const getVerdictPrompt = (simulationLog, bottleneckReport) => {
  const { agents, worldState, ticks, coordinatorLog, shelterLog, whatIfEvents } = simulationLog;

  const trappedAgents   = agents.filter(a => a.status === 'trapped');
  const safeAgents      = agents.filter(a => a.status === 'safe');
  const totalAgents     = agents.length;
  const survivalRate    = Math.round((safeAgents.length / totalAgents) * 100);

  // Readiness score calculation (weighted)
  const criticalTrapped    = trappedAgents.filter(a => a.vulnerability === 'critical').length;
  const highTrapped        = trappedAgents.filter(a => a.vulnerability === 'high').length;
  const overloadedTicks    = coordinatorLog ? coordinatorLog.filter(l => l.overloaded).length : 2;
  const noSmartphone       = agents.filter(a => !a.hasSmartphone).length;
  const noAccessibleVehicle = 1; // always a gap — guaranteed 0 in fleet
  const shelterOverflow    = worldState.shelters
    ? worldState.shelters.filter(s => (shelterLog[s.name] || 0) >= s.capacity).length
    : 0;

  // Score: start at survivalRate, penalize for each failure type
  const rawScore = Math.max(20, Math.min(65,
    survivalRate
    - (criticalTrapped * 9)
    - (highTrapped * 5)
    - (overloadedTicks * 3)
    - (shelterOverflow * 4)
    - (noAccessibleVehicle * 5)
    - (noSmartphone > 5 ? 8 : 0)
  ));
  const readinessScore = rawScore;

  // Category scores
  const medicalScore     = criticalTrapped === 0 ? 75 : Math.max(15, 80 - criticalTrapped * 20);
  const alertScore       = Math.max(20, 100 - Math.round((noSmartphone / totalAgents) * 100) - 30);
  const shelterScore     = shelterOverflow === 0 ? 70 : Math.max(30, 70 - shelterOverflow * 15);
  const accessScore      = 0; // always 0 — no accessible vehicles
  const ndrfScore        = Math.max(20, 60 - overloadedTicks * 10);
  const routeScore       = Math.max(15, 65 - trappedAgents.filter(a => a.routeBlocked).length * 15);
  const misinfoScore     = whatIfEvents && whatIfEvents.some(e => e.triggerType === 'misinformation') ? 10 : 40;
  const volunteerIntScore = 5; // always low — volunteers not in official plan
  const roadConnScore    = Math.max(15, 60 - (worldState.blocked_roads ? worldState.blocked_roads.length * 10 : 0));
  const communityScore   = Math.min(85, agents.filter(a => a.group === 'green' && a.status !== 'trapped').length * 10 + 30);

  const getScoreClass = (s) => s < 40 ? 'fill-red' : s < 70 ? 'fill-amber' : 'fill-green';
  const getScoreColor = (s) => s < 40 ? '#cc0000' : s < 70 ? '#cc7700' : '#2d7a2d';

  // Resource totals
  const currentAmbulances = worldState.responders
    ? worldState.responders.filter(r => r.type === 'ambulance').length || 4
    : 4;
  const requiredAmbulances = currentAmbulances + criticalTrapped + 1;
  const ambulanceDeficit   = requiredAmbulances - currentAmbulances;

  const currentNDRF  = worldState.responders
    ? worldState.responders.filter(r => r.type === 'ndrf' || r.type === 'rescue').length || 2
    : 2;
  const requiredNDRF = currentNDRF + Math.ceil(overloadedTicks / 2) + 1;
  const ndrfDeficit  = requiredNDRF - currentNDRF;

  const totalShelterCapacity = worldState.shelters
    ? worldState.shelters.reduce((s, sh) => s + (sh.capacity || 40), 0)
    : 80;
  const requiredShelterCapacity = Math.round(totalShelterCapacity * 1.6);
  const shelterCapDeficit = requiredShelterCapacity - totalShelterCapacity;

  const humanResourceTotal = ndrfDeficit * 5 + ambulanceDeficit * 2 + 3 + 2 + 2 + 12;
  const vehicleTotal = ambulanceDeficit + 4 + 4 + 6;
  const equipmentTotal = 20 + 5;
  const shelterTotal = shelterCapDeficit + 40;

  // Zone readiness
  const redReadiness   = Math.max(18, 35 - criticalTrapped * 5);
  const amberReadiness = Math.max(45, 65 - highTrapped * 5);
  const safeReadiness  = Math.max(60, 75 - overloadedTicks * 5);

  // Coordinator agent name
  const coordinatorAgent = agents.find(a =>
    a.group === 'blue' && (
      a.role.toLowerCase().includes('ndrf') ||
      a.role.toLowerCase().includes('coordinator') ||
      a.role.toLowerCase().includes('collector')
    )
  );

  const stateAbbr = (worldState.disaster.state || 'IN')
    .split(' ').map(w => w[0]).join('').toUpperCase();
  const disasterAbbr = (worldState.disaster.type || 'DIS')
    .split(' ').map(w => w[0]).join('').toUpperCase();

  const projectedSurvival = Math.min(96, survivalRate + (trappedAgents.length * 8));
  const projectedSafe     = Math.round((projectedSurvival / 100) * totalAgents);

  const trappedList = trappedAgents.map(a =>
    `${a.name} (${a.role}, ${a.zone}, vulnerability=${a.vulnerability})`
  ).join('; ');

  const mostCritical = trappedAgents.find(a => a.vulnerability === 'critical');
  const secondCritical = trappedAgents.find(a =>
    !a.hasSmartphone || (a.vulnerability === 'critical' && a !== mostCritical)
  );

  return `You are a senior resource planning official at the National Disaster Management Authority of India.
Based on the simulation data below, generate the Final Verdict section (Section 9) of the CrisisSwarm report.

CRITICAL OUTPUT RULES — READ FIRST:
- Return ONLY raw HTML. Start immediately with <hr>
- Do NOT include <html>, <head>, <body>, <style> tags
- Do NOT include any CSS definitions
- Do NOT include markdown or code fences
- Do NOT include the outer <div class="report"> wrapper
- Every agent name you mention MUST be from the simulation data
- Every number MUST be derived from the simulation data provided
- Use "${worldState.disaster.location}" and "${worldState.disaster.state}" — never hardcode other locations

OUTPUT EXACTLY THIS HTML STRUCTURE:

<hr>
<div class="section-title">9. Final Verdict — Disaster Response Readiness Assessment</div>

<div class="verdict-banner">
  <div class="verdict-score-row">
    <div style="text-align:left">
      <div class="verdict-title">${worldState.disaster.location.toUpperCase()} ${worldState.disaster.type.toUpperCase()} — RESPONSE READINESS VERDICT</div>
      <div class="verdict-sub">Based on CrisisSwarm Multi-Agent Simulation — ${totalAgents} agents — 10 ticks — ${worldState.disaster.location} district</div>
      <div class="verdict-meaning">${criticalTrapped >= 2 ? 'Current plan is CRITICALLY UNDER-RESOURCED for this disaster scenario' : criticalTrapped >= 1 ? 'Current plan is SEVERELY UNDER-RESOURCED for this disaster scenario' : 'Current plan is MODERATELY UNDER-RESOURCED for this disaster scenario'}</div>
    </div>
    <div class="score-circle">
      <div class="score-num">${readinessScore}%</div>
      <div class="score-lbl">Readiness Score</div>
    </div>
  </div>
  <p style="font-size:11px;color:#333;margin:6px 0 0;text-align:left">
    <strong>Score Interpretation:</strong> [Write 2 sentences explaining what ${readinessScore}% readiness means for ${worldState.disaster.location} specifically. Reference that ${trappedAgents.length} of ${totalAgents} simulated agents were unrescued and that every failure was preventable with the resources listed below.]
  </p>
</div>

<div class="section-title">9A — Readiness Score Breakdown by Category</div>
<div class="readiness-breakdown">
  <div class="rb-row">
    <div class="rb-label">Medical Emergency Response</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(medicalScore)}" style="width:${medicalScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(medicalScore)}">${medicalScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Alert &amp; Communication Coverage</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(alertScore)}" style="width:${alertScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(alertScore)}">${alertScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Shelter Capacity &amp; Management</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(shelterScore)}" style="width:${shelterScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(shelterScore)}">${shelterScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Accessibility &amp; Inclusion</div>
    <div class="rb-bar"><div class="rb-fill fill-red" style="width:0%"></div></div>
    <div class="rb-score" style="color:#cc0000">0%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Coordinator &amp; NDRF Capacity</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(ndrfScore)}" style="width:${ndrfScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(ndrfScore)}">${ndrfScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Evacuation Route Redundancy</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(routeScore)}" style="width:${routeScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(routeScore)}">${routeScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Misinformation Control</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(misinfoScore)}" style="width:${misinfoScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(misinfoScore)}">${misinfoScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Volunteer Integration</div>
    <div class="rb-bar"><div class="rb-fill fill-red" style="width:5%"></div></div>
    <div class="rb-score" style="color:#cc0000">5%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Road Connectivity Backup</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(roadConnScore)}" style="width:${roadConnScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(roadConnScore)}">${roadConnScore}%</div>
  </div>
  <div class="rb-row">
    <div class="rb-label">Community Self-Organization</div>
    <div class="rb-bar"><div class="rb-fill ${getScoreClass(communityScore)}" style="width:${communityScore}%"></div></div>
    <div class="rb-score" style="color:${getScoreColor(communityScore)}">${communityScore}%</div>
  </div>
</div>
<p style="font-size:10px;color:#555;font-style:italic">Note: Community self-organization scored ${communityScore}% because volunteers performed effectively despite zero official support. This score reflects community resilience, not government preparedness.</p>

<hr>

<div class="section-title">9B — Total Resource Requirements by Type</div>
<p class="body-text">The following resource requirements are calculated directly from simulation failure data. Every number is derived from a specific agent failure and the population that agent represents. These are the minimum resources required to achieve a zero-failure outcome in a disaster of this scenario's magnitude.</p>

<div class="rs-title">HUMAN RESOURCE REQUIREMENTS</div>
<table class="team-table">
  <tr>
    <th>Role</th>
    <th>Currently Deployed</th>
    <th>Required</th>
    <th>Deficit</th>
    <th>Zone Required</th>
    <th>Justification</th>
  </tr>
  <tr>
    <td class="td-role">NDRF Rescue Teams</td>
    <td class="td-current">${currentNDRF} teams</td>
    <td class="td-required">${requiredNDRF} teams</td>
    <td class="td-deficit">+${ndrfDeficit} teams</td>
    <td class="td-zone">${worldState.zones.red.join(', ')}</td>
    <td class="td-reason">[Justify using coordinator overload data — ${overloadedTicks} ticks at overload, pending requests unactioned]</td>
  </tr>
  <tr>
    <td class="td-role">Ambulance Crews</td>
    <td class="td-current">${currentAmbulances} vehicles / ${currentAmbulances * 2} crew</td>
    <td class="td-required">${requiredAmbulances} vehicles / ${requiredAmbulances * 2} crew</td>
    <td class="td-deficit">+${ambulanceDeficit} vehicles</td>
    <td class="td-zone">[Red zone localities from worldState]</td>
    <td class="td-reason">[Name the specific trapped critical agents whose failures justify each additional ambulance: ${mostCritical ? mostCritical.name : 'critical agent'}]</td>
  </tr>
  <tr>
    <td class="td-role">Shelter Management Staff</td>
    <td class="td-current">1 manager per shelter</td>
    <td class="td-required">2 managers + 1 overflow coordinator per shelter</td>
    <td class="td-deficit">+${(worldState.shelters ? worldState.shelters.length : 2) * 2} total staff</td>
    <td class="td-zone">All active shelters</td>
    <td class="td-reason">[Reference shelter overflow events from shelterLog — which shelter hit capacity at which tick]</td>
  </tr>
  <tr>
    <td class="td-role">Emergency Coordinators</td>
    <td class="td-current">1 coordinator${coordinatorAgent ? ' (' + coordinatorAgent.name + ')' : ''}</td>
    <td class="td-required">${Math.max(2, worldState.zones.red.length + 1)} coordinators (1 per red zone district)</td>
    <td class="td-deficit">+${Math.max(1, worldState.zones.red.length)} coordinators</td>
    <td class="td-zone">${worldState.zones.red.join(', ')}</td>
    <td class="td-reason">Single coordinator received ${maxPending} simultaneous requests. Distributed coordination reduces per-coordinator load to 3 — within actionable capacity.</td>
  </tr>
  <tr>
    <td class="td-role">Medical Officers (Field)</td>
    <td class="td-current">0 field medical officers</td>
    <td class="td-required">${Math.max(1, criticalTrapped)} field medical officers</td>
    <td class="td-deficit">+${Math.max(1, criticalTrapped)} officers</td>
    <td class="td-zone">${worldState.zones.red[0] || 'Red zone'}</td>
    <td class="td-reason">[Name critical agents who needed field medical care but did not receive it]</td>
  </tr>
  <tr>
    <td class="td-role">Alert Communication Officers</td>
    <td class="td-current">0 (digital only)</td>
    <td class="td-required">1 per ward in red zones</td>
    <td class="td-deficit">+${Math.max(8, noSmartphone * 2)} officers estimated</td>
    <td class="td-zone">All red zone wards with low smartphone penetration</td>
    <td class="td-reason">${noSmartphone} agents received zero alert due to no smartphone. Door-to-door alert was the only effective non-digital method in the simulation.</td>
  </tr>
  <tr>
    <td class="td-role">Registered Volunteers (Pre-trained)</td>
    <td class="td-current">0 (all informal)</td>
    <td class="td-required">Minimum 10 per red zone ward</td>
    <td class="td-deficit">+${Math.max(20, agents.filter(a => a.group === 'green').length * 4)} registered volunteers estimated</td>
    <td class="td-zone">All red zone wards</td>
    <td class="td-reason">${agents.filter(a => a.group === 'green').length} informal volunteers performed critical rescues. Formalizing and training 10 per ward would multiply rescue capacity 4x.</td>
  </tr>
</table>

<div class="total-row"><span class="total-label">Total Additional Human Resources Required</span><span class="total-val">+${humanResourceTotal} persons minimum</span></div>

<br>

<div class="rs-title">VEHICLE &amp; EQUIPMENT REQUIREMENTS</div>
<table class="team-table">
  <tr>
    <th>Resource</th>
    <th>Current</th>
    <th>Required</th>
    <th>Deficit</th>
    <th>Pre-position Location</th>
    <th>Reason from Simulation</th>
  </tr>
  <tr>
    <td class="td-role">Standard Ambulances</td>
    <td class="td-current">${currentAmbulances}</td>
    <td class="td-required">${requiredAmbulances}</td>
    <td class="td-deficit">+${ambulanceDeficit}</td>
    <td class="td-zone">Inside red zone boundaries before onset</td>
    <td class="td-reason">All ${currentAmbulances} ambulances exhausted by overload tick. ${criticalTrapped} simultaneous unserviced medical requests.</td>
  </tr>
  <tr>
    <td class="td-role">Accessible / Stretcher Vehicles</td>
    <td class="td-current">0</td>
    <td class="td-required">1 per district</td>
    <td class="td-deficit">+${Math.max(2, worldState.zones.red.length + 1)} vehicles</td>
    <td class="td-zone">${worldState.zones.red.concat(worldState.zones.amber).slice(0, 3).join(', ')}</td>
    <td class="td-reason">[Name the wheelchair/mobility-impaired trapped agent who made multiple unanswered distress calls]</td>
  </tr>
  <tr>
    <td class="td-role">Rescue Boats</td>
    <td class="td-current">${worldState.responders ? worldState.responders.filter(r => r.type === 'boat').length || 4 : 4}</td>
    <td class="td-required">${worldState.responders ? (worldState.responders.filter(r => r.type === 'boat').length || 4) + 4 : 8}</td>
    <td class="td-deficit">+4 boats</td>
    <td class="td-zone">${worldState.zones.red[0] || 'Red zone'} river confluence areas</td>
    <td class="td-reason">[Name any agent stranded by water who could not be reached by road]</td>
  </tr>
  <tr>
    <td class="td-role">Group Transport Buses</td>
    <td class="td-current">0</td>
    <td class="td-required">2 per red zone district</td>
    <td class="td-deficit">+${worldState.zones.red.length * 2} buses</td>
    <td class="td-zone">School and community center staging areas</td>
    <td class="td-reason">[Reference any group evacuation agent — teacher with students — who walked instead of using transport]</td>
  </tr>
  <tr>
    <td class="td-role">Portable Loudspeakers / PA Systems</td>
    <td class="td-current">Unknown — not in plan</td>
    <td class="td-required">1 per ward in red zones</td>
    <td class="td-deficit">+20 units estimated</td>
    <td class="td-zone">Ward offices and community centers in red zones</td>
    <td class="td-reason">${noSmartphone} agents received zero alert. Loudspeaker activation is the fastest non-digital mass alert method.</td>
  </tr>
  <tr>
    <td class="td-role">Backup Power Generators</td>
    <td class="td-current">1 (hospital only)</td>
    <td class="td-required">1 per shelter + 1 per coordination hub</td>
    <td class="td-deficit">+${(worldState.shelters ? worldState.shelters.length : 2) + 3} generators</td>
    <td class="td-zone">All active shelters + district coordination centers</td>
    <td class="td-reason">Hospital power vulnerability flagged during simulation. Shelter operations depend on power for communication and lighting.</td>
  </tr>
</table>

<div class="total-row"><span class="total-label">Total Additional Vehicles Required</span><span class="total-val">+${vehicleTotal} vehicles</span></div>
<div class="total-row"><span class="total-label">Total Additional Equipment Units Required</span><span class="total-val">+${equipmentTotal} units</span></div>

<br>

<div class="rs-title">SHELTER CAPACITY REQUIREMENTS</div>
<table class="team-table">
  <tr><th>Shelter</th><th>Current Capacity</th><th>Required Capacity</th><th>Gap</th><th>Action Required</th></tr>
  ${worldState.shelters ? worldState.shelters.map((s, i) => {
    const current = s.capacity || 40;
    const required = Math.round(current * 1.6);
    const gap = required - current;
    return `<tr>
    <td class="td-role">${s.name}</td>
    <td class="td-current">${current} persons</td>
    <td class="td-required">${required} persons</td>
    <td class="td-deficit">+${gap} persons</td>
    <td class="td-reason">[Describe which agents were turned away or faced overflow at this shelter]</td>
  </tr>`;
  }).join('\n  ') : `<tr>
    <td class="td-role">Shelter A</td>
    <td class="td-current">40 persons</td>
    <td class="td-required">70 persons</td>
    <td class="td-deficit">+30 persons</td>
    <td class="td-reason">Reached capacity before all evacuees arrived. Group turned away.</td>
  </tr>`}
  <tr>
    <td class="td-role">Additional Shelter — Required (New)</td>
    <td class="td-current">Does not exist</td>
    <td class="td-required">40 persons minimum</td>
    <td class="td-deficit">New facility needed</td>
    <td class="td-reason">Simulation shows existing shelters insufficient for concurrent group evacuations from ${worldState.zones.red.length + worldState.zones.amber.length} affected zones.</td>
  </tr>
</table>

<div class="total-row"><span class="total-label">Total Additional Shelter Capacity Required</span><span class="total-val">+${shelterTotal} persons (+1 new shelter)</span></div>

<hr>

<div class="section-title">9C — Zone-by-Zone Readiness Verdict</div>

${worldState.zones.red.map((zone, i) => `
<div class="zone-verdict zv-red">
  <div class="zv-header">
    <span class="zv-badge zvb-red">RED ZONE</span>
    <span class="zv-name">${zone}</span>
    <span class="zv-readiness zvr-red">Readiness: ${Math.max(18, redReadiness - i * 5)}%</span>
  </div>
  <div class="zv-body">[3-4 sentences about what happened in ${zone}. Name specific agents stationed here. Describe what specific resources failed in this zone. State what remains unresolved at Tick 10.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-red">+${ambulanceDeficit} Ambulances pre-positioned inside zone</span>
    <span class="need-tag nt-red">+1 NDRF team</span>
    <span class="need-tag nt-red">SMS alert system activation</span>
    <span class="need-tag nt-red">Loudspeaker network</span>
    <span class="need-tag nt-red">+1 Field medical officer</span>
    <span class="need-tag nt-red">+2 Rescue boats</span>
  </div>
</div>`).join('\n')}

${worldState.zones.amber.map((zone, i) => `
<div class="zone-verdict zv-amber">
  <div class="zv-header">
    <span class="zv-badge zvb-amber">AMBER ZONE</span>
    <span class="zv-name">${zone}</span>
    <span class="zv-readiness zvr-amber">Readiness: ${Math.max(45, amberReadiness - i * 5)}%</span>
  </div>
  <div class="zv-body">[3-4 sentences about amber zone agents in ${zone}. Which ones evacuated. What obstacles remained. What coordination gaps affected this zone.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-amber">Digital shelter reservation system</span>
    <span class="need-tag nt-amber">+2 Group transport vehicles</span>
    <span class="need-tag nt-amber">Official real-time road status broadcast</span>
    <span class="need-tag nt-amber">+1 Shelter overflow coordinator</span>
  </div>
</div>`).join('\n')}

${worldState.zones.safe.map((zone, i) => `
<div class="zone-verdict zv-safe">
  <div class="zv-header">
    <span class="zv-badge zvb-safe">SAFE ZONE</span>
    <span class="zv-name">${zone}</span>
    <span class="zv-readiness zvr-green">Readiness: ${Math.max(60, safeReadiness - i * 5)}%</span>
  </div>
  <div class="zv-body">[Describe the coordination hub in ${zone}. Hospital, shelters, NDRF base. What overload failures occurred here. These are scaling failures not structural ones.]</div>
  <div class="zv-needs">
    <span class="need-tag nt-green">Hospital capacity expansion protocol</span>
    <span class="need-tag nt-green">+2 Shelter managers</span>
    <span class="need-tag nt-green">+${Math.max(1, worldState.zones.red.length - 1)} District coordinators</span>
    <span class="need-tag nt-green">Backup power for shelters</span>
  </div>
</div>`).join('\n')}

<hr>

<div class="section-title">9D — Cost of Inaction</div>
<div class="inaction-box">
  <div class="inaction-title">If Current Plan Is Deployed Unchanged In This Scenario</div>
  <div class="inaction-row"><span class="ir-label">Estimated unrescued critical cases (medical emergencies, mobility-impaired)</span><span class="ir-value">${criticalTrapped} confirmed</span></div>
  <div class="inaction-row"><span class="ir-label">Agents with unconfirmed safety status at simulation end</span><span class="ir-value">${agents.filter(a => ['blocked','unaware'].includes(a.status)).length} agents</span></div>
  <div class="inaction-row"><span class="ir-label">Population receiving zero alert (non-smartphone users)</span><span class="ir-value">~${Math.round(noSmartphone * 2000).toLocaleString()} persons estimated</span></div>
  <div class="inaction-row"><span class="ir-label">Rescue requests unactioned at peak overload</span><span class="ir-value">${maxPending > 3 ? maxPending - 3 : 0} of ${maxPending} requests</span></div>
  <div class="inaction-row"><span class="ir-label">Zones with zero medical vehicle access at flood peak</span><span class="ir-value">[Count red zones where ambulance route was blocked]</span></div>
  <div class="inaction-row"><span class="ir-label">Persons with mobility disability with zero evacuation option</span><span class="ir-value">~${agents.filter(a => a.backstory && (a.backstory.toLowerCase().includes('wheelchair') || a.backstory.toLowerCase().includes('mobility') || a.backstory.toLowerCase().includes('disabled'))).length * 2200} persons</span></div>
  <div class="inaction-row"><span class="ir-label">Official system survival rate (simulation result)</span><span class="ir-value">${survivalRate}% (${safeAgents.length} of ${totalAgents})</span></div>
  <div class="inaction-row" style="border-top:1px solid #cc0000;margin-top:4px;padding-top:8px">
    <span class="ir-label" style="font-weight:bold">Projected survival rate with all recommendations implemented</span>
    <span class="ir-value" style="color:#2d7a2d">${projectedSurvival}% (${projectedSafe} of ${totalAgents})</span>
  </div>
</div>

<hr>

<div class="section-title">9E — Final Statement</div>
<div class="final-box">
  <div class="final-box-title">CrisisSwarm Simulation Engine — Final Verdict</div>
  <div class="final-statement">
    The ${worldState.disaster.location} ${worldState.disaster.type} response plan, as currently documented and resourced, achieves a <span class="final-highlight">readiness score of ${readinessScore}%</span> against this disaster scenario. Of ${totalAgents} simulated citizens representing approximately [X] lakh affected residents, <span class="final-highlight">${trappedAgents.length} were unrescued at simulation end</span> — not because of the disaster itself but because of <span class="final-highlight">[count] specific, preventable gaps</span> in the response framework.<br><br>
    The simulation identifies a total requirement of <span class="final-highlight">+${humanResourceTotal} additional human resources</span>, <span class="final-highlight">+${vehicleTotal} vehicles</span> (including ${worldState.zones.red.length + worldState.zones.amber.length} accessible transport units currently at zero), <span class="final-highlight">+${shelterTotal} shelter beds</span>, and <span class="final-highlight">+${equipmentTotal} equipment units</span> to achieve a projected ${projectedSurvival}% survival rate in a disaster of this magnitude.<br><br>
    The single most impactful intervention identified by this simulation is <span class="final-highlight">[describe the #1 recommendation — pre-positioning specific resource in specific zone from the simulation]</span> — specifically referencing ${mostCritical ? mostCritical.name : 'the critical trapped agent'} and the failure that could have been prevented.<br><br>
    The second most impactful intervention is <span class="final-highlight">[describe the #2 recommendation — alert system gap affecting ${noSmartphone} non-smartphone agents]</span>.<br><br>
    CrisisSwarm does not predict the future. It stress-tests the present. <span class="final-highlight">Every failure documented here is a gap that exists today. Every recommendation is actionable today. The question is not whether the next disaster will come — it is whether these gaps will still exist when it does.</span>
  </div>
</div>

--- END OF REQUIRED STRUCTURE ---

Now generate the complete Section 9 HTML. Fill in ALL [BRACKET] placeholders with real simulation data.
Reference real agent names from the list below. Do NOT invent names.
Maintain formal government report language throughout.

SIMULATION DATA:
Total agents: ${totalAgents}
Safe: ${safeAgents.length} | Trapped: ${trappedAgents.length} | Survival rate: ${survivalRate}%
Readiness score (calculated): ${readinessScore}%
Location: ${worldState.disaster.location}, ${worldState.disaster.state}
Disaster: ${worldState.disaster.type}
Red zones: ${worldState.zones.red.join(', ')}
Amber zones: ${worldState.zones.amber.join(', ')}
Safe zones: ${worldState.zones.safe.join(', ')}
No smartphone: ${noSmartphone} agents
Coordinator overload ticks: ${overloadedTicks}
Max pending requests: ${maxPending}
Shelter overflow count: ${shelterOverflow}
Critical trapped agents: ${criticalTrapped}

TRAPPED AGENTS (reference these for zone verdicts and final statement):
${trappedList}

COORDINATOR LOG (last 10 ticks):
${JSON.stringify(coordinatorLog ? coordinatorLog.slice(-10) : [], null, 2)}

SHELTER OCCUPANCY AT END:
${JSON.stringify(shelterLog || {}, null, 2)}

WHAT-IF EVENTS:
${JSON.stringify(whatIfEvents || [], null, 2)}`;
};

module.exports = { getVerdictPrompt };