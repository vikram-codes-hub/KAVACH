const { getDemographics } = require('../services/demographicData');

const getReportPrompt = (simulationLog) => {
  const { agents, worldState, ticks, coordinatorLog, shelterLog, whatIfEvents } = simulationLog;

  const total     = agents.length;
  const safe      = agents.filter(a => a.status === 'safe').length;
  const trapped   = agents.filter(a => a.status === 'trapped').length;
  const survival  = Math.round((safe / total) * 100);
  const noPhone   = agents.filter(a => !a.hasSmartphone).length;
  const noVehicle = agents.filter(a => !a.hasVehicle).length;
  const critical  = agents.filter(a => a.vulnerability === 'critical').length;
  const overloadTick = coordinatorLog?.find(l => l.overloaded)?.tick ?? 'N/A';
  const maxPending   = coordinatorLog ? Math.max(...coordinatorLog.map(l => l.pending || 0)) : 0;
  const shelterOverflow = worldState.shelters
    ? worldState.shelters.filter(s => (shelterLog?.[s.name] || 0) >= s.capacity).length : 0;

  const demo = getDemographics(worldState.disaster.district, worldState.disaster.state);
  const popAffected = Math.round(demo.pop_lakh * 0.3 * 100000);

  // Systemic failure categories from simulation
  const failureTypes = {
    noAlert:     agents.filter(a => a.status === 'trapped' && !a.hasSmartphone).length,
    noVehicle:   agents.filter(a => a.status === 'trapped' && !a.hasVehicle).length,
    routeBlocked:agents.filter(a => a.status === 'trapped' && a.routeBlocked).length,
    noRescue:    agents.filter(a => a.status === 'trapped' && a.needsRescue).length,
    shelterFull: agents.filter(a => a.status === 'trapped' && a.vulnerability !== 'critical').length,
  };

  const stateAbbr = (worldState.disaster.state||'IN').split(' ').map(w=>w[0]).join('').toUpperCase();
  const disAbbr   = (worldState.disaster.type||'DIS').split(' ').map(w=>w[0]).join('').toUpperCase();

  return `You are a senior NDMA official writing a post-simulation disaster response analysis for government use.
The audience is district collectors, NDRF commanders, and state disaster management officials.
DO NOT mention individual agent names. Write in aggregate policy terms only.
Return ONLY raw HTML starting with <div class="report-header">. No CSS, no markdown, no wrapper divs.

KEY RULE: Every finding must be expressed as a SYSTEMIC FAILURE affecting a POPULATION CATEGORY, not an individual.
Example of WRONG: "Agent Rekha Devi was trapped because..."
Example of RIGHT: "Pregnant women and mobility-impaired residents in red zones had zero accessible evacuation vehicles..."

SIMULATION STATISTICS:
Location: ${worldState.disaster.location}, ${worldState.disaster.state} | Disaster: ${worldState.disaster.type}
District population: ${demo.pop_lakh}L | Affected: ~${(popAffected/100000).toFixed(1)}L
Agents: ${total} | Safe: ${safe} (${survival}%) | Trapped/Unrescued: ${trapped}
Without smartphone: ${noPhone} (${Math.round(noPhone/total*100)}%) | Without vehicle: ${noVehicle} (${Math.round(noVehicle/total*100)}%)
Critical vulnerability: ${critical} | Coordinator overload at: Tick ${overloadTick} | Max pending: ${maxPending}
Shelter overflow count: ${shelterOverflow}
Red zones: ${worldState.zones.red.join(', ')}
Amber zones: ${worldState.zones.amber.join(', ')}
Safe zones: ${worldState.zones.safe.join(', ')}
Shelters: ${worldState.shelters?.map(s=>`${s.name}(cap:${s.capacity})`).join(', ')||'N/A'}
Hospitals: ${worldState.hospitals?.map(h=>h.name).join(', ')||'N/A'}

FAILURE BREAKDOWN:
- Trapped due to no alert received: ${failureTypes.noAlert} persons (${Math.round(failureTypes.noAlert/total*100)}%)
- Trapped due to no vehicle: ${failureTypes.noVehicle} persons
- Trapped due to blocked route: ${failureTypes.routeBlocked} persons
- Awaiting rescue at simulation end: ${failureTypes.noRescue} persons
- Shelter overflow cases: ${shelterOverflow} shelters at capacity

POPULATION PROJECTIONS (Census 2011 + NFHS-5):
- Elderly (${demo.elderly_pct}%): ~${Math.round(popAffected*demo.elderly_pct/100).toLocaleString()} persons at risk
- Disabled (${demo.disabled_pct}%): ~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} persons
- No smartphone (${demo.no_smartphone_pct}%): ~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons unreachable by digital alert
- BPL (${demo.bpl_pct}%): ~${Math.round(popAffected*demo.bpl_pct/100).toLocaleString()} persons with no self-evacuation capacity

COORDINATOR OVERLOAD: Tick ${overloadTick} | Max pending ${maxPending}
WHAT-IF EVENTS: ${whatIfEvents?.map(e=>e.triggerType).join(', ')||'none'}

---
OUTPUT THIS EXACT HTML STRUCTURE:

<div class="report-header">
  <div class="gov-line">National Disaster Management Authority — Government of India</div>
  <div class="gov-line" style="margin-top:2px">${worldState.disaster.issued_by||worldState.disaster.state+' SDMA'} — District Emergency Operations Centre</div>
  <div class="report-title">DISASTER RESPONSE SIMULATION — POLICY ANALYSIS REPORT</div>
  <div class="report-sub">${worldState.disaster.location} ${worldState.disaster.type} Scenario | Census-Grounded Population Model | ${demo.pop_lakh}L District Population</div>
</div>

<div class="alert-strip">
  <p>${trapped >= 3 ? 'CRITICAL' : trapped >= 1 ? 'HIGH' : 'MODERATE'} RESPONSE GAPS IDENTIFIED — ${survival}% SIMULATED SURVIVAL RATE — REPRESENTS ~${(popAffected/100000).toFixed(1)}L AFFECTED POPULATION</p>
</div>

<table class="meta-table">
  <tr><td>Report Ref</td><td>CRISISSWARM/${stateAbbr}/${disAbbr}/2024/SIM-001</td></tr>
  <tr><td>Scenario</td><td>${worldState.disaster.location} ${worldState.disaster.type} — ${worldState.disaster.river ? worldState.disaster.river + ' River' : 'extreme rainfall'}</td></tr>
  <tr><td>District Population</td><td>${demo.pop_lakh} lakh (Census 2011) | ~${(popAffected/100000).toFixed(1)} lakh in affected zones</td></tr>
  <tr><td>Simulation Model</td><td>${total} census-grounded agents | ${demo.elderly_pct}% elderly, ${demo.no_smartphone_pct}% no smartphone, ${demo.bpl_pct}% BPL</td></tr>
  <tr><td>Data Sources</td><td>Census of India 2011, NFHS-5 (2019-21), SECC 2011, NDMA Vulnerability Atlas</td></tr>
  <tr><td>Simulation Result</td><td>${survival}% survival rate | ${trapped} unrescued of ${total} simulated | Represents ~${Math.round(trapped/total*popAffected).toLocaleString()} real persons in equivalent scenario</td></tr>
</table>

<div class="section-title">1. Executive Summary</div>
<p class="body-text">[2-3 sentences: What the simulation modeled. State the survival rate and what it means at population scale (~${(popAffected/100000).toFixed(1)}L affected). State the single most critical systemic gap identified.]</p>
<p class="body-text">[1-2 sentences: The coordinator overload at Tick ${overloadTick} with ${maxPending} simultaneous requests was the cascade failure point. State how many rescue requests went unactioned as a result.]</p>

<div class="summary-grid">
  <div class="summary-box s-safe"><div class="snum">${survival}%</div><div class="slbl">Survival Rate</div></div>
  <div class="summary-box s-trapped"><div class="snum">${trapped}</div><div class="slbl">Unrescued</div></div>
  <div class="summary-box s-partial"><div class="snum">${Math.round(noPhone/total*100)}%</div><div class="slbl">Zero Alert Reach</div></div>
  <div class="summary-box s-total"><div class="snum">${shelterOverflow}</div><div class="slbl">Shelters Overflowed</div></div>
</div>

<hr>

<div class="section-title">2. Systemic Failure Analysis</div>
<p class="body-text">The following failures are expressed as population-level gaps in the current response framework. Each represents a category of residents who face identical failure under the current plan — not isolated incidents.</p>

<div class="failure-block">
  <div class="failure-num">Gap 01 — Alert System Coverage</div>
  <div class="failure-title">Digital-Only Alert Fails ${Math.round(noPhone/total*100)}% of Simulation Population — ~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} Persons Unreachable in Real Scenario</div>
  <div class="failure-body">
    [3-4 sentences: ${noPhone} of ${total} simulated agents (${Math.round(noPhone/total*100)}%) received zero alert because they lack smartphones. In ${worldState.disaster.location} district, ${demo.no_smartphone_pct}% of the population (~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons) are unreachable by digital-only alert systems. Describe which demographic groups this affects most — elderly, BPL, rural residents. State that door-to-door alert or loudspeaker activation was the only effective non-digital method in the simulation.]<br><br>
    <strong>Policy Gap:</strong> No non-digital alert protocol exists in the current district disaster response plan.<br>
    <strong>Population at Risk:</strong> ~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons (${demo.no_smartphone_pct}% of affected population)
  </div>
</div>

<div class="failure-block">
  <div class="failure-num">Gap 02 — Accessible Evacuation Infrastructure</div>
  <div class="failure-title">Zero Accessible Vehicles for Mobility-Impaired and Critical Medical Cases — ${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} Persons Affected</div>
  <div class="failure-body">
    [3-4 sentences: The simulation found zero accessible/stretcher vehicles in the current response plan. ${demo.disabled_pct}% of ${worldState.disaster.location} district population (~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} persons) have mobility disabilities. Pregnant women in advanced stages and elderly residents with mobility limitations also fall in this category. All of these persons had zero evacuation option when standard ambulance routes were blocked.]<br><br>
    <strong>Policy Gap:</strong> No accessible vehicle procurement or pre-positioning protocol in current DDMA plan.<br>
    <strong>Population at Risk:</strong> ~${Math.round(popAffected*(demo.disabled_pct+2)/100).toLocaleString()} persons (disabled + critical medical)
  </div>
</div>

<div class="failure-block">
  <div class="failure-num">Gap 03 — Coordinator Capacity vs. Demand</div>
  <div class="failure-title">Single Coordinator Overloaded at Tick ${overloadTick} — ${maxPending} Simultaneous Requests, Only 3 Actionable Per Tick</div>
  <div class="failure-body">
    [3-4 sentences: The simulation's single district coordinator received ${maxPending} simultaneous rescue requests at Tick ${overloadTick}. With a maximum actionable capacity of 3 requests per tick, ${Math.max(0, maxPending-3)} requests went unactioned at peak load. This directly caused delayed rescue for the most vulnerable population segments. Describe how distributed coordination (1 coordinator per red zone) would have prevented this cascade.]<br><br>
    <strong>Policy Gap:</strong> Single-point coordination structure cannot handle concurrent multi-zone disaster requests.<br>
    <strong>Recommended Structure:</strong> Minimum ${Math.max(2, worldState.zones.red.length+1)} coordinators — 1 per red zone + 1 district-level
  </div>
</div>

<div class="failure-block">
  <div class="failure-num">Gap 04 — Shelter Capacity Planning</div>
  <div class="failure-title">${shelterOverflow > 0 ? shelterOverflow + ' Shelter(s) Reached Capacity Before All Evacuees Arrived' : 'Shelter Capacity Adequate — Pre-Positioning Gaps Identified'}</div>
  <div class="failure-body">
    [3-4 sentences: Describe shelter utilization from shelterLog data. State total capacity vs. demand. ${shelterOverflow > 0 ? 'State which shelters overflowed and at which tick. Describe the population that was turned away — BPL households with no alternative accommodation.' : 'While shelters did not overflow in this scenario, the simulation identified pre-positioning gaps — shelters were not reachable by mobility-impaired residents without accessible transport.'} State the required capacity increase based on ${demo.bpl_pct}% BPL population with no alternative accommodation.]<br><br>
    <strong>Policy Gap:</strong> ${shelterOverflow > 0 ? 'Shelter capacity insufficient for concurrent multi-zone evacuation.' : 'Shelter accessibility not guaranteed for mobility-impaired population.'}<br>
    <strong>Required Capacity:</strong> +${Math.round(worldState.shelters?.reduce((s,sh)=>s+(sh.capacity||40),0)*0.6||60)} persons additional capacity
  </div>
</div>

${failureTypes.routeBlocked > 0 ? `
<div class="failure-block">
  <div class="failure-num">Gap 05 — Evacuation Route Redundancy</div>
  <div class="failure-title">${failureTypes.routeBlocked} Population Segments Trapped by Single-Route Dependency</div>
  <div class="failure-body">
    [3-4 sentences: ${failureTypes.routeBlocked} simulated agents (representing ${Math.round(failureTypes.routeBlocked/total*100)}% of affected population) were trapped when their primary evacuation route was blocked. The current plan has no alternate route protocol for ${worldState.zones.red.join(', ')}. Describe the specific roads blocked and which zones became isolated. State that pre-identified alternate routes with regular maintenance would eliminate this failure category.]<br><br>
    <strong>Policy Gap:</strong> No alternate evacuation route protocol in current DDMA plan for red zones.<br>
    <strong>Affected Zones:</strong> ${worldState.zones.red.join(', ')}
  </div>
</div>` : ''}

<hr>

<div class="section-title">3. Coordination & Response Timeline Analysis</div>

<table class="timeline-table">
  <tr><th>Phase</th><th>Time</th><th>System Status</th><th>Population Impact</th></tr>
  <tr><td class="td-tick">Alert Phase</td><td>Tick 0-1 (6:00-6:15 AM)</td><td class="td-event">[Describe alert coverage — how many received alert, how many did not]</td><td class="td-impact">~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons received zero alert</td></tr>
  <tr><td class="td-tick">Evacuation Phase</td><td>Tick 2-4 (6:30-7:00 AM)</td><td class="td-event">[Describe evacuation progress — which zones evacuating, which blocked]</td><td class="td-impact">[State % of population successfully evacuating vs. stuck]</td></tr>
  <tr><td class="td-tick" style="color:#cc0000">Cascade Failure</td><td>Tick ${overloadTick} (${overloadTick !== 'N/A' ? `${6 + Math.floor(overloadTick*15/60)}:${String((overloadTick*15)%60).padStart(2,'0')} AM` : 'N/A'})</td><td class="td-event" style="color:#cc0000">Coordinator overloaded — ${maxPending} simultaneous requests</td><td class="td-impact" style="color:#cc0000">${Math.max(0,maxPending-3)} rescue requests unactioned</td></tr>
  <tr><td class="td-tick">Rescue Phase</td><td>Tick 5-8 (7:15-8:00 AM)</td><td class="td-event">[Describe rescue operations — NDRF deployment, volunteer activity]</td><td class="td-impact">[State how many rescued vs. still waiting]</td></tr>
  <tr><td class="td-tick">Final State</td><td>Tick 10 (8:30 AM)</td><td class="td-event">Simulation end — ${trapped} unrescued</td><td class="td-impact">${survival}% survival rate | ~${Math.round(trapped/total*popAffected).toLocaleString()} real persons equivalent</td></tr>
</table>

<hr>

<div class="section-title">4. Resource Utilization Summary</div>
<table class="resource-table">
  <tr><th>Resource</th><th>Deployed</th><th>Peak Demand</th><th>Status</th><th>Gap</th></tr>
  <tr><td>NDRF Teams</td><td>${worldState.responders?.filter(r=>r.type==='NDRF'||r.type==='ndrf').length||2} teams</td><td>[from simulation]</td><td>[adequate/overloaded]</td><td>[+X teams needed]</td></tr>
  <tr><td>Ambulances</td><td>${worldState.responders?.filter(r=>r.type==='Ambulance'||r.type==='ambulance').length||4} vehicles</td><td>[from simulation]</td><td>[adequate/exhausted]</td><td>[+X vehicles needed]</td></tr>
  <tr><td>Accessible Vehicles</td><td>0</td><td>${Math.round(popAffected*demo.disabled_pct/100/1000)}+ requests</td><td class="res-full">NONE AVAILABLE</td><td>+${Math.max(2,worldState.zones.red.length+1)} vehicles minimum</td></tr>
  ${worldState.shelters?.map(s=>`<tr><td>${s.name}</td><td>${s.capacity} persons</td><td>${shelterLog?.[s.name]||0} persons</td><td class="${(shelterLog?.[s.name]||0)>=s.capacity?'res-full':'res-ok'}">${(shelterLog?.[s.name]||0)>=s.capacity?'FULL':'OPERATIONAL'}</td><td>${(shelterLog?.[s.name]||0)>=s.capacity?`+${Math.round(s.capacity*0.6)} capacity needed`:'Adequate'}</td></tr>`).join('')||''}
  <tr><td>District Coordinator</td><td>1 coordinator</td><td>${maxPending} simultaneous requests</td><td class="res-full">OVERLOADED at Tick ${overloadTick}</td><td>+${Math.max(1,worldState.zones.red.length)} coordinators</td></tr>
  <tr><td>Non-Digital Alert</td><td>0 (digital only)</td><td>${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons</td><td class="res-full">NOT DEPLOYED</td><td>Loudspeaker + door-to-door protocol</td></tr>
</table>

<hr>

<div class="section-title">5. Volunteer & Community Response</div>
<p class="body-text">[3-4 sentences: Describe the role of community volunteers in aggregate — how many were active, what they accomplished that the official system could not. State the percentage of last-mile rescues performed by volunteers vs. official responders. Note that zero official provision exists for volunteers in the current plan. Recommend formalization via NDMA Community Volunteer Program.]</p>

<div class="success-block">
  <div class="success-num">Key Finding — Community Volunteers Performed ${Math.round(agents.filter(a=>a.group==='green'&&a.status!=='trapped').length/Math.max(1,agents.filter(a=>a.group==='green').length)*100)}% of Last-Mile Rescues</div>
  <p style="font-size:10px;color:#86efac;margin:4px 0 0">${agents.filter(a=>a.group==='green').length} informal volunteers self-deployed with zero official coordination, training, or safety protocol. Formalizing this capacity via NDMA Community Volunteer Program would multiply rescue capacity at near-zero cost.</p>
</div>

<hr>

<div class="section-title">6. Actionable Recommendations — Prioritized for ${worldState.disaster.location} District</div>
<p class="body-text">All recommendations are grounded in simulation failures and ${worldState.disaster.district||worldState.disaster.location} district census data. Each is actionable within existing government frameworks (NDMA guidelines, DDMA mandate, state disaster management acts).</p>

[Generate exactly 6 rec-blocks. Each must state: what to do, why (which gap it closes), population impact, and implementing agency. NO agent names. Priority: IMMEDIATE (2), HIGH (2), MEDIUM (2).]

<div class="rec-block">
  <div class="rec-num">Recommendation 01 — Priority: IMMEDIATE — Life Safety</div>
  <div class="rec-title">Deploy Non-Digital Alert System: Loudspeaker Network + Door-to-Door Alert Teams in Red Zones</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes (${Math.round(noPhone/total*100)}% of population unreachable by digital alert). Population impact (~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons). Implementing agency: DDMA + local ward offices.]</div>
</div>

<div class="rec-block">
  <div class="rec-num">Recommendation 02 — Priority: IMMEDIATE — Life Safety</div>
  <div class="rec-title">Pre-Position ${Math.max(2,worldState.zones.red.length+1)} Accessible/Stretcher Vehicles Inside Red Zone Boundaries Before Disaster Onset</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes (zero accessible vehicles for ~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} disabled persons). Population impact. Implementing agency: SDRF + district transport department.]</div>
</div>

<div class="rec-block">
  <div class="rec-num">Recommendation 03 — Priority: HIGH — Coordination</div>
  <div class="rec-title">Establish Distributed Coordination: 1 Zone Coordinator Per Red Zone + 1 District Coordinator</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes (single coordinator overloaded at ${maxPending} requests). How distributed coordination keeps load ≤3/tick. Implementing agency: DDMA + NDRF.]</div>
</div>

<div class="rec-block">
  <div class="rec-num">Recommendation 04 — Priority: HIGH — Infrastructure</div>
  <div class="rec-title">Pre-Position NDRF Teams and Ambulances Inside Red Zone Boundaries 6 Hours Before Predicted Flood Peak</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes (route-blocked ambulances arriving too late). Population impact. Implementing agency: NDRF + state health department.]</div>
</div>

<div class="rec-block">
  <div class="rec-num">Recommendation 05 — Priority: MEDIUM — Capacity</div>
  <div class="rec-title">Expand Shelter Capacity by ${Math.round(worldState.shelters?.reduce((s,sh)=>s+(sh.capacity||40),0)*0.6||60)} Persons — Identify and Designate Overflow Facilities</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes. Which buildings to designate (schools, community halls). Implementing agency: DDMA + PWD.]</div>
</div>

<div class="rec-block">
  <div class="rec-num">Recommendation 06 — Priority: MEDIUM — Community</div>
  <div class="rec-title">Formalize Community Volunteer Network: Register, Train, and Equip 10 Volunteers Per Red Zone Ward</div>
  <div class="rec-body">[3 sentences: What to do. Gap it closes (volunteers performed critical rescues with zero official support). Population impact. Implementing agency: DDMA + NGO partnerships under NDMA Community Volunteer Program.]</div>
</div>

<hr>

<div class="section-title">7. Population Impact Projection</div>
<table class="meta-table">
  <tr><td>District total population</td><td>${demo.pop_lakh} lakh (Census 2011)</td></tr>
  <tr><td>Estimated in affected zones</td><td>~${(popAffected/100000).toFixed(1)} lakh</td></tr>
  <tr><td>Elderly at risk (${demo.elderly_pct}%)</td><td>~${Math.round(popAffected*demo.elderly_pct/100).toLocaleString()} persons — require dedicated evacuation support</td></tr>
  <tr><td>Persons with disability (${demo.disabled_pct}%)</td><td>~${Math.round(popAffected*demo.disabled_pct/100).toLocaleString()} persons — zero accessible vehicle option currently</td></tr>
  <tr><td>Without smartphone (${demo.no_smartphone_pct}%)</td><td>~${Math.round(popAffected*demo.no_smartphone_pct/100).toLocaleString()} persons — unreachable by digital alert</td></tr>
  <tr><td>BPL households (${demo.bpl_pct}%)</td><td>~${Math.round(popAffected*demo.bpl_pct/100).toLocaleString()} persons — no self-evacuation capacity</td></tr>
  <tr><td>Simulation survival (current plan)</td><td>${survival}% → ~${Math.round(popAffected*survival/100).toLocaleString()} persons safe</td></tr>
  <tr><td>Projected survival (with recommendations)</td><td>~${Math.min(96,survival+trapped*8)}% → ~${Math.round(popAffected*Math.min(96,survival+trapped*8)/100).toLocaleString()} persons safe (+${Math.round(popAffected*(Math.min(96,survival+trapped*8)-survival)/100).toLocaleString()} additional lives)</td></tr>
</table>

<div class="sig-section">
  <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px">Simulation Analysis Lead</div><div style="font-size:9px;color:#555">CrisisSwarm Research Team</div></div>
  <div class="sig-block" style="text-align:center"><div class="stamp">CRISISSWARM<br>POLICY REPORT<br>${stateAbbr}-${disAbbr}-2024<br>OFFICIAL OUTPUT</div></div>
  <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px">Technical Verification</div><div style="font-size:9px;color:#555">Multi-Agent Engine v1.0</div></div>
</div>
<div class="footer">
  <span>Ref: CRISISSWARM/${stateAbbr}/${disAbbr}/2024/SIM-001</span>
  <span>Census 2011 + NFHS-5 | ${demo.pop_lakh}L district population</span>
  <span>CrisisSwarm v1.0 — Hackerz Street 4.0</span>
</div>`;
};

module.exports = { getReportPrompt };