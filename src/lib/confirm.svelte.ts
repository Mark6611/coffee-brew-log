// Promise-based confirm store: call `confirmSheet({...})` from any handler and
// await the boolean, exactly like window.confirm — so call sites keep their
// shape. A singleton <ConfirmSheet /> in +layout.svelte renders the pending
// request. Replaces window.confirm ONLY at the destructive sites + the
// discard-changes sites; reversible confirms (archive, import) stay native.

export interface ConfirmRequest {
	title: string;
	body: string;
	/** The destructive verb ("Delete Brew", "Erase Everything") — never "OK". */
	verb: string;
	destructive?: boolean;
	cancelLabel?: string;
}

interface Pending extends ConfirmRequest {
	resolve: (ok: boolean) => void;
	/** The control that opened the sheet — focus returns here on settle. */
	invoker: HTMLElement | null;
	/** Present timestamp; the scrim ignores clicks in its first ~250ms so a
	 *  double-tap on the trigger can't fall through and self-cancel. */
	openedAt: number;
}

let pending = $state<Pending | null>(null);

export const confirmStore = {
	get pending() {
		return pending;
	},
	settle(ok: boolean) {
		if (!pending) return;
		const { resolve, invoker } = pending;
		pending = null;
		resolve(ok);
		// window.confirm restored focus to the invoker for free; the sheet has
		// to do it itself. Skip when the settle came from navigation and the
		// invoking page is gone.
		if (invoker?.isConnected) invoker.focus();
	}
};

export function confirmSheet(req: ConfirmRequest): Promise<boolean> {
	const invoker = document.activeElement as HTMLElement | null;
	// An in-page sheet renders BEHIND the iOS keyboard (unlike UIAlertController),
	// so drop the keyboard before presenting.
	invoker?.blur?.();
	// A superseded request must settle, not strand: its awaiting handler takes
	// the cancel path and restores any guard flags it set before the await.
	pending?.resolve(false);
	return new Promise<boolean>((resolve) => {
		pending = {
			destructive: true,
			cancelLabel: 'Cancel',
			...req,
			resolve,
			invoker,
			openedAt: performance.now()
		};
	});
}
