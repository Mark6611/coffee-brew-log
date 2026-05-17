# Handoff — Brew Detail · Edit · Stats

## Overview

Three new screens for the Coffee Brew Log PWA:

1. **`/brews/[id]`** — brew detail view (read-only)
2. **`/brews/[id]/edit`** — edit mode (reuses /new form, with mode chrome)
3. **`/stats`** — long-term patterns / editorial stats dashboard

The prior two handoffs (visual redesign + BagPicker) established the design
system (tokens, fonts, components) and the bag-link pattern. **This handoff
assumes those are already in place.** No new tokens, no new fonts. Everything
reuses: `paper · surface · ink · ink-70 · muted · faint · hairline · rule ·
copper · copper-dk · copper-lt · success · warning · danger` + Newsreader /
Geist / Geist Mono + `rounded-[14px]` inputs, `rounded-[18px]` cards, mono
eyebrows `text-[10.5px] tracking-[0.14em] uppercase`.

## About the design files

The files in this bundle are **design references created in HTML** — interactive
prototypes on a design canvas, not production code to copy.

Your task: **recreate these designs inside the existing SvelteKit + Tailwind v4
codebase** using its routing, components, and stores. **Do not introduce React.**
The HTML mocks use React only because the design tool requires it.

The full canvas is `brew-detail-design.html` — open in a browser to see every
artboard.

## Fidelity

**High-fidelity.** Final colors, sizes, motion timings, copy. Recreate
pixel-perfectly within Svelte using the existing token set. Where this README
and the HTML mock disagree, this README wins.

---

## Vibe statement

> Three rooms in the same house.

Detail is the brew at rest — the ratio bigger than anything else on the page,
because that's the number you're chasing. Edit is detail with a copper trim
and every field weighed against its saved twin. Stats is the laminated card
on the back wall: every section earns its place by saying something true.

---

## 1. `/brews/[id]` — brew detail

### Hierarchy (top to bottom)

| # | Element | Spec |
|---|---|---|
| 1 | Status bar (safe area) | `pt-[54px]` |
| 2 | Header row | `← Brews` ghost button (left) · `Edit` ghost button (right). 36px tall, 18px horizontal padding. |
| 3 | Identity eyebrow | `BREW · #N` mono uppercase muted |
| 4 | Method badge | Reuses existing brew-card badge component. Optional `methodSub` ("V60", "Origami") concatenated: `POUR-OVER · V60`. |
| 5 | Favorite badge | Inline next to method when `isFavorite`. `bg-success/10 text-[#3F5723]` pill with a 9px filled star prefix. |
| 6 | Coffee name | `font-display text-[30px] font-medium tracking-[-0.015em]`. Pulled from `brew.bag.name` if linked, else `brew.coffeeName`. |
| 7 | Bag link line | Inherits from brew card: 12px bag glyph + `roaster · process` in `text-copper-dk` with 1px copper underline. |
| 8 | Freshness eyebrow | Mono uppercase `tracking-[0.14em]` colored by `freshnessTone(roastedDate)`. Prefixed by 5px color dot. Hidden if no bag linked. |
| 9 | Brewed-at line | Plain `text-[13px] text-muted` — "Yesterday · 7:42" |
| 10 | **Hero ratio block** | See below |
| 11 | Variables card | See below |
| 12 | Rating card | See below |
| 13 | Notes card | Newsreader italic 15.5 on surface, padded `rounded-[18px]`. Quotes around the text. |
| 14 | Bag preview | Tappable card linking to `/bags/[bagId]` — 44px copper square + bag name + mono meta line + 4px mini consumption rail. |
| 15 | Footer actions | Duplicate (`bg-ink/[0.04]`) + Delete (`bg-danger/8 text-danger`). |

### Hero ratio block

