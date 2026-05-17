// /stats — long-term patterns.
// Editorial, not corporate. CSS-only charts; SVG when geometry needs it.
// Sections (in priority order):
//   1. Headline — total brews + last-12-week sparkbar + this-week delta
//   2. Method split — proportional bar
//   3. Ratio distribution per method — histogram with median marker
//   4. Best brews — top-rated, with a tiny inline preview
//   5. Bag patterns — most-brewed bag + freshness-at-brew distribution
//   6. Time of day — clock-shaped heatmap (small)

const S = () => window.BREW;
const SF = () => window.TF;

function StatsScreen({ dark = false }) {
  const bg   = dark ? S().d_paper : S().paper;
  const ink  = dark ? S().d_ink : S().ink;
  const mut  = dark ? S().d_muted : S().muted;
  const surf = dark ? S().d_surface : S().surface;
  const rule = dark ? S().d_rule : S().hairline;

  return (
    <div style={{
      width: 402, height: 874, background: bg, fontFamily: SF().ui, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{
        height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 22px 6px',
      }}>
        <span style={{ fontFamily: '-apple-system', fontWeight: 600, fontSize: 16, color: ink }}>9:41</span>
        <span style={{ fontFamily: SF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em' }}>•••</span>
      </div>

      {/* header */}
      <div style={{ padding: '8px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{
          height: 36, padding: '0 6px 0 4px', border: 'none', background: 'transparent',
          color: mut, fontFamily: SF().ui, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L4 8l6 5" stroke={mut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <RangePill active>12 WEEKS</RangePill>
          <RangePill>6 MO</RangePill>
          <RangePill>ALL</RangePill>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 40px' }}>
        {/* SECTION · HEADLINE */}
        <SEyebrow color={mut}>ALL TIME</SEyebrow>
        <h1 style={{
          margin: '6px 0 0', fontFamily: SF().display, fontWeight: 500,
          fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.015em', color: ink,
        }}>87 brews,<br/><span style={{ color: mut, fontStyle: 'italic' }}>and counting.</span></h1>

        {/* sparkbar — last 12 weeks */}
        <div style={{ marginTop: 22 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <SEyebrow color={mut}>LAST 12 WEEKS</SEyebrow>
            <span style={{
              fontFamily: SF().mono, fontSize: 11, color: S().success, letterSpacing: '0.04em',
            }}>↑ 2 vs last week</span>
          </div>
          <SparkBars data={[6,4,8,5,7,9,6,8,10,7,11,12]} dark={dark} highlightLast />
          <div style={{
            marginTop: 6, display: 'flex', justifyContent: 'space-between',
            fontFamily: SF().mono, fontSize: 10, color: mut, letterSpacing: '0.06em',
          }}>
            <span>FEB 23</span>
            <span style={{ color: S().copper }}>THIS WEEK · 12</span>
          </div>
        </div>

        {/* 3-stat cluster — quick numbers */}
        <div style={{
          marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        }}>
          <StatTile label="THIS WEEK"  value="12"     sub="brews"      dark={dark} accent />
          <StatTile label="AVG RATIO"  value="1:16.4" sub="pour-over"  dark={dark} />
          <StatTile label="AVG RATING" value="4.1"    sub="of 5"       dark={dark} />
        </div>

        {/* SECTION · METHOD SPLIT */}
        <SectionHeader dark={dark} top>METHOD SPLIT</SectionHeader>
        <MethodSplit pour={62} esp={25} dark={dark} />

        {/* SECTION · RATIO DISTRIBUTION */}
        <SectionHeader dark={dark}>RATIO DISTRIBUTION</SectionHeader>
        <RatioHistogram dark={dark} />

        {/* SECTION · BEST BREWS */}
        <SectionHeader dark={dark}>BEST BREWS</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BestBrewRow rank={1} ratio="1:16.3" name="Ethiopia Worka Sakaro" roaster="Sey" rating={4.9} dark={dark} />
          <BestBrewRow rank={2} ratio="1:16.5" name="Kenya Kiamabara AA"    roaster="April" rating={4.7} dark={dark} />
          <BestBrewRow rank={3} ratio="1:2.0"  name="Colombia La Palma"     roaster="Onyx" rating={4.6} dark={dark} method="ESPRESSO" />
        </div>

        {/* SECTION · BAG PATTERNS */}
        <SectionHeader dark={dark}>BAG PATTERNS</SectionHeader>
        <BagPatterns dark={dark} />

        {/* SECTION · TIME OF DAY */}
        <SectionHeader dark={dark}>TIME OF DAY</SectionHeader>
        <TimeOfDay dark={dark} />

        {/* Footnote */}
        <div style={{
          marginTop: 28, fontFamily: SF().display, fontStyle: 'italic', fontSize: 13,
          color: mut, lineHeight: 1.5,
        }}>
          "You log more on the weekends. Most brews are between 6:30 and 8 a.m."
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

// ─── tiny atoms ───────────────────────────────────────────────────────
function SEyebrow({ children, color, style }) {
  return (
    <div style={{
      fontFamily: SF().mono, fontSize: 10.5, fontWeight: 500,
      color: color || S().muted, letterSpacing: '0.14em', textTransform: 'uppercase',
      ...style,
    }}>{children}</div>
  );
}

function SectionHeader({ children, dark, top }) {
  const mut  = dark ? S().d_muted : S().muted;
  const rule = dark ? S().d_rule : S().hairline;
  return (
    <div style={{
      marginTop: top ? 30 : 28,
      marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <SEyebrow color={mut}>{children}</SEyebrow>
      <div style={{ flex: 1, height: 1, background: rule }} />
    </div>
  );
}

function RangePill({ children, active }) {
  return (
    <button style={{
      height: 28, padding: '0 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? S().ink : 'transparent',
      color: active ? S().paper : S().muted,
      boxShadow: active ? 'none' : `inset 0 0 0 1px ${S().hairline}`,
      fontFamily: SF().mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
    }}>{children}</button>
  );
}

function StatTile({ label, value, sub, accent, dark }) {
  return (
    <div style={{
      padding: '14px 14px 16px', borderRadius: 14,
      background: dark ? S().d_surface : S().surface,
      border: `1px solid ${dark ? S().d_rule : S().hairline}`,
    }}>
      <div style={{
        fontFamily: SF().mono, fontSize: 9.5, color: dark ? S().d_muted : S().muted,
        letterSpacing: '0.14em', fontWeight: 500,
      }}>{label}</div>
      <div style={{
        marginTop: 4, fontFamily: SF().display, fontSize: 24, fontWeight: 500,
        color: accent ? S().copper : (dark ? S().d_ink : S().ink), letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{
        marginTop: 2, fontFamily: SF().ui, fontSize: 11.5, color: dark ? S().d_muted : S().muted,
      }}>{sub}</div>
    </div>
  );
}

// ─── Sparkbar — 12 vertical bars ──────────────────────────────────────
function SparkBars({ data, dark, highlightLast }) {
  const max = Math.max(...data);
  const h = 60;
  return (
    <div style={{
      height: h, display: 'flex', alignItems: 'flex-end', gap: 4,
    }}>
      {data.map((v, i) => {
        const isLast = i === data.length - 1 && highlightLast;
        return (
          <div key={i} style={{
            flex: 1, height: `${(v / max) * 100}%`,
            background: isLast ? S().copper : (dark ? S().d_rule : '#D9CDB6'),
            borderRadius: 3, minHeight: 4,
            transition: 'height 0.3s ease-out',
          }}/>
        );
      })}
    </div>
  );
}

// ─── Method split — single stacked bar + labels above ─────────────────
function MethodSplit({ pour, esp, dark }) {
  const total = pour + esp;
  const pourPct = (pour / total) * 100;
  const espPct  = (esp / total) * 100;
  const mut = dark ? S().d_muted : S().muted;
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8,
      }}>
        <div>
          <span style={{
            fontFamily: SF().display, fontSize: 22, fontWeight: 500,
            color: dark ? S().d_ink : S().ink, letterSpacing: '-0.01em',
          }}>{pour}</span>
          <span style={{ fontFamily: SF().ui, fontSize: 13, color: mut, marginLeft: 6 }}>pour-over</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontFamily: SF().display, fontSize: 22, fontWeight: 500,
            color: dark ? S().d_ink : S().ink, letterSpacing: '-0.01em',
          }}>{esp}</span>
          <span style={{ fontFamily: SF().ui, fontSize: 13, color: mut, marginLeft: 6 }}>espresso</span>
        </div>
      </div>
      {/* the bar */}
      <div style={{
        height: 14, borderRadius: 999, overflow: 'hidden',
        background: dark ? 'rgba(255,255,255,0.04)' : '#EDE5D4',
        display: 'flex',
      }}>
        <div style={{
          width: `${pourPct}%`, background: S().copper, height: '100%',
        }}/>
        <div style={{ width: '1.5%' }}/>
        <div style={{
          width: `${espPct}%`, background: dark ? S().d_copper : S().copperDk, height: '100%',
        }}/>
      </div>
      <div style={{
        marginTop: 8, display: 'flex', justifyContent: 'space-between',
        fontFamily: SF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em',
      }}>
        <span style={{ color: S().copper }}>{Math.round(pourPct)}%</span>
        <span style={{ color: dark ? S().d_copper : S().copperDk }}>{Math.round(espPct)}%</span>
      </div>
    </div>
  );
}

// ─── Ratio histogram — CSS bars + median marker ───────────────────────
function RatioHistogram({ dark }) {
  // buckets cover 1:14 → 1:18 in 0.5 steps
  const buckets = [
    { label: '14',   pour: 1 },
    { label: '14.5', pour: 2 },
    { label: '15',   pour: 5 },
    { label: '15.5', pour: 8 },
    { label: '16',   pour: 18 },
    { label: '16.5', pour: 14 },
    { label: '17',   pour: 9 },
    { label: '17.5', pour: 4 },
    { label: '18',   pour: 1 },
  ];
  const max = Math.max(...buckets.map(b => b.pour));
  const mut = dark ? S().d_muted : S().muted;

  return (
    <div style={{
      padding: '14px 14px 12px', borderRadius: 14,
      background: dark ? S().d_surface : S().surface,
      border: `1px solid ${dark ? S().d_rule : S().hairline}`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <SEyebrow color={mut}>POUR-OVER · 62 BREWS</SEyebrow>
        <span style={{
          fontFamily: SF().mono, fontSize: 11, color: S().copper, letterSpacing: '0.04em',
        }}>MEDIAN 1:16.4</span>
      </div>
      <div style={{ position: 'relative', height: 100 }}>
        <div style={{
          height: '100%', display: 'flex', alignItems: 'flex-end', gap: 4,
        }}>
          {buckets.map((b, i) => {
            const isMedian = b.label === '16.5'; // 1:16.4 nearest bucket
            return (
              <div key={i} style={{
                flex: 1, height: `${(b.pour / max) * 100}%`,
                background: isMedian ? S().copper : (dark ? S().d_rule : '#D9CDB6'),
                borderRadius: 3, minHeight: 3,
              }}/>
            );
          })}
        </div>
        {/* median line */}
        <div style={{
          position: 'absolute', top: 0, bottom: -12, height: 'calc(100% + 14px)',
          left: `${((4.5) / 8) * 100 + (100 / 8 / 2)}%`,
          transform: 'translateX(-50%)',
          width: 1, borderLeft: `1px dashed ${S().copper}`, opacity: 0.5,
        }}/>
      </div>
      <div style={{
        marginTop: 10, display: 'flex', justifyContent: 'space-between',
        fontFamily: SF().mono, fontSize: 9.5, color: mut, letterSpacing: '0.04em',
      }}>
        {buckets.map((b,i) => (
          <span key={i} style={{
            flex: 1, textAlign: 'center',
            color: b.label === '16.5' ? S().copper : mut,
            fontWeight: b.label === '16.5' ? 600 : 500,
          }}>1:{b.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Best brew row ────────────────────────────────────────────────────
function BestBrewRow({ rank, ratio, name, roaster, rating, dark, method = 'POUR-OVER' }) {
  const ink = dark ? S().d_ink : S().ink;
  const mut = dark ? S().d_muted : S().muted;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 14,
      background: dark ? S().d_surface : S().surface,
      border: `1px solid ${dark ? S().d_rule : S().hairline}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        fontFamily: SF().mono, fontSize: 18, fontWeight: 500,
        color: rank === 1 ? S().copper : mut, letterSpacing: '-0.02em',
        width: 22, textAlign: 'center', flexShrink: 0,
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: SF().display, fontSize: 15, fontWeight: 500, lineHeight: 1.2,
          color: ink, letterSpacing: '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</div>
        <div style={{
          marginTop: 2, fontFamily: SF().mono, fontSize: 10.5, color: mut, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{roaster}</span>
          <span style={{ color: S().faint }}>·</span>
          <span>{method}</span>
          <span style={{ color: S().faint }}>·</span>
          <span style={{ color: S().copper }}>{ratio}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{
          fontFamily: SF().mono, fontSize: 14, fontWeight: 500, color: ink, letterSpacing: '-0.01em',
        }}>{rating.toFixed(1)}</div>
        <window.StarRow value={rating} size={10} />
      </div>
    </div>
  );
}

// ─── Bag patterns — most-brewed bag card + freshness-at-brew histogram ─
function BagPatterns({ dark }) {
  const mut = dark ? S().d_muted : S().muted;
  const ink = dark ? S().d_ink : S().ink;
  const surf = dark ? S().d_surface : S().surface;
  const rule = dark ? S().d_rule : S().hairline;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* MOST-BREWED bag */}
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: surf, border: `1px solid ${rule}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: S().copper,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <window.BagGlyph size={20} color="#FBF6EB" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SEyebrow color={mut}>MOST BREWED</SEyebrow>
          <div style={{
            marginTop: 2, fontFamily: SF().display, fontSize: 16, fontWeight: 500,
            color: ink, letterSpacing: '-0.005em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>Ethiopia Worka Sakaro</div>
          <div style={{
            marginTop: 2, fontFamily: SF().ui, fontSize: 12, color: mut,
          }}>14 brews · Sey · washed</div>
        </div>
      </div>

      {/* Freshness-at-brew breakdown */}
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: surf, border: `1px solid ${rule}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <SEyebrow color={mut}>FRESHNESS AT BREW</SEyebrow>
          <span style={{ fontFamily: SF().mono, fontSize: 11, color: mut, letterSpacing: '0.04em' }}>62 LINKED</span>
        </div>
        <FreshnessBar
          green={42} ochre={15} red={5} dark={dark}
        />
        <div style={{
          marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6,
          fontFamily: SF().ui, fontSize: 12.5, color: mut, lineHeight: 1.5,
        }}>
          <Legend color={S().success} label="Within 14 days" value="42" pct="68%" />
          <Legend color={S().warning} label="15–21 days"     value="15" pct="24%" />
          <Legend color={S().danger}  label="22+ days"       value="5"  pct="8%"  />
        </div>
      </div>
    </div>
  );
}

function FreshnessBar({ green, ochre, red, dark }) {
  const total = green + ochre + red;
  const g = (green / total) * 100;
  const o = (ochre / total) * 100;
  const r = (red / total) * 100;
  return (
    <div style={{
      height: 14, borderRadius: 999, overflow: 'hidden',
      background: dark ? 'rgba(255,255,255,0.04)' : '#EDE5D4',
      display: 'flex',
    }}>
      <div style={{ width: `${g}%`, background: S().success }}/>
      <div style={{ width: `${o}%`, background: S().warning }}/>
      <div style={{ width: `${r}%`, background: S().danger }}/>
    </div>
  );
}

function Legend({ color, label, value, pct }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}/>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontFamily: SF().mono, color: S().ink70 }}>{value}</span>
      <span style={{ fontFamily: SF().mono, fontSize: 11, color: S().muted, width: 36, textAlign: 'right' }}>{pct}</span>
    </div>
  );
}

// ─── Time of day — small 24-hour heatmap ──────────────────────────────
function TimeOfDay({ dark }) {
  // 24 cells, value 0–10 (rough)
  const hours = [0,0,0,0,0,1,4,9,7,3,1,1,0,1,2,3,4,2,1,1,0,0,0,0];
  const max = Math.max(...hours);
  const mut = dark ? S().d_muted : S().muted;
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: dark ? S().d_surface : S().surface,
      border: `1px solid ${dark ? S().d_rule : S().hairline}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <SEyebrow color={mut}>HOURS</SEyebrow>
        <span style={{ fontFamily: SF().mono, fontSize: 11, color: S().copper, letterSpacing: '0.04em' }}>PEAK 7 A.M.</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2,
      }}>
        {hours.map((v, i) => {
          const ratio = max === 0 ? 0 : v / max;
          return (
            <div key={i} style={{
              height: 28, borderRadius: 3,
              background: ratio === 0
                ? (dark ? 'rgba(255,255,255,0.03)' : '#EDE5D4')
                : `color-mix(in oklab, ${S().copper} ${20 + ratio * 80}%, ${dark ? '#221d16' : '#EDE5D4'})`,
            }}/>
          );
        })}
      </div>
      <div style={{
        marginTop: 8, display: 'flex', justifyContent: 'space-between',
        fontFamily: SF().mono, fontSize: 9, color: mut, letterSpacing: '0.04em',
      }}>
        <span>12 AM</span>
        <span>6</span>
        <span style={{ color: S().copper, fontWeight: 600 }}>NOON</span>
        <span>6</span>
        <span>12</span>
      </div>
    </div>
  );
}

Object.assign(window, { StatsScreen });
