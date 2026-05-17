// Bag detail view sketch — /bags/[id]
// Anatomy: header (bag identity), key facts row, consumption bar, linked brews.

const BD = () => window.BREW;
const BDF = () => window.TF;

function BagDetailScreen({ dark = false }) {
  const bag = window.BAGS[0]; // Ethiopia Worka Sakaro · Sey · 6d · 215/340g
  const bg = dark ? BD().d_paper : BD().paper;
  const ink = dark ? BD().d_ink : BD().ink;
  const muted = dark ? BD().d_muted : BD().muted;
  const surf = dark ? BD().d_surface : BD().surface;
  const rule = dark ? BD().d_rule : BD().hairline;

  return (
    <div style={{ width: 402, height: 874, background: bg, fontFamily: BDF().ui, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* status bar placeholder */}
      <div style={{
        height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 22px 6px',
      }}>
        <span style={{
          fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 600,
          fontSize: 16, color: ink,
        }}>9:41</span>
        <span style={{ fontFamily: BDF().mono, fontSize: 11, color: muted, letterSpacing: '0.04em' }}>•••</span>
      </div>

      {/* header row: back + edit */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 18px 14px',
      }}>
        <button style={{
          height: 36, padding: '0 6px 0 4px', border: 'none', background: 'transparent',
          color: muted, fontFamily: BDF().ui, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L4 8l6 5" stroke={muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Bags
        </button>
        <button style={{
          height: 36, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: ink, fontFamily: BDF().ui, fontSize: 14, fontWeight: 500,
        }}>Edit</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 40px' }}>
        {/* identity block */}
        <div style={{
          fontFamily: BDF().mono, fontSize: 10.5, color: muted, letterSpacing: '0.14em',
          fontWeight: 500, marginBottom: 8,
        }}>BAG · #03</div>
        <h1 style={{
          margin: 0, fontFamily: BDF().display, fontWeight: 500,
          fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.015em', color: ink,
        }}>{bag.name}</h1>
        <div style={{
          marginTop: 6, fontFamily: BDF().ui, fontSize: 15, color: muted,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span>{bag.roaster}</span>
          <span style={{ color: BD().faint }}>·</span>
          <span>{bag.origin}</span>
          <window.ProcessBadge process={bag.process} />
        </div>

        {/* key facts row */}
        <div style={{
          marginTop: 22, padding: '16px 18px', borderRadius: 18,
          background: surf, border: `1px solid ${rule}`,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        }}>
          <Fact label="ROASTED" value={`${bag.roastedDays}d`} valueColor={window.freshnessTone(bag.roastedDays)} sub="May 10" muted={muted} ink={ink} />
          <Fact label="BREWS" value="14" sub="this bag" muted={muted} ink={ink} />
          <Fact label="AVG RATIO" value="1:16.2" sub="pour-over" muted={muted} ink={ink} />
        </div>

        {/* consumption bar */}
        <div style={{ marginTop: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8,
          }}>
            <span style={{
              fontFamily: BDF().mono, fontSize: 10.5, fontWeight: 500,
              color: muted, letterSpacing: '0.14em',
            }}>REMAINING</span>
            <span style={{
              fontFamily: BDF().mono, fontSize: 14, fontWeight: 500,
              color: ink, letterSpacing: '-0.01em',
            }}>
              <span style={{ color: BD().copper }}>{bag.remaining}g</span>
              <span style={{ color: muted }}> / {bag.total}g</span>
            </span>
          </div>
          <div style={{
            height: 10, borderRadius: 999, background: dark ? 'rgba(255,255,255,0.06)' : '#EDE5D4',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${(bag.remaining / bag.total) * 100}%`, height: '100%',
              background: BD().copper, borderRadius: 999,
              transition: 'width 0.3s ease-out',
            }} />
            {/* tick marks at each 100g */}
            {Array.from({ length: Math.floor(bag.total / 100) }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${((i + 1) * 100 / bag.total) * 100}%`,
                width: 1, background: 'rgba(0,0,0,0.10)',
              }} />
            ))}
          </div>
          <div style={{
            marginTop: 6, fontFamily: BDF().ui, fontSize: 12, color: muted,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>~{Math.round(bag.remaining / 15)} pour-overs left</span>
            <span>auto-deducted from each brew</span>
          </div>
        </div>

        {/* notes */}
        <div style={{ marginTop: 22 }}>
          <div style={{
            fontFamily: BDF().mono, fontSize: 10.5, fontWeight: 500,
            color: muted, letterSpacing: '0.14em', marginBottom: 8,
          }}>NOTES</div>
          <div style={{
            padding: 14, borderRadius: 14, background: surf, border: `1px solid ${rule}`,
            fontFamily: BDF().display, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.55,
            color: dark ? BD().d_ink : BD().ink70,
          }}>
            "Tasted stone fruit and jasmine in the cup at Sey. Bought $24/340g. Dial in
            at 1:16.5 for V60, see how it cools."
          </div>
        </div>

        {/* linked brews */}
        <div style={{ marginTop: 22 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div style={{
              fontFamily: BDF().mono, fontSize: 10.5, fontWeight: 500,
              color: muted, letterSpacing: '0.14em',
            }}>BREWS · 14</div>
            <span style={{
              fontFamily: BDF().mono, fontSize: 10.5, color: BD().copper, letterSpacing: '0.08em',
            }}>SEE ALL →</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { date: 'YESTERDAY · 7:42', method: 'POUR-OVER', ratio: '1:16.3', time: '2:50', star: true },
              { date: 'TUE · 6:48',       method: 'POUR-OVER', ratio: '1:16.0', time: '3:05', star: false },
              { date: 'MON · 7:10',       method: 'POUR-OVER', ratio: '1:16.5', time: '2:58', star: false },
              { date: 'SUN · 8:24',       method: 'POUR-OVER', ratio: '1:15.8', time: '3:20', star: false },
            ].map((b, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 14,
                background: surf, border: `1px solid ${rule}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  fontFamily: BDF().mono, fontSize: 16, fontWeight: 500,
                  color: ink, letterSpacing: '-0.01em', width: 62,
                }}>{b.ratio}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: BDF().mono, fontSize: 10, color: muted, letterSpacing: '0.12em',
                  }}>{b.date}</div>
                  <div style={{
                    fontFamily: BDF().ui, fontSize: 13, color: ink, marginTop: 2,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{b.method}</span>
                    <span style={{ color: BD().faint }}>·</span>
                    <span style={{ fontFamily: BDF().mono }}>{b.time}</span>
                  </div>
                </div>
                {b.star && (
                  <span style={{
                    color: BD().success, fontSize: 14, fontWeight: 600,
                  }}>★</span>
                )}
                <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
                  <path d="M1 1l6 6-6 6" stroke={BD().faint} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* delete action — quiet, at the bottom */}
        <button style={{
          marginTop: 28, width: '100%', height: 48,
          borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(166,52,27,0.08)', color: BD().danger,
          fontFamily: BDF().ui, fontSize: 14.5, fontWeight: 500,
        }}>Archive this bag</button>
      </div>

      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

function Fact({ label, value, sub, valueColor, muted, ink }) {
  return (
    <div>
      <div style={{
        fontFamily: BDF().mono, fontSize: 9.5, fontWeight: 500,
        color: muted, letterSpacing: '0.14em',
      }}>{label}</div>
      <div style={{
        fontFamily: BDF().mono, fontSize: 20, fontWeight: 500,
        color: valueColor || ink, marginTop: 4, letterSpacing: '-0.02em',
      }}>{value}</div>
      <div style={{
        fontFamily: BDF().ui, fontSize: 11.5, color: muted, marginTop: 2,
      }}>{sub}</div>
    </div>
  );
}

// Wrap in iPhone bezel
function BagDetailFramed({ dark }) {
  return (
    <div style={{
      width: 402, height: 874, borderRadius: 48,
      background: '#000', overflow: 'hidden', position: 'relative',
      boxShadow: '0 30px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.18)',
    }}>
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }}/>
      <BagDetailScreen dark={dark} />
    </div>
  );
}

Object.assign(window, { BagDetailScreen, BagDetailFramed });
