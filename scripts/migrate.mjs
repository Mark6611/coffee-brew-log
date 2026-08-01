// Supabase migration runner — ends the hand-paste-into-SQL-editor ritual.
//
//   node scripts/migrate.mjs            apply all pending files in supabase/migrations/
//   node scripts/migrate.mjs --dry-run  show applied vs pending, run nothing
//   node scripts/migrate.mjs --file supabase/migrations/20260704_add_photo.sql
//
// Zero dependencies on purpose: this machine has neither psql nor the supabase CLI,
// and the DB password is not stored here. It uses the Supabase Management API
// (POST /v1/projects/{ref}/database/query) with a personal access token instead.
//
// One-time setup (do it yourself; never paste the token into chat):
//   1. supabase.com → Account → Access Tokens → Generate new token
//   2. add a line to .env.local:   SUPABASE_ACCESS_TOKEN=sbp_...
//
// Applied migrations are recorded in a `_migrations` table in the project DB, and
// each file is applied inside BEGIN/COMMIT together with its ledger insert, so a
// half-applied migration cannot be recorded as done.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIG_DIR = join(REPO, 'supabase', 'migrations');

// --- env ----------------------------------------------------------------------
function loadEnv() {
	const env = {};
	for (const f of ['.env.local', '.env']) {
		const p = join(REPO, f);
		if (!existsSync(p)) continue;
		for (const line of readFileSync(p, 'utf8').split('\n')) {
			const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
			if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
		}
	}
	return env;
}
const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
const urlRef = (env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const ref = env.SUPABASE_PROJECT_REF || urlRef;

if (!ref) {
	console.error('FATAL: cannot derive the project ref — expected VITE_SUPABASE_URL (or SUPABASE_PROJECT_REF) in .env.local');
	process.exit(1);
}
if (!token) {
	console.error(`No SUPABASE_ACCESS_TOKEN in .env.local — one-time setup:
  1. supabase.com → Account (avatar) → Access Tokens → "Generate new token"
  2. add this line to ${join(REPO, '.env.local')} yourself:
       SUPABASE_ACCESS_TOKEN=sbp_<the token>
Then re-run. (Project ref detected: ${ref})`);
	process.exit(1);
}

// --- management-api SQL -------------------------------------------------------
async function sql(query) {
	const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ query })
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
	try { return JSON.parse(text); } catch { return text; }
}

// --- main ---------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const oneFile = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

const files = oneFile
	? [resolve(oneFile)]
	: readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort().map((f) => join(MIG_DIR, f));
if (files.length === 0) {
	console.log(`nothing to do — no .sql files in ${MIG_DIR}`);
	process.exit(0);
}

await sql(`create table if not exists _migrations (
  name text primary key,
  applied_at timestamptz not null default now()
)`);
const appliedRows = await sql(`select name from _migrations order by name`);
const applied = new Set((Array.isArray(appliedRows) ? appliedRows : []).map((r) => r.name));

const pending = files.filter((f) => !applied.has(basename(f)));
console.log(`project ${ref}: ${applied.size} applied, ${pending.length} pending`);
for (const f of files) console.log(`  ${applied.has(basename(f)) ? '✓ applied' : '· pending'}  ${basename(f)}`);

if (dryRun || pending.length === 0) process.exit(0);

for (const f of pending) {
	const name = basename(f);
	const body = readFileSync(f, 'utf8');
	process.stdout.write(`applying ${name} … `);
	// one transaction: the migration and its ledger row commit or roll back together
	await sql(`begin;\n${body}\n;insert into _migrations (name) values ('${name.replace(/'/g, "''")}');\ncommit;`);
	console.log('done');
}
console.log(`${pending.length} migration(s) applied.`);
