# Handoff — Coffee Brew Log visual redesign

## Overview

This bundle is a **visual design direction** for the Coffee Brew Log PWA, evolving it from
Tailwind-default-with-amber to a warm, editorial, specialty-coffee aesthetic. Functionality is
already complete (form → IndexedDB → list) — **this handoff is purely visual**. Schema,
repositories, and routing must not change.

## About the design files

The files in this bundle are **design references created in HTML** — interactive prototypes
shown on a design canvas, not production code to copy.

Your task is to **recreate these designs inside the existing codebase** (SvelteKit + Tailwind CSS v4,
PWA, offline-capable) using its routing, components, and stores. **Do not introduce React.**
The HTML mocks use React only because the design tool requires it; treat the rendered output
(colors, spacing, typography, layout, copy) as the spec.

The full design canvas lives at `brew-log-design.html` — open it locally in a browser to see
every artboard. Each `brew-*.jsx` file is a small piece of that canvas.

## Fidelity

**High-fidelity.** Final colors (hex), final type stack, final spacing, final radii, final copy.
Recreate pixel-perfect within the SvelteKit + Tailwind v4 environment. Where this doc and the
HTML mock disagree, this doc wins (it has stricter numbers).

---

## Vibe statement

> A pour-over menu, not a dashboard.

The app should feel like the laminated card on the counter of a specialty café — warm paper,
generous whitespace, numbers set in a precise monospace, a single copper accent earning its
keep. Quiet on the surface, exact in the details. The user is a single person, one-handed at
6am with wet fingers: large hit targets, mono numerals that line up at any zoom, and an empty
state that reads like a journal prompt rather than a TODO.

---

## Design tokens (Tailwind v4 `@theme`)

Drop this into `src/app.css` (or wherever you load Tailwind):

```css
@import "tailwindcss";

@theme {
  /* Surfaces */
  --color-paper:     #F4EFE6;   /* page background — warm cream */
  --color-surface:   #FBF8F2;   /* raised cards on paper */
  --color-card:      #FFFFFF;   /* crisp white — used rarely */

  /* Ink */
  --color-ink:       #1C1814;   /* primary text */
  --color-ink-70:    #4A413A;   /* strong body */
  --color-muted:     #7A6E63;   /* secondary text */
  --color-faint:     #A89D90;   /* placeholders */

  /* Borders */
  --color-hairline:  #E6DFD2;   /* 1px borders, dividers */
  --color-rule:      #D9D0BF;   /* stronger separators */

  /* Brand — single accent */
  --color-copper:    #9C4A1F;   /* PRIMARY (replaces amber-700) */
  --color-copper-dk: #7A3915;   /* hover / pressed */
  --color-copper-lt: #F0DDC8;   /* badge bg, soft fills */

  /* Semantic */
  --color-success:   #4F6B2E;   /* olive — good extraction */
  --color-warning:   #B07A14;   /* ochre */
  --color-danger:    #A6341B;   /* terracotta — destructive */

  /* Fonts */
  --font-display:    "Newsreader Variable", Georgia, serif;
  --font-sans:       "Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono:       "Geist Mono Variable", "JetBrains Mono", ui-monospace, monospace;

  /* Radii */
  --radius-card:     1.125rem;   /* 18px — brew cards */
  --radius-input:    0.875rem;   /* 14px — inputs, buttons */
}

/* Dark mode pairs — apply when `<html data-theme="dark">` is set */
[data-theme="dark"] {
  --color-paper:     #16120E;
  --color-surface:   #1F1A14;
  --color-ink:       #F2EBDD;
  --color-ink-70:    #C9BFAD;
  --color-muted:     #9A8E7E;
  --color-faint:     #6B6052;
  --color-hairline:  #2D261D;
  --color-rule:      #3A3127;
  --color-copper:    #D2825A;   /* lighter for AA contrast on dark */
  --color-copper-dk: #B5683F;
  --color-copper-lt: rgba(210,130,90,0.10);
}

/* Apply body defaults */
html, body { background: var(--color-paper); color: var(--color-ink); }
body { font-family: var(--font-sans); }
```

