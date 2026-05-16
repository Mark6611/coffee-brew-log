// Written direction — vibe statement, page mockups (ASCII), dark mode rationale.
const DB = () => window.BREW;
const DF = () => window.TF;

function VibeCard() {
  return (
    <div style={{
      width: 760, padding: 40, background: DB().surface,
      borderRadius: 16, border: `1px solid ${DB().hairline}`,
      fontFamily: DF().ui,
    }}>
      <window.BrewEyebrow>00 · Vibe</window.BrewEyebrow>
      <h2 style={{
        margin: '8px 0 18px', fontFamily: DF().display, fontWeight: 500,
        fontSize: 44, lineHeight: 1.05, color: DB().ink, letterSpacing: '-0.02em',
        textWrap: 'pretty',
      }}>
        A pour-over menu, not a dashboard.
      </h2>
      <p style={{
        margin: '0 0 14px', fontFamily: DF().display, fontSize: 19, lineHeight: 1.5,
        color: DB().ink70, maxWidth: 620, fontStyle: 'italic', textWrap: 'pretty',
      }}>
        Brew Log should feel like the laminated card on the counter of a specialty café —
        warm paper, generous whitespace, numbers set in a precise monospace, a single
        copper accent earning its keep. Quiet on the surface, exact in the details.
      </p>
      <p style={{
        margin: 0, fontFamily: DF().ui, fontSize: 14, lineHeight: 1.6,
        color: DB().muted, maxWidth: 620,
      }}>
        It is a personal log, used one-handed at 6am with wet fingers. So: large hit
        targets, mono numerals that line up at any zoom, and an empty state that reads
        like a journal prompt rather than a TODO.
      </p>
    </div>
  );
}

