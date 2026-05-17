// /brews/[id]/edit — edit mode.
// Same shape as /new, but with:
//  - eyebrow "EDITING · BREW #N" in copper (vs muted)
//  - subtle copper top hairline as a mode marker
//  - "Save changes" CTA (disabled when not dirty)
//  - Reset (revert) appears in the header only when dirty
//  - Back returns to /brews/[id] (detail), not the list
//  - Delete lives ONLY on detail — not in the edit form
//  - Dirty fields get a 2px copper left bar to signal "you changed this"

const E = () => window.BREW;
const EF = () => window.TF;

function BrewEditScreen({ dark = false, dirty = true }) {
  const bg   = dark ? E().d_paper : E().paper;
  const ink  = dark ? E().d_ink : E().ink;
  const mut  = dark ? E().d_muted : E().muted;
  const surf = dark ? E().d_surface : E().surface;
  const rule = dark ? E().d_rule : E().hairline;

  return (
    <div style={{
      width: 402, height: 874, background: bg, fontFamily: EF().ui, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* mode marker — thin copper hairline at the very top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: E().copper, zIndex: 100,
      }}/>

      <div style={{
        height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 22px 6px',
      }}>
        <span style={{ fontFamily: '-apple-system', fontWeight: 600, fontSize: 16, color: ink }}>9:41</span>
        <span style={{ fontFamily: EF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em' }}>•••</span>
      </div>

      {/* form header — Cancel · EDITING eyebrow · Save changes */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px 10px', gap: 8,
      }}>
        <button style={{
          height: 36, padding: '0 8px', border: 'none', background: 'transparent',
          color: mut, fontFamily: EF().ui, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L4 8l6 5" stroke={mut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cancel
        </button>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0,
        }}>
          <span style={{
            fontFamily: EF().mono, fontSize: 10, fontWeight: 600,
            color: E().copper, letterSpacing: '0.18em',
          }}>EDITING</span>
          <span style={{
            marginTop: 1, fontFamily: EF().mono, fontSize: 10.5,
            color: mut, letterSpacing: '0.14em',
          }}>BREW · #87</span>
        </div>
        <button disabled={!dirty} style={{
          height: 36, padding: '0 14px', borderRadius: 10, border: 'none',
          cursor: dirty ? 'pointer' : 'not-allowed',
          background: dirty ? E().copper : 'rgba(28,24,20,0.08)',
          color: dirty ? '#FBF6EB' : mut,
          fontFamily: EF().ui, fontSize: 14, fontWeight: 600,
          opacity: dirty ? 1 : 1,
          transition: 'all 0.15s',
        }}>Save changes</button>
      </div>

      {/* Reset bar — only appears when dirty */}
      {dirty && (
        <div style={{
          margin: '0 22px 10px', padding: '8px 12px', borderRadius: 10,
          background: dark ? 'rgba(210,130,90,0.10)' : E().copperLt,
          color: E().copperDk,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontFamily: EF().ui, fontSize: 12.5,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: E().copper, flexShrink: 0,
            }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong style={{ fontWeight: 600 }}>3 unsaved changes</strong>
              <span style={{ opacity: 0.7 }}> · grind, water temp, notes</span>
            </span>
          </span>
          <button style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: E().copperDk, fontFamily: EF().mono, fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.1em', padding: '4px 6px', borderRadius: 6,
          }}>RESET</button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 40px' }}>
        {/* method */}
        <Field label="METHOD" dark={dark}>
          <window.BrewMethodPicker />
        </Field>

        {/* coffee bag (selected) */}
        <Field label="COFFEE" helper="links to a bag" dark={dark}>
          <div style={{
            minHeight: 56, padding: '8px 10px 8px 14px', borderRadius: 14,
            background: E().copperLt, border: '1px solid transparent',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: E().copper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <window.BagGlyph size={14} color="#FBF6EB" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: EF().display, fontSize: 17, fontWeight: 500, lineHeight: 1.15,
                color: E().ink, letterSpacing: '-0.005em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>Ethiopia Worka Sakaro</div>
              <div style={{
                fontFamily: EF().ui, fontSize: 12.5, color: E().copperDk, marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>Sey</span>
                <span style={{ color: E().copper, opacity: 0.5 }}>·</span>
                <span style={{ fontFamily: EF().mono, fontSize: 11, color: E().success }}>6d</span>
              </div>
            </div>
            <button style={{
              width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(28,24,20,0.06)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke={E().ink70} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </Field>

        {/* dose + yield */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <Field label="DOSE" dark={dark}>
            <NumField value="15.0" suffix="g" dark={dark} />
          </Field>
          <Field label="YIELD" dark={dark}>
            <NumField value="245" suffix="g" dark={dark} />
          </Field>
        </div>

        {/* ratio quick */}
        <Field label="RATIO · QUICK" dark={dark}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['1:15','1:16','1:17','1:18'].map((r,i) => (
              <window.BrewChip key={r} active={i===1}>{r}</window.BrewChip>
            ))}
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 10px',
              fontFamily: EF().mono, fontSize: 12, color: E().copper,
              background: E().copperLt, borderRadius: 999,
            }}>= 1:16.3 actual</span>
          </div>
        </Field>

        {/* GRIND — marked dirty with copper left bar */}
        <Field label="GRIND" helper="Fellow Ode 2" dark={dark} dirty>
          <input defaultValue="6.5" style={inputStyle(dark, true)} />
        </Field>

        {/* WATER TEMP — marked dirty */}
        <Field label="WATER TEMP" dark={dark} dirty>
          <NumField value="94" suffix="°C" dark={dark} dirty />
        </Field>

        {/* brew time */}
        <Field label="BREW TIME" dark={dark}>
          <div style={{ display: 'flex', gap: 8 }}>
            <NumField value="2" suffix="min" dark={dark} />
            <NumField value="50" suffix="sec" dark={dark} />
          </div>
        </Field>

        {/* balance */}
        <Field label="BALANCE" dark={dark}>
          <window.BalanceScale value="balanced" dark={dark} />
        </Field>

        {/* rating */}
        <Field label="RATING" dark={dark}>
          <RatingPicker value={4.5} dark={dark} />
        </Field>

        {/* notes — marked dirty */}
        <Field label="NOTES" dark={dark} dirty>
          <textarea defaultValue={'Stone fruit and jasmine on cool-down. Third pour ran fast — slow bloom next time.'} rows={3} style={{
            ...inputStyle(dark, true), height: 'auto', padding: '12px 14px',
            fontFamily: EF().display, fontStyle: 'italic', fontSize: 15, resize: 'none',
            lineHeight: 1.5,
          }} />
        </Field>
      </div>

      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

function Field({ label, helper, children, dark, dirty, style }) {
  return (
    <div style={{
      marginBottom: 18, position: 'relative',
      paddingLeft: dirty ? 12 : 0,
      ...style,
    }}>
      {dirty && (
        <div style={{
          position: 'absolute', left: 0, top: 22, bottom: 0, width: 2,
          background: E().copper, borderRadius: 2,
        }}/>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: EF().mono, fontSize: 10.5, fontWeight: 500,
          color: dark ? E().d_muted : E().muted, letterSpacing: '0.14em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {label}
          {dirty && (
            <span style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: 999,
              background: E().copper,
            }} />
          )}
        </span>
        {helper && (
          <span style={{
            fontFamily: EF().ui, fontSize: 11.5, color: dark ? E().d_muted : E().faint,
            letterSpacing: 0, textTransform: 'none',
          }}>{helper}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function inputStyle(dark, isDirty) {
  return {
    height: 48, width: '100%', padding: '0 14px', borderRadius: 14,
    background: dark ? E().d_surface : E().surface,
    border: `1px solid ${dark ? E().d_rule : E().hairline}`,
    color: dark ? E().d_ink : E().ink,
    fontFamily: EF().ui, fontSize: 15, outline: 'none',
  };
}

function NumField({ value, suffix, dark, dirty }) {
  return (
    <div style={{
      height: 56, padding: '0 16px', borderRadius: 14,
      background: dark ? E().d_surface : E().surface,
      border: `1px solid ${dark ? E().d_rule : E().hairline}`,
      display: 'flex', alignItems: 'baseline', gap: 6, flex: 1,
    }}>
      <span style={{
        fontFamily: EF().mono, fontSize: 24, fontWeight: 500,
        color: dark ? E().d_ink : E().ink, letterSpacing: '-0.02em',
      }}>{value}</span>
      <span style={{
        fontFamily: EF().mono, fontSize: 13, color: dark ? E().d_muted : E().muted,
      }}>{suffix}</span>
    </div>
  );
}

function RatingPicker({ value, dark }) {
  return (
    <div style={{
      height: 56, padding: '0 16px', borderRadius: 14,
      background: dark ? E().d_surface : E().surface,
      border: `1px solid ${dark ? E().d_rule : E().hairline}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: EF().display, fontSize: 24, fontWeight: 500,
          color: E().copper, letterSpacing: '-0.02em',
        }}>{value.toFixed(1)}</span>
        <span style={{
          fontFamily: EF().mono, fontSize: 11, color: dark ? E().d_muted : E().muted,
        }}>/ 5</span>
      </div>
      <window.StarRow value={value} size={20} />
    </div>
  );
}

Object.assign(window, { BrewEditScreen });
