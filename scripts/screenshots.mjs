// App Store screenshot generator.
// Serves the local `build/` (SPA fallback), seeds IndexedDB with realistic
// sample data, and captures exact device-pixel PNGs for the required sizes:
//   iPhone 6.9"  → 1320×2868 (viewport 440×956  @ dsf 3)
//   iPad   13"   → 2064×2752 (viewport 1032×1376 @ dsf 2)
// Run: node scripts/screenshots.mjs   (after `npm run build`)

import { chromium } from '@playwright/test';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const BUILD = resolve('build');
const PORT = 4319;
const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webmanifest': 'application/manifest+json',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.txt': 'text/plain'
};

function serve() {
	return new Promise((res) => {
		const server = http.createServer(async (req, resp) => {
			try {
				const p = decodeURIComponent((req.url || '/').split('?')[0]);
				let file = join(BUILD, p);
				if (p.endsWith('/')) file = join(file, 'index.html');
				if (extname(file) && existsSync(file)) {
					// asset
				} else if (existsSync(file + '.html')) {
					file = file + '.html'; // prerendered page, e.g. /privacy
				} else if (!extname(file) || !existsSync(file)) {
					file = join(BUILD, 'index.html'); // SPA fallback
				}
				const body = await readFile(file);
				resp.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
				resp.end(body);
			} catch {
				try {
					resp.writeHead(200, { 'Content-Type': 'text/html' });
					resp.end(await readFile(join(BUILD, 'index.html')));
				} catch {
					resp.writeHead(404);
					resp.end();
				}
			}
		});
		server.listen(PORT, () => res(server));
	});
}

// ── Sample data (valid UUIDs; timestamps relative to now) ────────────────
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const day = 86_400_000;
const ymd = (daysAgo) => new Date(now - daysAgo * day).toISOString().slice(0, 10);

const BAG1 = '11111111-1111-4111-8111-111111111111';
const BAG2 = '22222222-2222-4222-8222-222222222222';
const BAG3 = '33333333-3333-4333-8333-333333333333';

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
	}
];

const DETAIL_BREW = brews[0].id; // the dialed 5★ espresso
const DETAIL_BAG = BAG2; // dialed bag (dial-in + cost)

const seedData = { bags, brews };

async function seed(page, data) {
	await page.evaluate(async (d) => {
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
	}, data);
}

const SCREENS = [
	{ file: '01-home', route: '/' },
	{ file: '02-history', route: '/brews' },
	{ file: '03-shot-detail', route: `/brews/${DETAIL_BREW}` },
	{ file: '04-bag-dialin', route: `/bags/${DETAIL_BAG}` },
	{ file: '05-stats', route: '/stats' }
];

const DEVICES = [
	// iPhone 6.9" → 1320×2868 (APP_IPHONE_67 slot)
	{ dir: 'appstore-screenshots', viewport: { width: 440, height: 956 }, dsf: 3 },
	// iPad 12.9" → 2048×2732 (APP_IPAD_PRO_3GEN_129 — the reliably-accepted iPad size)
	{ dir: 'appstore-screenshots-ipad13', viewport: { width: 1024, height: 1366 }, dsf: 2 }
];

const HIDE_CSS = `
	[aria-label^="Cycle theme"] { display: none !important; }
	* { transition: none !important; animation: none !important; }
`;

async function run() {
	const server = await serve();
	const base = `http://localhost:${PORT}`;
	const browser = await chromium.launch();
	try {
		for (const dev of DEVICES) {
			await mkdir(resolve(dev.dir), { recursive: true });
			const ctx = await browser.newContext({
				viewport: dev.viewport,
				deviceScaleFactor: dev.dsf,
				colorScheme: 'light',
				serviceWorkers: 'block'
			});
			// Force the light theme before app JS runs.
			await ctx.addInitScript(() => localStorage.setItem('theme', 'light'));
			const page = await ctx.newPage();

			// Prime the app so Dexie creates the DB, then seed, then reload.
			await page.goto(base + '/', { waitUntil: 'networkidle' });
			await page.waitForTimeout(600);
			await seed(page, seedData);

			for (const s of SCREENS) {
				await page.goto(base + s.route, { waitUntil: 'networkidle' });
				await page.addStyleTag({ content: HIDE_CSS });
				await page.waitForTimeout(700);
				const out = join(dev.dir, `${s.file}.png`);
				await page.screenshot({ path: out });
				console.log(`✓ ${out}`);
			}
			await ctx.close();
		}
	} finally {
		await browser.close();
		server.close();
	}
}

run().then(
	() => process.exit(0),
	(e) => {
		console.error(e);
		process.exit(1);
	}
);
