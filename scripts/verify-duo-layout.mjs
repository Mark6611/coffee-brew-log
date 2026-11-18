// Verifies the layout at the iPhone Duo's logical viewports against the PRODUCTION
// build, including the live resize that folding produces and the Duo's safe-area
// insets. The WebView is the whole UI, so these are the sizes iOS hands it.
//
//   npm run build && node scripts/verify-duo-layout.mjs
//   DUO_OUT=/some/dir  … to keep the screenshots somewhere specific
//
// Geometry — MEASURED by sibling Buffy on the iOS 27.2 iPhone Duo simulator (Xcode
// 27.2, app built against the 27.2 SDK, logged from inside the WKWebView), pt @3x:
//   closed   — outer display 466×678
//   open     — inner display 951×669 LANDSCAPE, hinge down the middle (partially
//              open past the swap angle hands the WebView the same size)
//   insets   — 84 right + 34 bottom on both displays; on the outer display the
//              status area was also seen at the top instead (82 top, 0 right)
// NOT measured, kept as stress cases: the turned pose (669×951, inferred from the
// inner display's 2007×2853 framebuffer) and Split View (334pt, half of that).
//
// The page column is `mx-auto max-w-2xl` (672px). On a device with a hinge the
// native shell sets html[data-foldable] (HingePlugin.swift → src/lib/hinge.ts) and
// the column fills instead (layout.css); Chromium has no hinge, so this script sets
// the attribute itself — meaning it cannot reproduce the native timing (attribute
// after first paint, hinge status vs resize landing a beat apart). That contract
// is pinned by src/lib/hinge.test.ts and the on-device check.
//
// Chromium reports every env(safe-area-inset-*) as 0, so the server rewrites env()
// to real values in the CSS AND the JS it serves (the FABs and the confirm sheet
// carry their insets in inline styles, which live in the JS bundle).
//
// What a failure means: a horizontal scrollbar on the Duo, a column that floats
// like a phone on the unfolded display, an iPad/desktop that suddenly stops
// centring, content or a button inside a safe-area inset, or a form field small
// enough to trigger iOS focus-zoom.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BUILD = resolve('build');
const PORT = 4361;
const OUT = process.env.DUO_OUT ?? join(tmpdir(), 'coffee-duo-verify');
const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.woff2': 'font/woff2'
};

if (!existsSync(join(BUILD, 'index.html'))) {
	console.error('build/ is missing — run `npm run build` first');
	process.exit(2);
}
await mkdir(OUT, { recursive: true });

// Insets the server bakes into env() while an inset case runs; all 0 otherwise.
let insets = { top: 0, right: 0, bottom: 0, left: 0 };
const ENV_RE = /env\(\s*safe-area-inset-(top|right|bottom|left)\s*(?:,[^)]*)?\)/g;
const rewriteEnv = (text) => text.replace(ENV_RE, (_, side) => `${insets[side]}px`);

const server = await new Promise((res) => {
	const s = createServer(async (rq, rs) => {
		try {
			const p = decodeURIComponent((rq.url || '/').split('?')[0]);
			let f = join(BUILD, p);
			if (p.endsWith('/')) f = join(f, 'index.html');
			if (!(extname(f) && existsSync(f)))
				f = existsSync(f + '.html') ? f + '.html' : join(BUILD, 'index.html');
			const ext = extname(f);
			let body = await readFile(f);
			if (ext === '.css' || ext === '.js' || ext === '.html')
				body = rewriteEnv(body.toString('utf8'));
			rs.writeHead(200, {
				'Content-Type': MIME[ext] ?? 'application/octet-stream',
				'Cache-Control': 'no-store'
			});
			rs.end(body);
		} catch {
			rs.writeHead(404);
			rs.end();
		}
	});
	s.listen(PORT, () => res(s));
});
const base = `http://localhost:${PORT}`;

const COLUMN_MAX = 672; // Tailwind max-w-2xl — every page's column
const BAG1 = '11111111-1111-4111-8111-111111111111';
const BREW1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const VIEWPORTS = [
	{ name: 'duo-outer', width: 466, height: 678, foldable: true, note: 'closed (measured)' },
	// The default unfolded pose. 951pt is above the column's 672px, so this only
	// fills because of data-foldable — the case the hinge plugin exists for.
	{
		name: 'duo-inner',
		width: 951,
		height: 669,
		foldable: true,
		note: 'open, landscape (measured)'
	},
	{
		name: 'duo-inner-turned',
		width: 669,
		height: 951,
		foldable: true,
		note: 'open, turned (unmeasured)'
	},
	{
		name: 'duo-split',
		width: 334,
		height: 951,
		foldable: true,
		note: 'Split View half (unmeasured)'
	},
	{
		name: 'wide-no-hinge',
		width: 951,
		height: 669,
		note: 'control: same width, no hinge — centres'
	},
	{ name: 'se-floor', width: 320, height: 568, note: 'control: narrowest iPhone' },
	{ name: 'iphone-393', width: 393, height: 852, note: 'control: the HIG-pass width' },
	{ name: 'desktop', width: 1280, height: 900, note: 'control: centred column' }
];

