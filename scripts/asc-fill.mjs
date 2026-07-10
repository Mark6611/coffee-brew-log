// Fill Coffee Brew Log 1.0 metadata via the ASC API. Idempotent (PATCH).
import { asc } from './asc-api.mjs';

const VER_LOC = '28d09801-183b-466d-96ab-e9415fcff198'; // appStoreVersionLocalization en-US
const INFO_LOC = '3d1850e2-9934-482d-b71e-7238d35f4a8c'; // appInfoLocalization en-US
const REVIEW_DETAIL = '1726dbe9-9151-47a9-9ce1-106d3a84347c';

const SUPPORT_URL = 'https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app';
const PRIVACY_URL = `${SUPPORT_URL}/privacy-policy.html`;

const description = `Coffee Brew Log is a fast, private log for people who care how their coffee tastes — espresso and pour-over, tracked without the clutter.

LOG IN SECONDS
• One-tap “brew again” repeats any past brew, so your daily cup is two taps
• Espresso and pour-over, each with the fields that actually matter
• Attach a photo of the bag label or the cup

DIAL IN BY ROAST
• Roast-aware grind guidance and a next-shot suggestion after each espresso
• Target brew-time windows so you know which way to move the grinder
• Mark a bag “dialed” and every new shot starts from your settled recipe

WEIGH WITHOUT TOUCHING YOUR PHONE
• Connect an Acaia scale over Bluetooth to read live weight and shot time
• The yield and time fill themselves in as you brew, then auto-stop when the flow settles

KNOW YOUR BEANS
• Freshness, remaining grams, and cost per cup for every bag
• Ratings, tasting notes, and brew ratios computed for you

PRIVATE BY DESIGN
• Your data lives on your device. No account needed to use the app.
• Optional sign-in syncs your log across your own devices through your private account
• No ads, no analytics, no tracking

Coffee Brew Log is built for one person: you.`;

const keywords = 'coffee,espresso,pourover,brew,log,dialin,grind,ratio,acaia,scale,barista,beans,tracker,recipe';
const promotionalText =
	'Log a shot in seconds, dial in by roast level, and let your Acaia scale fill in the weight and time. Private by default — no ads, no account required.';
const subtitle = 'Your espresso & pour-over log';
const whatsNew = 'First public release of Coffee Brew Log.';

const reviewNotes = `Coffee Brew Log is a personal coffee brewing log. It requires NO account and works fully offline — you can review the core experience immediately: add a bag, log an espresso or pour-over, rate it, and see it in History and Stats.

Optional, and the app is fully functional without them:
• Sign in — optional, only for syncing across your own devices. It uses a one-time code emailed to you (magic-link); there is no password. A reviewer can skip sign-in entirely.
• Acaia scale — an optional Bluetooth connection that fills in weight and shot time while brewing. A physical Acaia scale is required to see live data, so a reviewer without one will see the “Connect” state; this does not affect any core feature. Screen recording available on request.

No ads, no analytics, no tracking. Privacy policy: ${PRIVACY_URL}`;

function assert(label, r) {
	console.log(`${r.ok ? '✓' : '✗'} ${label} — HTTP ${r.status}`);
	if (!r.ok) console.log('  ', JSON.stringify(r.json?.errors ?? r.json));
	return r.ok;
}

const VER = 'bf171ca8-6f1e-4567-91f5-1d4660137112';
void whatsNew; // 'whatsNew' is not editable on a first release (updates only) — omit.

// 1. Version localization: description, keywords, promo, support URL
assert(
	'version localization (desc/keywords/promo/support)',
	await asc('PATCH', `/v1/appStoreVersionLocalizations/${VER_LOC}`, {
		data: {
			type: 'appStoreVersionLocalizations',
			id: VER_LOC,
			attributes: { description, keywords, promotionalText, supportUrl: SUPPORT_URL }
		}
	})
);

// 2. App info localization: subtitle + privacy policy URL
assert(
	'app info localization (subtitle + privacyPolicyUrl)',
	await asc('PATCH', `/v1/appInfoLocalizations/${INFO_LOC}`, {
		data: {
			type: 'appInfoLocalizations',
			id: INFO_LOC,
			attributes: { subtitle, privacyPolicyUrl: PRIVACY_URL }
		}
	})
);

// 3. Review details: resolve the id from the version (the standalone id can be
//    stale), then PATCH if it exists or POST to create it.
void REVIEW_DETAIL;
const reviewAttrs = {
	contactFirstName: 'Kornkran',
	contactLastName: 'Keeratitejakarn',
	contactPhone: '+66999989598',
	contactEmail: 'kornkranmarwin@gmail.com',
	demoAccountRequired: false,
	notes: reviewNotes
};
const existing = await asc('GET', `/v1/appStoreVersions/${VER}/appStoreReviewDetail`);
const rdId = existing.json?.data?.id;
if (rdId) {
	assert(
		'review detail (patch)',
		await asc('PATCH', `/v1/appStoreReviewDetails/${rdId}`, {
			data: { type: 'appStoreReviewDetails', id: rdId, attributes: reviewAttrs }
		})
	);
} else {
	assert(
		'review detail (create)',
		await asc('POST', `/v1/appStoreReviewDetails`, {
			data: {
				type: 'appStoreReviewDetails',
				attributes: reviewAttrs,
				relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: VER } } }
			}
		})
	);
}

console.log('done.');
