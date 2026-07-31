import { prefersReducedMotion } from 'svelte/motion';

// Svelte drives `transition:`/`in:`/`out:` through the Web Animations API
// (element.animate()), NOT through CSS transitions — so the
// `@media (prefers-reduced-motion: reduce)` block in layout.css cannot reach
// them. Every JS-driven transition has to consult the setting itself.
//
// Exported as a FUNCTION, and this file is .svelte.ts, deliberately: reading
// `prefersReducedMotion.current` into a module-level const would snapshot the
// value once at import time and never update when the user changes the setting.
//
// Callers zero the duration AND the travel/stagger (`y`, `delay`) — a zero
// duration with a non-zero offset still teleports the element. duration: 0 is
// safe: Svelte skips its `duration > 0` branch entirely, so nothing is left
// mid-animation. SSR-safe too — the server build reports false.
export const rm = () => prefersReducedMotion.current;

/** Motion params collapsed to nothing when the user asks for reduced motion. */
export function motion<T extends Record<string, number>>(params: T): T | { duration: 0 } {
	return rm() ? { duration: 0 } : params;
}
