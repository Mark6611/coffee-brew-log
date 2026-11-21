<script lang="ts">
	import { onMount } from 'svelte';
	import type { Bag, Brew } from '$lib/db/types';
	import { listBags, listBrews } from '$lib/db/repository';
	import {
		bagConsumption,
		bagsByRecentUse,
		daysSinceRoast,
		freshnessTone,
		freshnessLabel
	} from '$lib/bags/compute';
	import { rm } from '$lib/motion.svelte';
	import { resolveOrigins, originLabel } from '$lib/origin/resolve';
	import ProcessBadge from './ProcessBadge.svelte';
	import OriginFlags from './OriginFlags.svelte';

	let {
		bagId = $bindable<string | undefined>(undefined),
		onselect,
		oncreatenew
	}: {
		bagId?: string;
		onselect?: (bag: Bag | null) => void;
		oncreatenew?: (queryName: string) => void;
	} = $props();

	let allBags = $state<Bag[]>([]);
	let allBrews = $state<Brew[]>([]);
	let query = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();
	let fieldEl: HTMLDivElement | undefined = $state();
	let listboxEl: HTMLDivElement | undefined = $state();
	let listEl: HTMLDivElement | undefined = $state();

	onMount(async () => {
		[allBags, allBrews] = await Promise.all([listBags(), listBrews()]);
	});

	const selectedBag = $derived(allBags.find((b) => b.id === bagId));

	// Every bag still in use, the one last brewed from on top: the bag in the
	// grinder is the likely pick, and it is rarely the newest one added.
	const activeBags = $derived(
		bagsByRecentUse(
			allBags.filter((b) => !b.archived),
			allBrews
		)
	);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return activeBags;
		return activeBags.filter(
			(b) => b.name.toLowerCase().includes(q) || (b.roaster?.toLowerCase().includes(q) ?? false)
		);
	});

	const hasQuery = $derived(query.length > 0);
	const totalRows = $derived(filtered.length + 1);

	// Reset the keyboard highlight whenever the query changes or the dropdown reopens.
	// Hovering sets highlightedIndex (even onto the "create new" row); if the query then
	// shrinks the list, that stale index made Enter fire createNew() — tearing down the
	// brew form mid-entry — instead of selecting the match the user could see.
	$effect(() => {
		void query;
		void isOpen;
		highlightedIndex = 0;
	});

	// ── Fitting the list ────────────────────────────────────────────────────
	// The list opens under the field, and on a phone so does the keyboard. Its
	// height is what the VISIBLE viewport has left below the field — the visual
	// viewport is the one a keyboard shrinks, and no CSS unit follows it — up to
	// four and a half rows (the half row is what says it scrolls). When that is
	// short the page moves up until the field sits under its label at the top:
	// the last bag and "Add a new bag" are never left under the keyboard.
	const ROWS_SHOWN = 4.5;
	const LABEL_ABOVE = 36; // the COFFEE eyebrow stays in sight above the field
	const CLEAR = 8;
	let listMax = $state<number | null>(null);
	// A new brew is a short page, and a page cannot scroll past its own end.
	// While the list is open this lends it the length the move below needs; it
	// must outlive the list by the length of the scroll back (the effect below).
	let roomEl: HTMLDivElement | undefined = $state();
	let keepRoom: (() => void) | undefined; // calls off a hand-back still pending

	// `move` — may the page be moved to make room? Yes when the list opens, the
	// keyboard changes or the rows do: a search deleted wants its rows back
	// wherever the page has drifted since. Never in answer to a scroll, which is
	// the page being moved by a finger (or by the keyboard arriving).
	function fit(move: boolean) {
		const field = fieldEl;
		const box = listboxEl;
		const list = listEl;
		if (!field || !box || !list) return;
		// Everything in PAGE coordinates. Client rects are no common ground: under
		// a keyboard, WebKit on iOS measures them from the visual viewport AND
		// reports that viewport as offset from the layout one, where Chromium
		// measures from the layout viewport. Add offsetTop to a rect and iOS has
		// counted the scroll twice — it found 300pt of room where there were 64.
		// (Measured in Safari on iOS 26.5.) Both engines agree that a rect plus
		// scrollY is a place on the page, and that pageTop is where the visible
		// part of it starts.
		const vv = window.visualViewport;
		const scrollY = window.scrollY;
		const visibleTop = vv?.pageTop ?? scrollY;
		const visibleHeight = vv?.height ?? window.innerHeight;
		const keyboardUp = visibleHeight < window.innerHeight - 1;
		// body pads each side by its safe-area inset (layout.css); under a
		// keyboard the bottom one is already covered.
		const pad = getComputedStyle(document.body);
		const insetTop = parseFloat(pad.paddingTop) || 0;
		const insetBottom = keyboardUp ? 0 : parseFloat(pad.paddingBottom) || 0;

		const at = field.getBoundingClientRect();
		const row = (list.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
		const content = list.scrollHeight;
		const want = Math.min(content, row * ROWS_SHOWN);
		// everything in the box that is not the list: heading, the add row, hints
		const chrome = box.offsetHeight - list.offsetHeight;
		const gap = box.getBoundingClientRect().top - at.bottom;
		let room =
			visibleTop + visibleHeight - insetBottom - CLEAR - (at.bottom + scrollY) - gap - chrome;

		if (move && room < want) {
			const rise = at.top + scrollY - (visibleTop + insetTop + LABEL_ABOVE);
			const by = Math.min(want - room, rise);
			if (by > 0.5) {
				// The page must reach a full screen below where it will come to rest.
				const reach = by + window.innerHeight - at.bottom;
				if (roomEl && reach > roomEl.offsetHeight) roomEl.style.height = `${reach}px`;
				// To a place, not by an amount: the keyboard can land while an
				// earlier move is still under way, and a relative scroll is added
				// to wherever the engine was heading, not to here.
				window.scrollTo({ top: scrollY + by, behavior: rm() ? 'auto' : 'smooth' });
				room += by;
			}
		}
		// Never less than a row, however little is left: a list of nothing
		// cannot be scrolled to the bag that is wanted.
		listMax = Math.max(Math.min(content, row), Math.min(want, room));
	}

	$effect(() => {
		if (!isOpen) return;
		keepRoom?.();
		const viewport: EventTarget = window.visualViewport ?? window;
		let timer: ReturnType<typeof setTimeout> | undefined;
		// A scroll is the page still moving — ours, the keyboard's, or a finger's.
		// Measure once it has stopped rather than resizing the list all the way.
		const settled = () => {
			clearTimeout(timer);
			timer = setTimeout(() => fit(false), 120);
		};
		const resized = () => fit(true);
		viewport.addEventListener('resize', resized);
		viewport.addEventListener('scroll', settled);
		window.addEventListener('scroll', settled, { passive: true });
		return () => {
			clearTimeout(timer);
			viewport.removeEventListener('resize', resized);
			viewport.removeEventListener('scroll', settled);
			window.removeEventListener('scroll', settled);
			listMax = null;
			// Hand the borrowed room back. If the page now rests past its real
			// end, walk it there first — dropping the room under it is a jump —
			// and let go when it arrives (or after a second, if a finger took
			// the page somewhere else on the way).
			const room = roomEl;
			if (!room || room.offsetHeight === 0) return;
			const end = Math.max(
				0,
				document.body.getBoundingClientRect().bottom + window.scrollY - window.innerHeight
			);
			if (window.scrollY <= end + 1 || rm()) {
				room.style.height = '';
				return;
			}
			const handBack = () => {
				keepRoom?.();
				room.style.height = '';
			};
			const arrived = () => {
				if (window.scrollY <= end + 1) handBack();
			};
			const wait = setTimeout(handBack, 1000);
			keepRoom = () => {
				clearTimeout(wait);
				window.removeEventListener('scroll', arrived);
				keepRoom = undefined;
			};
			window.addEventListener('scroll', arrived, { passive: true });
			window.scrollTo({ top: end, behavior: 'smooth' });
		};
	});

	// On opening, and again whenever typing changes how many rows there are.
	$effect(() => {
		void filtered.length;
		if (isOpen) fit(true);
	});

	// The highlight follows a mouse that has MOVED. Both engines also report a
	// move when the list scrolls under a pointer at rest — WebKit as a real
	// pointermove — and that took the highlight, and the Enter after it, away
	// from the arrow keys. A move to where the pointer already was is no move.
	let pointerAt = '';
	const point = (e: PointerEvent) => `${e.screenX},${e.screenY}`;
	function hover(e: PointerEvent, i: number) {
		if (e.pointerType === 'mouse' && point(e) !== pointerAt) highlightedIndex = i;
	}

	// The arrow keys can now walk past the rows in sight: bring the row along.
	// Only the list moves — scrollIntoView would move the page with it.
	function highlight(i: number) {
		highlightedIndex = i;
		const list = listEl;
		const row = list?.children[i] as HTMLElement | undefined;
		if (!list || !row) return;
		if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
		else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
			list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
	}

	function selectBag(bag: Bag) {
		bagId = bag.id;
		onselect?.(bag);
		query = '';
		isOpen = false;
		inputEl?.blur();
	}

	function clearSelection() {
		bagId = undefined;
		onselect?.(null);
		query = '';
		setTimeout(() => inputEl?.focus(), 0);
	}

	function createNew() {
		oncreatenew?.(query.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && !query && selectedBag) {
			e.preventDefault();
			clearSelection();
			return;
		}
		if (!isOpen) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (totalRows === 0) return;
			highlight((highlightedIndex + 1) % totalRows);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (totalRows === 0) return;
			highlight((highlightedIndex - 1 + totalRows) % totalRows);
		} else if (e.key === 'Enter') {
			if (totalRows === 0) return;
			e.preventDefault();
			if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
				selectBag(filtered[highlightedIndex]);
			} else {
				createNew();
			}
		} else if (e.key === 'Escape') {
			isOpen = false;
		}
	}
