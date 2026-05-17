# Handoff — BagPicker + bag linking

## Overview

This bundle is a **visual design direction** for two new pieces of the Coffee Brew Log PWA:

1. **BagPicker** — a single combobox that replaces the brew form's existing
   `COFFEE` + `ROASTER` text inputs. Searches the bag library, supports inline
   bag creation, renders as a tinted chip when selected.
2. **Bag indication on BrewCard** — how the existing brew card should reveal
   that a brew is linked to a bag in the library.
3. **Bag detail view** — sketch of `/bags/[id]` for when you build it.

The previous handoff (visual redesign) established the design system (tokens,
fonts, components). **This handoff assumes those are already in place** — no
new tokens, fonts, or radii. Everything reuses the established vocabulary:
`paper · surface · ink · muted · hairline · rule · copper · copper-dk · copper-lt`
+ Newsreader / Geist / Geist Mono + `rounded-[14px]` inputs, `rounded-[18px]`
cards, etc.

## About the design files

The files in this bundle are **design references created in HTML** — interactive
prototypes on a design canvas, not production code to copy.

Your task is to **recreate these designs inside the existing SvelteKit + Tailwind v4
codebase** using its routing, components, and stores. **Do not introduce React.**
The HTML mocks use React only because the design tool requires it; treat the
rendered output as the spec.

The full canvas lives at `bag-picker-design.html` — open in a browser to see
every artboard.

## Fidelity

**High-fidelity.** Final colors, sizes, motion timings, copy. Recreate
pixel-perfectly within Svelte using the existing token set. Where this README
and the HTML mock disagree, this README wins.

---

## Vibe statement

> One field. The shape of a thought, not two text boxes.

Brewing a coffee is reaching for a specific bag in the cupboard. The form
should match that action — one motion that picks the right bag, then
dissolves into a chip you can glance at while you grind. The BagPicker carries
all the data the old `COFFEE` + `ROASTER` fields did, and more (process,
roast date, weight remaining) — which means the rest of the form shrinks and
the brew card gains real signal (freshness color-coding) without the user
typing a single extra word.

---

## 1. BagPicker — component spec

### Anatomy

```
┌─ Idle / typing — height 48px, rounded-[14px], bg-paper, border-hairline ─┐
│ [🎒 glyph 18]  Search or add a coffee…              [▾ chevron 12]      │
└──────────────────────────────────────────────────────────────────────────┘
        ↓ focus opens

┌─ Dropdown — rounded-2xl, surface, shadow-[0_12px_32px_rgba(28,24,20,0.10)] ─┐
│ RECENT BAGS                                                  SORTED BY ↓   │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ [bag30] Ethiopia Worka Sakaro            6d (success green)          │  │
│ │         Sey · [WASHED]                   215g (mono muted)           │  │
│ │──────────────────────────────────────────────────────────────────────│  │
│ │ [bag30] Colombia La Palma                14d (success / warning)     │  │
│ │         Onyx · [HONEY]                   80g                         │  │
│ │──────────────────────────────────────────────────────────────────────│  │
│ │ [+30 copper] Create new bag                                       ↗  │  │
│ │             "ethio"                                                  │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ 3 RECENT          ↑↓ NAVIGATE · ↵ SELECT · ESC CLOSE                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### States (6 total)

| # | State | Trigger | Visual |
|---|---|---|---|
| 1 | Idle | No focus, no selection | `bg-paper` shell, bag glyph + placeholder in `text-faint`, chevron in `text-muted` |
| 2 | Focused empty | Focus with empty query | Shell border → `border-copper`, ring `ring-3 ring-copper/20`, glyph & chevron tint to copper. Dropdown opens showing "RECENT BAGS" (last 3 brewed). |
| 3 | Typing with results | `query.length > 0`, matches exist | Same focused shell, but input shows typed value. Right side shows `{n} MATCHES` in mono. Dropdown lists hits, matched substring rendered `text-copper font-semibold` (in both name AND roaster). "Create new bag" row pinned at bottom of list. |
| 4 | Typing no results | `query.length > 0`, no matches | Same shell. Dropdown contains only the "Create new bag" affordance. |
| 5 | **Selected (the chip)** | A bag is linked | Shell becomes `h-14 bg-copper-lt border-transparent`. Left: 32×32 `rounded-[9px] bg-copper` square holding the bag glyph in paper. Middle: bag name in `font-display text-[17px] font-medium`, then roaster + freshness on second line in `text-copper-dk`. Right: 32×32 `rounded-full bg-ink/[0.06]` button with × icon. |
| 6 | Dropdown anatomy | (reference) | Full set of slots: section header, regular rows, highlighted row (`bg-paper` background inside dropdown), create-new row, footer with keyboard hints. |

### Behavior

| Action | Result |
|---|---|
| Focus / click | Open dropdown |
| Type | Filter (case-insensitive substring on `name` OR `roaster`, diacritics-folded). Sort by best-match (name > roaster) when typing; by most-recently-brewed when query is empty. |
| ↓ / ↑ | Move highlighted row |
| ↵ Enter | Select highlighted row. If "Create new bag" is highlighted → navigate to `/bags/new?name=<encoded query>` |
| Esc | Close dropdown, retain query in input |
| Tab | Close + commit highlighted row if any |
| Backspace on empty input | Clear the selected chip (drops back to idle, focus retained) |
| Click chip body | Open `/bags/[bagId]` in a new history entry — back returns to the form intact |
| Click × on chip | Clear the link, return to idle |

### Bag row anatomy

```
┌─ min-h-15 (60px), px-4 py-2.5 ─────────────────────────────────────┐
│ ┌──┐  Ethiopia Worka Sakaro (display 16 / medium)        6d        │
│ │🎒│  Sey · [WASHED]   (sans 12.5 muted)                 215g      │
│ └──┘                                                               │
└────────────────────────────────────────────────────────────────────┘
   ↑                                                          ↑
   30×30 rounded-lg                                  mono right-aligned
   bg-paper border-hairline                          age (freshness color)
                                                     + remaining (muted)