```
┌─ rounded-[22px] bg-surface border-hairline px-[22px] py-[24px] ─────┐
│ (faint copper-lt circle 140×140, top-right, opacity 0.4)            │
│                                                                     │
│ RATIO                                                               │
│ 1:16.3                              ← mono 56px medium              │
│                                       tracking-[-0.04em] text-copper│
│                                       leading-none                  │
│                                                                     │
│ 15.0g of coffee yielded 245g of brew in 2:50.                       │
│                                     ← sans 13 muted                 │
│ ─── 1px hairline ───                                                │
│                                                                     │
│ DOSE     WATER    TIME     RATIO                                    │
│ 15.0g    245g     2:50     1:16.3   ← mono 17, ratio in copper      │
└─────────────────────────────────────────────────────────────────────┘
```

- Prose explainer template: `{dose} of coffee yielded {yieldOrWater} of {espresso|brew} in {time}.`
- Espresso variant: `{dose} of coffee yielded {yield} of espresso in {time}.`

### Variables card

```
┌─ rounded-[18px] bg-surface border-hairline p-[14px_16px] ───────────┐
│                                                                     │
│ GRIND               WATER TEMP                                      │
│ 6.5                 94°C                                            │
│ Fellow Ode 2        filtered, freshly boiled                        │
│                                                                     │
│ BALANCE                                                             │
│ ┌─ p-1.5 bg-paper rounded-xl border-hairline ──────────────────┐   │
│ │  Light    │  ● Balanced ●  │   Heavy                          │   │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Conditional rendering: if a field is null, **omit that row entirely** (no "—" placeholder).
- If GRIND, WATER TEMP, **and** BALANCE are all null, hide the entire Variables card.
- Espresso: no `WATER TEMP` ever.
- Balance scale is read-only here; same visual as the segmented method picker.

### Rating card

```
┌─────────────────────────────────────────────────────────────────────┐
│  4.5                              ★ ★ ★ ★ ☆ (half-filled last)     │
│  OUT OF 5                         "Best of this bag so far."       │
│                                   ← Newsreader italic 13.5         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- `4.5` is `font-display text-[36px] font-medium text-copper leading-none tracking-[-0.02em]`.
- Stars are 16px SVG paths; partial fills via a clipped overlay (see `StarRow` in `brew-detail.jsx`).
- Tasting note is optional — same Newsreader italic body as Notes, but compact.

### Empty / unlinked states

| State | Render |
|---|---|
| `brew.bagId == null` | Hide bag link + freshness eyebrow. After the brewed-at line, render a quiet copper-lt info chip: `[bag glyph] This brew isn't linked to a bag in your library.   LINK →` |
| `brew.rating == null` | Replace rating card with a `border-dashed border-hairline` affordance: empty stars + "Rate this brew" muted + "ADD →" copper |
| `brew.notes == null` | Replace notes card with same dashed-border affordance: italic muted "What did it taste like?" + "ADD →" copper |
| `brew.grindSetting == null` etc | Hide individual variable cells |

### Footer actions

- **Duplicate as new brew** — pre-fills `/new` with this brew's values. Subtle: `bg-ink/[0.04]`.
- **Delete this brew** — tinted danger. Opens a confirm sheet. On confirm, reverses the bag write-back (`bag.remainingGrams += brew.dose`) and navigates back to `/brews`.
- **No Save here.** Save only exists in edit.

---

## 2. `/brews/[id]/edit` — edit mode

This is the `/new` form with mode chrome. The fields are identical to /new
(adding `grind`, `water temp`, `balance`, `rating` to /new too, in the same
order as below).

### Field order (apply to both /new and /edit)

Follows the physical brew sequence: **weigh → grind → heat → pour → taste**.

