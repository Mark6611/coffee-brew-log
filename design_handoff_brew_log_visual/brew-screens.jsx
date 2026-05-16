// Three phone mockups: Home, Brew List, New Brew.
// All use the design tokens from brew-tokens.jsx (window.BREW / TF).

const B = () => window.BREW;
const F = () => window.TF;

// ─── shared in-app chrome ─────────────────────────────────────────────
function AppStatusBar({ dark = false }) {
  // tiny custom status bar tinted to the page (the device frame draws its own;
  // this is the safe-area top within the app)
  return (
    <div style={{
      height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 22px 6px',
    }}>
      <span style={{
        fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 600,
        fontSize: 16, color: dark ? B().d_ink : B().ink,
      }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: 0.85 }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill={dark ? B().d_ink : B().ink}>
          <rect x="0" y="7" width="3" height="4" rx="0.6"/><rect x="4.7" y="5" width="3" height="6" rx="0.6"/>
          <rect x="9.4" y="2.5" width="3" height="8.5" rx="0.6"/><rect x="14.1" y="0" width="3" height="11" rx="0.6"/>
        </g></svg>
        <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke={dark ? B().d_ink : B().ink} fill="none" opacity="0.4"/><rect x="2" y="2" width="13" height="7" rx="1.2" fill={dark ? B().d_ink : B().ink}/></svg>
      </div>
    </div>
  );
}

function AppHeader({ eyebrow, title, action, dark = false }) {
  return (
    <div style={{
      padding: '14px 22px 18px',
    }}>
      {eyebrow && <window.BrewEyebrow style={{ color: dark ? B().d_muted : B().muted, marginBottom: 6 }}>{eyebrow}</window.BrewEyebrow>}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{
          margin: 0, fontFamily: F().display, fontWeight: 500,
          fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.015em',
          color: dark ? B().d_ink : B().ink,
        }}>{title}</h1>
        {action}
      </div>
    </div>
  );
}

function HeaderAction({ icon, dark }) {
  return (
    <button style={{
      width: 38, height: 38, borderRadius: 999, border: 'none', cursor: 'pointer',
      background: dark ? B().d_surface : B().surface,
      boxShadow: `0 0 0 1px ${dark ? B().d_rule : B().hairline}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: dark ? B().d_ink : B().ink,
    }}>{icon}</button>
  );
}

// ─── tiny SVG icons (stroke icons — placeholder/intentional) ──────────
const Icons = {
  plus: (c='currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
  search: (c='currentColor') => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.6"/><path d="M11.2 11.2L15 15" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  filter: (c='currentColor') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14M3 8h10M5.5 12.5h5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  back: (c='currentColor') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L4 8l6 5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  bean: (c='currentColor') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M14.5 3C18 4.5 18.5 11 15 14.5C11.5 18 5 17.5 3.5 14C2 10.5 5 5 8.5 3.5C10.5 2.6 12.7 2.2 14.5 3z" stroke={c} strokeWidth="1.4"/>
      <path d="M13 4.5C10.5 7 7.5 11.5 5.5 15" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  stats: (c='currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14V9M9 14V4M15 14v-7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>
  ),
};

// ─── brew card ────────────────────────────────────────────────────────
function BrewCard({ method, name, roaster, dose, yield_, time, ratio, note, time_ago, fav, dark }) {
  const isEsp = method === 'ESPRESSO';
  return (
    <div style={{
      padding: '16px 18px 18px', borderRadius: 18,
      background: dark ? B().d_surface : B().surface,
      border: `1px solid ${dark ? B().d_rule : B().hairline}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <window.BrewBadge>{method}</window.BrewBadge>
          {fav && <window.BrewBadge tone="success">★</window.BrewBadge>}
        </div>
        <span style={{ fontFamily: F().mono, fontSize: 11, color: dark ? B().d_muted : B().muted, letterSpacing: '0.04em' }}>
          {time_ago}
        </span>
      </div>

      <div style={{
        fontFamily: F().display, fontSize: 22, fontWeight: 500, lineHeight: 1.15,
        letterSpacing: '-0.005em', color: dark ? B().d_ink : B().ink,
      }}>{name}</div>
      {roaster && (
        <div style={{
          fontFamily: F().ui, fontSize: 13, color: dark ? B().d_muted : B().muted, marginTop: 2,
        }}>{roaster}</div>
      )}

      {/* metric row */}
      <div style={{
        marginTop: 14, display: 'grid',
        gridTemplateColumns: isEsp ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
        gap: 4,
        borderTop: `1px solid ${dark ? B().d_rule : B().hairline}`, paddingTop: 12,
      }}>
        <Metric label={isEsp ? 'DOSE' : 'COFFEE'} value={dose} dark={dark} />
        <Metric label={isEsp ? 'YIELD' : 'WATER'} value={yield_} dark={dark} />
        <Metric label="TIME" value={time} dark={dark} />
        <Metric label="RATIO" value={ratio} dark={dark} accent />
      </div>

      {note && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: `1px dashed ${dark ? B().d_rule : B().hairline}`,
          fontFamily: F().display, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.45,
          color: dark ? B().d_ink : B().ink70,
        }}>{note}</div>
      )}
    </div>
  );
}