// The brew form with a bag picked: the one page that splits on the unfolded Duo
// (layout.css, .split) — the form RIGHT of the fold (the half you touch, under
// the right thumb), the bag's history left.
const SPLIT_ROUTE = `/brews/new?bagId=${BAG1}&method=espresso`;
// Below this width a foldable stays one column and the history is a sheet.
const SPLIT_MIN = 860;
// The narrowest box the form is checked in elsewhere (Split View, below). The
// form's half loses the status column and the fold gutter, and must keep this.
const FORM_MIN = 334;

const ROUTES = [
	'/',
	'/brews',
	`/brews/${BREW1}`,
	'/brews/new',
	SPLIT_ROUTE,
	`/brews/${BREW1}/edit`,
	'/bags',
	`/bags/${BAG1}`,
	'/stats',
	'/settings'
];

const failures = [];
const fail = (where, what) => {
	failures.push(`${where}: ${what}`);
	console.log(`  ✗ ${where}: ${what}`);
};

/** What the native shell does on the Duo: data-foldable on <html>, in every pose.
 *  An init script can run before <html> exists — wait for it. */
const markFoldable = () => {
	const set = () => {
		document.documentElement.dataset.foldable = '';
	};
	if (document.documentElement) return set();
	new MutationObserver((_, obs) => {
		if (!document.documentElement) return;
		obs.disconnect();
		set();
	}).observe(document, { childList: true });
};

/** A real function, not a string: page.evaluate() of an argument-less string that
 *  happens to be an arrow function returns the function object (Buffy hit this). */
const measure = () => {
	const de = document.documentElement;
	const px = (v) => parseFloat(v) || 0;
	const bs = getComputedStyle(document.body);
	const col = document.querySelector('.mx-auto.max-w-2xl');
	const fab = document.querySelector('a.fixed[class*="h-[60px]"]');
	const fr = fab ? fab.getBoundingClientRect() : null;
	const fields = [
		...document.querySelectorAll('input:not([type=file]):not([type=hidden]), textarea, select')
	].filter((f) => f.getClientRects().length > 0);
	const main = document.querySelector('.split-main');
	const aside = document.querySelector('.split-aside');
	const ar = aside ? aside.getBoundingClientRect() : null;
	const hist = [...document.querySelectorAll('button')].find(
		(b) => b.textContent.trim() === 'History'
	);
	return {
		vw: window.innerWidth,
		vh: window.innerHeight,
		scrollY: window.scrollY,
		// null on every page but the brew form
		split: main
			? {
					mainLeft: main.getBoundingClientRect().left,
					mainRight: main.getBoundingClientRect().right,
					mainPadLeft: px(getComputedStyle(main).paddingLeft),
					mainPadRight: px(getComputedStyle(main).paddingRight),
					asideShown: !!aside && getComputedStyle(aside).display !== 'none',
					aside: ar ? { left: ar.left, right: ar.right, top: ar.top, bottom: ar.bottom } : null,
					asidePadLeft: aside ? px(getComputedStyle(aside).paddingLeft) : null,
					asidePadRight: aside ? px(getComputedStyle(aside).paddingRight) : null,
					asideScrolls: aside ? aside.scrollHeight > aside.clientHeight + 1 : null,
					// present only once a bag is picked
					historyButton: hist ? getComputedStyle(hist).visibility : null
				}
			: null,
		foldable: 'foldable' in de.dataset,
		docOverflow: de.scrollWidth - de.clientWidth,
		bodyPad: { left: px(bs.paddingLeft), right: px(bs.paddingRight) },
		colWidth: col ? col.getBoundingClientRect().width : null,
		fab: fr ? { left: fr.left, rightGap: window.innerWidth - fr.right } : null,
		// smallest visible form-control font: below 16px iOS zooms on focus
		minField: fields.length
			? Math.min(...fields.map((f) => parseFloat(getComputedStyle(f).fontSize)))
			: null
	};
};

/** The two panes meet at the fold (50% of the viewport, not of the inset area):
 *  the form on the RIGHT, the history pane on the left, each 12px clear of the
 *  fold on top of its own gutter and both inside every inset. Anywhere it should
 *  not split, the aside must be gone and the History button — the way to the
 *  same content as a sheet — must be back. */