function MockupsCard() {
  const ascii = (s) => (
    <pre style={{
      margin: 0, fontFamily: DF().mono, fontSize: 11.5, lineHeight: 1.55,
      color: DB().ink70, whiteSpace: 'pre',
      padding: 16, background: DB().paper, borderRadius: 10,
      border: `1px solid ${DB().hairline}`, overflow: 'auto',
    }}>{s}</pre>
  );

  return (
    <div style={{
      width: 760, padding: 32, background: DB().surface,
      borderRadius: 16, border: `1px solid ${DB().hairline}`,
      fontFamily: DF().ui,
    }}>
      <window.BrewEyebrow>05 · Page mockups</window.BrewEyebrow>
      <h2 style={{
        margin: '6px 0 18px', fontFamily: DF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: DB().ink, letterSpacing: '-0.01em',
      }}>Layout & rhythm.</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontFamily: DF().ui, fontSize: 13, fontWeight: 600, color: DB().ink, marginBottom: 8 }}>Home</div>
          {ascii(
`╭──────────────────────────────────╮
│  THURSDAY · MAY 16          [📊] │
│  Good morning.                   │
│  Brew #87.                       │
│                                  │
│  LAST BREW · YESTERDAY           │
│ ╭──────────────────────────────╮ │
│ │ [POUR-OVER · V60]            │ │
│ │ Ethiopia                     │ │
│ │ Worka Sakaro                 │ │
│ │ Sey Coffee · washed          │ │
│ │ ───────────────────────────  │ │
│ │ DOSE   WATER   TIME  RATIO   │ │
│ │ 15.0g  245g    2:50  1:16.3  │ │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ │
│ │ "Stone fruit, jasmine…"      │ │
│ ╰──────────────────────────────╯ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │      +  New brew             │ │
│ └──────────────────────────────┘ │
│                                  │
│  THIS WEEK                       │
│  [BREWS 12] [AVG 1:16.4] [★ 3]   │
╰──────────────────────────────────╯`
          )}
        </div>

        <div>
          <div style={{ fontFamily: DF().ui, fontSize: 13, fontWeight: 600, color: DB().ink, marginBottom: 8 }}>Brew list</div>
          {ascii(
`╭──────────────────────────────────╮
│  ALL TIME · 87           [🔍][≡] │
│  Brews                           │
│                                  │
│  [All] (Pour-over) (Espresso)…   │
│                                  │
│  YESTERDAY · MAY 15  ─ ─ ─ ─ ─   │
│ ╭──────────────────────────────╮ │
│ │ [POUR-OVER] [★]    YESTERDAY │ │
│ │ Ethiopia Worka Sakaro        │ │
│ │ Sey · washed                 │ │
│ │ ───────────────────────────  │ │
│ │ DOSE   WATER  TIME  RATIO    │ │
│ │ 15.0g  245g   2:50  1:16.3   │ │
│ ╰──────────────────────────────╯ │
│                                  │
│  TUE · MAY 13  ─ ─ ─ ─ ─ ─ ─ ─   │
│ ╭──────────────────────────────╮ │
│ │ [ESPRESSO]         TUE 7:12  │ │
│ │ Colombia La Palma            │ │
│ │ ───────────────────────────  │ │
│ │ DOSE   YIELD  TIME  RATIO    │ │
│ │ 18.0g  37g    0:28  1:2.1    │ │
│ ╰──────────────────────────────╯ │
│                            ╭───╮ │
│                            │ + │ │
│                            ╰───╯ │
╰──────────────────────────────────╯`
          )}
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: DF().ui, fontSize: 13, fontWeight: 600, color: DB().ink, marginBottom: 8 }}>New brew</div>
          {ascii(
`╭─────────────────────────────────────────────────────────────────╮
│  ← Cancel              BREW #88                       [ Save ]  │
│  New brew                                                       │
│                                                                 │
│  METHOD                                                         │
│  ┌─────────────────────────────┬─────────────────────────────┐  │
│  │         Espresso            │  ▣      Pour-over           │  │
│  └─────────────────────────────┴─────────────────────────────┘  │
│                                                                 │
│  COFFEE                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Ethiopia Worka Sakaro                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Sey Coffee                                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  DOSE                            YIELD                          │
│  ┌────────────────────┐          ┌────────────────────┐         │
│  │ 15.0 g             │          │ 245 g              │         │
│  └────────────────────┘          └────────────────────┘         │
│                                                                 │
│  RATIO · QUICK                                                  │
│  ( 1:15 ) [ 1:16 ] ( 1:17 ) ( 1:18 )       = 1:16.3 actual      │
│                                                                 │
│  BREW TIME                                                      │
│  ┌─────────┐  ┌──────────┐                                      │
│  │ 2 min   │  │ 50 sec   │                                      │
│  └─────────┘  └──────────┘                                      │
│  ( 2:30 ) ( 2:45 ) ( 3:00 ) ( 3:15 )                            │
│                                                                 │
│  NOTES                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ "Stone fruit, jasmine on cool-down. Slow bloom next."     │  │
│  └───────────────────────────────────────────────────────────┘  │
╰─────────────────────────────────────────────────────────────────╯`
          )}
        </div>
      </div>
    </div>
  );
}