Then a custom variant for dark mode:
```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

### Dark mode policy

**Ship for V1.** App is used pre-dawn. **Do not auto-switch by `prefers-color-scheme`** — many
people brew with the kitchen light on; give the user an explicit setting (Light / Dark / System).

---

## Typography

### Install (offline-safe — no Google Fonts at runtime)

```bash
pnpm add @fontsource-variable/newsreader @fontsource-variable/geist @fontsource-variable/geist-mono
```

```ts
// src/app.html or +layout.svelte
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css'; // for note italics
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
```

### Type scale

| Role     | Font        | Size  | Weight | Line | Letter-spacing | Tailwind                                                |
|----------|-------------|------:|-------:|-----:|---------------:|---------------------------------------------------------|
| Display  | Newsreader  |  34px |    500 |  36 |        -0.015em | `font-display text-[34px] leading-9 font-medium tracking-[-0.015em]` |
| Heading  | Newsreader  |  22px |    500 |  28 |        -0.005em | `font-display text-[22px] leading-7 font-medium`        |
| Body     | Geist       |  16px |    400 |  24 |          0      | `text-base leading-6`                                   |
| Small    | Geist       |  13px |    400 |  18 |          0      | `text-[13px] leading-[18px]`                            |
| Metric   | Geist Mono  |  17px |    500 |  22 |        -0.01em  | `font-mono text-[17px] font-medium`                     |
| Big metric | Geist Mono | 24px |    500 |  26 |        -0.02em  | `font-mono text-2xl font-medium`                        |
| Eyebrow  | Geist Mono  |10.5px |    500 |  14 |         0.14em  | `font-mono text-[10.5px] uppercase tracking-[0.14em]`   |
| Note     | Newsreader *italic* | 15px | 400 | 22 |         0       | `font-display italic text-[15px] leading-[22px]`        |

**Rules:**
- All numeric measurements (dose, yield, time, ratio) use `font-mono` regardless of size.
- Eyebrow labels are always uppercase mono with 0.14em tracking and `text-muted`.
- Brew notes use Newsreader italic — not the sans body.
- Never load system fonts as a *display* fallback; use Georgia. Let Newsreader load with `font-display: swap`.

---

## Components

### Buttons (`h-12 px-5 rounded-[14px]`)

```html
<!-- primary -->
<button class="h-12 px-5 rounded-[14px] bg-copper text-paper font-medium tracking-tight
               active:bg-copper-dk transition-colors">Save brew</button>

<!-- secondary -->
<button class="h-12 px-5 rounded-[14px] border border-rule text-ink font-medium
               active:bg-hairline/60 transition-colors">Discard</button>

<!-- danger (tinted, not filled) -->
<button class="h-12 px-5 rounded-[14px] bg-danger/8 text-danger font-medium
               active:bg-danger/14 transition-colors">Delete</button>

<!-- ghost -->
<button class="h-11 px-3 rounded-lg text-ink-70 font-medium
               active:bg-hairline/50">Cancel</button>
```

**Rule: never two copper buttons side-by-side on the same screen.** Pair primary with ghost/secondary.

### Brew card (the workhorse)

```
┌─ rounded-[18px], 1px hairline, bg-surface, p-[16px 18px 18px] ─┐
│ [BADGE]  [★ if fav]                            TIME-AGO (mono) │
│                                                                │
│ Coffee name — font-display 22px medium                         │
│ Roaster — text-13 text-muted                                   │
│                                                                │
│ ─── 1px hairline ───                                           │
│ DOSE    YIELD/WATER   TIME    RATIO                            │
│ 15.0g   245g          2:50    1:16.3   ← all mono              │
│                                          (ratio = text-copper) │
│                                                                │
│ ─── 1px dashed hairline ───                                    │
│ "Notes in Newsreader italic, 15px, text-ink-70"                │
└────────────────────────────────────────────────────────────────┘
```

- The 4 metric columns use a CSS grid `grid-cols-4 gap-1`.
- Labels: `font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted`.
- Values: `font-mono text-[17px] font-medium`. Ratio value uses `text-copper`.
- The dashed rule above notes is `border-dashed border-hairline`.

### Inputs (`h-12 rounded-[14px]`)

- Background: `bg-paper` (the page color, not surface — gives a slight inset feel against cards)
- Border: `border border-hairline`
- Focus: `focus:border-copper focus:ring-2 focus:ring-copper/25 outline-none`
- Number inputs: add `font-mono` + `inputMode="decimal"`
- Notes textarea: `font-display italic` (Newsreader), `text-[15px] leading-[22px]`, `resize-none`
- Keep `@tailwindcss/forms` plugin but override the above; `[type='number']` should hide spinners.

### Method picker (segmented · `h-12 rounded-[14px]`)

```
┌─ outer: h-12 p-1 rounded-[14px] bg-paper border-hairline ─┐
│ ┌─ active thumb ───────────┐ ┌─ inactive ───────────────┐ │
│ │ Espresso  (bg-surface,   │ │ Pour-over  (transparent, │ │
│ │  shadow-sm, text-ink,    │ │   text-muted, font-500)  │ │
│ │  font-600)               │ │                          │ │
│ └──────────────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- The thumb animates `translate-x` via `transition-transform duration-200 ease-out`.
- Active label: `font-semibold text-ink`. Inactive: `font-medium text-muted`.
- The thumb has `shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]`.

