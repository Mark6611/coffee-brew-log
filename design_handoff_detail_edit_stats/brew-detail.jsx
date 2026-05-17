// /brews/[id] — brew detail view.
// Hierarchy:  identity (method+date) → hero (coffee name + bag link) →
// the BIG ratio → metrics row → variables (grind/temp/balance) →
// rating row → notes → linked-bag preview card → actions footer

const D = () => window.BREW;
const DF = () => window.TF;

// ─── small atoms shared with this file ────────────────────────────────
function DEyebrow({ children, color, style }) {
  return (
    <div style={{
      fontFamily: DF().mono, fontSize: 10.5, fontWeight: 500,
      color: color || D().muted, letterSpacing: '0.14em',
      textTransform: 'uppercase', ...style,
    }}>{children}</div>
  );
}

function DStatRow({ label, value, sub, accent, dark, mono = true, valueSize = 16 }) {
  return (
    <div>
      <div style={{
        fontFamily: DF().mono, fontSize: 9.5, fontWeight: 500,
        color: dark ? D().d_muted : D().muted, letterSpacing: '0.14em',
      }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontFamily: mono ? DF().mono : DF().display,
        fontSize: valueSize, fontWeight: 500,
        color: accent ? D().copper : (dark ? D().d_ink : D().ink),
        letterSpacing: '-0.01em',
      }}>{value}</div>
      {sub && <div style={{
        fontFamily: DF().ui, fontSize: 11, color: dark ? D().d_muted : D().muted,
        marginTop: 1,
      }}>{sub}</div>}
    </div>
  );
}

// Star row — out-of-5 rendered as five line marks; filled = copper, empty = hairline
function StarRow({ value = 0, size = 14 }) {
  // value can be decimal e.g. 4.5
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, value - i));
    stars.push(
      <div key={i} style={{
        position: 'relative', width: size, height: size,
      }}>
        <Star size={size} color={D().hairline} />
        <div style={{
          position: 'absolute', left: 0, top: 0, width: `${fill * 100}%`, height: '100%', overflow: 'hidden',
        }}>
          <Star size={size} color={D().copper} />
        </div>
      </div>
    );
  }
  return <div style={{ display: 'flex', gap: 4 }}>{stars}</div>;
}
function Star({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1.2 L8.6 5 L12.7 5.4 L9.6 8.1 L10.5 12.2 L7 10 L3.5 12.2 L4.4 8.1 L1.3 5.4 L5.4 5 Z"
            fill={color} />
    </svg>
  );
}