function checkSplit(where, m, splits, inset) {
	const s = m.split;
	const near = (a, b) => Math.abs(a - b) <= 0.5;
	if (!splits) {
		if (s.asideShown) fail(where, 'history pane showing where the form should be one column');
		if (s.mainPadLeft !== 0 || s.mainPadRight !== 0)
			fail(where, `form keeps the fold gutter (${s.mainPadLeft}/${s.mainPadRight}px)`);
		if (s.historyButton != null && s.historyButton !== 'visible')
			fail(where, 'History button hidden with no pane to stand in for it');
		return;
	}
	const fold = m.vw / 2;
	if (!s.asideShown || !s.aside) return fail(where, 'no history pane on the unfolded Duo');
	// the form is the RIGHT half, under the status column; the pane is the left
	if (!near(s.mainLeft, fold)) fail(where, `form starts at ${s.mainLeft}, want the fold ${fold}`);
	if (!near(s.mainRight, m.vw - inset.right))
		fail(where, `form ends at ${s.mainRight}, want ${m.vw - inset.right} (the right inset)`);
	if (!near(s.aside.left, inset.left))
		fail(where, `pane starts at ${s.aside.left}, want ${inset.left} (the left inset)`);
	if (!near(s.aside.right, fold))
		fail(where, `pane ends at ${s.aside.right}, want the fold ${fold}`);
	if (s.mainPadLeft !== 12 || s.mainPadRight !== 0)
		fail(
			where,
			`form padding ${s.mainPadLeft}/${s.mainPadRight}px, want 12/0 (clear of the fold only)`
		);
	if (s.asidePadRight !== 32 || s.asidePadLeft !== 20)
		fail(
			where,
			`pane padding ${s.asidePadLeft}/${s.asidePadRight}px, want 20/32 (its gutter; 20 + 12 at the fold)`
		);
	// what is left of the right half for the form — the reason for the 860px floor
	const room = s.mainRight - s.mainLeft - s.mainPadLeft;
	if (room < FORM_MIN - 0.5)
		fail(where, `the form has ${room}px beside the pane, below the ${FORM_MIN}px it is checked at`);
	// Pinned: at the top inset however far the form has scrolled.
	if (!near(s.aside.top, inset.top ?? 0))
		fail(where, `pane top ${s.aside.top} at scroll ${m.scrollY}, want ${inset.top ?? 0}`);
	if (s.aside.bottom > m.vh - (inset.bottom ?? 0) + 0.5)
		fail(where, `pane bottom ${s.aside.bottom} runs into the bottom inset`);
	if (s.historyButton != null && s.historyButton !== 'hidden')
		fail(where, 'History button showing beside the pane it would duplicate');
}

/** `foldable` is what the CASE says the device is — never read back from the page,
 *  or a lost data-foldable would quietly turn "must fill" into "may centre". */
function check(where, m, foldable, inset = { left: 0, right: 0 }) {
	if (m.foldable !== foldable)
		fail(where, foldable ? 'data-foldable missing' : 'data-foldable set on a hinge-less case');
	if (m.docOverflow > 0) fail(where, `page scrolls horizontally by ${m.docOverflow}px`);
	// Body pads exactly the inset sides, never mirrored (the Duo's status column
	// takes ONE edge). Global rule: with no inset it is 0 and changes nothing.
	if (m.bodyPad.left !== inset.left || m.bodyPad.right !== inset.right)
		fail(
			where,
			`body padding ${m.bodyPad.left}/${m.bodyPad.right}, want ${inset.left}/${inset.right}`
		);
	if (m.colWidth == null) return fail(where, 'no .mx-auto.max-w-2xl column');
	const room = m.vw - inset.left - inset.right;
	// The brew form is the right HALF on the unfolded Duo: from the fold to the
	// right inset.
	const splits = m.split != null && foldable && m.vw >= SPLIT_MIN;
	const want = splits ? m.vw / 2 - inset.right : foldable ? room : Math.min(room, COLUMN_MAX);
	if (Math.abs(m.colWidth - want) > 0.5)
		fail(
			where,
			`column ${m.colWidth}px, want ${want}px (${splits ? 'right half, from the fold' : foldable ? 'fill (data-foldable)' : room <= COLUMN_MAX ? 'fill' : 'centre at max-w-2xl'})`
		);
	if (m.split) checkSplit(where, m, splits, inset);
	if (m.fab) {
		if (m.fab.left < inset.left) fail(where, `FAB left edge ${m.fab.left} inside the left inset`);
		if (m.fab.rightGap < inset.right + 20 - 0.5)
			fail(where, `FAB ${m.fab.rightGap}px from the right edge, want ≥ ${inset.right + 20}`);
	}
	if (m.minField != null && m.minField < 16)
		fail(where, `a form field is ${m.minField}px — iOS zooms on focus below 16px`);
}

