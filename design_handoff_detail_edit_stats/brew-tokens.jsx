// Design tokens — palette + type scale, presented as reference cards.

const BREW = {
  // surfaces
  paper:    '#F4EFE6',  // page background — warm cream
  surface:  '#FBF8F2',  // raised cards on paper
  card:     '#FFFFFF',  // crisp white when needed (rare)
  // ink
  ink:      '#1C1814',  // primary text — near-black with coffee warmth
  ink70:    '#4A413A',  // strong body
  muted:    '#7A6E63',  // muted/secondary text
  faint:    '#A89D90',  // tertiary/placeholder
  // borders
  hairline: '#E6DFD2',  // 1px borders, dividers
  rule:     '#D9D0BF',  // stronger separators
  // brand
  copper:   '#9C4A1F',  // PRIMARY — replaces amber-700
  copperDk: '#7A3915',  // hover/pressed
  copperLt: '#F0DDC8',  // badge bg, soft fills
  // semantic
  success:  '#4F6B2E',  // olive — good extraction
  warning:  '#B07A14',  // ochre — careful
  danger:   '#A6341B',  // terracotta — destructive
  // dark mode pairs (preview)
  d_paper:  '#16120E',
  d_surface:'#1F1A14',
  d_ink:    '#F2EBDD',
  d_muted:  '#9A8E7E',
  d_rule:   '#2D261D',
  d_copper: '#D2825A',  // lighter for AA on dark
};

const TF = {
  display: '"Newsreader", Georgia, serif',
  ui:      '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono:    '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};

// Tailwind class hints (drop-in vocabulary for the implementation agent).
const TW = {
  primaryBtn:  'h-12 px-5 rounded-xl bg-copper text-paper font-medium tracking-tight active:bg-copper-dk transition-colors',
  secondaryBtn:'h-12 px-5 rounded-xl border border-rule bg-transparent text-ink font-medium tracking-tight active:bg-hairline/60',
  dangerBtn:   'h-12 px-5 rounded-xl bg-danger/8 text-danger font-medium tracking-tight active:bg-danger/14',
  ghostBtn:    'h-11 px-3 rounded-lg text-ink-70 font-medium active:bg-hairline/50',
  input:       'h-12 w-full px-3.5 rounded-xl bg-surface border border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-2 focus:ring-copper/25 outline-none transition',
  chip:        'inline-flex items-center h-8 px-3 rounded-full text-[12px] font-mono uppercase tracking-[0.08em] bg-copper-lt text-copper-dk',
  card:        'rounded-2xl bg-surface border border-hairline p-4',
};

// ─── small atoms ──────────────────────────────────────────────────────
function Eyebrow({ children, style }) {
  return (
    <div style={{
      fontFamily: TF.mono, fontSize: 10.5, fontWeight: 500,
      color: BREW.muted, textTransform: 'uppercase',
      letterSpacing: '0.14em', ...style,
    }}>{children}</div>
  );
}

