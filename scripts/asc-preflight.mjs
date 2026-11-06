// App Store Connect preflight — answers "can I actually ship right now?" BEFORE
// spending 10 minutes on an archive + upload.
//
// Every ASC failure in this project's history has been the same shape: a hidden
// prerequisite that only surfaces as a 409 at the FINAL submit step, after the
// build was already made and uploaded. Real examples:
//   409 "You cannot create a new version of the App in the current state"
//       (a version was still WAITING_FOR_REVIEW — Apple allows only one)
//   409 "This resource cannot be reviewed ... You must have published answers
//       to your app's data usages" / "... pricing has been set"
//   409 'ageAssurance' Expected a BOOLEAN but got STRING
//   409 "You must provide a value for the attribute 'socialMedia'" (a new
//       age-rating question Apple added after the last release — section 6)
//   404 /v1/appDataUsages  (App Privacy genuinely has NO public API)
//
// Run: node scripts/asc-preflight.mjs [targetVersion]
// Exit 0 = clear to ship. Exit 1 = at least one BLOCKER.

import { asc } from './asc-api.mjs';
import { unansweredAgeRating } from './age-rating.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = '6786772685';
const TARGET = process.argv[2] ?? null;

// A version in any of these states blocks creating/submitting another one.
const BLOCKING = new Set([
	'WAITING_FOR_REVIEW',
	'IN_REVIEW',
	'PENDING_DEVELOPER_RELEASE',
	'PENDING_APPLE_RELEASE',
	'PROCESSING_FOR_APP_STORE'
]);

const blockers = [];
const warnings = [];
const ok = [];
const sh = (c) => execSync(c, { cwd: REPO, encoding: 'utf8' }).trim();

function localVersions() {
	const pbx = readFileSync(`${REPO}/ios/App/App.xcodeproj/project.pbxproj`, 'utf8');
	const uniq = (re) => [...new Set([...pbx.matchAll(re)].map((m) => m[1]))];
	const marketing = uniq(/MARKETING_VERSION = ([^;]+);/g);
	const build = uniq(/CURRENT_PROJECT_VERSION = ([^;]+);/g);
	let appVersion = null;
	try {
		appVersion = readFileSync(`${REPO}/src/routes/settings/+page.svelte`, 'utf8').match(
			/APP_VERSION\s*=\s*'([^']+)'/
		)?.[1];
	} catch {
		/* settings page may move; treated as a warning below */
	}
	return { marketing, build, appVersion };
}

console.log('App Store Connect preflight\n' + '='.repeat(52));

// ── 1. Local version consistency ─────────────────────────────────────────
const { marketing, build, appVersion } = localVersions();
if (marketing.length !== 1)
	blockers.push(`MARKETING_VERSION disagrees across configs: ${marketing}`);
else ok.push(`MARKETING_VERSION ${marketing[0]} (consistent)`);
if (build.length !== 1) blockers.push(`CURRENT_PROJECT_VERSION disagrees across configs: ${build}`);
else ok.push(`CURRENT_PROJECT_VERSION ${build[0]} (consistent)`);
if (appVersion && marketing[0] && appVersion !== marketing[0])
	blockers.push(`Settings shows v${appVersion} but the build ships ${marketing[0]}`);
else if (appVersion) ok.push(`in-app version string matches (${appVersion})`);

// ── 2. Git state (a dirty tree means the build won't match the commit) ────
const dirty = sh('git status --porcelain');
if (dirty)
	warnings.push(
		`working tree is dirty (${dirty.split('\n').length} files) — build won't match a commit`
	);
else ok.push('working tree clean');
try {
	sh('git fetch origin --quiet');
	const behind = sh('git rev-list --count HEAD..origin/main');
	if (behind !== '0')
		warnings.push(`${behind} commit(s) on origin/main not in HEAD — rebase before shipping`);
	else ok.push('in sync with origin/main');
} catch {
	warnings.push('could not reach origin to compare');
}

// ── 3. Is any version blocking a new one? (the 409 that cost us today) ────
const vres = await asc(
	'GET',
	`/v1/apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState`
);
if (!vres.ok) blockers.push(`could not list versions: HTTP ${vres.status}`);
const versions = vres.json?.data ?? [];
const blocking = versions.filter((v) => BLOCKING.has(v.attributes.appStoreState));
if (blocking.length) {
	for (const v of blocking)
		blockers.push(
			`v${v.attributes.versionString} is ${v.attributes.appStoreState} — Apple allows only ONE version in review; ` +
				`a new version cannot even be CREATED until it clears (or is cancelled)`
		);
} else ok.push('no version is occupying the review slot');

const live = versions.filter((v) => v.attributes.appStoreState === 'READY_FOR_SALE');
if (live.length) ok.push(`live: ${live.map((v) => 'v' + v.attributes.versionString).join(', ')}`);

// ── 4. Latest builds — is anything actually shippable? ────────────────────
const bres = await asc(
	'GET',
	`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,expired`
);
const builds = (bres.json?.data ?? []).map((b) => b.attributes);
const usable = builds.find((b) => b.processingState === 'VALID' && !b.expired);
if (!usable)
	blockers.push(
		`no VALID unexpired build (latest: ${builds.map((b) => b.version + ':' + b.processingState).join(', ') || 'none'})`
	);
