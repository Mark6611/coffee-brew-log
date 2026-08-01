// Design-review capture: drives the DEV server (no build needed), seeds the
// same realistic data the App Store screenshot script uses, and captures every
// screen in both themes at iPhone size. Output is a contact sheet of PNGs for
// eyeballing a design change across the whole app at once.
//
// Run: node scripts/design-review.mjs [baseUrl]   (default http://localhost:5179)

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5179';
// Width override so a layout change can be checked at the tight iPhone widths
// (393 = 14/15/16, 375 = SE/mini) where rows have the least horizontal slack.
const WIDTH = Number(process.env.DR_WIDTH ?? 440);
const OUT = resolve(process.env.DR_OUT ?? 'design-review');

// ── Sample data (valid UUIDs; timestamps relative to now) ────────────────
// Mirrors scripts/screenshots.mjs so a design pass and an App Store capture
// are looking at the same coffee.
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const day = 86_400_000;
const ymd = (daysAgo) => new Date(now - daysAgo * day).toISOString().slice(0, 10);

const BAG1 = '11111111-1111-4111-8111-111111111111';
const BAG2 = '22222222-2222-4222-8222-222222222222';
const BAG3 = '33333333-3333-4333-8333-333333333333';
const BAG4 = '44444444-4444-4444-8444-444444444444';

const bags = [
	{
		id: BAG2,
		name: 'El Paraíso Lychee',
		roaster: 'Cata Coffee',
		origin: 'Colombia',
		process: 'anaerobic',
		roastLevel: 'medium',
		weightGrams: 250,
		pricePaid: 520,
		roastedAt: ymd(12),
		notes: 'Lychee, rosewater, cream. Dialed for the Lagom at 18g.',
		dialedRecipe: {
			grind: '2.4.0',
			doseG: 18,
			yieldG: 38,
			timeS: 29,
			tempC: 93,
			declaredAt: iso(3 * day)
		},
		createdAt: iso(14 * day)
	},
	{
		id: BAG1,
		name: 'Worka Sakaro',
		roaster: 'Sey Coffee',
		origin: 'Ethiopia',
		process: 'washed',
		roastLevel: 'light',
		weightGrams: 250,
		pricePaid: 340,
		roastedAt: ymd(8),
		notes: 'Bergamot, jasmine, white peach. A pour-over bag.',
		createdAt: iso(9 * day)
	},
	{
		id: BAG3,
		name: 'Finca Monteverde',
		roaster: 'Passenger',
		origin: 'Costa Rica',
		process: 'honey',
		roastLevel: 'medium',
		weightGrams: 340,
		pricePaid: 410,
		roastedAt: ymd(20),
		notes: 'Red apple, brown sugar, cocoa.',
		createdAt: iso(22 * day)
	},
	{
		// Espresso blend — exercises multi-origin flags + the grind calibrator.
		id: BAG4,
		name: 'Bourbon Barrel Blend',
		roaster: 'Onyx',
		origin: 'Brazil + Ethiopia',
		process: 'natural',
		roastLevel: 'medium-dark',
		weightGrams: 340,
		pricePaid: 480,
		roastedAt: ymd(10),
		notes: 'Chocolate-forward espresso blend. Brazil for body, Ethiopia for lift.',
		createdAt: iso(11 * day)
	}
];

let n = 0;
const bid = () => {
	n++;
	const h = n.toString(16).padStart(2, '0');
	return `aaaaaaaa-aaaa-4aaa-8aaa-0000000000${h}`;
};