### Quick-pick chips (`h-9 rounded-full`)

- Inactive: `bg-paper border border-hairline text-ink-70 font-mono text-[13px]`
- Active: `bg-ink text-paper border-0 font-mono text-[13px]` (filled ink, not copper)
- Ratios: `1:15`, `1:16`, `1:17`, `1:18`. Times: `2:30`, `2:45`, `3:00`, `3:15`, `3:30`, `4:00`.
- Show the *computed* ratio next to the chips as a copper pill: `bg-copper-lt text-copper font-mono text-[12px] px-2.5 h-9 rounded-full`. Format: `= 1:16.3 actual`.

### Badges

- Default (method): `bg-copper-lt text-copper-dk font-mono text-[10.5px] tracking-[0.12em] uppercase h-[22px] px-2.5 rounded-full`
- Success (favorite ★): `bg-success/10 text-[#3F5723]`
- Warning (dial-in): `bg-warning/12 text-[#7A540C]`

### Day header (list groups)

```
YESTERDAY · MAY 15  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
```
Eyebrow on left, 1px hairline filling the rest of the row. `mb-2.5`.

---

## Screens

### Home (`/`)

| Section | Content | Spec |
|---|---|---|
| Safe-area top | Real status bar; app pads `pt-[54px]` then `px-[22px]` | |
| Eyebrow | "THURSDAY · MAY 16" — mono eyebrow, current date | `text-muted` |
| Title | "Good morning." + `<br>` + *"Brew #N."* (italic, `text-muted`) | display 34px, leading 1.05 |
| Trailing icon | Circular 38px button → /stats (placeholder OK) | `bg-surface border-hairline` |
| Hero card | "Last brew · yesterday" eyebrow → hero brew card | A featured BrewCard at `rounded-[22px] p-[22px]`, with a faint copper circle decoration at top-right (`w-[140px] h-[140px] rounded-full bg-copper-lt opacity-50 absolute -top-[30px] -right-[30px]`) |
| Primary CTA | "+ New brew" button → /new | `h-14 rounded-2xl bg-copper text-paper` full-width, plus icon stroke |
| Week stats | "THIS WEEK" eyebrow + 3-column grid: BREWS / AVG RATIO / FAVORITES | each is a `surface` card with mono eyebrow + display 24px value |

### Brew list (`/brews`)

| Section | Content |
|---|---|
| Eyebrow | "ALL TIME · {count}" |
| Title | "Brews" |
| Trailing | Two 38px icon buttons — search, filter |
| Filter pills | "All" (active = filled ink) · "Pour-over" · "Espresso" · "Favorites" — `h-8 rounded-full px-3.5 text-[13px]`, horizontal scroll on overflow |
| Day groups | DayHeader → stack of BrewCards (`gap-2.5`), one group per day |
| FAB | Floating action button bottom-right: `w-15 h-15 rounded-full bg-copper`, `shadow-[0_8px_24px_rgba(156,74,31,0.35)]` |

### New brew (`/new`)

The form. Vertical stack, every field group is `[Eyebrow → input(s)] mb-[18px]`.

1. **Header row**: ← Cancel (ghost, left) · "BREW #N" eyebrow (center) · Save (copper compact `h-9 px-3.5 rounded-lg`, right)
2. **Title**: "New brew" — display 30px
3. **METHOD** — segmented picker
4. **COFFEE** — text input (name) + text input (roaster)
5. **DOSE** + **YIELD** — 2-col grid, both number fields, larger 56px height with `font-mono text-2xl` value + small "g" suffix
6. **RATIO · QUICK** — chip row + computed-ratio pill
7. **BREW TIME** — two compact number fields side-by-side (min / sec) + quick-pick chip row underneath
8. **NOTES** — Newsreader italic textarea, 3 rows

**Save button is always visible** in the header — no bottom CTA bar that gets eaten by the keyboard. Validation: dose & yield must be > 0; ratio is computed live and shown in copper.

### Empty state (`/brews` with no data)

