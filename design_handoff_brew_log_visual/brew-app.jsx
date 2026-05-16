// Main app — assembles all cards/mockups onto the design canvas.

function PhoneFrame({ children }) {
  // Wrap a screen in just the iOS bezel; the screen has its own status bar.
  return (
    <div style={{
      width: 402, height: 874, borderRadius: 48,
      background: '#000', padding: 0, overflow: 'hidden',
      boxShadow: '0 30px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.18)',
      position: 'relative',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }}/>
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
        zIndex: 60, pointerEvents: 'none',
      }}/>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="00-vibe" title="Coffee Brew Log · Visual Direction" subtitle="A handoff document for the implementation agent.">
        <DCArtboard id="vibe" label="Vibe statement" width={760} height={360}>
          <VibeCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="01-system" title="Design system" subtitle="Tokens, type scale, and the component kit.">
        <DCArtboard id="palette" label="Palette · light + dark" width={760} height={1010}>
          <PaletteCard />
        </DCArtboard>
        <DCArtboard id="type" label="Type scale" width={760} height={910}>
          <TypeCard />
        </DCArtboard>
        <DCArtboard id="components" label="Components" width={760} height={780}>
          <ComponentCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="02-screens" title="Mobile screens · light" subtitle="402×874 iPhone — Home, Brew list, New brew, Empty state.">
        <DCArtboard id="home" label="Home" width={402} height={874}>
          <PhoneFrame><HomeScreen /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="list" label="Brew list" width={402} height={874}>
          <PhoneFrame><ListScreen /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="new" label="New brew" width={402} height={874}>
          <PhoneFrame><NewBrewScreen /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="empty" label="Empty state" width={402} height={874}>
          <PhoneFrame><EmptyScreen /></PhoneFrame>
        </DCArtboard>
      </DCSection>

      <DCSection id="03-screens-dark" title="Mobile screens · dark" subtitle="Same components, dark tokens.">
        <DCArtboard id="home-d" label="Home · dark" width={402} height={874}>
          <PhoneFrame><HomeScreen dark /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="list-d" label="Brew list · dark" width={402} height={874}>
          <PhoneFrame><ListScreen dark /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="new-d" label="New brew · dark" width={402} height={874}>
          <PhoneFrame><NewBrewScreen dark /></PhoneFrame>
        </DCArtboard>
      </DCSection>

      <DCSection id="04-icon" title="App icon" subtitle="A coffee bean with its seam — single mark, no letterforms.">
        <DCArtboard id="icon" label="Icon study" width={760} height={770}>
          <IconCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="05-mockups" title="Page mockups" subtitle="ASCII layout & rhythm — for the developer's mental model.">
        <DCArtboard id="mockups" label="Layouts" width={760} height={1440}>
          <MockupsCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="06-handoff" title="Handoff notes" subtitle="Implementation specifics — Tailwind tokens, fonts, rules.">
        <DCArtboard id="handoff" label="Handoff" width={760} height={1110}>
          <HandoffCard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