1. METHOD (segmented)
2. COFFEE (BagPicker)
3. DOSE + YIELD (2-col grid, 56px tall, mono 24)
4. RATIO · QUICK (chips + computed actual pill)
5. **GRIND** (free-form input, helper text shows grinder name)
6. **WATER TEMP** (number, °C suffix — hidden when method is espresso)
7. **BREW TIME** (2 compact number fields min/sec + quick-pick chips)
8. BALANCE (segmented light/balanced/heavy)
9. RATING (decimal + stars)
10. NOTES (Newsreader italic textarea, 3 rows)

### Mode chrome

```
═══════════════════ 3px copper bar ═══════════════════
│ 9:41                                              ••• │
│                                                       │
│ ← Cancel        EDITING            [ Save changes ]   │
│              BREW · #87                               │
│                                                       │
│  ┌─ copper-lt bar (only when dirty) ─────────────┐   │
│  │ ● 3 unsaved changes · grind, water temp, …    │   │
│  │                                       RESET   │   │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  … form …                                             │
```

| Piece | Spec |
|---|---|
| **Top hairline** | `fixed top-0 inset-x-0 h-[3px] bg-copper z-[100]`. Persists during scroll. This is the single strongest "you're in edit mode" cue. |
| **Header eyebrows** | Centered between Cancel and Save. Two stacked: `EDITING` in copper (`font-mono text-[10px] font-semibold tracking-[0.18em]`) on top of `BREW · #N` in standard muted. **No h1 title** on this screen. |
| **Cancel** | `← Cancel` ghost button, left side. If dirty → confirm sheet. If clean → navigate immediately. |
| **Save changes** | Copper button right side. Copy is **`Save changes`** (not "Save brew"). Disabled when not dirty (`bg-ink/[0.08] text-muted cursor-not-allowed`). On save → `/brews/[id]`. |
| **Reset bar** | Only when `dirty === true`. `bg-copper-lt rounded-[10px] mx-[22px] mb-2.5 px-3 py-2`. Shows count + comma-separated dirty field names. RESET button on right in `font-mono uppercase tracking-[0.1em]` — opens "Discard N changes?" confirm. |
| **Per-field dirty marker** | Changed fields get a 2px copper bar in their left gutter (`pl-3 relative` + absolute bar) + a 5px copper dot after the field's eyebrow label. |

### Behavior answers (to the bracket questions)

| Question | Answer |
|---|---|
| How does user know they're editing vs creating? | 3px copper top bar + `EDITING · BREW #N` stacked eyebrow. No "Edit brew" h1. |
| Reset affordance? | Yes — inline copper-lt bar, only visible when dirty. RESET opens a confirm sheet. |
| Where does Back go? | Always to `/brews/[id]` (detail), the screen you came from. If user landed via direct URL, fall back to `/brews`. |
| Save CTA copy? | **`Save changes`** in edit mode. Keep `Save` in /new. |
| Delete affordance location? | **Only on detail page**, not in the edit form. Editing is for field changes; deleting is a different verb. |

### Dirty tracking

```ts
// Compute on each form change
const dirty = !deepEqual(form, originalSnapshot);
const dirtyFields = Object.keys(form).filter(k => form[k] !== originalSnapshot[k]);
```

- Per-field dirty marker uses `dirtyFields.includes(fieldName)`.
- "RESET" sets `form = structuredClone(originalSnapshot)`.
- **Edit form does NOT persist to sessionStorage** (unlike /new). If user navigates away without saving, they lose their changes — they should be warned.

### Bag write-back rules on edit/delete

| Action | Behavior |
|---|---|
| Edit dose (same bag) | `bag.remainingGrams += (oldDose - newDose)` on save. Show inline warning under DOSE if this would drop below 0; don't block save. |
| Edit bag | Restore old bag (`+= oldDose`), deduct from new bag (`-= newDose`). Atomic, one transaction. |
| Delete brew | Reverse original deduction: `bag.remainingGrams += brew.dose`. |
| Unlink bag (set bagId to null) | Restore old bag (`+= oldDose`). |

---

## 3. `/stats` — long-term patterns

### Sections in priority order