// Balance scale — three states laid out on a track
function BalanceScale({ value = 'balanced', dark }) {
  const labels = [
    { id: 'light',    txt: 'Light' },
    { id: 'balanced', txt: 'Balanced' },
    { id: 'heavy',    txt: 'Heavy' },
  ];
  return (
    <div style={{
      marginTop: 6, padding: 6,
      background: dark ? D().d_paper : D().paper,
      borderRadius: 12, border: `1px solid ${dark ? D().d_rule : D().hairline}`,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {labels.map(l => {
        const active = l.id === value;
        return (
          <div key={l.id} style={{
            flex: 1, height: 36, borderRadius: 8,
            background: active ? (dark ? D().d_surface : D().surface) : 'transparent',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: DF().ui, fontSize: 13,
            color: active ? (dark ? D().d_ink : D().ink) : (dark ? D().d_muted : D().muted),
            fontWeight: active ? 600 : 500,
          }}>{l.txt}</div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// THE SCREEN
// ═════════════════════════════════════════════════════════════════════
function BrewDetailScreen({ dark = false, brew }) {
  const b = brew || {
    id: 'br-087',
    n: 87,
    method: 'POUR-OVER',
    methodSub: 'V60',
    brewedAt: 'Yesterday · 7:42',
    dose: '15.0g',
    yield: '245g',
    water: '245g',
    time: '2:50',
    ratio: '1:16.3',
    grindSetting: '6.5',
    grinder: 'Fellow Ode 2',
    waterTempC: '94°C',
    balance: 'balanced',
    rating: 4.5,
    isFavorite: true,
    notes: 'Stone fruit and jasmine on cool-down. Third pour ran fast — slow bloom next time. Cooled to a juicy peach mid-cup; finish stayed clean.',
    bag: {
      name: 'Ethiopia Worka Sakaro', roaster: 'Sey',
      process: 'washed', roastedDays: 6, remaining: 215, total: 340,
    },
  };

  const bg   = dark ? D().d_paper : D().paper;
  const ink  = dark ? D().d_ink : D().ink;
  const mut  = dark ? D().d_muted : D().muted;
  const surf = dark ? D().d_surface : D().surface;
  const rule = dark ? D().d_rule : D().hairline;
  const isEsp = b.method === 'ESPRESSO';

  return (
    <div style={{
      width: 402, height: 874, background: bg, fontFamily: DF().ui, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* faux status bar */}
      <div style={{
        height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 22px 6px',
      }}>
        <span style={{
          fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 600,
          fontSize: 16, color: ink,
        }}>9:41</span>
        <span style={{ fontFamily: DF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em' }}>•••</span>
      </div>

      {/* header: back + edit */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 18px 4px',
      }}>
        <button style={{
          height: 36, padding: '0 6px 0 4px', border: 'none', background: 'transparent',
          color: mut, fontFamily: DF().ui, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L4 8l6 5" stroke={mut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Brews
        </button>
        <button style={{
          height: 36, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: ink, fontFamily: DF().ui, fontSize: 14, fontWeight: 500,
        }}>Edit</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 22px 40px' }}>
        {/* identity */}
        <DEyebrow color={mut}>BREW · #{b.n}</DEyebrow>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <window.BrewBadge>{b.method}{b.methodSub ? ` · ${b.methodSub}` : ''}</window.BrewBadge>
          {b.isFavorite && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 22,
              padding: '0 8px', borderRadius: 999,
              background: 'rgba(79,107,46,0.10)', color: '#3F5723',
              fontFamily: DF().mono, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.12em',
            }}>
              <Star size={9} color="#3F5723" /> FAVORITE
            </span>
          )}
        </div>
        <div style={{
          marginTop: 12,
          fontFamily: DF().display, fontSize: 30, fontWeight: 500, lineHeight: 1.05,
          letterSpacing: '-0.015em', color: ink,
        }}>{b.bag ? b.bag.name : 'Untitled brew'}</div>

        {/* bag link (or denormalized roaster) */}
        {b.bag && (
          <>
            <button style={{
              marginTop: 6, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: DF().ui, fontSize: 13.5, color: D().copperDk,
            }}>
              <window.BagGlyph size={12} color={D().copperDk} />
              <span style={{ borderBottom: `1px solid ${D().copper}55` }}>
                {b.bag.roaster} · {b.bag.process}
              </span>
            </button>
            <div style={{
              marginTop: 8, fontFamily: DF().mono, fontSize: 10.5, fontWeight: 500,
              letterSpacing: '0.14em', color: window.freshnessTone(b.bag.roastedDays),
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 999,
                background: window.freshnessTone(b.bag.roastedDays), display: 'inline-block',
              }} />
              ROASTED {b.bag.roastedDays} DAYS AGO
            </div>
          </>
        )}

        <div style={{
          marginTop: 10, fontFamily: DF().ui, fontSize: 13, color: mut,
        }}>{b.brewedAt}</div>

        {/* THE BIG RATIO — the brew's headline number */}
        <div style={{
          marginTop: 22, padding: '24px 22px',
          borderRadius: 22, background: surf, border: `1px solid ${rule}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 140, height: 140,
            borderRadius: 999, background: D().copperLt, opacity: dark ? 0.06 : 0.4,
          }}/>
          <DEyebrow color={mut} style={{ position: 'relative' }}>RATIO</DEyebrow>
          <div style={{
            marginTop: 4, position: 'relative',
            fontFamily: DF().mono, fontSize: 56, fontWeight: 500,
            lineHeight: 1, letterSpacing: '-0.04em', color: D().copper,
          }}>{b.ratio}</div>
          <div style={{
            marginTop: 8, position: 'relative',
            fontFamily: DF().ui, fontSize: 13, color: mut, lineHeight: 1.5,
          }}>
            {b.dose} of coffee yielded {isEsp ? b.yield : b.water} of {isEsp ? 'espresso' : 'brew'} in {b.time}.
          </div>

          {/* the 4 metric row, drops in below the headline */}
          <div style={{
            marginTop: 18, paddingTop: 14, position: 'relative',
            borderTop: `1px solid ${rule}`,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          }}>
            <DStatRow label="DOSE"  value={b.dose} dark={dark} valueSize={17} />
            <DStatRow label={isEsp ? 'YIELD' : 'WATER'} value={isEsp ? b.yield : b.water} dark={dark} valueSize={17} />
            <DStatRow label="TIME"  value={b.time} dark={dark} valueSize={17} />
            <DStatRow label="RATIO" value={b.ratio} dark={dark} valueSize={17} accent />
          </div>
        </div>

        {/* Variables — only those that have values */}
        <div style={{ marginTop: 22 }}>
          <DEyebrow color={mut} style={{ marginBottom: 10 }}>VARIABLES</DEyebrow>
          <div style={{
            padding: '14px 16px', borderRadius: 18,
            background: surf, border: `1px solid ${rule}`,
            display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 14, columnGap: 16,
          }}>
            <DStatRow label="GRIND" value={b.grindSetting} sub={b.grinder} dark={dark} valueSize={18} />
            <DStatRow label="WATER TEMP" value={b.waterTempC} sub="filtered, freshly boiled" dark={dark} valueSize={18} />
            {/* Balance spans 2 cols, with its scale below */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{
                fontFamily: DF().mono, fontSize: 9.5, fontWeight: 500,
                color: mut, letterSpacing: '0.14em',
              }}>BALANCE</div>
              <BalanceScale value={b.balance} dark={dark} />
            </div>
          </div>
        </div>

        {/* Rating block */}
        <div style={{ marginTop: 22 }}>
          <DEyebrow color={mut} style={{ marginBottom: 10 }}>RATING</DEyebrow>
          <div style={{
            padding: '16px 18px', borderRadius: 18,
            background: surf, border: `1px solid ${rule}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <div style={{
                fontFamily: DF().display, fontSize: 36, fontWeight: 500,
                color: D().copper, letterSpacing: '-0.02em', lineHeight: 1,
              }}>{b.rating.toFixed(1)}</div>
              <div style={{
                marginTop: 4, fontFamily: DF().mono, fontSize: 10, color: mut, letterSpacing: '0.14em',
              }}>OUT OF 5</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <StarRow value={b.rating} size={16} />
              <div style={{
                fontFamily: DF().display, fontStyle: 'italic', fontSize: 13.5,
                color: dark ? D().d_ink : D().ink70,
              }}>
                "Best of this bag so far."
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {b.notes && (
          <div style={{ marginTop: 22 }}>
            <DEyebrow color={mut} style={{ marginBottom: 10 }}>NOTES</DEyebrow>
            <div style={{
              padding: '16px 18px', borderRadius: 18,
              background: surf, border: `1px solid ${rule}`,
              fontFamily: DF().display, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.55,
              color: dark ? D().d_ink : D().ink70,
            }}>
              "{b.notes}"
            </div>
          </div>
        )}

        {/* Linked-bag preview card — mini view of the bag, tappable */}
        {b.bag && (
          <div style={{ marginTop: 22 }}>
            <DEyebrow color={mut} style={{ marginBottom: 10 }}>FROM BAG</DEyebrow>
            <button style={{
              width: '100%', padding: '14px 16px', borderRadius: 18,
              background: surf, border: `1px solid ${rule}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: D().copper,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <window.BagGlyph size={20} color="#FBF6EB" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: DF().display, fontSize: 16, fontWeight: 500, lineHeight: 1.2,
                  color: ink, letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{b.bag.name}</div>
                <div style={{
                  marginTop: 4, display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: DF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em',
                }}>
                  <span style={{ color: window.freshnessTone(b.bag.roastedDays) }}>{b.bag.roastedDays}d</span>
                  <span style={{ color: D().faint }}>·</span>
                  <span>{b.bag.remaining}g / {b.bag.total}g</span>
                </div>
                {/* mini consumption rail */}
                <div style={{
                  marginTop: 6, height: 4, borderRadius: 999,
                  background: dark ? 'rgba(255,255,255,0.06)' : '#EDE5D4', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(b.bag.remaining / b.bag.total) * 100}%`, height: '100%', background: D().copper,
                  }}/>
                </div>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
                <path d="M1 1l6 6-6 6" stroke={D().faint} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'rgba(28,24,20,0.04)', color: ink,
            fontFamily: DF().ui, fontSize: 14.5, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v6M7 8l-3-3M7 8l3-3M2 11.5h10" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Duplicate as new brew
          </button>
          <button style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'rgba(166,52,27,0.08)', color: D().danger,
            fontFamily: DF().ui, fontSize: 14.5, fontWeight: 500,
          }}>Delete this brew</button>
        </div>
      </div>

      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// VARIANT — no rating, no bag link, no notes (a barebones brew)
// ═════════════════════════════════════════════════════════════════════
function BrewDetailMinimal({ dark = false }) {
  const b = {
    n: 32, method: 'ESPRESSO', methodSub: null,
    brewedAt: 'Apr 28 · 7:11',
    dose: '18.0g', yield: '36g', water: '36g', time: '0:28', ratio: '1:2.0',
    grindSetting: '0.8', grinder: 'Option-O Lagom Casa',
    waterTempC: null, balance: 'heavy', rating: null,
    isFavorite: false, notes: null,
    bag: null,
    coffeeName: 'Colombia La Palma',
    roaster: 'Onyx Coffee Lab',
  };
  const bg   = dark ? D().d_paper : D().paper;
  const ink  = dark ? D().d_ink : D().ink;
  const mut  = dark ? D().d_muted : D().muted;
  const surf = dark ? D().d_surface : D().surface;
  const rule = dark ? D().d_rule : D().hairline;

  return (
    <div style={{
      width: 402, height: 874, background: bg, fontFamily: DF().ui, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 22px 6px',
      }}>
        <span style={{ fontFamily: '-apple-system', fontWeight: 600, fontSize: 16, color: ink }}>9:41</span>
        <span style={{ fontFamily: DF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em' }}>•••</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 4px' }}>
        <button style={{ height: 36, padding: '0 6px 0 4px', border: 'none', background: 'transparent', color: mut, fontFamily: DF().ui, fontSize: 15, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L4 8l6 5" stroke={mut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Brews
        </button>
        <button style={{ height: 36, padding: '0 14px', borderRadius: 10, border: 'none', background: 'transparent', color: ink, fontFamily: DF().ui, fontSize: 14, fontWeight: 500 }}>Edit</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 22px 40px' }}>
        <DEyebrow color={mut}>BREW · #{b.n}</DEyebrow>
        <div style={{ marginTop: 8 }}>
          <window.BrewBadge>{b.method}</window.BrewBadge>
        </div>
        <div style={{
          marginTop: 12,
          fontFamily: DF().display, fontSize: 30, fontWeight: 500, lineHeight: 1.05,
          letterSpacing: '-0.015em', color: ink,
        }}>{b.coffeeName}</div>
        <div style={{ marginTop: 4, fontFamily: DF().ui, fontSize: 13.5, color: mut }}>{b.roaster}</div>
        <div style={{ marginTop: 8, fontFamily: DF().ui, fontSize: 13, color: mut }}>{b.brewedAt}</div>

        {/* unlinked-bag hint — quiet, copper text-only */}
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: dark ? 'rgba(210,130,90,0.08)' : D().copperLt,
          color: D().copperDk, fontFamily: DF().ui, fontSize: 12.5, lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <window.BagGlyph size={14} color={D().copperDk} />
          <span style={{ flex: 1 }}>This brew isn't linked to a bag in your library.</span>
          <span style={{
            fontFamily: DF().mono, fontSize: 10.5, letterSpacing: '0.08em', fontWeight: 600,
          }}>LINK →</span>
        </div>

        <div style={{
          marginTop: 22, padding: '24px 22px',
          borderRadius: 22, background: surf, border: `1px solid ${rule}`,
        }}>
          <DEyebrow color={mut}>RATIO</DEyebrow>
          <div style={{
            marginTop: 4, fontFamily: DF().mono, fontSize: 56, fontWeight: 500,
            lineHeight: 1, letterSpacing: '-0.04em', color: D().copper,
          }}>{b.ratio}</div>
          <div style={{
            marginTop: 8, fontFamily: DF().ui, fontSize: 13, color: mut, lineHeight: 1.5,
          }}>{b.dose} in, {b.yield} out, in {b.time}.</div>

          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: `1px solid ${rule}`,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          }}>
            <DStatRow label="DOSE"  value={b.dose} dark={dark} valueSize={17} />
            <DStatRow label="YIELD" value={b.yield} dark={dark} valueSize={17} />
            <DStatRow label="TIME"  value={b.time} dark={dark} valueSize={17} />
            <DStatRow label="RATIO" value={b.ratio} dark={dark} valueSize={17} accent />
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <DEyebrow color={mut} style={{ marginBottom: 10 }}>VARIABLES</DEyebrow>
          <div style={{
            padding: '14px 16px', borderRadius: 18,
            background: surf, border: `1px solid ${rule}`,
            display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 14, columnGap: 16,
          }}>
            <DStatRow label="GRIND" value={b.grindSetting} sub={b.grinder} dark={dark} valueSize={18} />
            <div /> {/* empty cell — water temp not tracked for espresso */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontFamily: DF().mono, fontSize: 9.5, fontWeight: 500, color: mut, letterSpacing: '0.14em' }}>BALANCE</div>
              <BalanceScale value={b.balance} dark={dark} />
            </div>
          </div>
        </div>

        {/* No rating: render the "Add rating" affordance */}
        <div style={{ marginTop: 22 }}>
          <DEyebrow color={mut} style={{ marginBottom: 10 }}>RATING</DEyebrow>
          <button style={{
            width: '100%', padding: '14px 16px', borderRadius: 18,
            background: surf, border: `1px dashed ${rule}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StarRow value={0} size={16} />
              <span style={{ fontFamily: DF().ui, fontSize: 13.5, color: mut }}>Rate this brew</span>
            </div>
            <span style={{ fontFamily: DF().mono, fontSize: 10.5, color: D().copper, letterSpacing: '0.08em' }}>ADD →</span>
          </button>
        </div>

        <div style={{ marginTop: 22 }}>
          <DEyebrow color={mut} style={{ marginBottom: 10 }}>NOTES</DEyebrow>
          <button style={{
            width: '100%', padding: '14px 16px', borderRadius: 18,
            background: surf, border: `1px dashed ${rule}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: DF().display, fontStyle: 'italic', fontSize: 14.5, color: mut,
          }}>
            <span>What did it taste like?</span>
            <span style={{ fontFamily: DF().mono, fontStyle: 'normal', fontSize: 10.5, color: D().copper, letterSpacing: '0.08em' }}>ADD →</span>
          </button>
        </div>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none',
            background: 'rgba(28,24,20,0.04)', color: ink,
            fontFamily: DF().ui, fontSize: 14.5, fontWeight: 500,
          }}>Duplicate as new brew</button>
          <button style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none',
            background: 'rgba(166,52,27,0.08)', color: D().danger,
            fontFamily: DF().ui, fontSize: 14.5, fontWeight: 500,
          }}>Delete this brew</button>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

Object.assign(window, { BrewDetailScreen, BrewDetailMinimal, BalanceScale, StarRow });