</script>

<div class="relative">
	{#if selectedBag}
		<!-- Selected (chip) -->
		<div
			class="flex min-h-14 items-center gap-3 rounded-input border border-transparent bg-copper-lt px-3 py-2"
		>
			<div class="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-copper text-paper">
				<svg
					width="16"
					height="16"
					viewBox="0 0 18 18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linejoin="round"
					stroke-linecap="round"
				>
					<path d="M3.2 5L4.7 3h8.6L14.8 5" />
					<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
					<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
				</svg>
			</div>
			<div class="min-w-0 flex-1">
				<div
					class="truncate font-display text-[calc(var(--dt-base)*17/17)] leading-[1.2] font-medium text-ink"
				>
					{selectedBag.name}
				</div>
				<div class="truncate text-[calc(var(--dt-base)*12/17)] text-copper-dk">
					{#if selectedBag.roaster}{selectedBag.roaster}{/if}
					{#if selectedBag.roaster && (selectedBag.process || selectedBag.roastedAt)}
						·
					{/if}
					{#if selectedBag.process}{selectedBag.process}{/if}
					{#if selectedBag.process && selectedBag.roastedAt}
						·
					{/if}
					{#if selectedBag.roastedAt}{freshnessLabel(selectedBag.roastedAt)?.toLowerCase()}{/if}
				</div>
			</div>
			<button
				type="button"
				onclick={clearSelection}
				class="press-sm grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink hover:bg-ink/[0.10]"
				aria-label="Clear selection"
			>
				<svg
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
				>
					<line x1="3" y1="3" x2="9" y2="9" />
					<line x1="3" y1="9" x2="9" y2="3" />
				</svg>
			</button>
		</div>
	{:else}
		<!-- Keeps the pointer's last position for hover(): a row hears its own
		     move first, so it compares against where the pointer was before.
		     role=presentation: it listens, it is not a control. -->
		<div
			class="relative"
			role="presentation"
			onpointerdown={(e) => (pointerAt = point(e))}
			onpointermove={(e) => (pointerAt = point(e))}
		>
			<!-- Idle / typing -->
			<div
				bind:this={fieldEl}
				class="field-wrapper flex min-h-12 items-center gap-2 rounded-input border border-hairline bg-paper px-3 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 18 18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linejoin="round"
					stroke-linecap="round"
					class={isOpen || hasQuery ? 'text-copper' : 'text-faint'}
				>
					<path d="M3.2 5L4.7 3h8.6L14.8 5" />
					<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
					<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
				</svg>
				<!-- -my-2 self-stretch py-2: the input takes the wrapper's vertical
			     padding as its own, so the whole height of the field is the input.
			     .field-wrapper strips the forms plugin's padding with its border;
			     without this the input is one line of text (21pt) in a 48pt field
			     and a tap near the top or bottom edge lands on the wrapper. -->
				<input
					bind:this={inputEl}
					bind:value={query}
					onfocus={() => (isOpen = true)}
					onblur={() => setTimeout(() => (isOpen = false), 150)}
					onkeydown={handleKeydown}
					placeholder="Search or add a coffee…"
					autocapitalize="words"
					autocorrect="off"
					spellcheck="false"
					class="-my-2 min-w-0 flex-1 self-stretch bg-transparent py-2 text-ink outline-none placeholder:text-muted"
					role="combobox"
					aria-expanded={isOpen}
					aria-controls="bag-listbox"
					aria-autocomplete="list"
				/>
				{#if hasQuery}
					<span class="font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase"
						>{filtered.length} match{filtered.length === 1 ? '' : 'es'}</span
					>
				{:else}
					<svg
						width="12"
						height="12"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-muted"
					>
						<path d="M3 4.5l3 3 3-3" />
					</svg>
				{/if}
			</div>

			{#if isOpen}
				<!-- A press anywhere in the box — the list's scrollbar, its heading —
			     must leave the caret in the field: the blur is what closes this. -->
				<div
					bind:this={listboxEl}
					id="bag-listbox"
					tabindex="-1"
					onmousedown={(e) => e.preventDefault()}
					class="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-card border border-hairline bg-surface shadow-[0_12px_32px_rgba(28,24,20,0.10)]"
					role="listbox"
				>
					{#if filtered.length > 0}
						<div
							class="px-4 pt-3 pb-1 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase"
						>
							{hasQuery
								? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
								: 'Bags · recent first'}
						</div>
					{/if}

					<!-- max-h-64 only until fit() has measured; relative so a row's
				     offsetTop is counted from the list (see highlight()). -->
					<div
						bind:this={listEl}
						class="relative max-h-64 overflow-y-auto overscroll-contain"
						style:max-height={listMax == null ? undefined : `${listMax}px`}
					>
						{#each filtered as bag, i (bag.id)}
							{@const c = bagConsumption(bag, allBrews)}
							{@const days = daysSinceRoast(bag.roastedAt)}
							{@const tone = freshnessTone(bag.roastedAt)}
							{@const oFlags = resolveOrigins(bag.origin)}
							<button
								type="button"
								onmousedown={(e) => {
									e.preventDefault();
									selectBag(bag);
								}}
								onpointermove={(e) => hover(e, i)}
								class="block w-full px-4 py-3 text-left transition-colors {highlightedIndex === i
									? 'bg-paper'
									: 'hover:bg-paper/60'} {c.remaining != null && c.remaining <= 0
									? 'opacity-50'
									: ''}"
								role="option"
								aria-selected={highlightedIndex === i}
							>
								<div class="flex items-center gap-3">
									<div
										class="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-control border border-hairline bg-paper text-muted"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 18 18"
											fill="none"
											stroke="currentColor"
											stroke-width="1.4"
											stroke-linejoin="round"
											stroke-linecap="round"
										>
											<path d="M3.2 5L4.7 3h8.6L14.8 5" />
											<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
											<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2">
											<div
												class="truncate font-display text-[calc(var(--dt-base)*16/17)] leading-[1.2] font-medium text-ink"
											>
												{bag.name}
											</div>
											{#if days != null}
												<span
													class="shrink-0 font-mono text-[calc(var(--dt-base)*12/17)] font-medium"
													style="color: {tone}">{days}d</span
												>
											{/if}
										</div>
										<div class="mt-0.5 flex items-center justify-between gap-2">
											<div
												class="flex min-w-0 items-center gap-2 text-[calc(var(--dt-base)*12.5/17)] text-muted"
											>
												{#if bag.roaster}
													<span class="truncate">{bag.roaster}</span>
												{/if}
												{#if bag.roaster && oFlags.length}
													<span>·</span>
												{/if}
												{#if oFlags.length}
													<span class="whitespace-nowrap">
														<OriginFlags origin={bag.origin} />{originLabel(bag.origin)}
													</span>
												{/if}
												{#if (bag.roaster || oFlags.length) && bag.process}
													<span>·</span>
												{/if}
												{#if bag.process}
													<ProcessBadge process={bag.process} />
												{/if}
											</div>
											{#if bag.weightGrams}
												<span
													class="shrink-0 font-mono text-[calc(var(--dt-base)*12/17)] text-muted"
												>
													{c.remaining != null
														? `${Math.max(0, c.remaining).toFixed(0)}g`
														: `${bag.weightGrams}g`}
												</span>
											{/if}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>

					<button
						type="button"
						onmousedown={(e) => {
							e.preventDefault();
							createNew();
						}}
						onpointermove={(e) => hover(e, filtered.length)}
						class="block w-full border-t border-hairline px-4 py-3 text-left transition-colors {highlightedIndex ===
						filtered.length
							? 'bg-paper'
							: 'hover:bg-paper/60'}"
						role="option"
						aria-selected={highlightedIndex === filtered.length}
					>
						<div class="flex items-center gap-3">
							<div
								class="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-control bg-copper text-paper"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
								>
									<path d="M7 2v10M2 7h10" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-[calc(var(--dt-base)*14/17)] font-medium text-copper">
									{hasQuery ? 'Create new bag' : 'Add a new bag'}
								</div>
								{#if hasQuery}
									<div class="mt-0.5 truncate text-[calc(var(--dt-base)*12/17)] text-muted">
										"{query}"
									</div>
								{:else}
									<div class="mt-0.5 text-[calc(var(--dt-base)*12/17)] text-muted">
										Open the bag form →
									</div>
								{/if}
							</div>
						</div>
					</button>

					<!-- Keyboard hints, so not on a touch screen, where the row would
				     only take a third of a bag's height from the list. -->
					<div
						class="border-t border-hairline bg-paper/50 px-4 py-2 font-mono text-eyebrow font-medium tracking-[0.1em] text-muted uppercase pointer-coarse:hidden"
					>
						↑↓ navigate · ↵ select · esc close
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<!-- The room fit() borrows below the list. Outside the branches above: it
	     has to outlive the field being swapped for the chip. -->
	<div
		bind:this={roomEl}
		class="pointer-events-none invisible absolute top-full left-0 w-px"
		aria-hidden="true"
	></div>
</div>