| # | Section | What it shows |
|---|---|---|
| 1 | **Headline** | `"87 brews," / "and counting."` in display 34. Single most important number first. |
| 2 | **Last 12 weeks** | Sparkbar: 12 vertical bars (flex flex-end), last bar copper, others `#D9CDB6`. Above: delta vs last week ("↑ 2 vs last week") in success green. |
| 3 | **Quick stats** | 3-card grid: THIS WEEK · AVG RATIO · AVG RATING. `THIS WEEK` gets copper value. |
| 4 | **Method split** | Two big numbers above a single stacked bar. `bg-copper` (pour-over) · 1.5% gap · `bg-copper-dk` (espresso). Percentages below. |
| 5 | **Ratio distribution** | 9-bucket histogram from 1:14 to 1:18 (0.5 steps), pour-over only. Median bucket highlighted copper; dashed copper line at median. |
| 6 | **Best brews** | Top 3 rated, compact rows with rank numeral (rank 1 in copper), name, mono meta `roaster · method · ratio (copper)`, rating + stars. |
| 7 | **Bag patterns** | Two stacked cards: MOST BREWED (bag chip like picker selected state) + FRESHNESS AT BREW (3-color stacked bar with legend). |
| 8 | **Time of day** | 24-cell heatmap (one per hour) using `color-mix(in oklab, ...)`. NOON / 12AM / 6 / 12 labels. PEAK hour callout in the eyebrow. |
| 9 | **Pull-quote** | One italic Newsreader observation at the bottom, generated from templates against current data. |

### Range pills

Top-right of the screen.

```
[ 12 WEEKS ]  [ 6 MO ]  [ ALL ]
```

- `h-7 px-2.5 rounded-full font-mono text-[10px] font-medium tracking-[0.1em]`
- Active: `bg-ink text-paper`. Default: `transparent` + `inset-0_0_0_1px_hairline` + `text-muted`.
- Default value: `12 WEEKS`. Persist in URL: `?range=12w|6m|all`.

### Chart rules (CSS only)

| Element | How |
|---|---|
| **Vertical bars** | Flex with `align-items: flex-end`, percentage heights. `min-height: 4px` so 1-brew weeks don't disappear. Inactive `#D9CDB6`, active/highlighted `bg-copper`. |
| **Stacked horizontal bar** | Flex row, each segment `width: {pct}%`. Optional 1.5% gap between segments. `rounded-full overflow-hidden`. |
| **Median marker** | Absolute 1px `border-dashed border-copper opacity-50` vertical line over the histogram. Position computed from data, not hard-coded. |
| **Heatmap intensity** | `background: color-mix(in oklab, var(--color-copper) {20 + ratio * 80}%, var(--color-paper))`. Empty cells get `bg-paper` at low alpha. |
| **No JS chart libs** | Recharts, D3, victory, Chart.js — all banned. Everything is a flex container or inline SVG. |
| **Numbers everywhere** | Always mono. Eyebrows always mono uppercase. Never serif for chart labels. |

### Pull-quote templates

Generate one observation from the data using templates like:

- `You log more on the {weekday|weekend}s.`
- `Most brews fall between {h1} and {h2}.`
- `Your ratio variance dropped {N}% this month.`
- `Your average rating is up from {old} to {new} this {period}.`
- `You've brewed {bag} {N} times — your most-used bag.`
- `Your {method} brews trend {tighter|wider} than your {other method}.`

Pick whichever has the largest signal. Render in Newsreader italic 13, muted,
quoted. Falls back to "You logged {N} brews this {period}." if no insight stands out.

### What's NOT here (and why)

