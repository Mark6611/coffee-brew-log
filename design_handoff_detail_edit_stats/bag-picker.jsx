// BagPicker — all states. Designed for use inside the brew form, replacing
// the existing "COFFEE" + "ROASTER" text inputs. Touch-friendly on mobile.

const BP = () => window.BREW;
const BPF = () => window.TF;

// ─────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────
function BagGlyph({ size = 18, color }) {
  const c = color || BP().muted;
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      {/* a coffee bag silhouette — gusset bag with folded top */}
      <path d="M4 5.5 L4 14.5 Q4 15.5 5 15.5 L13 15.5 Q14 15.5 14 14.5 L14 5.5 Z"
            stroke={c} strokeWidth="1.4" fill="none"/>
      <path d="M4 5.5 L4.7 3 Q4.8 2.5 5.4 2.5 L12.6 2.5 Q13.2 2.5 13.3 3 L14 5.5"
            stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
      <path d="M4 5.5 L14 5.5" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}

function ChevronDown({ size = 12, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 4.5L6 8.5L10 4.5" stroke={color || BP().muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function XClear({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke={color || BP().muted} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function PlusGlyph({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 2.5v9M2.5 7h9" stroke={color || BP().copper} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bag fixtures — used everywhere
// ─────────────────────────────────────────────────────────────────────
const BAGS = [
  { id: 'b1', name: 'Ethiopia Worka Sakaro', roaster: 'Sey',         origin: 'Gedeb',     process: 'washed',    roastedDays: 6,  remaining: 215, total: 340 },
  { id: 'b2', name: 'Colombia La Palma',     roaster: 'Onyx',        origin: 'Huila',     process: 'honey',     roastedDays: 14, remaining: 80,  total: 250 },
  { id: 'b3', name: 'Kenya Kiamabara AA',    roaster: 'April',       origin: 'Nyeri',     process: 'washed',    roastedDays: 22, remaining: 12,  total: 250 },
  { id: 'b4', name: 'Guatemala Acatenango',  roaster: 'Square Mile', origin: 'Acatenango',process: 'natural',   roastedDays: 3,  remaining: 340, total: 340 },
  { id: 'b5', name: 'Ethiopia Banko Gotiti', roaster: 'Sey',         origin: 'Yirgacheffe',process:'anaerobic', roastedDays: 8,  remaining: 180, total: 250 },
];

// ─────────────────────────────────────────────────────────────────────
// Process badge — small tonal pill, distinct per process
// ─────────────────────────────────────────────────────────────────────
function ProcessBadge({ process }) {
  const map = {
    washed:    { bg: 'rgba(63,123,162,0.10)', fg: '#3F5B7B', label: 'WASHED' },
    natural:   { bg: 'rgba(166,52,27,0.10)',  fg: '#7A2913', label: 'NATURAL' },
    honey:     { bg: 'rgba(176,122,20,0.14)', fg: '#7A540C', label: 'HONEY' },
    anaerobic: { bg: 'rgba(79,107,46,0.12)',  fg: '#3F5723', label: 'ANAEROBIC' },
  };
  const s = map[process] || map.washed;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 7px',
      borderRadius: 999, background: s.bg, color: s.fg,
      fontFamily: BPF().mono, fontSize: 9.5, fontWeight: 500,
      letterSpacing: '0.12em', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

// Freshness color: <14 days good, 14–21 caution, >21 stale
function freshnessTone(days) {
  if (days <= 14) return BP().success;
  if (days <= 21) return BP().warning;
  return BP().danger;
}

// ─────────────────────────────────────────────────────────────────────
// Shared input shell — drives every state
// ─────────────────────────────────────────────────────────────────────
function Shell({ focused, selected, children, style }) {
  const ringStyle = focused ? {
    borderColor: BP().copper,
    boxShadow: `0 0 0 3px ${BP().copper}22`,
  } : {};
  const selStyle = selected ? {
    background: BP().copperLt,
    borderColor: 'transparent',
  } : {};
  return (
    <div style={{
      minHeight: 48, padding: selected ? '8px 10px 8px 14px' : '0 12px 0 14px',
      width: '100%', borderRadius: 14,
      background: BP().paper,
      border: `1px solid ${BP().hairline}`,
      display: 'flex', alignItems: 'center', gap: 10,
      transition: 'all 0.15s',
      ...ringStyle, ...selStyle, ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Field row in a form (label above)
// ─────────────────────────────────────────────────────────────────────
function FormField({ label, helper, children, style }) {
  return (
    <div style={{ ...style }}>
      <div style={{
        fontFamily: BPF().mono, fontSize: 10.5, fontWeight: 500,
        color: BP().muted, letterSpacing: '0.14em',
        marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        {helper && <span style={{ letterSpacing: 0, textTransform: 'none', fontSize: 11, color: BP().faint }}>{helper}</span>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Dropdown — anatomy used in several states
// ─────────────────────────────────────────────────────────────────────
function Dropdown({ children, attached = true, style }) {
  return (
    <div style={{
      marginTop: attached ? 6 : 0,
      borderRadius: 16, background: BP().surface,
      border: `1px solid ${BP().hairline}`,
      boxShadow: '0 12px 32px rgba(28,24,20,0.10), 0 2px 6px rgba(28,24,20,0.04)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

function DropdownHeader({ children, right }) {
  return (
    <div style={{
      padding: '12px 16px 6px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{
        fontFamily: BPF().mono, fontSize: 10.5, fontWeight: 500,
        color: BP().muted, letterSpacing: '0.14em',
      }}>{children}</span>
      {right}
    </div>
  );
}

function BagRow({ bag, highlight, query }) {
  // highlight = matched substring rendered in copper
  const renderName = () => {
    if (!query) return bag.name;
    const lower = bag.name.toLowerCase();
    const q = query.toLowerCase();
    const i = lower.indexOf(q);
    if (i < 0) return bag.name;
    return <>
      {bag.name.slice(0, i)}
      <mark style={{ background: 'transparent', color: BP().copper, fontWeight: 600 }}>
        {bag.name.slice(i, i + query.length)}
      </mark>
      {bag.name.slice(i + query.length)}
    </>;
  };
  const days = bag.roastedDays;
  const tone = freshnessTone(days);
  const empty = bag.remaining <= 0;
  return (
    <div style={{
      minHeight: 60, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      background: highlight ? BP().paper : 'transparent',
      borderTop: `1px solid ${BP().hairline}`,
      opacity: empty ? 0.5 : 1,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: BP().paper, border: `1px solid ${BP().hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <BagGlyph color={BP().ink70} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: BPF().display, fontSize: 16, fontWeight: 500, lineHeight: 1.2,
          color: BP().ink, letterSpacing: '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{renderName()}</div>
        <div style={{
          fontFamily: BPF().ui, fontSize: 12.5, color: BP().muted, marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{bag.roaster}</span>
          <span style={{ color: BP().faint }}>·</span>
          <ProcessBadge process={bag.process} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: BPF().mono, fontSize: 11, fontWeight: 500,
          color: tone, letterSpacing: '0.04em',
        }}>{days}d</div>
        <div style={{
          fontFamily: BPF().mono, fontSize: 10, color: BP().muted, marginTop: 1,
        }}>{bag.remaining}g</div>
      </div>
    </div>
  );
}

function CreateNewRow({ name }) {
  return (
    <div style={{
      minHeight: 56, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderTop: `1px solid ${BP().hairline}`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: BP().copperLt,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <PlusGlyph color={BP().copper} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: BPF().ui, fontSize: 14.5, fontWeight: 500,
          color: BP().copperDk,
        }}>
          Create new bag
        </div>
        <div style={{
          fontFamily: BPF().display, fontStyle: 'italic', fontSize: 13.5,
          color: BP().ink70, marginTop: 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>"{name}"</div>
      </div>
      <span style={{
        fontFamily: BPF().mono, fontSize: 10.5, color: BP().muted, letterSpacing: '0.1em',
      }}>↗</span>
    </div>
  );
}

function DropdownFooter({ text }) {
  return (
    <div style={{
      padding: '10px 16px 12px',
      borderTop: `1px solid ${BP().hairline}`,
      fontFamily: BPF().mono, fontSize: 10.5, color: BP().muted,
      letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span>{text}</span>
      <span style={{ color: BP().faint }}>↑↓ NAVIGATE · ↵ SELECT · ESC CLOSE</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STATE PANELS — each is one artboard demonstrating one state.
// ═════════════════════════════════════════════════════════════════════
function StateLabel({ n, title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontFamily: BPF().mono, fontSize: 10.5, color: BP().muted,
        letterSpacing: '0.14em', fontWeight: 500,
      }}>STATE · {n}</div>
      <div style={{
        marginTop: 4, fontFamily: BPF().display, fontSize: 20, fontWeight: 500,
        color: BP().ink, letterSpacing: '-0.005em',
      }}>{title}</div>
      {sub && (
        <div style={{
          marginTop: 2, fontFamily: BPF().ui, fontSize: 13, color: BP().muted,
          lineHeight: 1.45,
        }}>{sub}</div>
      )}
    </div>
  );
}

function StatePanel({ width = 380, height = 420, n, title, sub, children }) {
  return (
    <div style={{
      width, height, padding: 24,
      background: BP().surface, borderRadius: 16,
      border: `1px solid ${BP().hairline}`, fontFamily: BPF().ui,
      display: 'flex', flexDirection: 'column',
    }}>
      <StateLabel n={n} title={title} sub={sub} />
      <FormField label="COFFEE">
        {children}
      </FormField>
    </div>
  );
}

// ─── 1. Idle (empty, unfocused) ───────────────────────────────────────
function StateIdle() {
  return (
    <StatePanel n="1 / 6" title="Idle" sub="No selection. Cursor not in field." height={280}>
      <Shell>
        <BagGlyph />
        <span style={{ flex: 1, fontFamily: BPF().ui, fontSize: 15, color: BP().faint }}>
          Search or add a coffee…
        </span>
        <ChevronDown />
      </Shell>
    </StatePanel>
  );
}

// ─── 2. Focused empty (showing recents) ───────────────────────────────
function StateFocused() {
  return (
    <StatePanel n="2 / 6" title="Focused · empty" sub="Tap into the field with nothing typed. Shows recent bags (last brewed)." height={500}>
      <Shell focused>
        <BagGlyph color={BP().copper} />
        <span style={{ flex: 1, fontFamily: BPF().ui, fontSize: 15, color: BP().faint }}>
          Search or add a coffee…
        </span>
        <ChevronDown color={BP().copper} />
      </Shell>
      <Dropdown>
        <DropdownHeader>RECENT BAGS</DropdownHeader>
        {BAGS.slice(0, 3).map(b => <BagRow key={b.id} bag={b} />)}
        <DropdownFooter text="3 recent" />
      </Dropdown>
    </StatePanel>
  );
}

// ─── 3. Typing with results ───────────────────────────────────────────
function StateTyping() {
  const q = 'ethio';
  const matches = BAGS.filter(b => b.name.toLowerCase().includes(q) || b.roaster.toLowerCase().includes(q));
  return (
    <StatePanel n="3 / 6" title="Typing · results" sub="Filtered by name OR roaster. Match highlighted in copper." height={450}>
      <Shell focused>
        <BagGlyph color={BP().copper} />
        <span style={{ flex: 1, fontFamily: BPF().ui, fontSize: 15, color: BP().ink }}>
          ethio<span style={{
            display: 'inline-block', width: 1.5, height: 18,
            background: BP().copper, marginLeft: 1, verticalAlign: 'middle',
            animation: 'none',
          }} />
        </span>
        <span style={{
          fontFamily: BPF().mono, fontSize: 10.5, color: BP().muted, letterSpacing: '0.1em',
        }}>{matches.length} MATCH{matches.length !== 1 && 'ES'}</span>
      </Shell>
      <Dropdown>
        {matches.map((b, i) => <BagRow key={b.id} bag={b} query={q} highlight={i === 0} />)}
        <CreateNewRow name="ethio" />
      </Dropdown>
    </StatePanel>
  );
}

// ─── 4. Typing no results ─────────────────────────────────────────────
function StateNoResults() {
  return (
    <StatePanel n="4 / 6" title="Typing · no match" sub="Nothing in library matches. Only affordance is to create the bag." height={340}>
      <Shell focused>
        <BagGlyph color={BP().copper} />
        <span style={{ flex: 1, fontFamily: BPF().ui, fontSize: 15, color: BP().ink }}>
          Panama Esmeralda<span style={{
            display: 'inline-block', width: 1.5, height: 18,
            background: BP().copper, marginLeft: 1, verticalAlign: 'middle',
          }} />
        </span>
        <span style={{
          fontFamily: BPF().mono, fontSize: 10.5, color: BP().muted, letterSpacing: '0.1em',
        }}>0 MATCHES</span>
      </Shell>
      <Dropdown>
        <CreateNewRow name="Panama Esmeralda" />
        <DropdownFooter text="Enter to create" />
      </Dropdown>
    </StatePanel>
  );
}

// ─── 5. Selected (the most important state) ───────────────────────────
function StateSelected() {
  const bag = BAGS[0];
  return (
    <StatePanel n="5 / 6" title="Selected" sub="Bag is linked. Field renders as a tinted chip showing what was picked. ‘×’ clears." height={310}>
      <Shell selected>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: BP().copper,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BagGlyph color="#FBF6EB" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: BPF().display, fontSize: 17, fontWeight: 500, lineHeight: 1.15,
            color: BP().ink, letterSpacing: '-0.005em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{bag.name}</div>
          <div style={{
            fontFamily: BPF().ui, fontSize: 12.5, color: BP().copperDk, marginTop: 2,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{bag.roaster}</span>
            <span style={{ color: BP().copper, opacity: 0.5 }}>·</span>
            <span style={{
              fontFamily: BPF().mono, fontSize: 11,
              color: freshnessTone(bag.roastedDays),
            }}>{bag.roastedDays}d</span>
          </div>
        </div>
        <button style={{
          width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'rgba(28,24,20,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <XClear color={BP().ink70} />
        </button>
      </Shell>
      <div style={{
        marginTop: 10, fontFamily: BPF().ui, fontSize: 12, color: BP().muted, lineHeight: 1.45,
      }}>
        Tapping the chip body opens the bag detail. Tapping × clears the link
        and restores the empty/idle field below.
      </div>
    </StatePanel>
  );
}

// ─── 6. Dropdown anatomy (exploded reference) ─────────────────────────
function StateAnatomy() {
  return (
    <StatePanel n="6 / 6" title="Dropdown anatomy" sub="Full set of slots: header, row, highlighted row, ‘create new’, footer." height={620}>
      <Dropdown>
        <DropdownHeader right={
          <span style={{ fontFamily: BPF().mono, fontSize: 10, color: BP().faint, letterSpacing: '0.08em' }}>
            SORTED BY ↓ ROASTED
          </span>
        }>RECENT BAGS</DropdownHeader>
        <BagRow bag={BAGS[3]} highlight />
        <BagRow bag={BAGS[0]} />
        <BagRow bag={BAGS[4]} />
        <BagRow bag={BAGS[1]} />
        <BagRow bag={BAGS[2]} />
        <CreateNewRow name="Type to add new bag" />
        <DropdownFooter text="5 BAGS" />
      </Dropdown>
    </StatePanel>
  );
}

// ═════════════════════════════════════════════════════════════════════
// IN-CONTEXT — the picker placed in a form fragment
// ═════════════════════════════════════════════════════════════════════
function InFormContext({ state = 'selected' }) {
  return (
    <div style={{
      width: 380, padding: 24, background: BP().paper,
      borderRadius: 16, border: `1px solid ${BP().hairline}`,
      fontFamily: BPF().ui,
    }}>
      <div style={{
        fontFamily: BPF().mono, fontSize: 10.5, fontWeight: 500,
        color: BP().muted, letterSpacing: '0.14em', marginBottom: 8,
      }}>NEW BREW · FORM FRAGMENT</div>

      <FormField label="METHOD" style={{ marginBottom: 18 }}>
        <window.BrewMethodPicker />
      </FormField>

      <FormField label="COFFEE" helper="links to a bag in your library" style={{ marginBottom: 18 }}>
        {state === 'selected' ? (
          <Shell selected>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: BP().copper,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><BagGlyph color="#FBF6EB" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: BPF().display, fontSize: 17, fontWeight: 500, lineHeight: 1.15,
                color: BP().ink, letterSpacing: '-0.005em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>Ethiopia Worka Sakaro</div>
              <div style={{
                fontFamily: BPF().ui, fontSize: 12.5, color: BP().copperDk, marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>Sey</span>
                <span style={{ color: BP().copper, opacity: 0.5 }}>·</span>
                <span style={{ fontFamily: BPF().mono, fontSize: 11, color: BP().success }}>6d</span>
              </div>
            </div>
            <button style={{
              width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(28,24,20,0.06)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><XClear color={BP().ink70} /></button>
          </Shell>
        ) : (
          <Shell>
            <BagGlyph />
            <span style={{ flex: 1, fontFamily: BPF().ui, fontSize: 15, color: BP().faint }}>
              Search or add a coffee…
            </span>
            <ChevronDown />
          </Shell>
        )}
      </FormField>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12,
      }}>
        <FormField label="DOSE">
          <div style={{
            height: 56, padding: '0 14px', borderRadius: 14,
            background: BP().surface, border: `1px solid ${BP().hairline}`,
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ fontFamily: BPF().mono, fontSize: 22, fontWeight: 500, color: BP().ink }}>15.0</span>
            <span style={{ fontFamily: BPF().mono, fontSize: 13, color: BP().muted }}>g</span>
          </div>
        </FormField>
        <FormField label="YIELD">
          <div style={{
            height: 56, padding: '0 14px', borderRadius: 14,
            background: BP().surface, border: `1px solid ${BP().hairline}`,
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ fontFamily: BPF().mono, fontSize: 22, fontWeight: 500, color: BP().ink }}>245</span>
            <span style={{ fontFamily: BPF().mono, fontSize: 13, color: BP().muted }}>g</span>
          </div>
        </FormField>
      </div>

      <div style={{
        marginTop: 14, padding: '10px 12px', borderRadius: 10,
        background: BP().copperLt, color: BP().copperDk,
        fontFamily: BPF().ui, fontSize: 12, lineHeight: 1.5,
      }}>
        <strong style={{ fontWeight: 600 }}>Why one combined field?</strong> The old "COFFEE" +
        "ROASTER" pair encouraged free-typing duplicates. Linking to a bag captures roast date,
        process, and remaining weight automatically — the form gets shorter, the data gets richer.
      </div>
    </div>
  );
}

window.BAGS = BAGS;
window.BagGlyph = BagGlyph;
window.ProcessBadge = ProcessBadge;
window.freshnessTone = freshnessTone;

Object.assign(window, {
  StateIdle, StateFocused, StateTyping, StateNoResults, StateSelected, StateAnatomy,
  InFormContext,
});
