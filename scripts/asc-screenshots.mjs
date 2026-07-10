// Upload App Store screenshots to the 1.0 version localization via the ASC API.
// Flow per image: reserve (POST) → PUT bytes to the returned upload URL(s) →
// commit (PATCH uploaded=true + md5). Idempotent: skips a display set that
// already has screenshots.
import { asc } from './asc-api.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';

const VER_LOC = '28d09801-183b-466d-96ab-e9415fcff198';

const DEVICES = [
	{ displayType: 'APP_IPHONE_67', dir: 'appstore-screenshots' }, // 1320×2868
	{ displayType: 'APP_IPAD_PRO_3GEN_129', dir: 'appstore-screenshots-ipad13' } // 2048×2732
];

async function findOrCreateSet(displayType) {
	const existing = await asc(
		'GET',
		`/v1/appStoreVersionLocalizations/${VER_LOC}/appScreenshotSets?limit=50`
	);
	const found = (existing.json?.data ?? []).find(
		(s) => s.attributes?.screenshotDisplayType === displayType
	);
	if (found) return found.id;
	const created = await asc('POST', '/v1/appScreenshotSets', {
		data: {
			type: 'appScreenshotSets',
			attributes: { screenshotDisplayType: displayType },
			relationships: {
				appStoreVersionLocalization: {
					data: { type: 'appStoreVersionLocalizations', id: VER_LOC }
				}
			}
		}
	});
	if (!created.ok) throw new Error(`create set ${displayType}: ${JSON.stringify(created.json)}`);
	return created.json.data.id;
}

async function setCount(setId) {
	const r = await asc('GET', `/v1/appScreenshotSets/${setId}/appScreenshots?limit=50`);
	return (r.json?.data ?? []).length;
}

async function uploadOne(setId, dir, file) {
	const bytes = readFileSync(join(dir, file));
	const md5 = crypto.createHash('md5').update(bytes).digest('hex');
	const reserve = await asc('POST', '/v1/appScreenshots', {
		data: {
			type: 'appScreenshots',
			attributes: { fileName: file, fileSize: bytes.length },
			relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } }
		}
	});
	if (!reserve.ok) throw new Error(`reserve ${file}: ${JSON.stringify(reserve.json)}`);
	const id = reserve.json.data.id;
	const ops = reserve.json.data.attributes.uploadOperations ?? [];
	for (const op of ops) {
		const headers = {};
		for (const h of op.requestHeaders ?? []) headers[h.name] = h.value;
		const slice = bytes.subarray(op.offset, op.offset + op.length);
		const put = await fetch(op.url, { method: op.method, headers, body: slice });
		if (!put.ok) throw new Error(`PUT ${file}: HTTP ${put.status} ${await put.text()}`);
	}
	const commit = await asc('PATCH', `/v1/appScreenshots/${id}`, {
		data: { type: 'appScreenshots', id, attributes: { uploaded: true, sourceFileChecksum: md5 } }
	});
	if (!commit.ok) throw new Error(`commit ${file}: ${JSON.stringify(commit.json)}`);
	return id;
}

for (const dev of DEVICES) {
	const setId = await findOrCreateSet(dev.displayType);
	const already = await setCount(setId);
	if (already > 0) {
		console.log(`• ${dev.displayType}: already has ${already} screenshots — skipping`);
		continue;
	}
	const files = readdirSync(dev.dir)
		.filter((f) => f.endsWith('.png'))
		.sort();
	for (const f of files) {
		await uploadOne(setId, dev.dir, f);
		console.log(`✓ ${dev.displayType}  ${f}`);
	}
}
console.log('screenshots done.');