| Excluded | Why |
|---|---|
| Pie / donut | Method split reads better as a single stacked bar with side-by-side numbers above. |
| Line graphs | For 12 weeks of discrete events, bars are clearer. Lines imply continuous data. |
| Daily streaks / gamification | This is a personal log, not Duolingo. Streak shame is the wrong mood. |
| Goals / targets | The user knows what they want; the app shouldn't set numbers for them. |
| Drill-down / filtering | V1 is read-only numbers. For per-bag stats, the user goes to `/bags/[id]`. |
| Export / share | Personal log = personal. No screenshot generation, no CSV. |
| Realtime updates | Compute on mount + on tab focus. No timers. |

---

## Routing summary

| From | To | Trigger |
|---|---|---|
| `/brews` (list) | `/brews/[id]` | Tap brew card |
| `/brews/[id]` | `/brews/[id]/edit` | Tap `Edit` top-right |
| `/brews/[id]` | `/bags/[bagId]` | Tap bag link or bag preview card |
| `/brews/[id]/edit` | `/brews/[id]` | Save (always), Cancel (if clean), confirm + Cancel (if dirty) |
| `/` (home) | `/stats` | Tap stats icon in home header |
| `/stats` | `/` | Tap back top-left |

URL params:
- `/stats?range=12w` (default), `?range=6m`, `?range=all`

---

## Files in this bundle

| File | What it is |
|---|---|
| `brew-detail-design.html` | Open in a browser. Full design canvas. |
| `brew-detail.jsx` | Detail screen — rich + minimal variants. |
| `brew-edit.jsx` | Edit screen — dirty + clean + dark variants. |
| `brew-stats.jsx` | Stats screen — all sections. |
| `detail-direction.jsx` | Spec cards: detail, edit, stats, cross-cutting handoff. |
| `detail-app.jsx` | Canvas assembly. |
| `brew-tokens.jsx`, `bag-picker.jsx` | (Reused from prior handoffs) — tokens + BagPicker. |
| `design-canvas.jsx`, `ios-frame.jsx` | Design-tool scaffolding — do **NOT** port. |

Preview locally:
```bash
python3 -m http.server 8080
# then http://localhost:8080/brew-detail-design.html
```

---

## Suggested implementation order

1. **Schema additions** (if not already present): `Brew.grindSetting?: string`,
   `Brew.waterTempC?: number`, `Brew.balance?: 'light' | 'balanced' | 'heavy'`,
   `Brew.rating?: number` (decimal 1–5).
2. **`StarRow.svelte`** — partial-fill star control (4.5 → 4½ stars). Reusable
   read-only display + interactive picker variants.
3. **`BalanceScale.svelte`** — segmented control reusing the method-picker
   shape. Read-only mode for /detail, interactive for /edit.
4. **`HeroRatio.svelte`** — the big copper numeral block with prose explainer
   and metric row. Used only on /brews/[id].
5. **`/brews/[id]`** — wire from the brew store. Build hierarchy top-down.
   Conditional rendering for null fields. Footer Duplicate + Delete.
6. **Reorder /new fields** to: method → COFFEE → dose+yield → ratio → **grind
   → water temp → brew time** → balance → rating → notes. Add the new fields
   if missing.
7. **`/brews/[id]/edit`** — copy /new, add mode chrome (top hairline,
   stacked eyebrows, Reset bar). Implement dirty tracking + per-field
   markers. Wire bag write-back deltas.
8. **`/stats`** — sparkbar → quick stats → method split → ratio histogram →
   best brews → bag patterns → time of day → pull-quote. All CSS-drawn.
9. **Pull-quote engine** — templates + data-driven selection. Single function
   returns one observation string or the fallback.
10. **A11y pass** — ensure star picker is keyboard-accessible (arrow keys,
    half-step), balance scale is a proper radio group, heatmap cells have
    `aria-label="{N} brews at {hour}"`.

---

## Out of scope (V1)

- No charts requiring a JS library.
- No realtime / live-updating stats.
- No sharing / export / CSV / screenshots.
- No drill-down from stat → filtered brew list.
- No per-bag micro-stats outside `/bags/[id]`.
- No streaks, badges, goals, or gamification of any kind.