function Swatch({ name, hex, twName, label, dark = false }) {
  const onDark = isDarkHex(hex);
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${dark ? BREW.d_rule : BREW.hairline}`,
      background: dark ? BREW.d_surface : BREW.surface,
    }}>
      <div style={{
        height: 64, background: hex, position: 'relative',
        borderBottom: `1px solid ${dark ? BREW.d_rule : BREW.hairline}`,
      }}>
        {label && (
          <div style={{
            position: 'absolute', left: 10, bottom: 8,
            fontFamily: TF.mono, fontSize: 10, fontWeight: 500,
            color: onDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{label}</div>
        )}
      </div>
      <div style={{ padding: '10px 12px 11px' }}>
        <div style={{
          fontFamily: TF.ui, fontSize: 12.5, fontWeight: 500,
          color: dark ? BREW.d_ink : BREW.ink, lineHeight: 1.2,
        }}>{name}</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 4, gap: 8,
        }}>
          <span style={{ fontFamily: TF.mono, fontSize: 11, color: dark ? BREW.d_muted : BREW.muted }}>
            {hex.toLowerCase()}
          </span>
          <span style={{
            fontFamily: TF.mono, fontSize: 10, color: dark ? BREW.d_muted : BREW.faint,
            textAlign: 'right',
          }}>{twName}</span>
        </div>
      </div>
    </div>
  );
}

function isDarkHex(h) {
  const m = h.replace('#','');
  const r = parseInt(m.slice(0,2),16), g = parseInt(m.slice(2,4),16), b = parseInt(m.slice(4,6),16);
  return (r*0.299 + g*0.587 + b*0.114) < 140;
}

// ─── PALETTE CARD ─────────────────────────────────────────────────────
function PaletteCard() {
  const lightGroups = [
    { title: 'Surface & ink', items: [
      ['Paper',     BREW.paper,    'bg-paper',     'page'],
      ['Surface',   BREW.surface,  'bg-surface',   'card'],
      ['Ink',       BREW.ink,      'text-ink',     'AAA'],
      ['Muted',     BREW.muted,    'text-muted',   'AA'],
      ['Hairline',  BREW.hairline, 'border-hairline','1px'],
      ['Rule',      BREW.rule,     'border-rule',  '1.5px'],
    ]},
    { title: 'Brand', items: [
      ['Copper',    BREW.copper,   'bg-copper',    'primary'],
      ['Copper dk', BREW.copperDk, 'bg-copper-dk', 'pressed'],
      ['Copper lt', BREW.copperLt, 'bg-copper-lt', 'badge'],
    ]},
    { title: 'Semantic', items: [
      ['Success',   BREW.success,  'text-success', 'olive'],
      ['Warning',   BREW.warning,  'text-warning', 'ochre'],
      ['Danger',    BREW.danger,   'text-danger',  'terracotta'],
    ]},
  ];
  const darkGroups = [
    { title: 'Dark mode pairs', items: [
      ['Paper',     BREW.d_paper,   'dark:bg-paper',   'page'],
      ['Surface',   BREW.d_surface, 'dark:bg-surface', 'card'],
      ['Ink',       BREW.d_ink,     'dark:text-ink',   'AAA'],
      ['Muted',     BREW.d_muted,   'dark:text-muted', 'AA'],
      ['Rule',      BREW.d_rule,    'dark:border-rule','div'],
      ['Copper',    BREW.d_copper,  'dark:bg-copper',  'lighter'],
    ]},
  ];

  return (
    <div style={{
      width: 760, padding: 32, background: BREW.surface,
      borderRadius: 16, border: `1px solid ${BREW.hairline}`,
      fontFamily: TF.ui,
    }}>
      <Eyebrow>01 · Palette</Eyebrow>
      <h2 style={{
        margin: '6px 0 4px',
        fontFamily: TF.display, fontWeight: 500, fontSize: 32, lineHeight: 1.1,
        color: BREW.ink, letterSpacing: '-0.01em',
      }}>A warm room, lit by a single copper lamp.</h2>
      <p style={{
        margin: 0, fontFamily: TF.ui, fontSize: 14, lineHeight: 1.55,
        color: BREW.muted, maxWidth: 560,
      }}>
        Cream paper surfaces, espresso ink, one refined copper accent. Numbers wear monospace
        because every brew is a column of measurements. Hex codes below, Tailwind names beside.
      </p>

      {lightGroups.map(g => (
        <div key={g.title} style={{ marginTop: 28 }}>
          <Eyebrow style={{ marginBottom: 10 }}>{g.title}</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {g.items.map(([n,h,tw,l]) => <Swatch key={n} name={n} hex={h} twName={tw} label={l} />)}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 28, padding: 20, background: BREW.d_paper,
        borderRadius: 12, border: `1px solid ${BREW.d_rule}`,
      }}>
        <Eyebrow style={{ color: BREW.d_muted }}>{darkGroups[0].title}</Eyebrow>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {darkGroups[0].items.map(([n,h,tw,l]) => (
            <Swatch key={n} name={n} hex={h} twName={tw} label={l} dark />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TYPE CARD ────────────────────────────────────────────────────────
function TypeCard() {
  const Row = ({ role, sample, font, size, weight, lh, tracking, twClass, italic }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr 200px',
      gap: 24, padding: '20px 0', borderBottom: `1px solid ${BREW.hairline}`,
      alignItems: 'baseline',
    }}>
      <div>
        <Eyebrow>{role}</Eyebrow>
        <div style={{
          marginTop: 6, fontFamily: TF.mono, fontSize: 11, color: BREW.muted,
        }}>{size}/{lh} · {weight}</div>
      </div>
      <div style={{
        fontFamily: font, fontSize: size, lineHeight: lh / size,
        fontWeight: weight, color: BREW.ink, letterSpacing: tracking,
        fontStyle: italic ? 'italic' : 'normal',
      }}>{sample}</div>
      <div style={{
        fontFamily: TF.mono, fontSize: 10.5, color: BREW.muted,
        textAlign: 'right',
      }}>{twClass}</div>
    </div>
  );

  return (
    <div style={{
      width: 760, padding: 32, background: BREW.surface,
      borderRadius: 16, border: `1px solid ${BREW.hairline}`,
      fontFamily: TF.ui,
    }}>
      <Eyebrow>02 · Type</Eyebrow>
      <h2 style={{
        margin: '6px 0 14px',
        fontFamily: TF.display, fontWeight: 500, fontSize: 32, lineHeight: 1.1,
        color: BREW.ink, letterSpacing: '-0.01em',
      }}>Newsreader · Geist · Geist Mono</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18,
      }}>
        {[
          ['Newsreader', TF.display, 'Display + numerals. Variable serif, 6–72 opsz. Use 400–500. Italic for notes.', '@fontsource-variable/newsreader'],
          ['Geist', TF.ui, 'UI body, labels, buttons. Variable sans, 300–700. Use 400/500/600.', '@fontsource-variable/geist'],
          ['Geist Mono', TF.mono, 'Metrics, eyebrows, hex/codes. Variable mono, 400–600.', '@fontsource-variable/geist-mono'],
        ].map(([n,f,d,pkg]) => (
          <div key={n} style={{
            padding: 14, background: BREW.paper,
            borderRadius: 10, border: `1px solid ${BREW.hairline}`,
          }}>
            <div style={{ fontFamily: f, fontSize: 26, color: BREW.ink, lineHeight: 1, marginBottom: 8 }}>Aa Bb 1234</div>
            <div style={{ fontFamily: TF.ui, fontSize: 13, fontWeight: 600, color: BREW.ink }}>{n}</div>
            <div style={{ fontFamily: TF.ui, fontSize: 12, color: BREW.muted, marginTop: 4, lineHeight: 1.45 }}>{d}</div>
            <div style={{ fontFamily: TF.mono, fontSize: 10, color: BREW.faint, marginTop: 8 }}>{pkg}</div>
          </div>
        ))}
      </div>

      <Row role="Display"  sample="Ethiopia Worka Sakaro"  font={TF.display} size={32} weight={500} lh={36} tracking="-0.01em" twClass="text-[32px] leading-9 font-medium" />
      <Row role="Heading"  sample="This morning's brew"     font={TF.display} size={22} weight={500} lh={28} tracking="-0.005em" twClass="text-[22px] leading-7 font-medium" />
      <Row role="Body"     sample="V60 · 15g in, 245g out, 2:50 · ratio 1:16."  font={TF.ui} size={16} weight={400} lh={24} tracking="0" twClass="text-base leading-6" />
      <Row role="Small"    sample="Yesterday at 7:42 — third pour ran fast"     font={TF.ui} size={13} weight={400} lh={18} tracking="0" twClass="text-[13px] leading-[18px]" />
      <Row role="Metric"   sample="245.0g"                font={TF.mono} size={20} weight={500} lh={22} tracking="-0.01em" twClass="font-mono text-xl" />
      <Row role="Eyebrow"  sample="POUR-OVER"             font={TF.mono} size={11} weight={500} lh={14} tracking="0.14em" twClass="font-mono text-[11px] uppercase tracking-[0.14em]" />
      <Row role="Note"     sample="Tasted like stone fruit on cool-down. Try 95°C next time." font={TF.display} size={15} weight={400} lh={22} tracking="0" italic twClass="font-serif italic text-[15px] leading-[22px]" />
    </div>
  );
}

// ─── COMPONENT CARD ───────────────────────────────────────────────────
function ComponentCard() {
  const btn = (variant) => {
    const styles = {
      primary:   { bg: BREW.copper,    color: '#FBF6EB', border: 'none' },
      secondary: { bg: 'transparent',  color: BREW.ink,  border: `1px solid ${BREW.rule}` },
      danger:    { bg: 'rgba(166,52,27,0.08)', color: BREW.danger, border: 'none' },
      ghost:     { bg: 'transparent',  color: BREW.ink70, border: 'none' },
    }[variant];
    return (
      <button key={variant} style={{
        height: 48, padding: '0 22px', borderRadius: 14,
        background: styles.bg, color: styles.color, border: styles.border,
        fontFamily: TF.ui, fontSize: 15, fontWeight: 500, letterSpacing: '-0.005em',
        cursor: 'pointer',
      }}>{variant === 'primary' ? 'Save brew' : variant === 'danger' ? 'Delete' : variant === 'ghost' ? 'Cancel' : 'Discard'}</button>
    );
  };

  return (
    <div style={{
      width: 760, padding: 32, background: BREW.surface,
      borderRadius: 16, border: `1px solid ${BREW.hairline}`,
      fontFamily: TF.ui,
    }}>
      <Eyebrow>03 · Components</Eyebrow>
      <h2 style={{
        margin: '6px 0 22px', fontFamily: TF.display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: BREW.ink, letterSpacing: '-0.01em',
      }}>The atomic kit.</h2>

      {/* buttons */}
      <Eyebrow style={{ marginBottom: 10 }}>Buttons · h-12 · rounded-xl</Eyebrow>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {['primary','secondary','danger','ghost'].map(btn)}
      </div>

      {/* inputs */}
      <Eyebrow style={{ marginBottom: 10 }}>Inputs · h-12 · rounded-xl · 1px hairline</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <input placeholder="Coffee name" defaultValue="Ethiopia Worka Sakaro" style={inputStyle()} />
        <input placeholder="Roaster" defaultValue="Sey" style={inputStyle()} />
        <input placeholder="Dose (g)" defaultValue="15.0" inputMode="decimal" style={{...inputStyle(), fontFamily: TF.mono}} />
        <input placeholder="Yield (g)" defaultValue="245" inputMode="decimal" style={{...inputStyle(), fontFamily: TF.mono}} />
      </div>
      <textarea rows={2} defaultValue="Stone fruit, jasmine on cool-down. Bypass 10%." style={{
        ...inputStyle(), height: 'auto', padding: '12px 14px',
        fontFamily: TF.display, fontStyle: 'italic', fontSize: 15, resize: 'none',
      }} />

      {/* method picker */}
      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Method picker · segmented · h-12</Eyebrow>
      <MethodPicker />

      {/* quick picks */}
      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Quick-pick chips · ratio · time</Eyebrow>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {['1:15','1:16','1:17','1:18'].map((r,i) => <Chip key={r} active={i===1}>{r}</Chip>)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['2:30','2:45','3:00','3:15','3:30','4:00'].map((t,i) => <Chip key={t} active={i===2}>{t}</Chip>)}
      </div>

      {/* badges */}
      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Badges / chips</Eyebrow>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge>POUR-OVER</Badge>
        <Badge>ESPRESSO</Badge>
        <Badge tone="success">FAVORITE</Badge>
        <Badge tone="warning">DIAL-IN</Badge>
      </div>
    </div>
  );
}

function inputStyle() {
  return {
    height: 48, padding: '0 14px', borderRadius: 14,
    background: BREW.paper, border: `1px solid ${BREW.hairline}`,
    color: BREW.ink, fontFamily: TF.ui, fontSize: 15, width: '100%',
    outline: 'none',
  };
}

function MethodPicker({ value = 'pour' }) {
  const [v, setV] = React.useState(value);
  const opts = [
    { id: 'esp',  label: 'Espresso' },
    { id: 'pour', label: 'Pour-over' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
      height: 48, padding: 4, borderRadius: 14,
      background: BREW.paper, border: `1px solid ${BREW.hairline}`,
    }}>
      {opts.map(o => {
        const active = o.id === v;
        return (
          <button key={o.id} onClick={() => setV(o.id)} style={{
            height: '100%', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: active ? BREW.surface : 'transparent',
            color: active ? BREW.ink : BREW.muted,
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
            fontFamily: TF.ui, fontSize: 14.5, fontWeight: active ? 600 : 500,
            transition: 'all 0.15s',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 14px', borderRadius: 999,
      background: active ? BREW.ink : BREW.paper,
      color: active ? BREW.paper : BREW.ink70,
      border: active ? 'none' : `1px solid ${BREW.hairline}`,
      fontFamily: TF.mono, fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
      cursor: 'pointer',
    }}>{children}</button>
  );
}

function Badge({ children, tone }) {
  const palette = {
    success: { bg: 'rgba(79,107,46,0.10)',  color: '#3F5723' },
    warning: { bg: 'rgba(176,122,20,0.12)', color: '#7A540C' },
  }[tone] || { bg: BREW.copperLt, color: BREW.copperDk };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
      borderRadius: 999, background: palette.bg, color: palette.color,
      fontFamily: TF.mono, fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.12em',
    }}>{children}</span>
  );
}

window.BREW = BREW;
window.TF = TF;
window.TW = TW;
window.BrewEyebrow = Eyebrow;
window.BrewBadge = Badge;
window.BrewChip = Chip;
window.BrewMethodPicker = MethodPicker;
Object.assign(window, { PaletteCard, TypeCard, ComponentCard });