/** Navigate and wait until the page has RENDERED its column — pages show a
 *  "Loading…" line while IndexedDB answers, and a fixed sleep measured that line
 *  instead of the page on a loaded machine (a false "no column" failure). */
async function gotoRendered(page, route) {
	await page.goto(base + route, { waitUntil: 'networkidle' });
	await page.waitForSelector('.mx-auto.max-w-2xl', { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(150);
}

async function seed(page) {
	await page.goto(base + '/', { waitUntil: 'networkidle' });
	await page.evaluate(
		async ({ BAG1, BREW1 }) => {
			const db = await new Promise((res, rej) => {
				const req = indexedDB.open('CoffeeBrewLog');
				req.onsuccess = () => res(req.result);
				req.onerror = () => rej(req.error);
			});
			const day = 86_400_000;
			const iso = (ago) => new Date(Date.now() - ago).toISOString();
			const bag = {
				id: BAG1,
				name: 'Worka Sakaro',
				roaster: 'Sey Coffee',
				origin: 'Ethiopia',
				process: 'washed',
				roastLevel: 'light',
				weightGrams: 250,
				roastedAt: iso(8 * day).slice(0, 10),
				notes: 'Bergamot, jasmine, white peach.',
				createdAt: iso(9 * day)
			};
			const names = [
				'Worka Sakaro',
				'La Esperanza',
				'Bourbon Barrel Blend',
				'Hayes Valley',
				'Gedeb Natural',
				'El Diamante'
			];
			const brews = names.map((n, i) => ({
				id: i === 0 ? BREW1 : crypto.randomUUID(),
				method: 'espresso',
				coffeeName: n,
				bagId: i === 0 ? BAG1 : undefined,
				doseGrams: 18,
				yieldGrams: 36 + i,
				brewTimeSeconds: 26 + i,
				grindSetting: '2.5',
				notes: i === 0 ? 'Floral, long finish.' : '',
				rating: (i % 5) + 1,
				brewedAt: iso(i * day),
				createdAt: iso(i * day),
				updatedAt: iso(i * day)
			}));
			await new Promise((res, rej) => {
				const tx = db.transaction(['bags', 'brews'], 'readwrite');
				tx.objectStore('bags').clear();
				tx.objectStore('brews').clear();
				tx.objectStore('bags').put(bag);
				for (const b of brews) tx.objectStore('brews').put(b);
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
			});
			db.close();
		},
		{ BAG1, BREW1 }
	);
}

const browser = await chromium.launch();
try {
	const contexts = {};
	for (const foldable of [false, true]) {
		const ctx = await browser.newContext({
			viewport: { width: 393, height: 852 },
			colorScheme: 'light',
			serviceWorkers: 'block'
		});
		if (foldable) await ctx.addInitScript(markFoldable);
		const page = await ctx.newPage();
		page.on('pageerror', (e) => fail(`pageerror${foldable ? ' (foldable)' : ''}`, e.message));
		await seed(page);
		contexts[foldable] = page;
	}

	// ── Static pass: every route at every viewport ──────────────────────────
	for (const vp of VIEWPORTS) {
		console.log(`── ${vp.name} ${vp.width}×${vp.height} (${vp.note})`);
		const page = contexts[!!vp.foldable];
		await page.setViewportSize({ width: vp.width, height: vp.height });
		for (const route of ROUTES) {
			await gotoRendered(page, route);
			check(`${vp.name} ${route}`, await page.evaluate(measure), !!vp.foldable);
			const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '-').slice(1, 30);
			await page.screenshot({ path: join(OUT, `${vp.name}--${slug}.png`) });
		}
	}

	// ── Fold walk: the Duo resizes continuously; data-foldable stays put ─────
	// The simulator produced closed → open → partially open → closed; partially
	// open is the same 951×669 as open. Then the two UNMEASURED poses, then closed.
	// Walked twice: on /brews, and on the brew form, where the split has to
	// appear and go again with the width alone — nothing may cache a pose.
	for (const walkRoute of ['/brews', SPLIT_ROUTE]) {
		console.log(`── fold walk on ${walkRoute} (no reloads)`);
		const page = contexts[true];
		await page.setViewportSize({ width: 466, height: 678 });
		await gotoRendered(page, walkRoute);
		await page.evaluate(() => window.scrollTo(0, 300));
		for (const [w, h, label] of [
			[466, 678, 'closed'],
			[951, 669, 'open'],
			[669, 951, 'open turned'],
			[334, 951, 'split view'],
			[466, 678, 'closed again']
		]) {
			await page.setViewportSize({ width: w, height: h });
			await page.waitForTimeout(300);
			const m = await page.evaluate(measure);
			check(`fold→${label} ${w}×${h}`, m, true);
			console.log(
				`   ${label.padEnd(13)} column=${m.colWidth}px overflow=${m.docOverflow}` +
					(m.split ? ` pane=${m.split.asideShown ? 'shown' : 'hidden'}` : '')
			);
			const tag = walkRoute === '/brews' ? '' : 'form-';
			await page.screenshot({
				path: join(OUT, `fold-${tag}${label.replace(/\s+/g, '-')}.png`)
			});
		}
	}

	// ── A history sheet opened folded must not survive unfolding ────────────
	// The sheet and the pane show the same thing. Opened on the outer display
	// and left up, the sheet would sit across the fold over a dimmed pane, so
	// the page closes it when the pane appears — and the scroll lock has to go
	// with it, or the form is stuck. Folding again must not bring it back.
	{
		console.log('── history sheet across a fold');
		const where = 'history sheet, opened folded then unfolded';
		const page = contexts[true];
		await page.setViewportSize({ width: 466, height: 678 });
		await gotoRendered(page, SPLIT_ROUTE);
		await page.getByRole('button', { name: 'History' }).click();
		const sheet = page.locator('[role="dialog"]');
		await sheet.waitFor({ state: 'visible', timeout: 3000 });
		await page.setViewportSize({ width: 951, height: 669 });
		const closed = await sheet.waitFor({ state: 'detached', timeout: 3000 }).then(
			() => true,
			() => false
		);
		if (!closed) {
			fail(where, 'the sheet is still up, over the pane that shows the same history');
			await page.keyboard.press('Escape');
			await sheet.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
		}
		const after = await page.evaluate(() => ({
			locked: document.body.style.overflow === 'hidden',
			pane: getComputedStyle(document.querySelector('.split-aside')).display !== 'none'
		}));
		if (!after.pane) fail(where, 'no history pane after unfolding');
		if (after.locked) fail(where, 'the page is still scroll-locked after the sheet closed');
		await page.setViewportSize({ width: 466, height: 678 });
		await page.waitForTimeout(400);
		const back = await sheet.count();
		if (back) fail(where, 'the sheet came back on folding again');
		console.log(
			`   sheet ${closed ? 'closed' : 'STILL UP'} on unfolding, pane ${after.pane ? 'shown' : 'missing'}, scroll ${after.locked ? 'LOCKED' : 'free'}, folded again: ${back ? 'sheet back' : 'no sheet'}`
		);
	}

	// ── Input floor at the smallest Dynamic Type size ───────────────────────
	// On iOS, :root takes `font: -apple-system-body`, so 1rem IS the Dynamic Type
	// size — 14px at xSmall. Chromium has no such font, so 1rem stays 16px and an
	// unfloored field could never show as too small. Pin the root at 14px to
	// stand in for xSmall: a size-less field the floor misses then drops to 14px
	// (iOS focus-zooms below 16). The floor's own band stops at 600px, so the
	// Duo's inner poses (669, 951) are covered ONLY by its data-foldable rule.
	console.log('── input floor at xSmall Dynamic Type (root 14px)');
	{
		const page = contexts[true];
		for (const [w, h] of [
			[951, 669],
			[669, 951],
			[466, 678]
		]) {
			await page.setViewportSize({ width: w, height: h });
			for (const route of ['/brews/new', `/brews/${BREW1}/edit`, '/bags/new']) {
				await gotoRendered(page, route);
				await page.addStyleTag({ content: ':root { font-size: 14px !important; }' });
				await page.waitForTimeout(200);
				const m = await page.evaluate(measure);
				if (m.minField == null) fail(`xsmall ${w}×${h} ${route}`, 'no visible form fields');
				else if (m.minField < 16)
					fail(`xsmall ${w}×${h} ${route}`, `a form field is ${m.minField}px at xSmall`);
				else console.log(`   ${w}×${h} ${route.padEnd(48)} min field ${m.minField}px`);
			}
		}
	}

	// ── Safe-area insets: env() rewritten in what the server sends ───────────
	console.log('── safe-area insets (env() rewritten in served CSS + JS)');
	const INSET_CASES = [
		// measured, closed: the status column down the right edge
		{
			name: 'duo-outer',
			w: 466,
			h: 678,
			foldable: true,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		// measured, closed: the status area at the top instead
		{
			name: 'duo-outer-top',
			w: 466,
			h: 678,
			foldable: true,
			inset: { top: 82, right: 0, bottom: 34, left: 0 }
		},
		// measured, open: fills via data-foldable, inside the right inset
		{
			name: 'duo-inner',
			w: 951,
			h: 669,
			foldable: true,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		// the split's floor, with the Duo's measured insets: the narrowest width at
		// which the form still has its 334pt beside the status column…
		{
			name: 'duo-split-floor',
			w: 860,
			h: 669,
			foldable: true,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		// …and one point under it, where there is one column and the sheet again
		{
			name: 'duo-under-floor',
			w: 859,
			h: 669,
			foldable: true,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		// control: the same inset with no hinge still centres, inside the inset
		{
			name: 'wide-no-hinge',
			w: 951,
			h: 669,
			foldable: false,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		// simulated: an inset on the LEFT must not be mirrored to the right
		{
			name: 'duo-split-asym',
			w: 334,
			h: 951,
			foldable: true,
			inset: { top: 48, right: 0, bottom: 21, left: 24 }
		}
	];
	for (const c of INSET_CASES) {
		insets = c.inset;
		const page = contexts[c.foldable];
		await page.setViewportSize({ width: c.w, height: c.h });
		for (const route of ['/brews', `/brews/${BREW1}`]) {
			await gotoRendered(page, route);
			check(`inset ${c.name} ${route}`, await page.evaluate(measure), c.foldable, c.inset);
		}
		// The confirm sheet is fixed to the viewport, so the body padding never
		// reaches it — it must add each inset to its own 12px gutter.
		await page
			.getByRole('button', { name: /delete/i })
			.first()
			.click();
		const dlg = page.locator('[role="alertdialog"]');
		await dlg.waitFor({ state: 'visible', timeout: 3000 });
		await page.waitForTimeout(300);
		const r = await dlg.boundingBox();
		const gapL = r.x;
		const gapR = c.w - (r.x + r.width);
		const gapB = c.h - (r.y + r.height);
		if (Math.abs(gapL - (12 + c.inset.left)) > 0.5)
			fail(`inset ${c.name} sheet`, `left gap ${gapL}, want ${12 + c.inset.left}`);
		if (Math.abs(gapR - (12 + c.inset.right)) > 0.5)
			fail(`inset ${c.name} sheet`, `right gap ${gapR}, want ${12 + c.inset.right}`);
		if (gapB < 12 + c.inset.bottom - 0.5)
			fail(`inset ${c.name} sheet`, `bottom gap ${gapB}, want ≥ ${12 + c.inset.bottom}`);
		await page.screenshot({ path: join(OUT, `inset-${c.name}--sheet.png`) });
		await page.keyboard.press('Escape');
		await dlg.waitFor({ state: 'detached', timeout: 3000 });
		console.log(`   ${c.name.padEnd(15)} sheet gaps L${gapL} R${gapR} B${Math.round(gapB)}`);

		await gotoRendered(page, SPLIT_ROUTE);
		if (c.foldable && c.w >= SPLIT_MIN) {
			// Unfolded Duo: no sheet — the history is the pane left of the fold, and
			// the form, right of it, is the one that pays the 84pt status column.
			// Measured at the top and again with the form scrolled, where the pane
			// must not have moved.
			check(`inset ${c.name} split`, await page.evaluate(measure), true, c.inset);
			// The picture of the layout as it is used; the "tall" one below is a stress case.
			await page.screenshot({ path: join(OUT, `inset-${c.name}--split.png`) });
			await page.evaluate(() => window.scrollTo(0, 400));
			await page.waitForTimeout(200);
			const scrolled = await page.evaluate(measure);
			if (scrolled.scrollY < 100) fail(`inset ${c.name} split`, 'form did not scroll');
			check(`inset ${c.name} split, scrolled`, scrolled, true, c.inset);
			// A history taller than the display scrolls inside the pane.
			await page.addStyleTag({ content: '.split-aside ol { min-height: 1400px; }' });
			await page.waitForTimeout(200);
			const tall = await page.evaluate(measure);
			check(`inset ${c.name} split, tall`, tall, true, c.inset);
			if (!tall.split?.asideScrolls)
				fail(`inset ${c.name} split, tall`, 'a tall history does not scroll inside the pane');
			if (Math.abs(tall.split.aside.bottom - (c.h - c.inset.bottom)) > 0.5)
				fail(
					`inset ${c.name} split, tall`,
					`pane bottom ${tall.split.aside.bottom}, want ${c.h - c.inset.bottom} when full`
				);
			await page.screenshot({ path: join(OUT, `inset-${c.name}--split-tall.png`) });
			const a = tall.split.aside;
			console.log(
				`   ${c.name.padEnd(15)} split: pane ${a.left}–${a.right}, form ${tall.split.mainLeft}–${tall.split.mainRight}, pane pinned at ${a.top}, bottom ${a.bottom}`
			);
		} else {
			// The brew form's history sheet is the other fixed overlay, with the same
			// 12px gutter plus each inset. It differs in two ways: it is capped to the
			// page column and centred (so on a wide display its side gaps are equal,
			// not 12), and its body scrolls — so its height must stop short of the top
			// inset. The injected min-height makes the content tall enough to bind.
			// First the form itself: one column, no pane, and the History button
			// back — measured, so a split that shows up under its floor is a named
			// failure here and not a click that times out on a hidden button.
			const form = await page.evaluate(measure);
			check(`inset ${c.name} form`, form, c.foldable, c.inset);
			if (form.split?.historyButton !== 'visible') {
				if (form.split?.historyButton == null)
					fail(`inset ${c.name} form`, 'no History button on the brew form with a bag picked');
				continue;
			}
			await page.getByRole('button', { name: 'History' }).click();
			const hist = page.locator('[role="dialog"]');
			await hist.waitFor({ state: 'visible', timeout: 3000 });
			await page.addStyleTag({ content: '[role="dialog"] ol { min-height: 1400px; }' });
			await page.waitForTimeout(300);
			const h = await hist.boundingBox();
			const hL = h.x - c.inset.left;
			const hR = c.w - (h.x + h.width) - c.inset.right;
			const hB = c.h - (h.y + h.height) - c.inset.bottom;
			const hT = h.y - c.inset.top;
			const capped = h.width > 648 - 0.5;
			if (capped ? Math.abs(hL - hR) > 1 || hL < 11.5 : Math.abs(hL - 12) > 0.5)
				fail(
					`inset ${c.name} history`,
					`left gap ${hL} inside the inset, want ${capped ? 'centred' : 12}`
				);
			if (!capped && Math.abs(hR - 12) > 0.5)
				fail(`inset ${c.name} history`, `right gap ${hR} inside the inset, want 12`);
			if (Math.abs(hB - 12) > 0.5)
				fail(`inset ${c.name} history`, `bottom gap ${hB} inside the inset, want 12`);
			if (Math.abs(hT - 56) > 0.5)
				fail(`inset ${c.name} history`, `top gap ${hT} below the inset, want 56 when full`);
			await page.screenshot({ path: join(OUT, `inset-${c.name}--history.png`) });
			await page.keyboard.press('Escape');
			await hist.waitFor({ state: 'detached', timeout: 3000 });
			console.log(
				`   ${c.name.padEnd(15)} history gaps inside the insets L${hL} R${hR} B${hB} T${hT}` +
					(capped ? ' (capped, centred)' : '')
			);
		}
	}
	// ── Arrival animation: fixed chrome must not move with the page ──────────
	// A screen change eases the new page in from the side ($lib/navMotion). The
	// page wrapper is as tall as the document, so if that motion is ever written
	// as a transform (or anything else that makes the wrapper a containing block)
	// every position:fixed element inside it — the + buttons, the edit bar, a
	// sheet — jumps to the PAGE's edges for the length of the animation, and with
	// insets it double-counts them. So: navigate in-app, freeze the animation
	// 60ms in, and require each fixed element to be exactly where it ends up.
	// Also: the page arrives from the right going deeper and from the left going
	// back up — by link as well as by history, since the app's own back controls
	// are links — and it cannot be dragged sideways while it is 24px off-screen.
	console.log('── arrival animation (frozen mid-flight)');
	const freezeArrival = () => {
		const animate = Element.prototype.animate;
		window.__nav = [];
		Element.prototype.animate = function (...args) {
			const a = animate.apply(this, args);
			if (this.matches?.('[data-nav-stage]')) {
				a.pause();
				a.currentTime = 60;
				window.__nav.push(a);
			}
			return a;
		};
	};
	const snapArrival = () => {
		const stage = document.querySelector('[data-nav-stage]');
		const box = (el) => {
			const r = el.getBoundingClientRect();
			return [r.left, r.top, r.right, r.bottom].map((n) => Math.round(n * 10) / 10);
		};
		return {
			frozen: window.__nav.length,
			stageLeft: stage.getBoundingClientRect().left,
			fixed: [...stage.querySelectorAll('*')]
				.filter((el) => getComputedStyle(el).position === 'fixed')
				.map((el) => ({
					what: el.getAttribute('aria-label') ?? el.className.toString().slice(0, 24),
					box: box(el)
				}))
		};
	};
	const ARRIVAL_CASES = [
		{
			name: 'phone',
			w: 393,
			h: 852,
			foldable: false,
			inset: { top: 0, right: 0, bottom: 0, left: 0 }
		},
		{
			name: 'duo-outer',
			w: 466,
			h: 678,
			foldable: true,
			inset: { top: 0, right: 84, bottom: 34, left: 0 }
		},
		{
			name: 'duo-outer-top',
			w: 466,
			h: 678,
			foldable: true,
			inset: { top: 82, right: 0, bottom: 34, left: 0 }
		}
	];
	for (const c of ARRIVAL_CASES) {
		insets = c.inset;
		const page = contexts[c.foldable];
		await page.setViewportSize({ width: c.w, height: c.h });
		const arrive = async (label, act, wantDir, wantFixed) => {
			const where = `arrival ${c.name} ${label}`;
			await page.evaluate(() => (window.__nav = []));
			await act();
			await page
				.waitForFunction(() => window.__nav.length > 0, null, { timeout: 5000 })
				.catch(() => {});
			await page.waitForTimeout(200); // IndexedDB answers and the list renders
			const mid = await page.evaluate(snapArrival);
			if (!mid.frozen) return fail(where, 'the arrival animation did not run');
			await page.mouse.move(120, 300);
			await page.mouse.wheel(60, 0);
			await page.waitForTimeout(150);
			const draggedTo = await page.evaluate(() => window.scrollX);
			await page.evaluate(() => window.__nav.forEach((a) => a.finish()));
			await page.waitForTimeout(100);
			const end = await page.evaluate(snapArrival);
			const travel = mid.stageLeft - end.stageLeft;
			if (wantDir === 'forward' ? !(travel > 1) : !(travel < -1))
				fail(
					where,
					`page is ${travel.toFixed(1)}px from rest mid-flight, want it coming ${wantDir}`
				);
			if (draggedTo !== 0) fail(where, `the page scrolled sideways to ${draggedTo} while arriving`);
			if (end.fixed.length < wantFixed)
				fail(
					where,
					`found ${end.fixed.length} fixed element(s), expected ${wantFixed} — nothing to check`
				);
			if (mid.fixed.length !== end.fixed.length)
				fail(
					where,
					`fixed elements changed mid-flight (${mid.fixed.length} → ${end.fixed.length})`
				);
			else
				mid.fixed.forEach((f, i) => {
					const moved = f.box.some((n, k) => Math.abs(n - end.fixed[i].box[k]) > 0.5);
					if (moved)
						fail(
							where,
							`"${f.what}" is at [${f.box}] mid-flight but rests at [${end.fixed[i].box}]`
						);
				});
			console.log(
				`   ${c.name.padEnd(14)} ${label.padEnd(22)} ${travel > 0 ? '+' : ''}${travel.toFixed(1)}px mid-flight, ` +
					`${end.fixed.length} fixed element(s) still`
			);
		};
		await gotoRendered(page, '/');
		await page.evaluate(freezeArrival);
		await arrive('home → brews', () => page.click('a[href$="/brews"]'), 'forward', 1);
		// "‹ Home" is a plain link — the only kind of back the native shell has.
		await arrive('brews → home (link)', () => page.click('.header a'), 'back', 0);
		await arrive('home → bags', () => page.click('a[href$="/bags"]'), 'forward', 1);
		await arrive('bags → home (history)', () => page.goBack(), 'back', 0);
		await gotoRendered(page, `/brews/${BREW1}`);
		await page.evaluate(freezeArrival);
		await arrive(
			'detail → edit',
			() => page.click(`a[href$="/brews/${BREW1}/edit"]`),
			'forward',
			1
		);
	}
	insets = { top: 0, right: 0, bottom: 0, left: 0 };

	// Reset seeded state (house rule).
	for (const page of Object.values(contexts)) {
		await page.evaluate(async () => {
			const db = await new Promise((res) => {
				const req = indexedDB.open('CoffeeBrewLog');
				req.onsuccess = () => res(req.result);
			});
			await new Promise((res) => {
				const tx = db.transaction(['bags', 'brews'], 'readwrite');
				tx.objectStore('bags').clear();
				tx.objectStore('brews').clear();
				tx.oncomplete = () => res();
			});
			db.close();
			localStorage.clear();
		});
	}
} finally {
	await browser.close();
	server.close();
}

console.log(`\nscreenshots: ${OUT}`);
if (failures.length) {
	console.log(`\n${failures.length} failure(s)`);
	process.exit(1);
}
console.log('duo layout: all green');
