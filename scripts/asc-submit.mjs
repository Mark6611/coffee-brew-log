// Final step: submit Coffee Brew Log 1.0 for App Review via the ASC API.
// Run ONLY after Free pricing and the App Privacy data-usage answers are set in
// the ASC web UI (both are web-only). Reuses an existing pending review
// submission if present, adds the 1.0 version, and submits. Re-runnable: if the
// version still isn't eligible it prints the exact blockers and does not submit.
import { asc } from './asc-api.mjs';

const APP = '6786772685';
const VER = 'bf171ca8-6f1e-4567-91f5-1d4660137112';

const errs = (r) => (r.json?.errors ?? []).map((e) => `  - ${e.detail}`).join('\n');

// 1. Find a pending review submission or create one.
let subId;
const list = await asc(
	'GET',
	`/v1/reviewSubmissions?filter[app]=${APP}&filter[state]=READY_FOR_REVIEW,COMPLETING&limit=10`
);
const pending = (list.json?.data ?? []).find((s) =>
	['READY_FOR_REVIEW', 'COMPLETING'].includes(s.attributes?.state)
);
if (pending) {
	subId = pending.id;
	console.log(`Reusing review submission ${subId} (${pending.attributes.state})`);
} else {
	const created = await asc('POST', '/v1/reviewSubmissions', {
		data: {
			type: 'reviewSubmissions',
			attributes: { platform: 'IOS' },
			relationships: { app: { data: { type: 'apps', id: APP } } }
		}
	});
	if (!created.ok) {
		console.log('✗ create submission failed:\n' + errs(created));
		process.exit(1);
	}
	subId = created.json.data.id;
	console.log(`Created review submission ${subId}`);
}

// 2. Ensure the version is an item on the submission.
const items = await asc('GET', `/v1/reviewSubmissions/${subId}/items`);
const hasVersion = (items.json?.data ?? []).length > 0;
if (!hasVersion) {
	const add = await asc('POST', '/v1/reviewSubmissionItems', {
		data: {
			type: 'reviewSubmissionItems',
			relationships: {
				reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
				appStoreVersion: { data: { type: 'appStoreVersions', id: VER } }
			}
		}
	});
	if (!add.ok) {
		console.log('✗ Version not eligible yet — remaining blockers:\n' + errs(add));
		console.log('\nSet Free pricing + App Privacy answers in the ASC web UI, then re-run.');
		process.exit(1);
	}
	console.log('✓ Added version 1.0 to the submission');
}

// 3. Submit.
const submit = await asc('PATCH', `/v1/reviewSubmissions/${subId}`, {
	data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } }
});
if (!submit.ok) {
	console.log('✗ Submit failed:\n' + errs(submit));
	process.exit(1);
}
console.log(`\n🎉 SUBMITTED — state: ${submit.json?.data?.attributes?.state}`);
