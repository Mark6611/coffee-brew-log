// Weekly export of Supabase data to ~/Desktop/CODE/coffee-brew-log-backups/.
// Run manually via `npm run export`, or scheduled via the launchd plist
// installed at ~/Library/LaunchAgents/com.coffee-brew-log.export.plist.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local and VITE_SUPABASE_URL in .env.
// Both files are loaded via Node's --env-file flag (see scripts/export.sh).

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
	console.error(
		'Missing VITE_SUPABASE_URL (.env) or SUPABASE_SERVICE_ROLE_KEY (.env.local). Aborting.'
	);
	process.exit(1);
}

const OUTPUT_DIR = join(homedir(), 'Desktop/CODE/coffee-brew-log-backups');

const supabase = createClient(url, key, {
	auth: { autoRefreshToken: false, persistSession: false }
});

function escapeCsv(value) {
	if (value == null) return '';
	const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
	if (s.includes(',') || s.includes('"') || s.includes('\n')) {
		return '"' + s.replace(/"/g, '""') + '"';
	}
	return s;
}

function toCsv(rows) {
	if (rows.length === 0) return '';
	const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
	const header = keys.join(',');
	const lines = rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(','));
	return [header, ...lines].join('\n') + '\n';
}

async function main() {
	await mkdir(OUTPUT_DIR, { recursive: true });

	const { data: bags, error: bagsErr } = await supabase.from('bags').select('*');
	if (bagsErr) {
		console.error('Failed to fetch bags:', bagsErr.message);
		process.exit(1);
	}
	const { data: brews, error: brewsErr } = await supabase.from('brews').select('*');
	if (brewsErr) {
		console.error('Failed to fetch brews:', brewsErr.message);
		process.exit(1);
	}

	const today = new Date().toISOString().slice(0, 10);

	await writeFile(join(OUTPUT_DIR, 'bags-latest.csv'), toCsv(bags ?? []));
	await writeFile(join(OUTPUT_DIR, 'brews-latest.csv'), toCsv(brews ?? []));
	await writeFile(
		join(OUTPUT_DIR, `bags-${today}.json`),
		JSON.stringify(bags ?? [], null, 2)
	);
	await writeFile(
		join(OUTPUT_DIR, `brews-${today}.json`),
		JSON.stringify(brews ?? [], null, 2)
	);

	console.log(
		`[${new Date().toISOString()}] Exported ${bags?.length ?? 0} bags + ${brews?.length ?? 0} brews to ${OUTPUT_DIR}`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
