import type { HandleClientError } from '@sveltejs/kit';

// Central client-side error handler. Runs when an unexpected error is thrown
// during a load() or a component render. Without it such a throw reached the
// console and nothing else — the user got SvelteKit's bare fallback page with
// no way back, and no record of what happened.
//
// Returns the shape +error.svelte reads as `page.error`. Deliberately minimal:
// no third-party reporting, since this app collects nothing and sends nothing
// anywhere. A future build can wire one in here without touching components.
export const handleError: HandleClientError = ({ error, event }) => {
	console.error('[client error]', event?.url?.pathname ?? '', error);
	return {
		message: error instanceof Error ? error.message : 'An unexpected error occurred.'
	};
};
