// What window.confirm and <dialog> give for free, and an in-page sheet has to
// provide itself or it is a downgrade wearing better clothes. Shared by
// ConfirmSheet and Sheet. Both return their own undo, so each fits an $effect.

/** Stop the document scrolling behind a presented sheet. */
export function lockScroll(): () => void {
	const prev = document.body.style.overflow;
	document.body.style.overflow = 'hidden';
	return () => {
		document.body.style.overflow = prev;
	};
}

/** Focus `el`, keep Tab inside it, and run `onEscape` when Escape is pressed. */
export function trapFocus(el: HTMLElement, onEscape: () => void): () => void {
	el.focus();
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onEscape();
			return;
		}
		if (e.key !== 'Tab') return;
		const focusables = el.querySelectorAll<HTMLElement>(
			'button, [href], [tabindex]:not([tabindex="-1"])'
		);
		if (!focusables.length) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement;
		// `active === el` is the guaranteed initial state (el.focus() above;
		// the container's tabindex="-1" excludes it from the query). Without
		// these branches a first Shift+Tab walks backwards OUT of the modal
		// into the page behind the scrim, killing the trap and Escape with it.
		if (e.shiftKey && (active === first || active === el)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || active === el)) {
			e.preventDefault();
			first.focus();
		}
	}
	el.addEventListener('keydown', onKey);
	return () => el.removeEventListener('keydown', onKey);
}