```

- Highlighted row: change row `bg` to `paper` (slight inset off the surface).
- Empty bag row (`remaining ≤ 0`): `opacity-50`, still pickable.
- Truncate name with ellipsis at 1 line.

### Process badge palette

Tonal pills — **never use copper for process** (copper is reserved for action).

| Process     | Background           | Foreground |
|-------------|----------------------|------------|
| WASHED      | `rgba(63,123,162,0.10)`  | `#3F5B7B` |
| NATURAL     | `rgba(166,52,27,0.10)`   | `#7A2913` |
| HONEY       | `rgba(176,122,20,0.14)`  | `#7A540C` |
| ANAEROBIC   | `rgba(79,107,46,0.12)`   | `#3F5723` |

Shape: `h-[18px] px-[7px] rounded-full font-mono text-[9.5px] tracking-[0.12em] uppercase`.

### Freshness ramp

A pure helper used in 3 places (picker row, picker chip, brew card eyebrow):

```ts
function freshnessTone(roastedDate: Date): string {
  const days = Math.floor((Date.now() - roastedDate.getTime()) / 86_400_000);
  if (days <= 14) return 'var(--color-success)';   // olive  #4F6B2E
  if (days <= 21) return 'var(--color-warning)';   // ochre  #B07A14
  return 'var(--color-danger)';                    // terracotta #A6341B
}
```

### Motion (CSS only)

| Element | Property | Duration | Easing |
|---|---|---|---|
| Dropdown open | `transform: scaleY(0.96 → 1) + opacity(0 → 1)`, `transform-origin: top` | 150ms | `ease-out` |
| Chip in/out | `opacity + scale(0.95 → 1)` | 200ms | `ease-out` |
| Bean square highlight on select | 1-frame light-flash | — | — |
| Row highlight | `background-color` | 100ms | linear |

### Accessibility

- Input: `role="combobox"` + `aria-expanded`, `aria-controls={listboxId}`,
  `aria-activedescendant={highlightedRowId}`, `aria-autocomplete="list"`.
- Dropdown: `role="listbox"`.
- Each row: `role="option"`, `aria-selected={highlighted}`.
- Process badges: include an `aria-label` with the full process name (badge
  text is visually uppercased + clipped).
- Touch targets: every interactive element ≥ 44px hit area.

