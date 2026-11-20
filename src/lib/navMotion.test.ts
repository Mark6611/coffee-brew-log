import { describe, it, expect } from 'vitest';
import {
	NAV_TRAVEL,
	navDirection,
	navMotion,
	shouldAnimateNav,
	wantsLightHaptic
} from '$lib/navMotion';

describe('navDirection', () => {
	const ID = '/brews/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

	// No screen in this app calls history.back(): "‹ Brews", Cancel and the
	// return after a save are links and goto()s, so the route tree decides.
	it('goes back when a link or goto() leads up the route tree', () => {
		expect(navDirection('link', undefined, '/brews', '/')).toBe('back');
		expect(navDirection('link', undefined, ID, '/brews')).toBe('back');
		expect(navDirection('link', undefined, `${ID}/edit`, ID)).toBe('back'); // Cancel
		expect(navDirection('goto', undefined, `${ID}/edit`, ID)).toBe('back'); // saved
		expect(navDirection('goto', undefined, ID, '/brews')).toBe('back'); // deleted
		expect(navDirection('link', undefined, '/brews/new', '/')).toBe('back');
	});

	it('goes forward when it leads deeper, or sideways', () => {
		expect(navDirection('link', undefined, '/', '/brews')).toBe('forward');
		expect(navDirection('link', undefined, '/brews', ID)).toBe('forward');
		expect(navDirection('link', undefined, ID, `${ID}/edit`)).toBe('forward');
		expect(navDirection('goto', undefined, '/', '/brews/new')).toBe('forward');
		expect(navDirection('goto', undefined, '/brews/new', '/bags/new')).toBe('forward');
		expect(navDirection('goto', undefined, '/brews/new', ID)).toBe('forward');
	});

	// "Up" means an ancestor, not merely a shorter path.
	it('treats a shallower screen in another branch as onward, not up', () => {
		const BAG = '/bags/11111111-1111-4111-8111-111111111111';
		expect(navDirection('link', undefined, BAG, '/brews')).toBe('forward'); // "See all →"
		expect(navDirection('link', undefined, BAG, '/bags')).toBe('back');
		expect(navDirection('link', undefined, ID, BAG)).toBe('forward');
	});

	// The new-bag form is opened from the middle of a brew form and returns there.
	it('enters the new-bag form forward and leaves it back, wherever it was opened from', () => {
		expect(navDirection('goto', undefined, `${ID}/edit`, '/bags/new')).toBe('forward'); // shallower
		expect(navDirection('link', undefined, '/bags', '/bags/new')).toBe('forward');
		expect(navDirection('link', undefined, '/bags/new', '/brews/new')).toBe('back'); // Cancel
		expect(navDirection('goto', undefined, '/bags/new', '/brews/new')).toBe('back'); // saved
		expect(navDirection('goto', undefined, '/bags/new', `${ID}/edit`)).toBe('back'); // deeper
		expect(navDirection('link', undefined, '/bags/new', '/bags')).toBe('back');
	});

	// Privacy sits at the top level but hangs off Settings.
	it('goes back from Privacy to Settings, and on up to home', () => {
		expect(navDirection('link', undefined, '/settings', '/privacy')).toBe('forward');
		expect(navDirection('link', undefined, '/privacy', '/settings')).toBe('back');
		expect(navDirection('link', undefined, '/privacy', '/')).toBe('back');
		expect(navDirection('link', undefined, '/settings', '/')).toBe('back');
	});

	it('ignores a trailing slash and copes with an unknown origin', () => {
		expect(navDirection('link', undefined, '/brews/', '/')).toBe('back');
		expect(navDirection('link', undefined, '/bags/new/', '/brews/new/')).toBe('back');
		expect(navDirection('link', undefined, null, '/brews')).toBe('forward');
		expect(navDirection('link', undefined, '/brews', null)).toBe('forward');
	});

	it('lets a real history step keep the direction it took', () => {
		expect(navDirection('popstate', -1, '/brews', ID)).toBe('back'); // deeper, but back
		expect(navDirection('popstate', -3, ID, '/')).toBe('back');
		expect(navDirection('popstate', 1, ID, '/brews')).toBe('forward'); // shallower, but forward
		expect(navDirection('popstate', undefined, ID, '/brews')).toBe('forward');
	});
});

describe('shouldAnimateNav', () => {
	it('moves between screens, not within one, and not when leaving', () => {
		expect(shouldAnimateNav('/', '/brews')).toBe(true);
		expect(shouldAnimateNav('/brews/a', '/brews/b')).toBe(true);
		expect(shouldAnimateNav(null, '/')).toBe(true);
		expect(shouldAnimateNav('/brews/new', '/brews/new')).toBe(false);
		expect(shouldAnimateNav('/', null)).toBe(false);
	});
});

describe('navMotion', () => {
	it('comes in from the right going forward and from the left going back', () => {
		expect(navMotion('forward', false)?.keyframes[0]).toEqual({
			opacity: 0,
			left: `${NAV_TRAVEL}px`
		});
		expect(navMotion('back', false)?.keyframes[0]).toEqual({
			opacity: 0,
			left: `-${NAV_TRAVEL}px`
		});
		expect(navMotion('forward', false)?.keyframes[1]).toEqual({ opacity: 1, left: '0px' });
	});

	it('does nothing at all with Reduce Motion on', () => {
		expect(navMotion('forward', true)).toBeNull();
		expect(navMotion('back', true)).toBeNull();
	});

	// A transform on the page wrapper makes it the containing block for the
	// position:fixed + buttons, edit bar and sheets inside it — they jump to the
	// page's edges for the length of the animation. See navMotion's comment.
	it('never moves the page with a transform, and leaves nothing behind', () => {
		for (const dir of ['forward', 'back'] as const) {
			const m = navMotion(dir, false)!;
			for (const frame of m.keyframes) {
				for (const prop of ['transform', 'translate', 'scale', 'rotate', 'filter']) {
					expect(frame).not.toHaveProperty(prop);
				}
			}
			expect(m.options.fill).toBeUndefined();
		}
	});
});

describe('wantsLightHaptic', () => {
	const control = (attrs: Record<string, string> = {}, disabled = false) => ({
		disabled,
		getAttribute: (name: string) => attrs[name] ?? null
	});
	const tapOn = (found: unknown) => ({ closest: () => found }) as unknown as EventTarget;

	it('ticks for a switch, a segment or a chip', () => {
		expect(wantsLightHaptic(tapOn(control({ 'aria-pressed': 'false' })))).toBe(true);
		expect(wantsLightHaptic(tapOn(control({ role: 'switch', 'aria-checked': 'true' })))).toBe(true);
	});

	it('stays quiet for anything else', () => {
		expect(wantsLightHaptic(tapOn(null))).toBe(false);
	});

	it('stays quiet on a read-only scale and on a disabled control', () => {
		expect(
			wantsLightHaptic(tapOn(control({ 'aria-pressed': 'true', 'aria-hidden': 'true' })))
		).toBe(false);
		expect(wantsLightHaptic(tapOn(control({ 'aria-pressed': 'false' }, true)))).toBe(false);
	});

	it('ignores targets that are not elements', () => {
		expect(wantsLightHaptic(null)).toBe(false);
		expect(wantsLightHaptic({} as EventTarget)).toBe(false);
	});
});