Center column, vertically centered, `px-10 pb-20`:
1. Copper bean medallion — 96px circle `bg-copper-lt`, with the bean SVG (56×56) inside in copper
2. Heading: "No brews yet." — display 26px
3. Italic body, max-w-[280px], `text-muted`:
   > "Your first cup of the morning is also the start of a record. Log it and we'll watch the numbers settle."
4. CTA: "+ Log first brew" — copper button `h-13 px-5.5`

---

## App icon

A single coffee bean drawn as two strokes: the ellipse outline + a central S-curve seam.
Cream strokes on copper. No letterforms, no steam.

**SVG geometry** (paste into `/static/icon.svg`):

```svg
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#9C4A1F"/>
  <g transform="translate(256 256) rotate(-18)">
    <ellipse cx="0" cy="0" rx="125" ry="172"
             fill="none" stroke="#FBF6EB" stroke-width="22"/>
    <path d="M 0 -150 C 50 -90, -50 -10, 0 60 S 50 130, 0 150"
          fill="none" stroke="#FBF6EB" stroke-width="22" stroke-linecap="round"/>
  </g>
</svg>
```

**Manifest sizes to produce** (any reasonable raster tool from `icon.svg`):
- 16, 32, 48 — favicon set (drop `rx` to ~18 at 16px, ~28 at 32px, ~52 at 48px for proper corner radius)
- 180 — `apple-touch-icon.png`
- 192, 512 — PWA manifest (maskable variants too: same artwork, padded 20% so iOS/Android safe area covers the bean)

**Update `app.html`:**
```html
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**Variants** in HTML mock (only the copper-on-cream primary ships): inverted, monochrome ink, dark-mode lighter copper. Use the dark-mode lighter copper (`#D2825A`) when the icon needs to appear on a dark background in-app.

---

## Interactions & motion

CSS transitions only — no JS animation libraries.

| What | Property | Duration | Easing |
|---|---|---|---|
| Button states | `background-color`, `color` | 150ms | `ease-out` |
| Method picker thumb | `transform` (translate-x) | 200ms | `cubic-bezier(0.2, 0.7, 0.3, 1)` |
| Chip active/inactive | `background-color`, `color` | 120ms | `ease-out` |
| Card hover (where applicable on desktop) | `box-shadow` | 150ms | `ease-out` |
| Page enter (form modal) | View Transitions API where supported; fallback `translate-y-2 opacity-0 → 0 1` over 250ms |

No skeleton loaders — IndexedDB is fast enough. If you need a placeholder beat, render the empty state.

---

## Out of scope / what NOT to do

- No gradients on surfaces. (One translucent copper circle on the home hero card is the only exception.)
- No SVG illustration besides the bean mark.
- No emoji in UI copy.
- No system-font fallback for headings — Georgia is the only acceptable fallback for Newsreader.
- Do not introduce a second accent color. Copper is alone.
- Do not auto-switch to dark mode by system preference — user setting only.
- No bottom-nav tab bar. The app is two-screen (home + list) + one modal-ish form. A FAB on list + a CTA on home is enough.
- No remote sync, auth, or any Phase 2 feature.

---

## Files in this bundle

| File | What it is |
|---|---|
| `brew-log-design.html` | Open in a browser. The full design canvas with every artboard. |
| `brew-tokens.jsx` | Live React render of the palette, type scale, and component kit. |
| `brew-screens.jsx` | The four mobile mockups (home, list, new brew, empty). |
| `brew-icon.jsx` | The app icon mark at every size + variant. |
| `brew-direction.jsx` | Vibe statement, ASCII page mockups, handoff notes (this README is the canonical version). |
| `brew-app.jsx` | The canvas assembly. |
| `design-canvas.jsx`, `ios-frame.jsx` | Design tool scaffolding — do NOT port these. |

To preview the canvas locally:
```bash
# from this folder:
python3 -m http.server 8080
# then open http://localhost:8080/brew-log-design.html
```

---

## Suggested implementation order

1. Drop the `@theme` block into `app.css`. Verify token names work everywhere.
2. Install the three fontsource packages, import in `+layout.svelte`. Verify Newsreader + Geist render.
3. Build a `<BrewCard>` Svelte component (the workhorse). Match brew list's first card exactly.
4. Replace the brew list screen → match mock.
5. Replace home → match mock.
6. Replace new brew → match mock. This is the largest job; the segmented picker and number fields are the most custom pieces.
7. Add empty state.
8. Generate icon assets, update manifest + `app.html`.
9. Wire dark-mode toggle (Light/Dark/System) into settings, persist to localStorage, apply `data-theme` on `<html>`.
10. Spot-check all touch targets are ≥44px and that mono numerals align across cards at every density.
