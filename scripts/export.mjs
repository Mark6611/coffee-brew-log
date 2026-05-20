// Weekly export of Supabase data to a local folder.
//
// Reads:
//   - VITE_SUPABASE_URL (from .env or plist EnvironmentVariables)
//   - SUPABASE_SERVICE_ROLE_KEY (from .env.local or plist EnvironmentVariables)
//   - BACKUP_DIR (optional override; default: ~/coffee-brew-log/backups)
//
// Uses Node's built-in fetch against Supabase's PostgREST endpoint, so no
// node_modules are required at runtime. The launchd job runs this from a
// non-TCC location (~/coffee-brew-log/) where macOS doesn't block file access.

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const outputDir = process.env.BACKUP_DIR ?? join(homedir(), 'coffee-brew-log/backups');

if (!url || !key) {
	console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
	process.exit(1);
}

async function fetchTable(table) {
	const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`
		}
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to fetch ${table}: ${res.status} ${text}`);
	}
	return res.json();
}

function escapeCsv(value) {
	if (value == null) return '';
	const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
	if (s.includes(',') || s.includes('"') || s.includes('\n')) {
		return '"' + s.replace(/"/g, '""') + '"';
	}
	return s;
}

// CSV is for human reading in Numbers / Excel. The JSON snapshots are the
// lossless restore format and keep every column.
//
// For CSV we drop `userId` (same UUID on every row — pure noise) and shove
// `id` to the last column (still useful for restore, just out of the way).
const CSV_HIDDEN = new Set(['userId']);
const CSV_TAIL = ['id'];

function toCsv(rows) {
	if (rows.length === 0) return '';
	const seen = new Set(rows.flatMap((r) => Object.keys(r)));
	const mainKeys = [...seen].filter((k) => !CSV_HIDDEN.has(k) && !CSV_TAIL.includes(k));
	const tailKeys = CSV_TAIL.filter((k) => seen.has(k));
	const keys = [...mainKeys, ...tailKeys];
	const header = keys.join(',');
	const lines = rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(','));
	return [header, ...lines].join('\n') + '\n';
}

async function main() {
	await mkdir(outputDir, { recursive: true });

	const [bags, brews] = await Promise.all([fetchTable('bags'), fetchTable('brews')]);

	const today = new Date().toISOString().slice(0, 10);

	await writeFile(join(outputDir, 'bags-latest.csv'), toCsv(bags));
	await writeFile(join(outputDir, 'brews-latest.csv'), toCsv(brews));
	await writeFile(join(outputDir, `bags-${today}.json`), JSON.stringify(bags, null, 2));
	await writeFile(join(outputDir, `brews-${today}.json`), JSON.stringify(brews, null, 2));

	console.log(
		`[${new Date().toISOString()}] Exported ${bags.length} bags + ${brews.length} brews to ${outputDir}`
	);
}

main().catch((err) => {
	console.error(err.message ?? err);
	process.exit(1);
});