---

## 2. Brew card — bag indication

### Decision: **Variation B** wins.

The roaster line was already on the card. Promoting it to a tappable link
with a 12px bag-glyph prefix and a 1px copper underline costs nothing
visually, and the new freshness eyebrow ("ROASTED 6 DAYS AGO" in color)
*only exists because the link gives us a roast date* — so the bag link
earns its real estate by contributing information.

### Spec

```
┌─ existing BrewCard, rounded-[18px], bg-surface, border-hairline ─────┐
│ [POUR-OVER]                                       YESTERDAY · 7:42   │
│                                                                      │
│ Ethiopia Worka Sakaro   ← unchanged: font-display 22/medium          │
│                                                                      │
│ 🎒 Sey · washed         ← NEW: was plain text, now a tappable link   │
│                            • 12px bag glyph in text-copper-dk        │
│                            • text-[13px] text-copper-dk              │
│                            • 1px border-bottom in copper/35          │
│                                                                      │
│ ● ROASTED 6 DAYS AGO    ← NEW: bag-derived freshness eyebrow         │
│                            • font-mono text-[10.5px] tracking-[0.14em]│
│                            • color = freshnessTone(roastedDate)      │
│                            • prefixed by a 5px color-dot             │
│                            • hidden when brew has no bagId           │
│                                                                      │
│ ──── 1px hairline ────                                               │
│ DOSE    WATER    TIME    RATIO                                       │
│ 15.0g   245g     2:50    1:16.3                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Behavior

- Tapping the roaster link → `/bags/[bagId]`.
- Hover (desktop): underline darkens to full copper.
- If `brew.bagId` is absent (legacy brews from before this change), fall back
  to the existing plain-text roaster and **omit the freshness eyebrow entirely**.

### What we rejected and why

**Variation A — small "BAG" pill in the metadata row.** Adds a chip that just
signals "this brew has a bag." Once the bag library is in use, every brew
will have one, so the chip becomes wallpaper.

**Variation C — "FROM BAG: {name}" footer line.** Duplicates the coffee
name on the same card. Defensible if bag names will diverge from coffee
names — for a personal single-user log, they almost always converge.

---

## 3. Bag detail — `/bags/[id]` (optional sketch)

Hierarchy is: **identity → key facts → consumption bar → notes → linked brews → archive**.

```
┌────────────────────────────────────────────────────────────────┐
│ ← Bags                                              Edit       │
│                                                                │
│ BAG · #03                                                      │
│ Ethiopia Worka Sakaro                                          │
│ Sey · Gedeb · [WASHED]                                         │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ROASTED       BREWS         AVG RATIO                    │  │
│ │ 6d (green)    14            1:16.2                       │  │
│ │ May 10        this bag      pour-over                    │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ REMAINING                              215g / 340g             │
│ ████████████████████░░░░░░░░░░  ← 10px copper rail, tick/100g  │
│ ~14 pour-overs left            auto-deducted from each brew    │
│                                                                │
│ NOTES                                                          │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ "Tasted stone fruit and jasmine at Sey. $24/340g.        │  │
│ │  Dial in at 1:16.5 for V60, see how it cools."           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ BREWS · 14                                          SEE ALL →  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 1:16.3   YESTERDAY · 7:42                              ★ │  │
│ │          POUR-OVER · 2:50                              › │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 1:16.0   TUE · 6:48                                      │  │
│ │          POUR-OVER · 3:05                              › │  │
│ └──────────────────────────────────────────────────────────┘  │
│   ...                                                          │
│                                                                │
│ ┌─ Archive this bag ─────────────────────────────────────┐    │
│ │ bg-danger/8 text-danger                                │    │
│ └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

### Spec highlights

- **Consumption bar**: 10px tall, `rounded-full bg-[#EDE5D4]`. Filled portion
  is `bg-copper`, width = `(remaining / total) × 100%`. Tick marks every 100g
  rendered as 1px verticals at `rgba(0,0,0,0.10)`. Transition width on update
  with `transition-[width] duration-300 ease-out`.
- **Brews list row**: compact variant — `padding: 12px 14px`, big mono
  `1:16.3` left (width 62), date eyebrow + method/time on right, optional ★
  in `text-success`, chevron in `text-faint`.
