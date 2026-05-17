// Direction doc + handoff notes for the detail / edit / stats trio.
const X = () => window.BREW;
const XF = () => window.TF;

function VibeCard() {
  return (
    <div style={{
      width: 760, padding: 40, background: X().surface,
      borderRadius: 16, border: `1px solid ${X().hairline}`,
      fontFamily: XF().ui,
    }}>
      <div style={{
        fontFamily: XF().mono, fontSize: 10.5, color: X().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>00 · DIRECTION</div>
      <h2 style={{
        margin: '8px 0 18px', fontFamily: XF().display, fontWeight: 500,
        fontSize: 44, lineHeight: 1.05, color: X().ink, letterSpacing: '-0.02em', textWrap: 'pretty',
      }}>
        Three rooms in the same house.
      </h2>
      <p style={{
        margin: '0 0 14px', fontFamily: XF().display, fontSize: 19, lineHeight: 1.5,
        color: X().ink70, maxWidth: 640, fontStyle: 'italic', textWrap: 'pretty',
      }}>
        Detail is the brew at rest — the ratio bigger than anything else on the page,
        because that's the number you're chasing. Edit is detail with a copper trim and
        every field weighed against its saved twin. Stats is the laminated card on the
        back wall: every section earns its place by saying something true.
      </p>
      <p style={{
        margin: 0, fontFamily: XF().ui, fontSize: 14, lineHeight: 1.6,
        color: X().muted, maxWidth: 640,
      }}>
        Nothing here is new system; everything reuses the tokens and shapes already
        in place. The only "new" gestures are the big ratio numeral, the copper hairline
        that marks edit mode, and the CSS-drawn charts on /stats.
      </p>
    </div>
  );
}

// ─── Detail spec ──────────────────────────────────────────────────────
function DetailSpecCard() {
  return (
    <CardShell n="03 · DETAIL · SPEC" title="/brews/[id]">
      <Section title="Hierarchy">
        <Row label="1 · Identity" value={<>"BREW · #N" eyebrow → method badge (with method-sub like "V60") + optional favorite badge</>} />
        <Row label="2 · Coffee name" value={<>Newsreader 30px medium — pulled from <code style={c()}>brew.bag.name</code> if linked, else <code style={c()}>brew.coffeeName</code></>} />
        <Row label="3 · Bag link" value={<>Inherits from the brew-card pattern: bag-glyph + roaster · process as link · freshness eyebrow on its own line</>} />
        <Row label="4 · Brewed-at" value={<>Plain sans 13 muted: "Yesterday · 7:42" — the timestamp lives here, not in the metadata row</>} />
        <Row label="5 · Hero ratio block" value={<>The headline. Mono 56px copper, letter-spacing -0.04em. One-line prose explanation below ("15.0g of coffee yielded 245g of brew in 2:50"). 4-metric row pinned under a 1px hairline.</>} />
        <Row label="6 · Variables card" value={<>Grind + grinder (sub), water temp + sub, balance (segmented scale that's read-only here). Hide cells that are null.</>} />
        <Row label="7 · Rating card" value={<>Big copper 36px decimal + small "OUT OF 5" eyebrow on the left. Star row + optional italic tasting note on the right.</>} />
        <Row label="8 · Notes" value={<>Newsreader italic 15.5 on surface, padded card</>} />
        <Row label="9 · Bag preview" value={<>44px copper square + bag name + freshness/remaining/mini consumption rail. Tap → <code style={c()}>/bags/[id]</code></>} />
        <Row label="10 · Footer" value={<>"Duplicate as new brew" (subtle ghost) and "Delete this brew" (tinted danger). No primary copper button — Save lives in Edit only.</>} />
      </Section>

      <Section title="Hero ratio block">
        <Row label="Shape" value={<><code style={c()}>rounded-[22px] bg-surface border-hairline px-[22px] py-[24px]</code></>} />
        <Row label="Decoration" value={<>Faint <code style={c()}>copper-lt</code> circle <code style={c()}>w-[140px] h-[140px]</code> peeking from top-right · opacity 0.4 light / 0.06 dark</>} />
        <Row label="Numeral" value={<>Mono 56px medium <code style={c()}>tracking-[-0.04em]</code> in <code style={c()}>text-copper</code> · zero margin top, just under its eyebrow</>} />
        <Row label="Prose explainer" value={<>One sentence, sans 13, muted. Templated: <code style={c()}>{`{dose} of coffee yielded {yieldOrWater} of {espresso|brew} in {time}.`}</code></>} />
        <Row label="Metric row" value={<>Same 4-column grid as the brew card. Ratio cell is repeated here in copper so the numbers stay symmetrical with the brew-card preview elsewhere.</>} />
      </Section>

      <Section title="Conditional content">
        <Row label="No bag linked" value={<>Hide bag link + freshness eyebrow. Show a quiet copper-lt info chip after the brewed-at: "This brew isn't linked to a bag in your library." with "LINK →" affordance.</>} />
        <Row label="No rating" value={<>Replace the rating card with a dashed-border <code style={c()}>border-dashed border-hairline</code> "Rate this brew" affordance — empty stars + "ADD →" copper text.</>} />
        <Row label="No notes" value={<>Same dashed-border affordance: "What did it taste like?" in italic muted, plus "ADD →".</>} />
        <Row label="No water temp / grind / balance" value={<>Hide those rows in the Variables card. If ALL four are empty, hide the Variables card entirely.</>} />
        <Row label="Espresso" value={<>Label is YIELD instead of WATER. No water-temp row.</>} />
      </Section>

      <Section title="Actions footer">
        <Row label="Duplicate" value={<>Pre-fills /new with this brew's values, ratio derived from current bag's stock. <code style={c()}>bg-ink/[0.04]</code> · subtle.</>} />
        <Row label="Delete" value={<><code style={c()}>bg-danger/8 text-danger</code>, opens a sheet/confirm. Removing a brew also reverses the bag-write-back from earlier (returns the dose to the bag's remaining grams).</>} />
        <Row label="No Save here" value={<>Save only exists in /edit. Detail is read-only.</>} />
      </Section>
    </CardShell>
  );
}

// ─── Edit spec ────────────────────────────────────────────────────────
function EditSpecCard() {
  return (
    <CardShell n="04 · EDIT · SPEC" title="/brews/[id]/edit · the answers to your bracket questions">
      <Section title="How does the user know they're editing?">
        <Row label="Top hairline" value={<>A 3px <code style={c()}>bg-copper</code> bar pinned to the very top of the viewport. Persists during scroll. This is the single strongest "you're in edit mode" cue.</>} />
        <Row label="Header eyebrow" value={<>Two stacked eyebrows centered between Cancel and Save: "<strong>EDITING</strong>" in copper (10px, 0.18em tracking, weight 600) on top of "BREW · #N" in standard muted.</>} />
        <Row label="Title removed" value={<>No "New brew" / "Edit brew" h1 on this screen — the eyebrows do the work, and we save vertical space for the actually-changed fields.</>} />
      </Section>

      <Section title="Reset affordance">
        <Row label="Where" value={<>Inline bar just under the header, below 22px gutter. Only visible when <code style={c()}>dirty === true</code>.</>} />
        <Row label="Looks like" value={<>copper-lt bg, 10px-radius pill. Bullet · "<strong>3 unsaved changes</strong> · grind, water temp, notes" · "RESET" button on the right in mono uppercase.</>} />
        <Row label="Behavior" value={<>"RESET" reverts all fields to last-saved values. Triggers a confirmation sheet ("Discard 3 changes?") because Reset is destructive.</>} />
        <Row label="Field-level dirty marker" value={<>Changed fields get a 2px copper bar in their left gutter + a 5px copper dot after the eyebrow label. Cheap, consistent, scannable.</>} />
      </Section>

      <Section title="Save button">
        <Row label="Copy" value={<>"<strong>Save changes</strong>" — yes, swap it from "Save brew". In new-brew mode the existing "Save" stays.</>} />
        <Row label="Disabled when not dirty" value={<>bg-ink/[0.08] · text-muted · not-allowed cursor. Prevents accidental no-op saves and makes the dirty state legible at a glance.</>} />
        <Row label="On tap" value={<>Persists, fires success haptic, navigates to /brews/[id] (detail).</>} />
      </Section>

      <Section title="Back / Cancel">
        <Row label="Back goes to /brews/[id]" value={<>Always. You came FROM detail (via the top-right Edit), so back returns you there. If user navigated directly via URL, fall back to /brews.</>} />
        <Row label="Cancel = back" value={<>Same destination. If dirty, intercept with a "Discard 3 changes?" sheet. If clean, navigate immediately.</>} />
      </Section>

      <Section title="Delete">
        <Row label="Where" value={<>Only on /brews/[id] detail — NOT in the form. Forms are for editing fields; deleting a record is a different verb and belongs to the detail page.</>} />
      </Section>

      <Section title="Field set">
        <Row label="Identical to /new" value={<>method · COFFEE bag picker · dose · yield · ratio quick + computed · <strong>GRIND</strong> (free-form input + grinder hint) · <strong>WATER TEMP</strong> (number °C) · <strong>BREW TIME</strong> · BALANCE (light/balanced/heavy segmented) · RATING (decimal + stars) · NOTES (Newsreader italic textarea)<br/><br/><em style={{ color: X().muted }}>Order follows the physical brew sequence: weigh → grind → heat → pour → taste.</em></>} />
        <Row label="New for edit" value={<>Grind, water temp, balance, rating already exist on the brew schema — surface them in /new too. The form should be identical between new and edit; only the mode chrome differs.</>} />
      </Section>
    </CardShell>
  );
}

// ─── Stats spec ───────────────────────────────────────────────────────
function StatsSpecCard() {
  return (
    <CardShell n="05 · STATS · SPEC" title="/stats — editorial, not corporate">
      <Section title="Sections in priority order">
        <Row label="1 · Headline" value={<>"<strong>87 brews,</strong> and counting." in display 34. Single most important number first.</>} />
        <Row label="2 · Last 12 weeks" value={<>Sparkbar: 12 vertical bars, last bar highlighted copper. Above: delta vs last week ("↑ 2 vs last week") in success green. Date label on each end.</>} />
        <Row label="3 · Quick stats" value={<>3-card grid: THIS WEEK · AVG RATIO · AVG RATING. THIS WEEK gets copper value to draw the eye.</>} />
        <Row label="4 · Method split" value={<>Two big numbers above a single stacked bar. Copper = pour-over, copperDk = espresso. % below. No pie chart.</>} />
        <Row label="5 · Ratio distribution" value={<>9-bucket histogram from 1:14 to 1:18, pour-over only (espresso has its own range, separate section if ever needed). Median bucket highlighted in copper; dashed copper line marks median. Method-label + brew count in the eyebrow.</>} />
        <Row label="6 · Best brews" value={<>Top 3 rated, compact rows with rank numeral (rank 1 in copper), name, mono meta line (roaster · method · ratio in copper), and rating with stars.</>} />
        <Row label="7 · Bag patterns" value={<>Two stacked cards: MOST BREWED (large bag chip — same anatomy as bag-picker selected state) + FRESHNESS AT BREW (3-color stacked bar with legend underneath).</>} />
        <Row label="8 · Time of day" value={<>24-cell heatmap (one cell per hour) using <code style={c()}>color-mix(in oklab, copper N%, paper)</code> for ramped intensity. NOON / 12AM / 6 / 12 labels below. PEAK hour callout in the eyebrow.</>} />
        <Row label="9 · Pull-quote" value={<>One italic Newsreader observation at the bottom — generated from a few hand-written templates, picks whatever applies most strongly to current data. Examples: "You log more on the weekends." / "Most brews fall between 6:30 and 8 a.m." / "Your ratio variance dropped 20% this month."</>} />
      </Section>

      <Section title="Range pills">
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <RangePillStatic active>12 WEEKS</RangePillStatic>
          <RangePillStatic>6 MO</RangePillStatic>
          <RangePillStatic>ALL</RangePillStatic>
        </div>
        <div style={{ marginTop: 8, fontFamily: XF().ui, fontSize: 12.5, color: X().muted, lineHeight: 1.5 }}>
          Top-right of the screen. Mono uppercase, h-7. Active = filled ink. Default = 12 WEEKS so the sparkbar is always populated for someone who's been logging a couple months.
        </div>
      </Section>

      <Section title="Chart rules (CSS only)">
        <Row label="Bars" value={<>Vertical bars use flex with <code style={c()}>align-items: flex-end</code> and percentage heights. Inactive = #D9CDB6 (a darkened paper), active/highlighted = copper.</>} />
        <Row label="Median marker" value={<>A 1px <code style={c()}>border-dashed border-copper opacity-50</code> vertical line over the histogram. Computed from data, not hard-coded.</>} />
        <Row label="Heatmap intensity" value={<><code style={c()}>color-mix(in oklab, var(--color-copper) {`{20 + ratio * 80}%`}, var(--color-paper))</code>. Empty hours = bg-paper at 0.06 alpha.</>} />
        <Row label="No JS chart libs" value={<>Period. Recharts, D3, victory — all banned. Everything's a flex container or an inline SVG.</>} />
        <Row label="Numbers everywhere" value={<>Always mono. Eyebrows always mono uppercase. Never serif for chart labels.</>} />
      </Section>

      <Section title="What's NOT here (and why)">
        <Row label="No pie / donut" value={<>Method split reads better as a single stacked bar with side-by-side numbers above. The bar carries proportion, the numbers carry magnitude.</>} />
        <Row label="No line graphs" value={<>For 12 weeks of data, bars are clearer and dot-counts read as accurate. Lines imply continuous data; brewing is discrete events.</>} />
        <Row label="No daily streaks / gamification" value={<>This is a personal log, not Duolingo. Streak shame is the wrong mood.</>} />
        <Row label="No goals / targets" value={<>The user knows what they want; the app doesn't need to set numbers for them.</>} />
        <Row label="Filtering / drill-down" value={<>Cut for V1. Numbers are read-only. If user wants per-bag stats, they go to /bags/[id].</>} />
      </Section>
    </CardShell>
  );
}

function RangePillStatic({ children, active }) {
  return (
    <span style={{
      height: 28, padding: '0 10px', borderRadius: 999,
      background: active ? X().ink : 'transparent',
      color: active ? X().paper : X().muted,
      boxShadow: active ? 'none' : `inset 0 0 0 1px ${X().hairline}`,
      fontFamily: XF().mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
      display: 'inline-flex', alignItems: 'center',
    }}>{children}</span>
  );
}

// ─── Cross-cutting handoff ────────────────────────────────────────────
function CrossCuttingHandoff() {
  return (
    <CardShell n="06 · HANDOFF" title="Implementation notes">
      <Section title="Routing">
        <Row label="/brews/[id]" value={<>Tap a brew card → push detail. Edit (top-right) → /brews/[id]/edit. Bag link → /bags/[bagId]. Back → /brews list.</>} />
        <Row label="/brews/[id]/edit" value={<>Save → /brews/[id] (detail). Cancel → /brews/[id] if dirty-confirmed, /brews/[id] always when clean. Browser back is the same as Cancel.</>} />
        <Row label="/stats" value={<>Accessed from the home page header icon (the stats chevron already mocked). Top-left back → /. Range pill state lives in URL: <code style={c()}>?range=12w|6m|all</code>.</>} />
      </Section>

      <Section title="State">
        <Row label="Dirty tracking" value={<>Compare current form snapshot to original brew snapshot on each keystroke. <code style={c()}>dirty = !deepEqual(form, original)</code>. Per-field dirty markers compare each field individually.</>} />
        <Row label="Form persistence" value={<>Edit form does NOT persist to sessionStorage (unlike /new) — if the user navigates away without saving, they bail out of the edit. Confirm on dirty navigation away.</>} />
        <Row label="Computed values" value={<>Ratio is always derived from dose/yield, never stored. Avg ratio in stats = mean of computed ratios. Median = sorted middle.</>} />
      </Section>

      <Section title="Bag write-back on edit/delete">
        <Row label="On dose change" value={<>If brew has bagId: <code style={c()}>bag.remainingGrams += (oldDose - newDose)</code> on save. Show inline warning under DOSE if this would push remaining below 0.</>} />
        <Row label="On bag change" value={<>Restore old bag's remaining by +oldDose, deduct from new bag by -newDose. Atomic, single transaction.</>} />
        <Row label="On brew delete" value={<>Reverse the original write-back: <code style={c()}>bag.remainingGrams += brew.dose</code>.</>} />
      </Section>

      <Section title="Tailwind class hints">
        <div style={{
          padding: 14, borderRadius: 10, background: X().paper, border: `1px solid ${X().hairline}`,
          fontFamily: XF().mono, fontSize: 11.5, lineHeight: 1.7, color: X().ink70,
        }}>
          <span style={{ color: X().muted }}>// Hero ratio numeral (detail page headline)</span><br/>
          &lt;div class="font-mono font-medium text-[56px] leading-none tracking-[-0.04em] text-copper"&gt;1:16.3&lt;/div&gt;<br/><br/>
          <span style={{ color: X().muted }}>// Edit-mode top hairline</span><br/>
          &lt;div class="fixed top-0 inset-x-0 h-[3px] bg-copper z-[100]"&gt;&lt;/div&gt;<br/><br/>
          <span style={{ color: X().muted }}>// Dirty field bar</span><br/>
          &lt;div class="pl-3 relative"&gt;<br/>
          &nbsp;&nbsp;&lt;div class="absolute left-0 top-[22px] bottom-0 w-[2px] rounded-[2px] bg-copper"&gt;&lt;/div&gt;<br/>
          &nbsp;&nbsp;… field …<br/>
          &lt;/div&gt;<br/><br/>
          <span style={{ color: X().muted }}>// Heatmap cell — color-mix gradient</span><br/>
          style="background: color-mix(in oklab, var(--color-copper) &lcub;20 + ratio * 80&rcub;%, var(--color-paper))"
        </div>
      </Section>

      <Section title="Out of scope (V1)">
        <Row label="Charts" value={<>No JS chart libraries. Sparklines and histograms are CSS flex bars; heatmap is a CSS grid with <code style={c()}>color-mix()</code>.</>} />
        <Row label="No realtime" value={<>Stats compute on screen mount. Recompute on focus, not on a timer.</>} />
        <Row label="No export / share" value={<>Stats are read-only. No screenshot generation, no CSV export. Personal log = personal.</>} />
        <Row label="No drill-down" value={<>Numbers don't link to filtered brew lists in V1. Add later if desired.</>} />
      </Section>
    </CardShell>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
function CardShell({ n, title, children }) {
  return (
    <div style={{
      width: 760, padding: 32, background: X().surface,
      borderRadius: 16, border: `1px solid ${X().hairline}`, fontFamily: XF().ui,
    }}>
      <div style={{
        fontFamily: XF().mono, fontSize: 10.5, color: X().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>{n}</div>
      <h2 style={{
        margin: '6px 0 22px', fontFamily: XF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: X().ink, letterSpacing: '-0.01em',
      }}>{title}</h2>
      {children}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: XF().mono, fontSize: 10.5, fontWeight: 500,
        color: X().muted, letterSpacing: '0.14em', marginBottom: 10,
      }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr',
      gap: 16, padding: '10px 0', borderBottom: `1px solid ${X().hairline}`,
      alignItems: 'baseline',
    }}>
      <div style={{ fontFamily: XF().ui, fontSize: 12.5, fontWeight: 500, color: X().ink }}>{label}</div>
      <div style={{ fontFamily: XF().ui, fontSize: 13.5, color: X().ink70, lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}
function c() {
  return {
    fontFamily: XF().mono, fontSize: 12, padding: '1px 5px',
    background: X().paper, border: `1px solid ${X().hairline}`,
    borderRadius: 4, color: X().ink,
  };
}

Object.assign(window, {
  VibeCard, DetailSpecCard, EditSpecCard, StatsSpecCard, CrossCuttingHandoff,
});
