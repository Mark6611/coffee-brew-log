// Wait for a TestFlight build to finish Apple-side processing.
//
// This loop was hand-rolled from scratch ~125 times across past sessions, each
// time re-deriving the same two details:
//   1. Poll the FLAT /v1/builds route with filter[app] + sort=-uploadedDate.
//      The nested /v1/apps/<id>/builds route IGNORES sort, so "the latest build"
//      silently comes back as whatever order Apple felt like.
//   2. A build is only usable at processingState VALID. PROCESSING is normal for
//      the first few minutes; FAILED/INVALID are terminal and mean do not ship.
//
// Run: node scripts/asc-wait-build.mjs <buildVersion> [--timeout=900] [--interval=40]
// Exit 0 = VALID. Exit 1 = terminal failure, timeout, or bad usage.

import { asc } from './asc-api.mjs';

const APP_ID = '6786772685';
const args = process.argv.slice(2);
const version = args.find((a) => !a.startsWith('--'));
const num = (flag, dflt) => {
	const hit = args.find((a) => a.startsWith(`--${flag}=`));
	return hit ? Number(hit.split('=')[1]) : dflt;
};
const TIMEOUT_S = num('timeout', 900);
const INTERVAL_S = num('interval', 40);

if (!version) {
	console.error(
		'Usage: node scripts/asc-wait-build.mjs <buildVersion> [--timeout=900] [--interval=40]'
	);
	process.exit(1);
}

const TERMINAL_BAD = new Set(['FAILED', 'INVALID']);
const started = Date.now();
const stamp = () => new Date().toTimeString().slice(0, 8);

console.log(`Waiting for build ${version} (timeout ${TIMEOUT_S}s, polling every ${INTERVAL_S}s)`);

while ((Date.now() - started) / 1000 < TIMEOUT_S) {
	let state = 'ABSENT';
	try {
		const r = await asc(
			'GET',
			`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=10` +
				`&fields[builds]=version,processingState,expired`
		);
		if (!r.ok) {
			// A transient API error must not be mistaken for "build is gone" — keep waiting.
			console.log(`[${stamp()}] build ${version}: API HTTP ${r.status} (retrying)`);
			await new Promise((res) => setTimeout(res, INTERVAL_S * 1000));
			continue;
		}
		const hit = (r.json?.data ?? []).find((b) => b.attributes.version === String(version));
		state = hit ? hit.attributes.processingState : 'ABSENT';
	} catch (e) {
		console.log(`[${stamp()}] build ${version}: request failed (${e.message}) — retrying`);
		await new Promise((res) => setTimeout(res, INTERVAL_S * 1000));
		continue;
	}

	console.log(`[${stamp()}] build ${version}: ${state}`);

	if (state === 'VALID') {
		console.log(`\nBuild ${version} is VALID — ready to attach or test.`);
		process.exit(0);
	}
	if (TERMINAL_BAD.has(state)) {
		console.error(
			`\nBuild ${version} is ${state}. Apple usually emails the reason ` +
				`(export compliance, asset validation, or a bad binary). Do not ship it.`
		);
		process.exit(1);
	}
	// ABSENT is expected for the first minute or two after upload.
	await new Promise((res) => setTimeout(res, INTERVAL_S * 1000));
}

console.error(
	`\nTimed out after ${TIMEOUT_S}s. Processing usually takes 2-10 min; ` +
		`check App Store Connect for a processing email if it is much longer.`
);
process.exit(1);
