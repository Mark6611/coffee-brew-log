// Upload App Store screenshots to a version localization via the ASC API.
// Flow per image: reserve (POST) → PUT bytes to the returned upload URL(s) →
// commit (PATCH uploaded=true + md5).
//
// Usage:
//   node scripts/asc-screenshots.mjs <versionLocalizationId> [--replace]
//
// Without --replace a display set that already has screenshots is left alone.
// With --replace its existing screenshots are deleted first — which is what a
// new version needs, since ASC copies the previous version's images forward and
// they then show the OLD UI (a 2.3.3 "accurate metadata" risk after a redesign).
import { asc } from './asc-api.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';

const VER_LOC = process.argv[2] ?? '28d09801-183b-466d-96ab-e9415fcff198';
const REPLACE = process.argv.includes('--replace');
if (!/^[0-9a-f-]{36}$/.test(VER_LOC)) {
	console.error(`Not a version-localization id: ${VER_LOC}`);
	process.exit(1);
}
console.log(`target localization ${VER_LOC}${REPLACE ? ' (replacing existing)' : ''}`);

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

async function setScreenshots(setId) {
	const r = await asc('GET', `/v1/appScreenshotSets/${setId}/appScreenshots?limit=50`);
	return r.json?.data ?? [];
}

async function clearSet(setId) {
	for (const shot of await setScreenshots(setId)) {
		const del = await asc('DELETE', `/v1/appScreenshots/${shot.id}`);
		if (!del.ok) throw new Error(`delete ${shot.id}: ${JSON.stringify(del.json)}`);
	}
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
	const already = (await setScreenshots(setId)).length;
	if (already > 0) {
		if (!REPLACE) {
			console.log(`• ${dev.displayType}: already has ${already} screenshots — skipping`);
			continue;
		}
		await clearSet(setId);
		console.log(`• ${dev.displayType}: removed ${already} carried-over screenshots`);
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
