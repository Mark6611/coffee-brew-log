// Three variations of how a linked bag should appear on the existing BrewCard.
// Picked variation: B (the roaster line is itself the bag link, plus a small
// freshness eyebrow). Rationale on the card.

const CV = () => window.BREW;
const CVF = () => window.TF;

// ─── shared metric atom ───────────────────────────────────────────────
function Metric({ label, value, accent, dark }) {
  return (
    <div>
      <div style={{
        fontFamily: CVF().mono, fontSize: 9.5, fontWeight: 500,
        color: dark ? CV().d_muted : CV().muted, letterSpacing: '0.14em',
      }}>{label}</div>
      <div style={{
        fontFamily: CVF().mono, fontSize: 17, fontWeight: 500,
        color: accent ? CV().copper : (dark ? CV().d_ink : CV().ink),
        marginTop: 2, letterSpacing: '-0.01em',
      }}>{value}</div>
    </div>
  );
}

// ─── base card shell shared by all variations ─────────────────────────
function CardShell({ children, recommended }) {
  return (
    <div style={{
      width: 360, padding: '16px 18px 18px', borderRadius: 18,
      background: CV().surface, border: `1px solid ${CV().hairline}`,
      position: 'relative',
    }}>
      {recommended && (
        <div style={{
          position: 'absolute', top: -10, right: 14,
          background: CV().copper, color: '#FBF6EB',
          fontFamily: CVF().mono, fontSize: 9.5, fontWeight: 600,
          letterSpacing: '0.14em', padding: '3px 8px',
          borderRadius: 999,
        }}>RECOMMENDED</div>
      )}
      {children}
    </div>
  );
}

// Top row utility
function TopRow({ time, badges = ['POUR-OVER'] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {badges.map((b, i) => <window.BrewBadge key={i}>{b}</window.BrewBadge>)}
      </div>
      <span style={{ fontFamily: CVF().mono, fontSize: 11, color: CV().muted, letterSpacing: '0.04em' }}>{time}</span>
    </div>
  );
}

function CoffeeName({ children }) {
  return (
    <div style={{
      fontFamily: CVF().display, fontSize: 22, fontWeight: 500, lineHeight: 1.15,
      letterSpacing: '-0.005em', color: CV().ink,
    }}>{children}</div>
  );
}

function MetricsRow() {
  return (
    <div style={{
      marginTop: 14, paddingTop: 12,
      borderTop: `1px solid ${CV().hairline}`,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
    }}>
      <Metric label="DOSE" value="15.0g" />
      <Metric label="WATER" value="245g" />
      <Metric label="TIME" value="2:50" />
      <Metric label="RATIO" value="1:16.3" accent />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// VARIATION A — quiet bag pill in the top-right metadata row
// ═════════════════════════════════════════════════════════════════════
function VariantA() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em' }}>VARIATION A · BAG PILL</div>
      <CardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <window.BrewBadge>POUR-OVER</window.BrewBadge>
          {/* the bag indicator — small tappable pill */}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 22,
            padding: '0 8px 0 6px', borderRadius: 999, border: 'none',
            background: CV().copperLt, color: CV().copperDk, cursor: 'pointer',
          }}>
            <window.BagGlyph size={11} color={CV().copperDk} />
            <span style={{ fontFamily: CVF().mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em' }}>BAG</span>
          </button>
        </div>
        <CoffeeName>Ethiopia Worka Sakaro</CoffeeName>
        <div style={{ fontFamily: CVF().ui, fontSize: 13, color: CV().muted, marginTop: 2 }}>Sey · washed</div>
        <MetricsRow />
        <div style={{
          marginTop: 8, fontFamily: CVF().mono, fontSize: 10, color: CV().faint, letterSpacing: '0.04em',
          textAlign: 'right',
        }}>YESTERDAY · 7:42</div>
      </CardShell>
      <Note tone="con">
        Adds visual weight to the metadata row, displacing the time-ago. The pill says
        "this is a bag" but doesn't show <em>which</em> bag — the user has to tap to find out.
      </Note>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// VARIATION B — roaster line becomes a link + freshness eyebrow (PICK)
// ═════════════════════════════════════════════════════════════════════
function VariantB() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em' }}>VARIATION B · ROASTER-AS-LINK + FRESHNESS</div>
      <CardShell recommended>
        <TopRow time="YESTERDAY · 7:42" badges={['POUR-OVER']} />
        <CoffeeName>Ethiopia Worka Sakaro</CoffeeName>
        {/* roaster line is now a tappable link to /bags/[id]; bag-glyph prefix */}
        <button style={{
          marginTop: 4, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: CVF().ui, fontSize: 13, color: CV().copperDk,
        }}>
          <window.BagGlyph size={12} color={CV().copperDk} />
          <span style={{
            borderBottom: `1px solid ${CV().copper}55`,
          }}>Sey · washed</span>
        </button>
        {/* freshness eyebrow — only present because the bag link enables it */}
        <div style={{
          marginTop: 8, fontFamily: CVF().mono, fontSize: 10.5, fontWeight: 500,
          letterSpacing: '0.14em', color: window.freshnessTone(6),
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 999, background: window.freshnessTone(6), display: 'inline-block',
          }} />
          ROASTED 6 DAYS AGO
        </div>
        <MetricsRow />
      </CardShell>
      <Note tone="pro">
        <strong>Why this one:</strong> the roaster line was already there — promoting it to a
        link adds the affordance without adding a new row. The freshness eyebrow (only
        possible because the bag link gives us a roast date) earns its real estate by
        contributing <em>information</em>, not decoration. Color-coded: green ≤14d, ochre
        ≤21d, terracotta beyond.
      </Note>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// VARIATION C — separate "FROM BAG" line under metrics
// ═════════════════════════════════════════════════════════════════════
function VariantC() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em' }}>VARIATION C · FOOTER LINE</div>
      <CardShell>
        <TopRow time="YESTERDAY · 7:42" badges={['POUR-OVER']} />
        <CoffeeName>Ethiopia Worka Sakaro</CoffeeName>
        <div style={{ fontFamily: CVF().ui, fontSize: 13, color: CV().muted, marginTop: 2 }}>Sey · washed</div>
        <MetricsRow />
        {/* footer line */}
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${CV().hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em',
          }}>FROM BAG</div>
          <button style={{
            padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: CVF().display, fontSize: 14, fontStyle: 'italic',
            color: CV().copperDk, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Ethiopia Worka Sakaro <span style={{ fontStyle: 'normal' }}>↗</span>
          </button>
        </div>
      </CardShell>
      <Note tone="con">
        Duplicates the coffee name twice on the same card. Works if a bag's name and the
        coffee name will frequently <em>differ</em> (e.g. internal bag nicknames), but for
        a personal log they usually match.
      </Note>
    </div>
  );
}

function Note({ tone, children }) {
  const isPro = tone === 'pro';
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: isPro ? CV().copperLt : CV().paper,
      color: isPro ? CV().copperDk : CV().ink70,
      border: isPro ? 'none' : `1px solid ${CV().hairline}`,
      fontFamily: CVF().ui, fontSize: 12.5, lineHeight: 1.5,
      maxWidth: 360,
    }}>{children}</div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// COMPOSITE — side-by-side comparison