const brews = [
	// Most recent — the home "last brew" hero: a dialed shot on bag2
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG2,
		coffeeName: 'El Paraíso Lychee',
		roaster: 'Cata Coffee',
		doseGrams: 18,
		yieldGrams: 38,
		brewTimeSeconds: 29,
		grindSetting: '2.4.0',
		waterTempC: 93,
		extraction: 'balanced',
		balance: 'balanced',
		rating: 5,
		isFavorite: true,
		notes: 'Bang on. Lychee up front, syrupy body, clean finish.',
		brewedAt: iso(4 * 3600_000)
	},
	{
		id: bid(),
		method: 'pour-over',
		bagId: BAG1,
		coffeeName: 'Worka Sakaro',
		roaster: 'Sey Coffee',
		doseGrams: 16,
		waterGrams: 256,
		brewTimeSeconds: 175,
		grindSetting: '4.2',
		waterTempC: 96,
		balance: 'light',
		rating: 4.5,
		notes: 'Jasmine and bergamot, tea-like. 1:16, 4.2 on the Ode.',
		brewedAt: iso(1 * day + 2 * 3600_000)
	},
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG2,
		coffeeName: 'El Paraíso Lychee',
		roaster: 'Cata Coffee',
		doseGrams: 18,
		yieldGrams: 37,
		brewTimeSeconds: 31,
		grindSetting: '2.5.0',
		waterTempC: 93,
		extraction: 'bitter',
		balance: 'heavy',
		rating: 4,
		notes: 'A touch slow — opened the grind a notch for the next one.',
		brewedAt: iso(2 * day)
	},
	{
		id: bid(),
		method: 'pour-over',
		bagId: BAG3,
		coffeeName: 'Finca Monteverde',
		roaster: 'Passenger',
		doseGrams: 18,
		waterGrams: 288,
		brewTimeSeconds: 195,
		grindSetting: '4.5',
		waterTempC: 94,
		balance: 'balanced',
		rating: 4.5,
		notes: 'Red apple and cocoa, rounder. 1:16.',
		brewedAt: iso(3 * day)
	},
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG2,
		coffeeName: 'El Paraíso Lychee',
		roaster: 'Cata Coffee',
		doseGrams: 18,
		yieldGrams: 36,
		brewTimeSeconds: 25,
		grindSetting: '2.3.0',
		waterTempC: 93,
		extraction: 'sour',
		balance: 'light',
		rating: 3.5,
		notes: 'Ran fast, a little sour. Tightening the grind.',
		brewedAt: iso(4 * day)
	},
	{
		id: bid(),
		method: 'pour-over',
		bagId: BAG1,
		coffeeName: 'Worka Sakaro',
		roaster: 'Sey Coffee',
		doseGrams: 15,
		waterGrams: 250,
		brewTimeSeconds: 168,
		grindSetting: '4.2',
		waterTempC: 96,
		rating: 5,
		isFavorite: true,
		notes: 'Cleanest cup this week. Florals for days.',
		brewedAt: iso(5 * day)
	},
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG3,
		coffeeName: 'Finca Monteverde',
		roaster: 'Passenger',
		doseGrams: 18,
		yieldGrams: 40,
		brewTimeSeconds: 28,
		grindSetting: '3.0.0',
		waterTempC: 92,
		extraction: 'balanced',
		rating: 4,
		notes: 'Chocolatey, comfortable daily shot.',
		brewedAt: iso(6 * day)
	},
	{
		id: bid(),
		method: 'pour-over',
		bagId: BAG3,
		coffeeName: 'Finca Monteverde',
		roaster: 'Passenger',
		doseGrams: 18,
		waterGrams: 300,
		brewTimeSeconds: 210,
		grindSetting: '4.7',
		waterTempC: 94,
		rating: 4,
		notes: 'Brown sugar sweetness. 1:16.6.',
		brewedAt: iso(8 * day)
	},
	// Bourbon Barrel Blend — a converged espresso: three balanced shots clustered
	// around 2.9.x so the grind calibrator reads high confidence.
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG4,
		coffeeName: 'Bourbon Barrel Blend',
		roaster: 'Onyx',
		doseGrams: 18,
		yieldGrams: 36,
		brewTimeSeconds: 27,
		grindSetting: '2.9.1',
		waterTempC: 92,
		extraction: 'balanced',
		balance: 'balanced',
		rating: 5,
		notes: 'Milk chocolate, dried cherry, round. Dialed.',
		brewedAt: iso(1 * day + 5 * 3600_000)
	},
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG4,
		coffeeName: 'Bourbon Barrel Blend',
		roaster: 'Onyx',
		doseGrams: 18,
		yieldGrams: 37,
		brewTimeSeconds: 28,
		grindSetting: '2.9.2',
		waterTempC: 92,
		extraction: 'balanced',
		balance: 'balanced',
		rating: 4.5,
		notes: 'Comfortable, cocoa-forward.',
		brewedAt: iso(3 * day)
	},
	{
		id: bid(),
		method: 'espresso',
		bagId: BAG4,
		coffeeName: 'Bourbon Barrel Blend',
		roaster: 'Onyx',
		doseGrams: 18,
		yieldGrams: 36,
		brewTimeSeconds: 27,
		grindSetting: '2.9.0',
		waterTempC: 92,
		extraction: 'balanced',
		balance: 'balanced',
		rating: 4.5,
		notes: 'First good one on this bag.',
		brewedAt: iso(6 * day)
	}
];