function HandoffCard() {
  const Row = ({ label, value }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr',
      gap: 16, padding: '12px 0', borderBottom: `1px solid ${DB().hairline}`,
      alignItems: 'baseline',
    }}>
      <div style={{ fontFamily: DF().mono, fontSize: 11, color: DB().muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: DF().ui, fontSize: 14, color: DB().ink70, lineHeight: 1.55 }}>{value}</div>
    </div>
  );

  return (
    <div style={{
      width: 760, padding: 32, background: DB().surface,
      borderRadius: 16, border: `1px solid ${DB().hairline}`,
      fontFamily: DF().ui,
    }}>
      <window.BrewEyebrow>07 · Handoff notes</window.BrewEyebrow>
      <h2 style={{
        margin: '6px 0 18px', fontFamily: DF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: DB().ink, letterSpacing: '-0.01em',
      }}>For the implementation agent.</h2>

      <Row label="Tailwind v4 setup" value={
        <span>
          Define tokens in <code style={codeS()}>@theme</code>: <code style={codeS()}>--color-paper</code>, <code style={codeS()}>--color-surface</code>, <code style={codeS()}>--color-ink</code>, <code style={codeS()}>--color-muted</code>, <code style={codeS()}>--color-hairline</code>, <code style={codeS()}>--color-rule</code>, <code style={codeS()}>--color-copper</code>, <code style={codeS()}>--color-copper-dk</code>, <code style={codeS()}>--color-copper-lt</code>, <code style={codeS()}>--color-success</code>, <code style={codeS()}>--color-warning</code>, <code style={codeS()}>--color-danger</code>. Map dark mode pairs via <code style={codeS()}>@variant dark</code>.
        </span>
      } />
      <Row label="Fonts" value={
        <span>
          Install <code style={codeS()}>@fontsource-variable/newsreader</code>, <code style={codeS()}>@fontsource-variable/geist</code>, <code style={codeS()}>@fontsource-variable/geist-mono</code>. Self-hosted, offline-safe. Set <code style={codeS()}>--font-display</code>, <code style={codeS()}>--font-sans</code>, <code style={codeS()}>--font-mono</code>; default body to <code style={codeS()}>font-sans</code>.
        </span>
      } />
      <Row label="Radii & spacing" value={
        <span>Cards <code style={codeS()}>rounded-2xl</code> (18px). Inputs/buttons <code style={codeS()}>rounded-xl</code> (14px). Chips <code style={codeS()}>rounded-full</code>. Page padding <code style={codeS()}>px-[22px]</code> · section gap <code style={codeS()}>gap-y-5</code> · grouped card gap <code style={codeS()}>gap-2.5</code>.</span>
      } />
      <Row label="Forms" value={
        <span>Keep <code style={codeS()}>@tailwindcss/forms</code> but override: <code style={codeS()}>h-12</code>, <code style={codeS()}>bg-paper</code>, <code style={codeS()}>border-hairline</code>, focus <code style={codeS()}>border-copper</code> + <code style={codeS()}>ring-copper/25</code>. Number inputs use <code style={codeS()}>font-mono</code> + <code style={codeS()}>inputMode="decimal"</code>. Notes textarea uses <code style={codeS()}>font-serif italic</code>.</span>
      } />
      <Row label="Buttons" value={
        <span>One primary copper button per screen, max. Save action is copper, Cancel is ghost (no border), Delete is tinted-danger. <strong style={{color: DB().ink}}>Never two copper buttons side by side.</strong></span>
      } />
      <Row label="Numerals" value={
        <span>All measurements (dose, yield, time, ratio) in <code style={codeS()}>font-mono</code>. Labels for those measurements in <code style={codeS()}>font-mono uppercase tracking-[0.14em] text-[10.5px]</code> · color <code style={codeS()}>text-muted</code>.</span>
      } />
      <Row label="Motion" value={
        <span>CSS only. <code style={codeS()}>transition-colors duration-150</code> on interactive states. Method picker thumb animates <code style={codeS()}>translate-x</code>. New-brew enters from the bottom (<code style={codeS()}>view-transition-name</code> on form, fallback <code style={codeS()}>translate-y-2 → 0</code> on mount).</span>
      } />
      <Row label="Empty state copy" value={
        <span style={{ fontStyle: 'italic', color: DB().ink70 }}>
          "No brews yet. Your first cup of the morning is also the start of a record. Log it and we'll watch the numbers settle."
        </span>
      } />
      <Row label="Dark mode" value={
        <span><strong style={{color: DB().ink}}>Ship for V1.</strong> The app is used pre-dawn. Reuse same component shapes; swap tokens only. Lighter copper <code style={codeS()}>#D2825A</code> for AA on dark surfaces. Ink inversion: paper → <code style={codeS()}>#16120E</code>, ink → <code style={codeS()}>#F2EBDD</code>. <strong style={{color: DB().ink}}>Do not</strong> auto-switch by system — give the user a setting; many people brew with a kitchen light on.</span>
      } />
      <Row label="Out of scope" value={
        <span style={{ color: DB().muted }}>No gradients on surfaces. No SVG illustration except the bean mark. No emoji in UI copy. No system fonts as a fallback for display headings (let Newsreader load with <code style={codeS()}>font-display: swap</code> and a Georgia fallback).</span>
      } />
    </div>
  );
}

function codeS() {
  return {
    fontFamily: DF().mono, fontSize: 12, padding: '1px 5px',
    background: DB().paper, border: `1px solid ${DB().hairline}`,
    borderRadius: 4, color: DB().ink,
  };
}

Object.assign(window, { VibeCard, MockupsCard, HandoffCard });
