const { getDemographics } = require('../services/demographicData');

const getVerdictPrompt = (simulationLog, bottleneckReport) => {
  const { agents, worldState, coordinatorLog, shelterLog, whatIfEvents } = simulationLog;

  const trapped   = agents.filter(a => a.status === 'trapped');
  const safe      = agents.filter(a => a.status === 'safe');
  const total     = agents.length;
  const survival  = Math.round((safe.length / total) * 100);
  const noPhone   = agents.filter(a => !a.hasSmartphone).length;
  const criticalT = trapped.filter(a => a.vulnerability === 'critical').length;
  const highT     = trapped.filter(a => a.vulnerability === 'high').length;
  const overloadTicks = coordinatorLog?.filter(l => l.overloaded).length ?? 2;
  const maxPending    = coordinatorLog ? Math.max(...coordinatorLog.map(l => l.pending || 0)) : 0;
  const shelterOverflow = worldState.shelters
    ? worldState.shelters.filter(s => (shelterLog?.[s.name]||0) >= s.capacity).length : 0;

  const demo = getDemographics(worldState.disaster.district, worldState.disaster.state);
  const popAffected = Math.round(demo.pop_lakh * 0.3 * 100000);

  // Readiness score
  const readiness = Math.max(20, Math.min(65,
    survival - criticalT*9 - highT*5 - overloadTicks*3 - shelterOverflow*4 - (noPhone>5?8:0) - 5
  ));
  const projected = Math.min(96, survival + trapped.length * 8);

  // Resource deficits
  const currentNDRF = worldState.responders?.filter(r=>r.type==='NDRF'||r.type==='ndrf').length || 2;
  const neededNDRF  = currentNDRF + Math.ceil(overloadTicks/2) + 1;
  const currentAmb  = worldState.responders?.filter(r=>r.type==='Ambulance'||r.type==='ambulance').length || 4;
  const neededAmb   = currentAmb + criticalT + 1;
  const shelterGap  = worldState.shelters
    ? worldState.shelters.reduce((s,sh)=>s+Math.round((sh.capacity||40)*0.6),0) : 60;

  const sc = (s) => s<40?'fill-red':s<70?'fill-amber':'fill-green';
  const cc = (s) => s<40?'#cc0000':s<70?'#cc7700':'#2d7a2d';

  const scores = {
    medical:    Math.max(15, 80 - criticalT*20),
    alert:      Math.max(20, 100 - Math.round(noPhone/total*100) - 30),
    shelter:    shelterOverflow===0 ? 70 : Math.max(30, 70-shelterOverflow*15),
    ndrf:       Math.max(20, 60 - overloadTicks*10),
    route:      Math.max(15, 65 - trapped.filter(a=>a.routeBlocked).length*15),
    misinfo:    whatIfEvents?.some(e=>e.triggerType==='misinformation') ? 10 : 40,
    volunteer:  Math.min(85, agents.filter(a=>a.group==='green'&&a.status!=='trapped').length*10+30),
    community:  Math.min(85, agents.filter(a=>a.group==='green'&&a.status!=='trapped').length*10+30)
  };

  const stateAbbr = (worldState.disaster.state||'IN').split(' ').map(w=>w[0]).join('').toUpperCase();
  const disAbbr   = (worldState.disaster.type||'DIS').split(' ').map(w=>w[0]).join('').toUpperCase();

  return `You are a senior NDMA resource planning official. Generate Section 9 (Final Verdict) of the CrisisSwarm report.
Return ONLY raw HTML starting with <hr>. No CSS, no markdown, no wrapper divs.

SIMULATION DATA:
Location: ${worldState.disaster.location}, ${worldState.disaster.state} | Disaster: ${worldState.disaster.type}
District: ${demo.pop_lakh}L population | Affected: ~${(popAffected/100000).toFixed(1)}L
Agents: ${total} | Safe: ${safe.length} | Trapped: ${trapped.length} | Survival: ${survival}%
Readiness score: ${readiness}% | Projected with fixes: ${projected}%
Critical trapped: ${criticalT} | High trapped: ${highT} | No smartphone: ${noPhone}
Overload ticks: ${overloadTicks} | Max pending: ${maxPending} | Shelter overflow: ${shelterOverflow}
NDRF current: ${currentNDRF} → needed: ${neededNDRF} | Ambulances current: ${currentAmb} → needed: ${neededAmb}

---
OUTPUT THIS EXACT HTML:

<hr>
<div class="section-title">9. Final Verdict — Disaster Response Readiness Assessment</div>

<div class="verdict-banner">
  <div class="verdict-score-row">
    <div style="text-align:left">
      <div class="verdict-title">${worldState.disaster.location.toUpperCase()} ${worldState.disaster.type.toUpperCase()} — RESPONSE READINESS VERDICT</div>
      <div class="verdict-sub">Census-grounded simulation | ${total} agents | ${demo.pop_lakh}L district population | 10 ticks</div>
      <div class="verdict-meaning">${criticalT>=2?'CRITICALLY UNDER-RESOURCED':criticalT>=1?'SEVERELY UNDER-RESOURCED':'MODERATELY UNDER-RESOURCED'} — ${trapped.length} unrescued of ${total} simulated</div>
    </div>
    <div class="score-circle">
      <div class="score-num">${readiness}%</div>
      <div class="score-lbl">Readiness Score</div>
    </div>
  </div>
  <p style="font-size:11px;color:#333;margin:6px 0 0">
    [2 sentences: what ${readiness}% means for ${worldState.disaster.location} specifically. Reference that ${trapped.length} of ${total} agents unrescued = ~${Math.round(trapped.length/total*popAffected).toLocaleString()} real persons in equivalent scenario. Every failure was preventable.]
  </p>
</div>

<div class="section-title">9A — Readiness Score by Category</div>
<div class="readiness-breakdown">
  <div class="rb-row"><div class="rb-label">Medical Emergency Response</div><div class="rb-bar"><div class="rb-fill ${sc(scores.medical)}" style="width:${scores.medical}%"></div></div><div class="rb-score" style="color:${cc(scores.medical)}">${scores.medical}%</div></div>
  <div class="rb-row"><div class="rb-label">Alert &amp; Communication (${demo.no_smartphone_pct}% no smartphone in district)</div><div class="rb-bar"><div class="rb-fill ${sc(scores.alert)}" style="width:${scores.alert}%"></div></div><div class="rb-score" style="color:${cc(scores.alert)}">${scores.alert}%</div></div>
  <div class="rb-row"><div class="rb-label">Shelter Capacity &amp; Management</div><div class="rb-bar"><div class="rb-fill ${sc(scores.shelter)}" style="width:${scores.shelter}%"></div></div><div class="rb-score" style="color:${cc(scores.shelter)}">${scores.shelter}%</div></div>
  <div class="rb-row"><div class="rb-label">Accessibility &amp; Inclusion (${demo.disabled_pct}% disabled in district)</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:0%"></div></div><div class="rb-score" style="color:#cc0000">0%</div></div>
  <div class="rb-row"><div class="rb-label">NDRF &amp; Coordinator Capacity</div><div class="rb-bar"><div class="rb-fill ${sc(scores.ndrf)}" style="width:${scores.ndrf}%"></div></div><div class="rb-score" style="color:${cc(scores.ndrf)}">${scores.ndrf}%</div></div>
  <div class="rb-row"><div class="rb-label">Evacuation Route Redundancy</div><div class="rb-bar"><div class="rb-fill ${sc(scores.route)}" style="width:${scores.route}%"></div></div><div class="rb-score" style="color:${cc(scores.route)}">${scores.route}%</div></div>
  <div class="rb-row"><div class="rb-label">Misinformation Control</div><div class="rb-bar"><div class="rb-fill ${sc(scores.misinfo)}" style="width:${scores.misinfo}%"></div></div><div class="rb-score" style="color:${cc(scores.misinfo)}">${scores.misinfo}%</div></div>
  <div class="rb-row"><div class="rb-label">Volunteer Integration (${agents.filter(a=>a.group==='green').length} informal volunteers active)</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:5%"></div></div><div class="rb-score" style="color:#cc0000">5%</div></div>
  <div class="rb-row"><div class="rb-label">Community Self-Organization</div><div class="rb-bar"><div class="rb-fill ${sc(scores.community)}" style="width:${scores.community}%"></div></div><div class="rb-score" style="color:${cc(scores.community)}">${scores.community}%</div></div>
</div>

<hr>

<div class="section-title">9B — Minimum Resource Requirements to Achieve Zero-Failure Outcome</div>
<p class="body-text">Calculated from simulation failures and ${worldState.disaster.district||worldState.disaster.location} district census data (${demo.pop_lakh}L population, ${demo.elderly_pct}% elderly, ${demo.disabled_pct}% disabled, ${demo.bpl_pct}% BPL).</p>

<table class="team-table">
  <tr><th>Resource</th><th>Current</th><th>Required</th><th>Deficit</th><th>Deploy Zone</th><th>Justification</th></tr>
  <tr>
    <td class="td-role">NDRF Rescue Teams</td>
    <td class="td-current">${currentNDRF} teams</td>
    <td class="td-required">${neededNDRF} teams</td>
    <td class="td-deficit">+${neededNDRF-currentNDRF} teams</td>
    <td class="td-zone">${worldState.zones.red.join(', ')}</td>
    <td class="td-reason">[District coordination node received ${maxPending} simultaneous requests at Tick ${overloadTicks}. ${neededNDRF-currentNDRF} additional teams reduce per-node load to ≤3/tick and decentralize response.]</td>
  </tr>
  <tr>
    <td class="td-role">Ambulances (pre-positioned in red zones)</td>
    <td class="td-current">${currentAmb} vehicles</td>
    <td class="td-required">${neededAmb} vehicles</td>
    <td class="td-deficit">+${neededAmb-currentAmb} vehicles</td>
    <td class="td-zone">Inside red zone boundaries before onset</td>
    <td class="td-reason">[Describe the population category affected and emergency needs. State that pre-positioning inside zone eliminates route-blocked failure.]</td>
  </tr>
  <tr>
    <td class="td-role">Accessible/Stretcher Vehicles</td>
    <td class="td-current">0</td>
    <td class="td-required">${Math.max(2,worldState.zones.red.length+1)} vehicles</td>
    <td class="td-deficit">+${Math.max(2,worldState.zones.red.length+1)} vehicles</td>
    <td class="td-zone">${worldState.zones.red.concat(worldState.zones.amber).slice(0,3).join(', ')}</td>
    <td class="td-reason">[Name wheelchair/mobility-impaired trapped agent. ~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} disabled persons in affected zones have zero evacuation option under current plan.]</td>
  </tr>
  <tr>
    <td class="td-role">Emergency Coordinators</td>
    <td class="td-current">1 coordinator</td>
    <td class="td-required">${Math.max(2,worldState.zones.red.length+1)} coordinators</td>
    <td class="td-deficit">+${Math.max(1,worldState.zones.red.length)} coordinators</td>
    <td class="td-zone">1 per red zone district</td>
    <td class="td-reason">Single coordinator overloaded at Tick ${overloadTicks} with ${maxPending} pending requests. Distributed coordination (1 per zone) keeps load ≤3/tick.</td>
  </tr>
  <tr>
    <td class="td-role">Non-Digital Alert Officers (door-to-door)</td>
    <td class="td-current">0</td>
    <td class="td-required">1 per ward in red zones</td>
    <td class="td-deficit">+${Math.max(8,noPhone*2)} officers est.</td>
    <td class="td-zone">All red zone wards</td>
    <td class="td-reason">${noPhone} agents (${Math.round(noPhone/total*100)}% of simulation) received zero alert. District data: ${demo.no_smartphone_pct}% of ${(popAffected/100000).toFixed(1)}L affected = ~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons unreachable by digital alert.</td>
  </tr>
  <tr>
    <td class="td-role">Registered Community Volunteers</td>
    <td class="td-current">0 (all informal)</td>
    <td class="td-required">10 per red zone ward</td>
    <td class="td-deficit">+${Math.max(20,agents.filter(a=>a.group==='green').length*4)} volunteers</td>
    <td class="td-zone">All red zone wards</td>
    <td class="td-reason">${agents.filter(a=>a.group==='green').length} informal volunteers performed critical last-mile rescues the official system could not reach. Formalizing via NDMA Community Volunteer Program multiplies capacity 4x at near-zero cost.</td>
  </tr>
  <tr>
    <td class="td-role">Additional Shelter Capacity</td>
    <td class="td-current">${worldState.shelters?.reduce((s,sh)=>s+(sh.capacity||40),0)||80} persons</td>
    <td class="td-required">${(worldState.shelters?.reduce((s,sh)=>s+(sh.capacity||40),0)||80)+shelterGap} persons</td>
    <td class="td-deficit">+${shelterGap} persons (+1 new shelter)</td>
    <td class="td-zone">Safe zones</td>
    <td class="td-reason">[Reference shelter overflow events. State which shelter hit capacity at which tick. BPL population (${demo.bpl_pct}%) has no alternative accommodation.]</td>
  </tr>
</table>

<hr>

<div class="section-title">9C — Zone-by-Zone Readiness</div>
${worldState.zones.red.map((z,i)=>`
<div class="zone-verdict zv-red">
  <div class="zv-header"><span class="zv-badge zvb-red">RED ZONE</span><span class="zv-name">${z}</span><span class="zv-readiness zvr-red">Readiness: ${Math.max(18,35-criticalT*5-i*5)}%</span></div>
  <div class="zv-body">[3 sentences: agents in ${z}, what failed, what remains unresolved at Tick 10. Use zone-level statistics and population categories only.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-red">+${neededAmb-currentAmb} Ambulances pre-positioned</span>
    <span class="need-tag nt-red">+1 NDRF team</span>
    <span class="need-tag nt-red">Loudspeaker alert network</span>
    <span class="need-tag nt-red">+1 Accessible vehicle</span>
    <span class="need-tag nt-red">+1 Field medical officer</span>
  </div>
</div>`).join('\n')}

${worldState.zones.amber.map((z,i)=>`
<div class="zone-verdict zv-amber">
  <div class="zv-header"><span class="zv-badge zvb-amber">AMBER ZONE</span><span class="zv-name">${z}</span><span class="zv-readiness zvr-amber">Readiness: ${Math.max(45,60-highT*5-i*5)}%</span></div>
  <div class="zv-body">[3 sentences: amber agents in ${z}, evacuation obstacles, coordination gaps.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-amber">+2 Group transport vehicles</span>
    <span class="need-tag nt-amber">Real-time road status broadcast</span>
    <span class="need-tag nt-amber">+1 Shelter overflow coordinator</span>
  </div>
</div>`).join('\n')}

${worldState.zones.safe.map((z,i)=>`
<div class="zone-verdict zv-safe">
  <div class="zv-header"><span class="zv-badge zvb-safe">SAFE ZONE</span><span class="zv-name">${z}</span><span class="zv-readiness zvr-green">Readiness: ${Math.max(60,75-overloadTicks*5-i*5)}%</span></div>
  <div class="zv-body">[Coordination hub in ${z}. Hospital/shelter overload. Scaling failures not structural ones.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-green">+${Math.max(1,worldState.zones.red.length-1)} District coordinators</span>
    <span class="need-tag nt-green">+2 Shelter managers</span>
    <span class="need-tag nt-green">Backup power for shelters</span>
  </div>
</div>`).join('\n')}

<hr>

<div class="section-title">9D — Population Impact: Current Plan vs Recommended Plan</div>
<div class="inaction-box">
  <div class="inaction-title">If Current Plan Deployed Unchanged — ${worldState.disaster.location} ${worldState.disaster.type}</div>
  <div class="inaction-row"><span class="ir-label">Unrescued critical cases (simulation)</span><span class="ir-value">${criticalT} confirmed</span></div>
  <div class="inaction-row"><span class="ir-label">Persons receiving zero alert (${demo.no_smartphone_pct}% no smartphone)</span><span class="ir-value">~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons</span></div>
  <div class="inaction-row"><span class="ir-label">Disabled persons with zero evacuation option (${demo.disabled_pct}%)</span><span class="ir-value">~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} persons</span></div>
  <div class="inaction-row"><span class="ir-label">Elderly at risk without dedicated support (${demo.elderly_pct}%)</span><span class="ir-value">~${Math.round(popAffected*demo.elderly_pct/100).toLocaleString()} persons</span></div>
  <div class="inaction-row"><span class="ir-label">BPL households with no self-evacuation capacity (${demo.bpl_pct}%)</span><span class="ir-value">~${Math.round(popAffected*demo.bpl_pct/100).toLocaleString()} persons</span></div>
  <div class="inaction-row"><span class="ir-label">Simulation survival rate</span><span class="ir-value">${survival}% → ~${Math.round(popAffected*survival/100).toLocaleString()} persons safe</span></div>
  <div class="inaction-row" style="border-top:1px solid #cc0000;margin-top:4px;padding-top:8px">
    <span class="ir-label" style="font-weight:bold">Projected survival with all recommendations implemented</span>
    <span class="ir-value" style="color:#2d7a2d">${projected}% → ~${Math.round(popAffected*projected/100).toLocaleString()} persons safe (+${Math.round(popAffected*(projected-survival)/100).toLocaleString()} additional lives)</span>
  </div>
</div>

<hr>

<div class="section-title">9E — Final Statement</div>
<div class="final-box">
  <div class="final-box-title">CrisisSwarm Simulation Engine — Final Verdict</div>
  <div class="final-statement">
    The ${worldState.disaster.location} ${worldState.disaster.type} response plan achieves a <span class="final-highlight">readiness score of ${readiness}%</span> against this scenario. Of ${total} census-grounded agents representing ~${(popAffected/100000).toFixed(1)} lakh affected residents, <span class="final-highlight">${trapped.length} were unrescued</span> — not due to the disaster but due to <span class="final-highlight">preventable systemic gaps</span>.<br><br>
    The simulation identifies: <span class="final-highlight">+${neededNDRF-currentNDRF} NDRF teams</span>, <span class="final-highlight">+${neededAmb-currentAmb} ambulances pre-positioned in red zones</span>, <span class="final-highlight">+${Math.max(2,worldState.zones.red.length+1)} accessible vehicles</span> (currently zero), <span class="final-highlight">non-digital alert for ~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons</span> without smartphones, and <span class="final-highlight">formalization of community volunteer networks</span> as the minimum interventions to achieve ${projected}% survival.<br><br>
    [1 sentence naming the single most critical failure from the simulation and the specific agent who represents it.]<br><br>
    <span class="final-highlight">Every failure documented here is a gap that exists today. Every recommendation is actionable today. The question is not whether the next disaster will come — it is whether these gaps will still exist when it does.</span>
  </div>
</div>

<div class="footer">
  <span>Ref: CRISISSWARM/${stateAbbr}/${disAbbr}/2024/SIM-001</span>
  <span>Data: Census 2011 + NFHS-5 | District: ${worldState.disaster.district||worldState.disaster.location}</span>
  <span>CrisisSwarm v1.0 — Hackerz Street 4.0</span>
</div>`;
};

module.exports = { getVerdictPrompt };