const DETAIL_BREW = brews[0].id; // the dialed 5★ espresso
// The latest shot on the NON-dialed blend bag — the only state in which
// CompassCard renders, so without this screen the compass is never captured.
const COMPASS_BREW = brews
	.filter((b) => b.bagId === BAG4)
	.sort((a, b) => b.brewedAt.localeCompare(a.brewedAt))[0].id;
const DETAIL_BAG = BAG2; // dialed bag (dial-in + cost)

async function seed(page) {
	await page.evaluate(
		async (d) => {
			const db = await new Promise((res, rej) => {
				const req = indexedDB.open('CoffeeBrewLog');
				req.onsuccess = () => res(req.result);
				req.onerror = () => rej(req.error);
			});
			await new Promise((res, rej) => {
				const tx = db.transaction(['bags', 'brews'], 'readwrite');
				for (const b of d.bags) tx.objectStore('bags').put(b);
				for (const b of d.brews) tx.objectStore('brews').put(b);
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
			});
			db.close();
		},
		{ bags, brews }
	);
}

const SCREENS = [
	['01-home', '/'],
	['02-brews', '/brews'],
	['03-brew-detail', `/brews/${DETAIL_BREW}`],
	['04-brew-edit', `/brews/${DETAIL_BREW}/edit`],
	['05-brew-new', '/brews/new'],
	['06-brew-new-dialin', `/brews/new?bagId=${BAG1}&method=espresso`],
	['07-bags', '/bags'],
	['08-bag-detail', `/bags/${DETAIL_BAG}`],
	['08b-bag-calibrated', `/bags/${BAG4}`],
	['03b-brew-compass', `/brews/${COMPASS_BREW}`],
	['09-bag-edit', `/bags/${DETAIL_BAG}/edit`],
	['10-bag-new', '/bags/new'],
	['11-stats', '/stats'],
	['12-settings', '/settings'],
	['13-buttons', '/dev/buttons']
];

// The dev server has died mid-run repeatedly, turning a 3-minute capture into an
// ERR_CONNECTION_REFUSED stack trace with nothing to show. Fail fast and clearly
// instead of half-writing an output directory.
async function ensureServer() {
	try {
		const r = await fetch(BASE, { signal: AbortSignal.timeout(4000) });
		if (r.ok || r.status < 500) return;
	} catch {
		/* fall through to the explicit error below */
	}
	console.error(
		`\nDev server is not answering at ${BASE}.\n` +
			`Start it first (npm run dev, or the preview tool) and re-run.\n`
	);
	process.exit(1);
}
await ensureServer();

const errors = [];

for (const theme of ['light', 'dark']) {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: WIDTH, height: 956 },
		deviceScaleFactor: 2,
		colorScheme: theme
	});
	await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
	const page = await ctx.newPage();
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`[${theme}] console: ${m.text()}`);
	});
	page.on('pageerror', (e) => errors.push(`[${theme}] pageerror: ${e.message}`));

	// Prime the app so Dexie creates the object stores, seed, then reload — the
	// already-rendered page won't re-read the DB on its own.
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(700);
	await seed(page);
	await page.reload({ waitUntil: 'networkidle' });

	await mkdir(`${OUT}/${theme}`, { recursive: true });
	for (const [file, route] of SCREENS) {
		await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(450);
		await page.screenshot({ path: `${OUT}/${theme}/${file}.png`, fullPage: true });
	}
	await browser.close();
	console.log(`captured ${SCREENS.length} screens (${theme})`);
}

console.log(`\nOutput: ${OUT}`);
if (errors.length) {
	console.log(`\n${errors.length} PAGE ERRORS:`);
	for (const e of [...new Set(errors)]) console.log('  ' + e);
	// Exit non-zero so `design-review && next-step` actually gates. Printing the
	// errors and returning 0 is how a broken screen sails through a ship chain.
	process.exit(1);
} else {
	console.log('\nNo console/page errors on any screen.');
}
