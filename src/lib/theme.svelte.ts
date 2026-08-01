// Theme preference store. Extracted from +layout.svelte's component-local
// state so Settings can own a Light/Dark/System segmented control and the
// floating toggle could be deleted.
//
// Two traps this extraction has to respect:
// - The matchMedia listener must live HERE, reading store state — in the layout
//   it closed over component-local `theme`, so extracting naively would leave
//   System mode deaf to OS changes.
// - localStorage must be read in the module initializer, not onMount, or the
//   Settings segmented control renders the wrong segment for one tick.

import { setupNativeChrome } from '$lib/native';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'theme';
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;

let pref = $state<ThemePref>(stored === 'light' || stored === 'dark' ? stored : 'system');

function systemDark(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function effective(): 'light' | 'dark' {
	return pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref;
}

function apply() {
	const eff = effective();
	document.documentElement.dataset.theme = eff;
	// Keep the native status bar's text color in step with the theme.
	void setupNativeChrome(eff);
}

export const theme = {
	get pref() {
		return pref;
	},
	set(p: ThemePref) {
		pref = p;
		if (p === 'system') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, p);
		apply();
	},
	get effective() {
		return effective();
	},
	/** Call once from the root layout's onMount. */
	init() {
		apply();
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			if (pref === 'system') apply();
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}
};