else {
	ok.push(`build ${usable.version} is VALID`);
	if (build[0] && usable.version !== build[0])
		warnings.push(
			`local CURRENT_PROJECT_VERSION is ${build[0]} but the newest VALID build is ${usable.version} — upload first`
		);
}

// ── 5. If the target version exists, is it actually complete? ─────────────
const target = TARGET ? versions.find((v) => v.attributes.versionString === TARGET) : null;
if (TARGET && !target) {
	warnings.push(`v${TARGET} does not exist yet in ASC (it will be created at submit time)`);
} else if (target) {
	const id = target.id;
	const b = await asc('GET', `/v1/appStoreVersions/${id}/build?fields[builds]=version`);
	if (!b.json?.data) blockers.push(`v${TARGET} has no build attached`);
	else ok.push(`v${TARGET} has build ${b.json.data.attributes.version} attached`);

	const locs = await asc(
		'GET',
		`/v1/appStoreVersions/${id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,whatsNew`
	);
	for (const l of locs.json?.data ?? []) {
		const { locale, whatsNew } = l.attributes;
		// whatsNew is not editable on a FIRST release — absent is only a blocker later.
		if (!whatsNew && live.length) blockers.push(`v${TARGET} ${locale}: release notes are empty`);
		else ok.push(`v${TARGET} ${locale}: release notes present`);

		const sets = await asc(
			'GET',
			`/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?limit=10`
		);
		for (const s of sets.json?.data ?? []) {
			const shots = await asc('GET', `/v1/appScreenshotSets/${s.id}/appScreenshots?limit=50`);
			const rows = shots.json?.data ?? [];
			const bad = rows.filter((r) => r.attributes.assetDeliveryState?.state !== 'COMPLETE');
			const type = s.attributes.screenshotDisplayType;
			if (!rows.length) blockers.push(`v${TARGET} ${type}: no screenshots`);
			else if (bad.length)
				blockers.push(`v${TARGET} ${type}: ${bad.length} screenshot(s) not COMPLETE`);
			else ok.push(`v${TARGET} ${type}: ${rows.length} screenshots COMPLETE`);
		}
	}
}

// ── 6. Age-rating questions Apple added since the last release ────────────
// A new question arrives as null on an existing app and only surfaces as a 409
// when the version is added to a review submission (socialMedia, 1.6). Check
// the declaration that will be SUBMITTED: the in-progress app info if a version
// is being prepared (a blocker — this is the one Apple reviews), otherwise the
// live one, which a new version copies (a warning — a TestFlight-only cut is
// unaffected, but the next submission will 409 until it is answered).
const ires = await asc('GET', `/v1/apps/${APP_ID}/appInfos?fields[appInfos]=state`);
const infos = ires.json?.data ?? [];
const SETTLED = new Set(['READY_FOR_DISTRIBUTION', 'REPLACED_WITH_NEW_INFO']);
const pending = infos.find((i) => !SETTLED.has(i.attributes.state));
const info = pending ?? infos.find((i) => i.attributes.state === 'READY_FOR_DISTRIBUTION');
if (!info) {
	warnings.push(`could not find an app info to check the age rating (HTTP ${ires.status})`);
} else {
	const which = pending
		? `${info.attributes.state} app info`
		: 'live app info (a new version copies it)';
	// The direct GET /v1/ageRatingDeclarations/<id> 403s; the appInfo route reads it.
	const ar = await asc('GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`);
	if (!ar.ok) {
		warnings.push(`could not read the age rating on the ${which}: HTTP ${ar.status}`);
	} else {
		const missing = unansweredAgeRating(ar.json?.data?.attributes);
		if (!missing.length) {
			ok.push(`age rating: every question answered (${which})`);
		} else {
			const msg =
				`age rating: unanswered question(s) ${missing.join(', ')} on the ${which} — ` +
				`adding the version to a review submission 409s until they are answered. ` +
				`PATCH /v1/ageRatingDeclarations/${ar.json.data.id} (read it via /v1/appInfos/${info.id}/ageRatingDeclaration). ` +
				`If one is null by design, add it to OPTIONAL_AGE_FIELDS in scripts/age-rating.mjs.`;
			(pending ? blockers : warnings).push(msg);
		}
	}
}

// ── 7. Things the API cannot see — must be stated, not silently assumed ───
warnings.push(
	'NOT API-CHECKABLE: App Privacy answers and Pricing. Both are web-UI only ' +
		'(/v1/appDataUsages 404s) and both surface as a 409 at submit if unset. ' +
		'They persist per-app, so if a previous version shipped, they are already set.'
);

const line = '-'.repeat(52);
console.log(`\n${line}\nPASS (${ok.length})`);
for (const o of ok) console.log(`  ✓ ${o}`);
if (warnings.length) {
	console.log(`\nWARN (${warnings.length})`);
	for (const w of warnings) console.log(`  ! ${w}`);
}
if (blockers.length) {
	console.log(`\nBLOCKERS (${blockers.length})`);
	for (const b of blockers) console.log(`  ✗ ${b}`);
	console.log(`\n${line}\nNOT clear to ship.`);
	process.exit(1);
}
console.log(`\n${line}\nClear to ship.`);
