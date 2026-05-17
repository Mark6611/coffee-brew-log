// Assembles all artboards onto the canvas.

function PhoneFrame2({ children }) {
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

function BagApp() {
  return (
    <DesignCanvas>
      <DCSection id="00-vibe" title="BagPicker · Direction" subtitle="One field for bag-linked brews + how it shows on the brew card.">
        <DCArtboard id="vibe" label="Direction" width={760} height={410}>
          <BagVibeCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="01-states" title="01 · BagPicker states" subtitle="Six panels covering every state the picker can be in.">
        <DCArtboard id="s1-idle"     label="1 · Idle"           width={380} height={280}>
          <StateIdle />
        </DCArtboard>
        <DCArtboard id="s2-focused"  label="2 · Focused empty"  width={380} height={500}>
          <StateFocused />
        </DCArtboard>
        <DCArtboard id="s3-typing"   label="3 · Typing · results" width={380} height={450}>
          <StateTyping />
        </DCArtboard>
        <DCArtboard id="s4-noresults" label="4 · Typing · no match" width={380} height={340}>
          <StateNoResults />
        </DCArtboard>
        <DCArtboard id="s5-selected" label="5 · Selected"       width={380} height={310}>
          <StateSelected />
        </DCArtboard>
        <DCArtboard id="s6-anatomy"  label="6 · Dropdown anatomy" width={380} height={620}>
          <StateAnatomy />
        </DCArtboard>
      </DCSection>

      <DCSection id="01b-context" title="01b · In context" subtitle="The picker dropped into the New-Brew form fragment.">
        <DCArtboard id="ctx-empty"    label="Form · empty picker"    width={380} height={660}>
          <InFormContext state="empty" />
        </DCArtboard>
        <DCArtboard id="ctx-selected" label="Form · selected picker" width={380} height={660}>
          <InFormContext state="selected" />
        </DCArtboard>
      </DCSection>

      <DCSection id="02-card" title="02 · Brew card · bag link" subtitle="Three variations explored — Variation B (recommended) shown in context.">
        <DCArtboard id="variants" label="Three options · side by side" width={1240} height={690}>
          <VariantsCompare />
        </DCArtboard>
        <DCArtboard id="list-context" label="Variation B applied · brew list" width={402} height={780}>
          <BrewListWithBags />
        </DCArtboard>
      </DCSection>

      <DCSection id="03-specs" title="03 · BagPicker specs" subtitle="Shape, color, behavior, motion.">
        <DCArtboard id="specs" label="Spec sheet" width={760} height={1750}>
          <BagSpecsCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="04-decision" title="04 · Brew card decision" subtitle="Why Variation B over A and C, plus the freshness ramp.">
        <DCArtboard id="decision" label="Decision rationale" width={760} height={540}>
          <BagDecisionCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="05-detail" title="05 · Bag detail · /bags/[id]" subtitle="Optional sketch — identity, key facts, consumption bar, linked brews.">
        <DCArtboard id="detail-screen" label="Bag detail · light" width={402} height={874}>
          <PhoneFrame2><BagDetailScreen /></PhoneFrame2>
        </DCArtboard>
        <DCArtboard id="detail-dark" label="Bag detail · dark" width={402} height={874}>
          <PhoneFrame2><BagDetailScreen dark /></PhoneFrame2>
        </DCArtboard>
        <DCArtboard id="detail-notes" label="Layout notes" width={760} height={620}>
          <BagDetailNotesCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="06-handoff" title="06 · Handoff notes" subtitle="Tailwind snippets and wiring rules.">
        <DCArtboard id="handoff" label="Handoff" width={760} height={1100}>
          <HandoffNotesCard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<BagApp />);
