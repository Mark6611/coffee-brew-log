// Vibe + handoff cards for the bag-picker direction.

const BG = () => window.BREW;
const BGF = () => window.TF;

function BagVibeCard() {
  return (
    <div style={{
      width: 760, padding: 40, background: BG().surface,
      borderRadius: 16, border: `1px solid ${BG().hairline}`,
      fontFamily: BGF().ui,
    }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>00 · DIRECTION</div>
      <h2 style={{
        margin: '8px 0 18px', fontFamily: BGF().display, fontWeight: 500,
        fontSize: 44, lineHeight: 1.05, color: BG().ink, letterSpacing: '-0.02em', textWrap: 'pretty',
      }}>
        One field. The shape of a thought, not two text boxes.
      </h2>
      <p style={{
        margin: '0 0 14px', fontFamily: BGF().display, fontSize: 19, lineHeight: 1.5,
        color: BG().ink70, maxWidth: 620, fontStyle: 'italic', textWrap: 'pretty',
      }}>
        Brewing a coffee is reaching for a specific bag in the cupboard. The form should match
        that action — one motion that picks the right bag, then dissolves into a chip you can
        glance at while you grind.
      </p>
      <p style={{
        margin: 0, fontFamily: BGF().ui, fontSize: 14, lineHeight: 1.6,
        color: BG().muted, maxWidth: 620,
      }}>
        The BagPicker carries all the data the old <code style={c()}>COFFEE</code> + <code style={c()}>ROASTER</code>
        fields did, and more (process, roast date, weight remaining) — which means the rest of the
        form shrinks and the brew card gains genuine signal like freshness color-coding without
        the user typing a single extra word.
      </p>
    </div>
  );
}

function BagSpecsCard() {
  return (
    <div style={{
      width: 760, padding: 32, background: BG().surface,
      borderRadius: 16, border: `1px solid ${BG().hairline}`,
      fontFamily: BGF().ui,
    }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>03 · SPECS</div>
      <h2 style={{
        margin: '6px 0 22px', fontFamily: BGF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: BG().ink, letterSpacing: '-0.01em',
      }}>BagPicker · component spec.</h2>

      <Section title="Shape & sizing">
        <Row label="Empty / typing height" value={<>h-12 · same as every other field</>} />
        <Row label="Selected height" value={<>h-14 (56px) — the chip needs the room for two lines (name + roaster/freshness)</>} />
        <Row label="Radius" value={<>rounded-[14px] — matches inputs</>} />
        <Row label="Dropdown radius" value={<>rounded-2xl (16px) · shadow <code style={c()}>0 12px 32px rgba(28,24,20,0.10)</code></>} />
        <Row label="Dropdown gap" value={<>6px below the trigger; same horizontal extent</>} />
        <Row label="Row height" value={<>min-h-15 (60px) — finger-target; ≥44px hit area for everything</>} />
      </Section>

      <Section title="Color & state">
        <Row label="Idle" value={<>bg-paper · border-hairline · glyph + placeholder in text-faint</>} />
        <Row label="Focused" value={<>border-copper · ring-3 ring-copper/20 · glyph + chevron tint to copper</>} />
        <Row label="Selected (chip)" value={<>bg-copper-lt · border-transparent · 32px copper square holding bean glyph in paper · roaster line in text-copper-dk</>} />
        <Row label="Highlighted row" value={<>bg-paper inside the dropdown (slight inset off the surface) · arrow keys move this</>} />
        <Row label="Match highlight" value={<>matched substring in <code style={c()}>text-copper font-semibold</code> — both name and roaster get this treatment</>} />
        <Row label="Empty bag row" value={<>opacity-50 — bag with 0g remaining is still pickable but visually de-emphasized</>} />
      </Section>

      <Section title="Behavior">
        <Row label="Open trigger" value={<>focus or click — same behavior; mobile keyboard pops the field above the keyboard</>} />
        <Row label="Filter logic" value={<>case-insensitive substring on <code style={c()}>name</code> OR <code style={c()}>roaster</code> · diacritics-folded</>} />
        <Row label="Sort" value={<>by most-recently-brewed first when empty; by best-match (name &gt; roaster) when typing</>} />
        <Row label="Keyboard" value={<>↓/↑ move highlight · Enter selects · Esc closes · Tab closes + commits highlight if any · Backspace on empty input clears the selected chip</>} />
        <Row label="Create new" value={<>row always visible at the bottom when query.length &gt; 0 · Enter when it's highlighted = navigate to <code style={c()}>/bags/new?name=&lt;query&gt;</code> · the form's other fields persist via session storage so user can return mid-brew</>} />
        <Row label="Clear chip" value={<>× button on chip · also clears via Backspace on a focused chip · drops user back into idle state with focus retained</>} />
        <Row label="Tap chip body" value={<>opens <code style={c()}>/bags/[id]</code> in a new history entry — back returns to form intact</>} />
      </Section>

      <Section title="Bag row anatomy">
        <Row label="Left" value={<>30×30 rounded-lg with the bag glyph in ink-70 on bg-paper · 1px hairline</>} />
        <Row label="Middle" value={<>Name (Newsreader 16/medium) over roaster + process badge (text-13 muted + small process pill) — truncate with ellipsis at 1 line</>} />
        <Row label="Right (mono)" value={<>roast age: "<code style={c()}>6d</code>" in freshness color (green ≤14, ochre ≤21, terracotta beyond) · remaining grams "<code style={c()}>215g</code>" in muted mono below</>} />
      </Section>

      <Section title="Process badge palette">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <window.ProcessBadge process="washed" />
          <window.ProcessBadge process="natural" />
          <window.ProcessBadge process="honey" />
          <window.ProcessBadge process="anaerobic" />
        </div>
        <div style={{
          marginTop: 10, fontFamily: BGF().ui, fontSize: 12.5, color: BG().muted, lineHeight: 1.5,
        }}>
          Tonal pills — never use the brand copper for process. Process is reference data; copper is for action.
        </div>
      </Section>

      <Section title="Motion (CSS only)">
        <Row label="Dropdown open" value={<>transform-origin top · scale-y 0.96→1 + opacity 0→1 · 150ms ease-out</>} />
        <Row label="Chip in/out" value={<>opacity + scale-95→100 · 200ms ease-out · the bean square gets a soft 1-frame highlight</>} />
        <Row label="Row highlight" value={<>background-color 100ms — no slide-in</>} />
      </Section>
    </div>
  );
}

function BagDecisionCard() {
  return (
    <div style={{
      width: 760, padding: 32, background: BG().surface,
      borderRadius: 16, border: `1px solid ${BG().hairline}`,
      fontFamily: BGF().ui,
    }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>04 · DECISION</div>
      <h2 style={{
        margin: '6px 0 14px', fontFamily: BGF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: BG().ink, letterSpacing: '-0.01em',
      }}>Brew card · Variation B wins.</h2>

      <p style={{
        margin: '0 0 18px', fontFamily: BGF().ui, fontSize: 14.5, lineHeight: 1.55,
        color: BG().ink70, maxWidth: 640,
      }}>
        The roaster line was already on the card. Promoting it to a tappable link with a 12px
        bag-glyph prefix and a 1px copper underline costs nothing visually and gives the user a
        direct path to the bag detail. The freshness eyebrow ("ROASTED 6 DAYS AGO" in color)
        only exists because the link gives us a roast date — so the bag link is <em>earning</em>
        its real estate by contributing information.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          padding: 14, borderRadius: 12, background: BG().paper,
          border: `1px solid ${BG().hairline}`,
        }}>
          <div style={{ fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', marginBottom: 6 }}>WHY NOT A — BAG PILL</div>
          <p style={{ margin: 0, fontFamily: BGF().ui, fontSize: 13, color: BG().ink70, lineHeight: 1.5 }}>
            Adds a new chip to the metadata row that just says "this brew has a bag." It's a
            signal without information — every brew is going to have one once the bag
            library exists, so the chip becomes wallpaper.
          </p>
        </div>
        <div style={{
          padding: 14, borderRadius: 12, background: BG().paper,
          border: `1px solid ${BG().hairline}`,
        }}>
          <div style={{ fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', marginBottom: 6 }}>WHY NOT C — FOOTER LINE</div>
          <p style={{ margin: 0, fontFamily: BGF().ui, fontSize: 13, color: BG().ink70, lineHeight: 1.5 }}>
            Repeats the coffee name a second time on the same card. Defensible if bag names
            and coffee names will routinely diverge — but for a single-user log, they
            converge to the same string most of the time.
          </p>
        </div>
      </div>

      <div style={{
        marginTop: 22, padding: '14px 16px', borderRadius: 12,
        background: BG().copperLt, color: BG().copperDk,
        fontFamily: BGF().ui, fontSize: 13.5, lineHeight: 1.55,
      }}>
        <strong style={{ fontWeight: 600 }}>Freshness ramp:</strong>
        &nbsp;0–14 days → <code style={c2('#3F5723')}>success / olive</code> ·
        15–21 days → <code style={c2('#7A540C')}>warning / ochre</code> ·
        22+ days → <code style={c2('#7A2913')}>danger / terracotta</code>.
        Same 5px color-dot prefix all three states · text is always mono uppercase eyebrow size.
      </div>
    </div>
  );
}

function BagDetailNotesCard() {
  return (
    <div style={{
      width: 760, padding: 32, background: BG().surface,
      borderRadius: 16, border: `1px solid ${BG().hairline}`,
      fontFamily: BGF().ui,
    }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>05 · BAG DETAIL · /bags/[id]</div>
      <h2 style={{
        margin: '6px 0 14px', fontFamily: BGF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: BG().ink, letterSpacing: '-0.01em',
      }}>Optional · sketch for when you build it.</h2>
      <p style={{
        margin: '0 0 12px', fontFamily: BGF().ui, fontSize: 14, lineHeight: 1.6,
        color: BG().muted, maxWidth: 640,
      }}>
        Hierarchy is: identity → key facts (mono) → consumption bar → linked brews list. The
        consumption bar is the most novel piece — a thin 10px rail, ticked every 100g, filled
        in copper.
      </p>
      <Section title="Anatomy">
        <Row label="Header" value={<>"BAG · #N" eyebrow → bag name (Newsreader 30px) → roaster · origin · process badge</>} />
        <Row label="Key facts (3-col)" value={<>ROASTED (Nd in freshness color) · BREWS (count this bag) · AVG RATIO — all mono 20px values</>} />
        <Row label="Consumption" value={<>"REMAINING <strong>215g</strong> / 340g" · 10px copper rail · auto-deducts <code style={c()}>dose</code> from each linked brew</>} />
        <Row label="Notes" value={<>Newsreader italic, surface card, free-form</>} />
        <Row label="Brews list" value={<>compact row variant: big mono ratio left · date eyebrow + method/time · star if favorited · chevron → brew detail</>} />
        <Row label="Archive" value={<>danger-tinted button at the bottom (not delete — preserves history). Archived bags drop from the picker dropdown but stay reachable from <code style={c()}>/bags?show=archived</code></>} />
      </Section>
    </div>
  );
}

function HandoffNotesCard() {
  return (
    <div style={{
      width: 760, padding: 32, background: BG().surface,
      borderRadius: 16, border: `1px solid ${BG().hairline}`,
      fontFamily: BGF().ui,
    }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, color: BG().muted, letterSpacing: '0.14em', fontWeight: 500,
      }}>06 · HANDOFF · TAILWIND HINTS</div>
      <h2 style={{
        margin: '6px 0 14px', fontFamily: BGF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: BG().ink, letterSpacing: '-0.01em',
      }}>For the implementation agent.</h2>

      <div style={{
        padding: 14, borderRadius: 10, background: BG().paper, border: `1px solid ${BG().hairline}`,
        fontFamily: BGF().mono, fontSize: 11.5, lineHeight: 1.7, color: BG().ink70,
        overflow: 'auto',
      }}>
        <span style={{ color: BG().muted }}>{'// Empty picker shell'}</span><br/>
        &lt;div class="h-12 px-3.5 rounded-[14px] bg-paper border border-hairline flex items-center gap-2.5 transition-all focus-within:border-copper focus-within:ring-3 focus-within:ring-copper/20"&gt;<br/>
        &nbsp;&nbsp;&lt;BagGlyph class="text-muted" /&gt;<br/>
        &nbsp;&nbsp;&lt;input class="flex-1 bg-transparent outline-none text-[15px] placeholder:text-faint" placeholder="Search or add a coffee…" /&gt;<br/>
        &nbsp;&nbsp;&lt;ChevronDown class="text-muted" /&gt;<br/>
        &lt;/div&gt;<br/><br/>
        <span style={{ color: BG().muted }}>{'// Selected chip'}</span><br/>
        &lt;div class="h-14 pl-2.5 pr-2 py-2 rounded-[14px] bg-copper-lt flex items-center gap-2.5"&gt;<br/>
        &nbsp;&nbsp;&lt;div class="w-8 h-8 rounded-[9px] bg-copper grid place-items-center"&gt;&lt;BagGlyph class="text-paper" /&gt;&lt;/div&gt;<br/>
        &nbsp;&nbsp;&lt;div class="flex-1 min-w-0"&gt;<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&lt;div class="font-display text-[17px] font-medium text-ink truncate"&gt;&lcub;bag.name&rcub;&lt;/div&gt;<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&lt;div class="text-[12.5px] text-copper-dk flex items-center gap-1.5"&gt;<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lcub;bag.roaster&rcub; <span style={{ color: BG().copper, opacity: 0.5 }}>·</span> &lt;span class="font-mono" :style&#61;&#123;color: freshnessTone(days)&#125;&gt;&lcub;days&rcub;d&lt;/span&gt;<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;<br/>
        &nbsp;&nbsp;&lt;/div&gt;<br/>
        &nbsp;&nbsp;&lt;button class="w-8 h-8 rounded-full bg-ink/[0.06] grid place-items-center"&gt;&lt;XClear /&gt;&lt;/button&gt;<br/>
        &lt;/div&gt;
      </div>

      <Section title="Wiring rules">
        <Row label="Schema" value={<>Brew gains <code style={c()}>bagId?: string</code> (optional, FK to Bag). On legacy brews without bagId, fall back to the old <code style={c()}>coffeeName</code> + <code style={c()}>roaster</code> fields and hide the freshness eyebrow.</>} />
        <Row label="Bag write-back" value={<>When a brew is saved with a linked bag, deduct <code style={c()}>dose</code> grams from <code style={c()}>bag.remaining</code>. When a brew is edited or deleted, reverse / re-apply the delta.</>} />
        <Row label="Freshness function" value={<>Pure helper: <code style={c()}>freshnessTone(roastedDate)</code> → returns one of the three tokens. Used in 3 places: picker row, chip, brew card eyebrow.</>} />
        <Row label="Cache" value={<>BagPicker preloads the full bag list at form mount (IDB is fast; total bags will stay &lt; 200 for a personal log). Filter runs locally on every keystroke; no debounce needed.</>} />
        <Row label="Accessibility" value={<><code style={c()}>role="combobox"</code> on the input, <code style={c()}>role="listbox"</code> on the dropdown, <code style={c()}>role="option"</code> on rows. <code style={c()}>aria-activedescendant</code> for the highlighted row. Process badges include <code style={c()}>aria-label</code> with full process name (badge text is uppercase-truncated visually).</>} />
        <Row label="Out of scope" value={<>No fuzzy/typo-tolerant search in V1 — straight substring. No bag photos. No barcode scan. No price tracking.</>} />
      </Section>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: BGF().mono, fontSize: 10.5, fontWeight: 500,
        color: BG().muted, letterSpacing: '0.14em', marginBottom: 10,
      }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      gap: 16, padding: '10px 0', borderBottom: `1px solid ${BG().hairline}`,
      alignItems: 'baseline',
    }}>
      <div style={{ fontFamily: BGF().ui, fontSize: 12.5, fontWeight: 500, color: BG().ink }}>{label}</div>
      <div style={{ fontFamily: BGF().ui, fontSize: 13.5, color: BG().ink70, lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}
function c() {
  return {
    fontFamily: BGF().mono, fontSize: 12, padding: '1px 5px',
    background: BG().paper, border: `1px solid ${BG().hairline}`,
    borderRadius: 4, color: BG().ink,
  };
}
function c2(col) {
  return {
    fontFamily: BGF().mono, fontSize: 11, padding: '1px 5px',
    background: 'rgba(255,255,255,0.5)', borderRadius: 4, color: col,
  };
}

Object.assign(window, { BagVibeCard, BagSpecsCard, BagDecisionCard, BagDetailNotesCard, HandoffNotesCard });
