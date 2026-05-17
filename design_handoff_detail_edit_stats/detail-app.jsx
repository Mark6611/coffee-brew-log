// Assembles the detail/edit/stats canvas.

function PhoneFrame3({ children }) {
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
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)',
        zIndex: 60, pointerEvents: 'none',
      }}/>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function DetailApp() {
  return (
    <DesignCanvas>
      <DCSection id="00-vibe" title="Detail · Edit · Stats" subtitle="Three rooms in the same house.">
        <DCArtboard id="vibe" label="Direction" width={760} height={400}>
          <VibeCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="01-detail" title="01 · /brews/[id] — brew detail" subtitle="Detail at rest. Ratio is the headline. Bag link inherits the brew-card pattern.">
        <DCArtboard id="detail-rich"   label="Rich brew · light"   width={402} height={874}>
          <PhoneFrame3><BrewDetailScreen /></PhoneFrame3>
        </DCArtboard>
        <DCArtboard id="detail-dark"   label="Rich brew · dark"    width={402} height={874}>
          <PhoneFrame3><BrewDetailScreen dark /></PhoneFrame3>
        </DCArtboard>
        <DCArtboard id="detail-minimal" label="Barebones brew · no bag / no rating / no notes" width={402} height={874}>
          <PhoneFrame3><BrewDetailMinimal /></PhoneFrame3>
        </DCArtboard>
      </DCSection>

      <DCSection id="01-detail-spec" title="01b · Detail spec" subtitle="Hierarchy, hero ratio, conditional rendering rules, actions footer.">
        <DCArtboard id="detail-spec" label="Detail spec" width={760} height={1790}>
          <DetailSpecCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="02-edit" title="02 · /brews/[id]/edit — edit mode" subtitle="Copper top hairline, EDITING eyebrow, Reset bar appears when dirty, per-field dirty markers.">
        <DCArtboard id="edit-dirty" label="Edit · dirty"   width={402} height={874}>
          <PhoneFrame3><BrewEditScreen /></PhoneFrame3>
        </DCArtboard>
        <DCArtboard id="edit-clean" label="Edit · clean (no changes yet)" width={402} height={874}>
          <PhoneFrame3><BrewEditScreen dirty={false} /></PhoneFrame3>
        </DCArtboard>
        <DCArtboard id="edit-dark"  label="Edit · dirty · dark" width={402} height={874}>
          <PhoneFrame3><BrewEditScreen dark /></PhoneFrame3>
        </DCArtboard>
      </DCSection>

      <DCSection id="02-edit-spec" title="02b · Edit spec" subtitle="Answers to bracket questions: dirty UI, Reset, Save copy, back behavior, where Delete lives.">
        <DCArtboard id="edit-spec" label="Edit spec" width={760} height={1480}>
          <EditSpecCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="03-stats" title="03 · /stats — long-term patterns" subtitle="Editorial, not corporate. CSS-only charts.">
        <DCArtboard id="stats-light" label="Stats · light"   width={402} height={874}>
          <PhoneFrame3><StatsScreen /></PhoneFrame3>
        </DCArtboard>
        <DCArtboard id="stats-dark"  label="Stats · dark"    width={402} height={874}>
          <PhoneFrame3><StatsScreen dark /></PhoneFrame3>
        </DCArtboard>
      </DCSection>

      <DCSection id="03-stats-spec" title="03b · Stats spec" subtitle="Section priority order, chart rules, what's excluded and why.">
        <DCArtboard id="stats-spec" label="Stats spec" width={760} height={1650}>
          <StatsSpecCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="04-handoff" title="04 · Implementation notes" subtitle="Routing, state, bag write-back, Tailwind hints, out of scope.">
        <DCArtboard id="handoff" label="Handoff" width={760} height={1550}>
          <CrossCuttingHandoff />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DetailApp />);