- **Archive vs delete**: this button does NOT delete — it sets
  `bag.archived = true`. Archived bags drop from the picker dropdown but
  remain reachable from `/bags?show=archived`. Linked brews keep their
  `bagId`.

---

## Wiring rules

### Schema delta

```ts
// Brew now has an optional FK to Bag
interface Brew {
  // …existing fields
  bagId?: string;
  // Keep coffeeName + roaster as denormalized cache for legacy data + UI
  // perf — but when bagId is set, those should be derived from the bag.
}

interface Bag {
  id: string;
  name: string;
  roaster: string;
  origin?: string;
  roastedDate: Date;
  process: 'washed' | 'natural' | 'honey' | 'anaerobic';
  totalGrams: number;       // bag weight at purchase
  remainingGrams: number;   // auto-decrements
  notes?: string;
  archived: boolean;
  createdAt: Date;
}
```

### Bag write-back

When a brew with `bagId` is **saved**: `bag.remainingGrams -= brew.dose`.
When **edited**: reverse old delta, apply new.
When **deleted**: reverse delta.
Floor at 0; do not block save when remaining would go negative — just warn
inline (`text-warning` helper text "this would go below zero").

### IndexedDB

The picker preloads the full bag list at form mount (a personal log will
stay well under 200 bags). Filtering runs locally on each keystroke — no
debounce needed. No external search index, no fuzzy/typo-tolerant matching
in V1 — straight substring.

### Form persistence

When the user clicks "Create new bag" from the picker, the rest of the form
state (method, dose, yield, ratio, time, notes) must persist via
`sessionStorage` so navigating to `/bags/new?name=X` and back via browser
back doesn't lose what they already entered. Restore on `/new` mount; clear
on save.

---

## Out of scope (V1)

- No fuzzy / typo-tolerant search.
- No bag photos, no barcode scanning, no price tracking on the bag.
- No bag tags / categories.
- No multi-select (a brew links to exactly one bag).
- No remote sync.

---

## Files in this bundle

| File | What it is |
|---|---|
| `bag-picker-design.html` | Open in a browser. Full design canvas with every artboard. |
| `bag-picker.jsx` | All 6 BagPicker states + in-form context. |
| `bag-card-variants.jsx` | 3 brew-card variations + Variation B applied in a brew list. |
| `bag-detail.jsx` | Bag detail view in light + dark. |
| `bag-direction.jsx` | Vibe, spec sheet, decision rationale, handoff notes. |
| `bag-app.jsx` | Canvas assembly. |
| `brew-tokens.jsx` | (Reused from the prior handoff) — palette + type + components. |
| `design-canvas.jsx`, `ios-frame.jsx` | Design-tool scaffolding — do **NOT** port. |

Preview locally:
```bash
python3 -m http.server 8080
# then open http://localhost:8080/bag-picker-design.html
```

---

## Suggested implementation order

1. **Schema migration**: add `bagId?` to Brew, ensure Bag has `process`,
   `roastedDate`, `totalGrams`, `remainingGrams`, `archived`.
2. **`freshnessTone()` helper** — pure function, used by 3 places.
3. **`ProcessBadge.svelte`** — the tonal pill, takes `process` prop.
4. **`BagPicker.svelte`** — start with the empty + selected states wired to
   a single bag prop; iterate to dropdown / typing / no-match / create-new.
5. **Swap into `/new`**: delete the old `COFFEE` + `ROASTER` inputs, drop in
   `<BagPicker bind:bagId>`.
6. **Update `BrewCard.svelte`**: roaster line → tappable link, add freshness
   eyebrow conditional on `bagId`.
7. **`/bags/[id]`**: identity header → key facts grid → consumption bar →
   notes → linked brews → archive button.
8. **Bag write-back**: hook the dose deduction into the brew save/edit/delete
   lifecycle in the brew store.
9. **Form persistence**: sessionStorage for the new-brew form state, so
   "Create new bag" → back doesn't lose work.
10. **A11y pass**: combobox/listbox roles, `aria-activedescendant`, touch
    target audit on the chip × button and the freshness eyebrow.
