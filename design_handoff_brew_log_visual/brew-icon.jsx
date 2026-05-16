// App icon concept — coffee bean mark at multiple sizes.
// Design rationale: a single coffee bean rendered as two opposing crescents
// forming the iconic central crease. Reads as a bean at 16px, as a refined
// mark at 512px. Single copper accent on cream, no gradients, no glyphs.

const ICON_B = () => window.BREW;
const ICON_F = () => window.TF;

// The mark itself — scalable. Pass `size` for the artwork box.
function BeanMark({ size = 512, bg = '#9C4A1F', fg = '#FBF6EB' }) {
  // Bean fits a 512 viewBox, tilted -18°.
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: 'block' }}>
      {/* background tile */}
      <rect x="0" y="0" width="512" height="512" rx={size >= 64 ? 112 : 18} fill={bg} />
      {/* bean — outer ellipse + central seam, all in fg */}
      <g transform="translate(256 256) rotate(-18)">
        <ellipse cx="0" cy="0" rx="125" ry="172" fill="none" stroke={fg} strokeWidth="22"/>
        {/* central seam: an S-curve, the signature of a coffee bean */}
        <path d="M 0 -150 C 50 -90, -50 -10, 0 60 S 50 130, 0 150"
              fill="none" stroke={fg} strokeWidth="22"
              strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// Render the mark at a real DOM size so we can preview it accurately.
function IconAtSize({ pixels, label, bg, fg, rounded = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: pixels, height: pixels, position: 'relative',
        // For 16px and 32px, show a tiny pixel grid backing so the user
        // can see how it reads at favicon scale.
        boxShadow: pixels <= 32 ? '0 0 0 1px rgba(0,0,0,0.08)' : '0 6px 18px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
        borderRadius: rounded ? (pixels >= 64 ? pixels * 0.22 : pixels * 0.16) : 0,
        overflow: 'hidden',
      }}>
        <BeanMark size={pixels} bg={bg} fg={fg} />
      </div>
      <div style={{
        fontFamily: ICON_F().mono, fontSize: 10.5, color: ICON_B().muted,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  );
}

function IconCard() {
  return (
    <div style={{
      width: 760, padding: 32, background: ICON_B().surface,
      borderRadius: 16, border: `1px solid ${ICON_B().hairline}`,
      fontFamily: ICON_F().ui,
    }}>
      <window.BrewEyebrow>06 · App icon</window.BrewEyebrow>
      <h2 style={{
        margin: '6px 0 4px', fontFamily: ICON_F().display, fontWeight: 500,
        fontSize: 32, lineHeight: 1.1, color: ICON_B().ink, letterSpacing: '-0.01em',
      }}>A single bean, with its seam.</h2>
      <p style={{
        margin: 0, fontFamily: ICON_F().ui, fontSize: 14, lineHeight: 1.55,
        color: ICON_B().muted, maxWidth: 560,
      }}>
        Two strokes: the bean outline and the S-curve seam, drawn in cream on a copper tile.
        It carries the brand's single accent without leaning on letterforms or steam clichés.
      </p>

      {/* Size ladder */}
      <div style={{
        marginTop: 28, padding: 24, background: ICON_B().paper,
        borderRadius: 12, border: `1px solid ${ICON_B().hairline}`,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        gap: 20, flexWrap: 'wrap',
      }}>
        <IconAtSize pixels={16}  label="16 · favicon" bg={ICON_B().copper} fg="#FBF6EB" />
        <IconAtSize pixels={32}  label="32"           bg={ICON_B().copper} fg="#FBF6EB" />
        <IconAtSize pixels={64}  label="64"           bg={ICON_B().copper} fg="#FBF6EB" />
        <IconAtSize pixels={120} label="120 · iOS"    bg={ICON_B().copper} fg="#FBF6EB" />
        <IconAtSize pixels={180} label="180 · @3x"    bg={ICON_B().copper} fg="#FBF6EB" />
      </div>

      {/* Variants */}
      <div style={{
        marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        {[
          { bg: ICON_B().copper,    fg: '#FBF6EB',         label: 'Primary' },
          { bg: ICON_B().ink,       fg: '#FBF6EB',         label: 'Monochrome ink' },
          { bg: '#FBF6EB',          fg: ICON_B().copper,   label: 'Inverted' },
          { bg: ICON_B().d_paper,   fg: ICON_B().d_copper, label: 'Dark mode' },
        ].map(v => (
          <div key={v.label} style={{
            padding: 18, background: ICON_B().paper,
            borderRadius: 12, border: `1px solid ${ICON_B().hairline}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <IconAtSize pixels={84} label={v.label} bg={v.bg} fg={v.fg} />
          </div>
        ))}
      </div>

      {/* SVG handoff hint */}
      <div style={{
        marginTop: 18, padding: 14, borderRadius: 10,
        background: ICON_B().paper, border: `1px solid ${ICON_B().hairline}`,
        fontFamily: ICON_F().mono, fontSize: 11.5, color: ICON_B().ink70,
        lineHeight: 1.6,
      }}>
        <div style={{ color: ICON_B().muted, marginBottom: 6 }}># SVG geometry (paste into /static/icon.svg)</div>
        viewBox="0 0 512 512" · rect r=112 fill={'{copper}'}<br/>
        ellipse rx=125 ry=172 stroke={'{paper}'} stroke-w=22 · rotate(-18 256 256)<br/>
        seam: M 0 -150 C 50 -90, -50 -10, 0 60 S 50 130, 0 150
      </div>
    </div>
  );
}

window.BeanMark = BeanMark;
Object.assign(window, { IconCard });