// ═════════════════════════════════════════════════════════════════════
function VariantsCompare() {
  return (
    <div style={{
      width: 1240, padding: 32, background: CV().surface,
      borderRadius: 16, border: `1px solid ${CV().hairline}`,
      fontFamily: CVF().ui,
    }}>
      <div style={{ fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em' }}>02 · BREW CARD · BAG LINK</div>
      <h2 style={{
        margin: '6px 0 4px', fontFamily: CVF().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: CV().ink, letterSpacing: '-0.01em',
      }}>Three ways to show a linked bag.</h2>
      <p style={{
        margin: 0, fontFamily: CVF().ui, fontSize: 14, lineHeight: 1.55,
        color: CV().muted, maxWidth: 720, marginBottom: 24,
      }}>
        The card must signal that there's more behind the brew (the bag) without adding
        chrome. The best signal turns existing pixels into a link instead of inventing new ones.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
        <VariantA />
        <VariantB />
        <VariantC />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// BREW LIST — Variation B applied in context (mini phone preview)
// ═════════════════════════════════════════════════════════════════════
function BrewListWithBags() {
  const items = [
    { name: 'Ethiopia Worka Sakaro', roaster: 'Sey', process: 'washed', days: 6,  ratio: '1:16.3', dose: '15.0g', yield: '245g', time: '2:50', date: 'YESTERDAY' },
    { name: 'Colombia La Palma',     roaster: 'Onyx', process: 'honey',  days: 14, ratio: '1:2.1',  dose: '18.0g', yield: '37g',  time: '0:28', date: 'TUE 7:12', method: 'ESPRESSO' },
    { name: 'Kenya Kiamabara AA',    roaster: 'April', process: 'washed', days: 22, ratio: '1:16.0', dose: '14.5g', yield: '232g', time: '3:05', date: 'MON 6:48' },
  ];
  return (
    <div style={{
      width: 402, padding: 22, background: CV().paper, fontFamily: CVF().ui,
      borderRadius: 32, border: `1px solid ${CV().hairline}`,
    }}>
      <div style={{
        fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.14em', marginBottom: 8,
      }}>BREW LIST · IN-CONTEXT</div>
      <h1 style={{
        margin: '0 0 18px', fontFamily: CVF().display, fontWeight: 500, fontSize: 32,
        color: CV().ink, letterSpacing: '-0.015em',
      }}>Brews</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: '14px 16px 16px', borderRadius: 18,
            background: CV().surface, border: `1px solid ${CV().hairline}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <window.BrewBadge>{it.method || 'POUR-OVER'}</window.BrewBadge>
              <span style={{ fontFamily: CVF().mono, fontSize: 10.5, color: CV().muted, letterSpacing: '0.04em' }}>{it.date}</span>
            </div>
            <div style={{
              fontFamily: CVF().display, fontSize: 19, fontWeight: 500, lineHeight: 1.15,
              color: CV().ink, letterSpacing: '-0.005em',
            }}>{it.name}</div>
            <button style={{
              marginTop: 3, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: CVF().ui, fontSize: 12.5, color: CV().copperDk,
            }}>
              <window.BagGlyph size={11} color={CV().copperDk} />
              <span style={{ borderBottom: `1px solid ${CV().copper}55` }}>{it.roaster} · {it.process}</span>
            </button>
            <div style={{
              marginTop: 8, fontFamily: CVF().mono, fontSize: 10, fontWeight: 500,
              letterSpacing: '0.14em', color: window.freshnessTone(it.days),
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 999, background: window.freshnessTone(it.days),
              }} /> ROASTED {it.days} DAYS AGO
            </div>
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: `1px solid ${CV().hairline}`,
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
            }}>
              <Metric label={it.method === 'ESPRESSO' ? 'DOSE' : 'DOSE'} value={it.dose} />
              <Metric label={it.method === 'ESPRESSO' ? 'YIELD' : 'WATER'} value={it.yield} />
              <Metric label="TIME" value={it.time} />
              <Metric label="RATIO" value={it.ratio} accent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { VariantsCompare, BrewListWithBags });