function Metric({ label, value, accent, dark }) {
  return (
    <div>
      <div style={{
        fontFamily: F().mono, fontSize: 9.5, fontWeight: 500,
        color: dark ? B().d_muted : B().muted, letterSpacing: '0.14em',
      }}>{label}</div>
      <div style={{
        fontFamily: F().mono, fontSize: 17, fontWeight: 500,
        color: accent ? (dark ? B().d_copper : B().copper) : (dark ? B().d_ink : B().ink),
        marginTop: 2, letterSpacing: '-0.01em',
      }}>{value}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN 1 · HOME
// ═════════════════════════════════════════════════════════════════════
function HomeScreen({ dark = false }) {
  const bg = dark ? B().d_paper : B().paper;
  return (
    <div style={{ width: 402, height: 874, background: bg, fontFamily: F().ui, overflow: 'hidden' }}>
      <AppStatusBar dark={dark} />
      <AppHeader
        eyebrow="THURSDAY · MAY 16"
        title={<>Good morning.<br/><span style={{ color: dark ? B().d_muted : B().muted, fontStyle: 'italic' }}>Brew #87.</span></>}
        action={<HeaderAction icon={Icons.stats(dark ? B().d_ink : B().ink)} dark={dark} />}
        dark={dark}
      />

      {/* hero — last brew */}
      <div style={{ padding: '4px 22px 0' }}>
        <window.BrewEyebrow style={{ color: dark ? B().d_muted : B().muted, marginBottom: 10 }}>
          Last brew · yesterday
        </window.BrewEyebrow>
        <div style={{
          padding: 22, borderRadius: 22,
          background: dark ? B().d_surface : B().surface,
          border: `1px solid ${dark ? B().d_rule : B().hairline}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 140, height: 140,
            borderRadius: 999, background: B().copperLt, opacity: dark ? 0.08 : 0.5,
          }}/>
          <window.BrewBadge>POUR-OVER · V60</window.BrewBadge>
          <div style={{
            marginTop: 12, fontFamily: F().display, fontSize: 26, fontWeight: 500,
            lineHeight: 1.1, color: dark ? B().d_ink : B().ink, letterSpacing: '-0.01em',
          }}>Ethiopia<br/>Worka Sakaro</div>
          <div style={{
            fontFamily: F().ui, fontSize: 13, color: dark ? B().d_muted : B().muted, marginTop: 4,
          }}>Sey Coffee · washed</div>

          <div style={{
            marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
            position: 'relative',
          }}>
            <Metric label="DOSE" value="15.0g" dark={dark} />
            <Metric label="WATER" value="245g" dark={dark} />
            <Metric label="TIME" value="2:50" dark={dark} />
            <Metric label="RATIO" value="1:16.3" dark={dark} accent />
          </div>

          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: `1px dashed ${dark ? B().d_rule : B().hairline}`,
            fontFamily: F().display, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.45,
            color: dark ? B().d_ink : B().ink70,
          }}>
            "Stone fruit, jasmine on cool-down. Third pour ran fast — slow bloom next time."
          </div>
        </div>
      </div>

      {/* primary CTA */}
      <div style={{ padding: '18px 22px 6px' }}>
        <button style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: B().copper, color: '#FBF6EB',
          fontFamily: F().ui, fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 3px rgba(0,0,0,0.08)',
        }}>
          {Icons.plus('#FBF6EB')} New brew
        </button>
      </div>

      {/* quick stats */}
      <div style={{ padding: '18px 22px 0' }}>
        <window.BrewEyebrow style={{ color: dark ? B().d_muted : B().muted, marginBottom: 10 }}>
          This week
        </window.BrewEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            ['BREWS', '12'],
            ['AVG RATIO', '1:16.4'],
            ['FAVORITES', '3'],
          ].map(([l,v]) => (
            <div key={l} style={{
              padding: '14px 14px 16px', borderRadius: 14,
              background: dark ? B().d_surface : B().surface,
              border: `1px solid ${dark ? B().d_rule : B().hairline}`,
            }}>
              <div style={{
                fontFamily: F().mono, fontSize: 10, color: dark ? B().d_muted : B().muted,
                letterSpacing: '0.14em', fontWeight: 500,
              }}>{l}</div>
              <div style={{
                marginTop: 4, fontFamily: F().display, fontSize: 24, fontWeight: 500,
                color: dark ? B().d_ink : B().ink, letterSpacing: '-0.01em',
              }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN 2 · BREW LIST
// ═════════════════════════════════════════════════════════════════════
function ListScreen({ dark = false }) {
  const bg = dark ? B().d_paper : B().paper;
  const brews = [
    {
      method: 'POUR-OVER', name: 'Ethiopia Worka Sakaro', roaster: 'Sey · washed',
      dose: '15.0g', yield_: '245g', time: '2:50', ratio: '1:16.3',
      note: 'Stone fruit, jasmine on cool-down.', time_ago: 'YESTERDAY', fav: true,
    },
    {
      method: 'ESPRESSO', name: 'Colombia La Palma', roaster: 'Onyx · honey',
      dose: '18.0g', yield_: '37g', time: '0:28', ratio: '1:2.1',
      time_ago: 'TUE · 7:12',
    },
    {
      method: 'POUR-OVER', name: 'Kenya Kiamabara AA', roaster: 'April · washed',
      dose: '14.5g', yield_: '232g', time: '3:05', ratio: '1:16.0',
      note: 'Blackcurrant. Slightly under — grind finer.', time_ago: 'MON · 6:48',
    },
    {
      method: 'ESPRESSO', name: 'Colombia La Palma', roaster: 'Onyx · honey',
      dose: '18.0g', yield_: '36g', time: '0:31', ratio: '1:2.0',
      time_ago: 'SUN · 8:20',
    },
  ];
  return (
    <div style={{ width: 402, height: 874, background: bg, fontFamily: F().ui, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppStatusBar dark={dark} />
      <AppHeader
        eyebrow="ALL TIME · 87"
        title="Brews"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <HeaderAction icon={Icons.search(dark ? B().d_ink : B().ink)} dark={dark} />
            <HeaderAction icon={Icons.filter(dark ? B().d_ink : B().ink)} dark={dark} />
          </div>
        }
        dark={dark}
      />

      {/* filter pills */}
      <div style={{ padding: '0 22px 12px', display: 'flex', gap: 8, overflow: 'hidden' }}>
        {[['All', true], ['Pour-over', false], ['Espresso', false], ['Favorites', false]].map(([l, active]) => (
          <button key={l} style={{
            height: 32, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: active ? (dark ? B().d_ink : B().ink) : 'transparent',
            color: active ? (dark ? B().d_paper : B().paper) : (dark ? B().d_muted : B().muted),
            boxShadow: active ? 'none' : `inset 0 0 0 1px ${dark ? B().d_rule : B().hairline}`,
            fontFamily: F().ui, fontSize: 13, fontWeight: 500,
            whiteSpace: 'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {/* list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 22px 100px' }}>
        {/* day group header */}
        <DayHeader dark={dark}>YESTERDAY · MAY 15</DayHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          <BrewCard {...brews[0]} dark={dark} />
        </div>

        <DayHeader dark={dark}>TUESDAY · MAY 13</DayHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          <BrewCard {...brews[1]} dark={dark} />
        </div>

        <DayHeader dark={dark}>MONDAY · MAY 12</DayHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          <BrewCard {...brews[2]} dark={dark} />
        </div>

        <DayHeader dark={dark}>SUNDAY · MAY 11</DayHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BrewCard {...brews[3]} dark={dark} />
        </div>
      </div>

      {/* floating action button */}
      <div style={{ position: 'absolute', right: 22, bottom: 50, zIndex: 30 }}>
        <button style={{
          width: 60, height: 60, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: B().copper, color: '#FBF6EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(156, 74, 31, 0.35), 0 2px 6px rgba(0,0,0,0.12)',
        }}>{Icons.plus('#FBF6EB')}</button>
      </div>
    </div>
  );
}

function DayHeader({ children, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 10px',
    }}>
      <window.BrewEyebrow style={{ color: dark ? B().d_muted : B().muted }}>{children}</window.BrewEyebrow>
      <div style={{ flex: 1, height: 1, background: dark ? B().d_rule : B().hairline }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN 3 · NEW BREW FORM
// ═════════════════════════════════════════════════════════════════════
function NewBrewScreen({ dark = false }) {
  const bg = dark ? B().d_paper : B().paper;
  return (
    <div style={{ width: 402, height: 874, background: bg, fontFamily: F().ui, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppStatusBar dark={dark} />

      {/* form header (different from home — has cancel/save) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 18px 10px',
      }}>
        <button style={{
          height: 36, padding: '0 4px', border: 'none', background: 'transparent',
          color: dark ? B().d_muted : B().muted, fontFamily: F().ui, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {Icons.back(dark ? B().d_muted : B().muted)} Cancel
        </button>
        <window.BrewEyebrow style={{ color: dark ? B().d_muted : B().muted }}>BREW #88</window.BrewEyebrow>
        <button style={{
          height: 36, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: B().copper, color: '#FBF6EB',
          fontFamily: F().ui, fontSize: 14, fontWeight: 600,
        }}>Save</button>
      </div>

      <h1 style={{
        margin: '6px 22px 18px', fontFamily: F().display, fontWeight: 500,
        fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.015em',
        color: dark ? B().d_ink : B().ink,
      }}>New brew</h1>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 40px' }}>

        {/* method picker */}
        <FieldLabel dark={dark}>METHOD</FieldLabel>
        <div style={{ marginBottom: 18 }}>
          <window.BrewMethodPicker />
        </div>

        {/* coffee */}
        <FieldLabel dark={dark}>COFFEE</FieldLabel>
        <input placeholder="e.g. Ethiopia Worka Sakaro" defaultValue="Ethiopia Worka Sakaro" style={fieldStyle(dark)} />
        <input placeholder="Roaster" defaultValue="Sey Coffee" style={{...fieldStyle(dark), marginTop: 8}} />

        {/* dose + yield row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <div>
            <FieldLabel dark={dark}>DOSE</FieldLabel>
            <NumberField value="15.0" suffix="g" dark={dark} />
          </div>
          <div>
            <FieldLabel dark={dark}>YIELD</FieldLabel>
            <NumberField value="245" suffix="g" dark={dark} />
          </div>
        </div>

        {/* ratio quick pick */}
        <FieldLabel dark={dark} style={{ marginTop: 16 }}>RATIO · QUICK</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['1:15','1:16','1:17','1:18'].map((r,i) => (
            <window.BrewChip key={r} active={i===1}>{r}</window.BrewChip>
          ))}
          <span style={{
            display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 10px',
            fontFamily: F().mono, fontSize: 12, color: dark ? B().d_copper : B().copper,
            background: dark ? 'rgba(210,130,90,0.10)' : B().copperLt,
            borderRadius: 999, letterSpacing: '-0.01em',
          }}>= 1:16.3 actual</span>
        </div>

        {/* time */}
        <FieldLabel dark={dark} style={{ marginTop: 18 }}>BREW TIME</FieldLabel>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NumberField value="2" suffix="min" dark={dark} compact />
          <NumberField value="50" suffix="sec" dark={dark} compact />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {['2:30','2:45','3:00','3:15'].map((t,i) => (
            <window.BrewChip key={t} active={false}>{t}</window.BrewChip>
          ))}
        </div>

        {/* notes */}
        <FieldLabel dark={dark} style={{ marginTop: 18 }}>NOTES</FieldLabel>
        <textarea
          rows={3}
          defaultValue="Stone fruit, jasmine on cool-down. Third pour ran fast — slow bloom next time."
          style={{
            ...fieldStyle(dark), height: 'auto', padding: '14px 14px',
            fontFamily: F().display, fontStyle: 'italic', fontSize: 15, lineHeight: 1.45,
            resize: 'none',
          }}
        />
      </div>
    </div>
  );
}

function FieldLabel({ children, dark, style }) {
  return (
    <div style={{
      fontFamily: F().mono, fontSize: 10.5, fontWeight: 500,
      color: dark ? B().d_muted : B().muted, letterSpacing: '0.14em',
      marginBottom: 8, marginTop: 4, ...style,
    }}>{children}</div>
  );
}

function fieldStyle(dark) {
  return {
    height: 48, width: '100%', padding: '0 14px', borderRadius: 14,
    background: dark ? B().d_surface : B().surface,
    border: `1px solid ${dark ? B().d_rule : B().hairline}`,
    color: dark ? B().d_ink : B().ink,
    fontFamily: F().ui, fontSize: 15, outline: 'none',
  };
}

function NumberField({ value, suffix, dark, compact }) {
  return (
    <div style={{
      height: 56, padding: '0 16px', borderRadius: 14,
      background: dark ? B().d_surface : B().surface,
      border: `1px solid ${dark ? B().d_rule : B().hairline}`,
      display: 'flex', alignItems: 'baseline', gap: 6, flex: 1,
    }}>
      <span style={{
        fontFamily: F().mono, fontSize: 24, fontWeight: 500,
        color: dark ? B().d_ink : B().ink, letterSpacing: '-0.02em',
      }}>{value}</span>
      <span style={{
        fontFamily: F().mono, fontSize: 13, color: dark ? B().d_muted : B().muted,
      }}>{suffix}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN 4 · EMPTY STATE
// ═════════════════════════════════════════════════════════════════════
function EmptyScreen({ dark = false }) {
  const bg = dark ? B().d_paper : B().paper;
  return (
    <div style={{ width: 402, height: 874, background: bg, fontFamily: F().ui, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppStatusBar dark={dark} />
      <AppHeader eyebrow="ALL TIME · 0" title="Brews" dark={dark} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 40px 80px',
        textAlign: 'center',
      }}>
        {/* big copper bean */}
        <div style={{
          width: 96, height: 96, borderRadius: 999,
          background: dark ? 'rgba(210,130,90,0.10)' : B().copperLt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <ellipse cx="28" cy="28" rx="18" ry="22" transform="rotate(-22 28 28)"
              stroke={dark ? B().d_copper : B().copper} strokeWidth="2"/>
            <path d="M20 14 Q28 28 36 42" stroke={dark ? B().d_copper : B().copper} strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <h2 style={{
          margin: 0, fontFamily: F().display, fontWeight: 500, fontSize: 26,
          lineHeight: 1.15, letterSpacing: '-0.01em',
          color: dark ? B().d_ink : B().ink,
        }}>No brews yet.</h2>
        <p style={{
          margin: '8px 0 28px', fontFamily: F().display, fontStyle: 'italic',
          fontSize: 15, lineHeight: 1.5, color: dark ? B().d_muted : B().muted,
          maxWidth: 280,
        }}>
          Your first cup of the morning is also the start of a record. Log it and we'll watch the numbers settle.
        </p>
        <button style={{
          height: 52, padding: '0 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: B().copper, color: '#FBF6EB',
          fontFamily: F().ui, fontSize: 15, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>{Icons.plus('#FBF6EB')} Log first brew</button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, ListScreen, NewBrewScreen, EmptyScreen, BrewCard });
