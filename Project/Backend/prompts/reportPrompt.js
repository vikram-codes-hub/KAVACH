const getReportPrompt = (simulationLog) => {
  const { agents, worldState, ticks, coordinatorLog, shelterLog, whatIfEvents } = simulationLog;

  const trappedAgents   = agents.filter(a => a.status === 'trapped');
  const safeAgents      = agents.filter(a => a.status === 'safe');
  const managingAgents  = agents.filter(a => ['managing','overloaded'].includes(a.status));
  const volunteerAgents = agents.filter(a => a.group === 'green');
  const totalAgents     = agents.length;
  const survivalRate    = Math.round((safeAgents.length / totalAgents) * 100);
  const partialAgents   = agents.filter(a => ['blocked','unaware'].includes(a.status));

  // Coordinator overload data
  const overloadTick = coordinatorLog
    ? coordinatorLog.find(l => l.overloaded)
    : null;
  const maxPending = coordinatorLog
    ? Math.max(...coordinatorLog.map(l => l.pending || 0))
    : 0;

  // Shelter data
  const shelterNames = worldState.shelters
    ? worldState.shelters.map(s => s.name).join(', ')
    : 'Shelter A';

  // Non-smartphone agents
  const noSmartphoneAgents = agents.filter(a => !a.hasSmartphone);
  const noVehicleNoPhone   = agents.filter(a => !a.hasVehicle && !a.hasSmartphone);

  // State abbreviation for report ref
  const stateAbbr = (worldState.disaster.state || 'IN')
    .split(' ').map(w => w[0]).join('').toUpperCase();
  const disasterAbbr = (worldState.disaster.type || 'DIS')
    .split(' ').map(w => w[0]).join('').toUpperCase();

  // Zone info
  const redZones   = worldState.zones.red.join(', ');
  const amberZones = worldState.zones.amber.join(', ');
  const safeZones  = worldState.zones.safe.join(', ');

  // Tick timeline from simulationLog
  const tickSummary = (ticks || []).map(t => ({
    tick: t.tick,
    time: t.time,
    trapped: (t.agents || []).filter(a => a.status === 'trapped').length,
    safe:    (t.agents || []).filter(a => a.status === 'safe').length,
    pending: t.pendingCount || 0,
    overloaded: t.coordinatorResult?.overloaded || false
  }));

  // Agent name lists for report
  const trappedList = trappedAgents.map(a =>
    `ID ${a.id}: ${a.name}, ${a.age}, ${a.role}, ${a.zone}, vulnerability=${a.vulnerability}, thought="${a.currentThought}"`
  ).join('\n');

  const volunteerList = volunteerAgents.map(a =>
    `${a.name} (${a.role}) — status: ${a.status} — thought: "${a.currentThought}"`
  ).join('\n');

  const safeList = safeAgents.slice(0, 10).map(a =>
    `${a.name} (${a.role})`
  ).join(', ');

  return `You are a senior official at the National Disaster Management Authority of India writing a formal post-simulation bottleneck analysis report.

CRITICAL OUTPUT RULES — READ FIRST:
- Return ONLY raw HTML. Start immediately with <div class="report-header">
- Do NOT include <html>, <head>, <body>, <style> tags
- Do NOT include any CSS
- Do NOT include markdown or code fences
- Do NOT include the outer <div class="report"> wrapper
- Every agent name you mention MUST come from the simulation data below
- Every number MUST come from simulation data
- Use "${worldState.disaster.location}" and "${worldState.disaster.state}" — never hardcode other locations
- Tick 0=6:00AM, Tick 1=6:15AM, Tick 2=6:30AM, Tick 3=6:45AM, Tick 4=7:00AM, Tick 5=7:15AM, Tick 6=7:30AM, Tick 7=7:45AM, Tick 8=8:00AM, Tick 9=8:15AM, Tick 10=8:30AM

OUTPUT EXACTLY THIS HTML STRUCTURE (fill in [BRACKETS] from simulation data):

<div class="report-header">
  <div class="gov-line">National Disaster Management Authority — Government of India</div>
  <div class="gov-line" style="margin-top:2px">${worldState.disaster.issued_by || worldState.disaster.state + ' State Disaster Management Authority'} — District Emergency Operations Centre</div>
  <div class="report-title">POST-SIMULATION BOTTLENECK ANALYSIS REPORT</div>
  <div class="report-sub">CrisisSwarm Multi-Agent Disaster Response Simulation — ${worldState.disaster.location} ${worldState.disaster.type} Scenario</div>
</div>

<div class="alert-strip">
  <p>SIMULATION CLASSIFICATION: [CRITICAL if trapped≥3, HIGH if trapped≥1, MODERATE otherwise] — ${trappedAgents.length} OF ${totalAgents} AGENTS UNRESCUED AT SIMULATION END</p>
</div>

<table class="meta-table">
  <tr><td>Report Reference</td><td>CRISISSWARM/${stateAbbr}/${disasterAbbr}/2024/SIM-001</td></tr>
  <tr><td>Simulation Scenario</td><td>${worldState.disaster.location} ${worldState.disaster.type} — [river/cause from worldState if available]</td></tr>
  <tr><td>Affected Districts</td><td>[list districts from worldState.zones.red and worldState.zones.amber]</td></tr>
  <tr><td>Simulation Duration</td><td>10 Ticks — 6:00 AM to 8:30 AM (2 hours 30 minutes simulated)</td></tr>
  <tr><td>Total Agents Simulated</td><td>${totalAgents} representative citizens across 4 behavioral categories</td></tr>
  <tr><td>Population Represented</td><td>Approximately [X] lakh residents across affected zones</td></tr>
  <tr><td>Simulation Engine</td><td>CrisisSwarm v1.0 — Multi-agent BFS ${worldState.disaster.type} propagation model</td></tr>
  <tr><td>Report Generated</td><td>Tick 10 — 8:30 AM — Groq LLM Analysis Engine</td></tr>
  <tr><td>Classification</td><td>FOR OFFICIAL USE — DISASTER PREPAREDNESS PLANNING</td></tr>
</table>

<div class="section-title">1. Executive Summary</div>
<p class="body-text">[Paragraph 1: What the simulation modeled — ${totalAgents} agents, the disaster type, the location, duration. Mention the 4 groups. Reference specific zone names: red=${redZones}, amber=${amberZones}.]</p>
<p class="body-text">[Paragraph 2: What went wrong — state EXACT numbers: ${trappedAgents.length} critical failures, how many secondary, any misinformation events. Name 2-3 specific trapped agents by name. State that ${safeAgents.length} reached safety.]</p>
<p class="body-text">[Paragraph 3: Coordinator overload — mention the exact tick when overload occurred (${overloadTick ? 'Tick ' + overloadTick.tick : 'Tick 6'}), the number of simultaneous pending requests (${maxPending}), and that this directly caused multiple unrescued outcomes.]</p>

<div class="summary-grid">
  <div class="summary-box s-safe"><div class="snum">${safeAgents.length}</div><div class="slbl">Reached Safety</div></div>
  <div class="summary-box s-trapped"><div class="snum">${trappedAgents.length}</div><div class="slbl">Trapped / Unrescued</div></div>
  <div class="summary-box s-partial"><div class="snum">${partialAgents.length}</div><div class="slbl">Partial Outcome</div></div>
  <div class="summary-box s-total"><div class="snum">${survivalRate}%</div><div class="slbl">Survival Rate</div></div>
</div>

<hr>

<div class="section-title">2. Critical Failure Analysis</div>
<p class="body-text">The following failures are listed in order of life-safety impact. Each failure is documented with the specific agent involved, the tick at which failure occurred, and the estimated population category represented by that agent.</p>

[For EACH trapped agent from this list, generate one failure-block:
${trappedList}

Each failure-block must follow this EXACT structure:]

<div class="failure-block">
  <div class="failure-num">Critical Failure 0[N] — Life-Safety Impact: [Extreme/High/Medium-High based on vulnerability]</div>
  <div class="failure-title">[Descriptive title naming the SYSTEMIC failure — not the agent — e.g. "Single Ambulance Route Failure" or "Digital-Only Alert System"]</div>
  <div class="failure-body">
    <span class="agent-tag">AGENT [ID]</span><span class="failure-agent">[Name], [age], [role], [zone]</span><br><br>
    [3-4 sentences: what happened tick by tick. When did they first call for help. What specific resource failed. What was their exact situation at Tick 10. Reference their currentThought.]<br><br>
    <strong>Root Cause:</strong> [One sentence — the SYSTEMIC gap, not personal failure]
  </div>
  <div class="failure-pop">Population represented: Approximately [X] [demographic description] in [zone] — all facing identical rescue failure under the current plan.</div>
</div>

<hr>

<div class="section-title">3. Secondary Coordination Failures</div>

<div class="warning-block">
  <div class="warning-num">Secondary Failure 01 — Coordinator Overload</div>
  <div class="failure-title">NDRF Coordinator Received ${maxPending} Simultaneous Requests at Tick ${overloadTick ? overloadTick.tick : 6} — Actionable Capacity: 3</div>
  <div class="failure-body">[Describe the coordinator overload using real coordinatorLog data. Name the coordinator agent if present in blue group. List the specific requests that went unactioned. State which outcomes were directly caused by this.]</div>
</div>

${whatIfEvents && whatIfEvents.some(e => e.triggerType === 'misinformation') ? `
<div class="warning-block">
  <div class="warning-num">Secondary Failure 02 — Misinformation Cascade</div>
  <div class="failure-title">Social Media Misinformation Caused Agents to Take Dangerous Routes</div>
  <div class="failure-body">[Describe the misinformation event from whatIfEvents. How many agents were rerouted. Who corrected it. What additional time was added to evacuation.]</div>
</div>` : ''}

<div class="success-block">
  <div class="success-num">Finding — Community Volunteers Rescued Individuals the Official System Could Not Reach</div>
  ${volunteerAgents.map(v => `
  <div class="volunteer-row"><span class="vname">${v.name} (${v.role})</span><span class="vrescued">${v.currentThought}</span></div>`).join('')}
</div>

<hr>

<div class="section-title">4. Disaster Timeline — Critical Events</div>
<table class="timeline-table">
  <tr><th>Tick</th><th>Time</th><th>Event</th><th>Impact</th></tr>
  [Generate one row per tick 0 through 10 using simulation data. Mark Tick ${overloadTick ? overloadTick.tick : 6} row with style="color:#cc0000;font-weight:bold" as cascade failure point.]
  <tr><td class="td-tick">Tick 0</td><td>6:00 AM</td><td class="td-event">${worldState.disaster.type} alert issued. ${worldState.disaster.location} affected zones activated.</td><td class="td-impact">${noSmartphoneAgents.length} non-smartphone agents receive no alert</td></tr>
  [Continue for all ticks based on simulation events — reference real agent names, real tick numbers]
</table>

<hr>

<div class="section-title">5. Resource Utilization Analysis</div>
<table class="resource-table">
  <tr><th>Resource</th><th>Capacity</th><th>Peak Usage</th><th>Status at Tick 10</th><th>Utilization</th></tr>
  [Generate rows for each resource. Use res-full class for exhausted, res-warn for near-full, res-ok for functioning.
   Bar width = percentage of capacity used. Resources to cover:
   - Ambulances (from worldState.responders)
   - Each shelter (from worldState.shelters with capacity)  
   - Hospital emergency ward (from worldState.hospitals)
   - NDRF Teams
   - Coordinator Actions/Tick (always 3 capacity, show overload %)
   - Accessible Vehicles (always 0 current — guaranteed gap)
   - Community Volunteers (unplanned)]
  <tr>
    <td>Accessible Vehicles</td><td>0 vehicles</td><td>1+ requests (Tick 1)</td>
    <td class="res-full">NONE AVAILABLE</td>
    <td><div class="bar-wrap"><div class="bar-bg"><div class="bar-fill bar-red" style="width:0%"></div></div>0%</div></td>
  </tr>
  <tr>
    <td>Community Volunteers</td><td>Unplanned</td><td>${volunteerAgents.length} active</td>
    <td class="res-ok">ACTIVE — SELF-DEPLOYED</td>
    <td><div class="bar-wrap"><div class="bar-bg"><div class="bar-fill bar-green" style="width:70%"></div></div>Unplanned</div></td>
  </tr>
</table>

<hr>

<div class="section-title">6. Community Volunteer Contribution Analysis</div>
<p class="body-text">A significant finding of this simulation is the critical role played by community volunteers — individuals with no official designation in the response plan who self-deployed based on local knowledge and informal communication networks.</p>
<div class="success-block">
  <div class="success-num">Finding — Volunteers Rescued Individuals the Official System Could Not Reach</div>
  ${volunteerAgents.map(v => `
  <div class="volunteer-row"><span class="vname">${v.name} (${v.role})</span><span class="vrescued">[describe what this volunteer did based on their status and currentThought: ${v.currentThought}]</span></div>`).join('')}
</div>
<p class="body-text"><strong>Critical Observation:</strong> The current disaster response plan makes zero provision for community volunteers — no registration system, no task assignment, no communication channel, no safety protocol. Despite this, volunteers performed critical rescue operations. Formalizing volunteer networks would multiply response capacity at near-zero cost.</p>

<hr>

<div class="section-title">7. Recommendations — Actionable & Prioritized</div>

[Generate exactly 7 rec-blocks. Each must reference the specific agent failure that justifies it.
First 2 must be "Priority: Immediate — Life Safety", next 2 "Priority: High — [category]", last 3 "Priority: Medium — [category]".]

<div class="rec-block">
  <div class="rec-num">Recommendation 01 — Priority: Immediate — Life Safety</div>
  <div class="rec-title">[Title referencing the most critical failure from Section 2]</div>
  <div class="rec-body">[3-4 sentences. Reference specific agent. State what should be done. Estimate impact.]</div>
</div>
[repeat for all 7 recommendations — each must reference a DIFFERENT agent failure from Section 2]

<hr>

<div class="section-title">8. Simulation Methodology Note</div>
<p class="body-text">This simulation used ${totalAgents} representative agents to model the behavior of approximately [X] lakh affected residents in ${worldState.disaster.location}, ${worldState.disaster.state}. Each agent represents a distinct demographic type. The simulation engine uses BFS ${worldState.disaster.type.toLowerCase()} propagation from red zone boundaries across a weighted road graph, with agent decisions determined by a rule-based engine using each agent's properties evaluated at each tick.</p>
<p class="body-text">The simulation is not predictive of exact outcomes but is diagnostic of systemic vulnerabilities in the response plan. Every failure documented in this report reflects a real gap in the current documented disaster response framework for ${worldState.disaster.location}.</p>

<div class="highlight-box">
  <strong>Key Finding:</strong> [Identify the cascade failure tick from simulationLog — the tick where multiple failures happened simultaneously. State that all unrescued outcomes trace back to events at or before that tick. State that pre-positioned resources would have prevented all primary failures.]
</div>

<div class="sig-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div style="font-size:10px">Simulation Analysis Lead</div>
    <div style="font-size:9px;color:#555;margin-top:2px">CrisisSwarm Research Team</div>
  </div>
  <div class="sig-block" style="text-align:center">
    <div class="stamp">CRISISSWARM<br>SIMULATION REPORT<br>${stateAbbr}-${disasterAbbr}-2024<br>OFFICIAL OUTPUT</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div style="font-size:10px">Technical Verification</div>
    <div style="font-size:9px;color:#555;margin-top:2px">Multi-Agent Engine v1.0</div>
  </div>
</div>

<div class="footer">
  <span>Report Ref: CRISISSWARM/${stateAbbr}/${disasterAbbr}/2024/SIM-001</span>
  <span>Generated: Tick 10 — 8:30 AM Simulation Time</span>
  <span>CrisisSwarm v1.0 — Hackerz Street 4.0</span>
</div>
<div class="page-label">Page 1 of 1 — Generated automatically by the CrisisSwarm Groq Report Engine based on simulation log data</div>

--- END OF REQUIRED STRUCTURE ---

Now generate the complete report. Fill in ALL [BRACKET] placeholders with real simulation data.
Use ONLY agent names from the simulation log. Do NOT invent agent names.
The report must be coherent, formal, and reference simulation data throughout.

SIMULATION DATA:
Total agents: ${totalAgents}
Safe: ${safeAgents.length}
Trapped: ${trappedAgents.length}
Survival rate: ${survivalRate}%
Location: ${worldState.disaster.location}, ${worldState.disaster.state}
Disaster type: ${worldState.disaster.type}
Red zones: ${redZones}
Amber zones: ${amberZones}
Safe zones: ${safeZones}
No smartphone agents: ${noSmartphoneAgents.length}
No vehicle + no smartphone: ${noVehicleNoPhone.length}
Coordinator overload tick: ${overloadTick ? overloadTick.tick : 'unknown'}
Max pending requests: ${maxPending}
Shelters: ${worldState.shelters ? worldState.shelters.map(s => s.name + ' (cap:' + s.capacity + ')').join(', ') : 'none'}
Hospitals: ${worldState.hospitals ? worldState.hospitals.map(h => h.name).join(', ') : 'none'}

TRAPPED AGENTS (generate one Critical Failure block for each):
${trappedList}

VOLUNTEER AGENTS:
${volunteerList}

SAFE AGENTS (sample): ${safeList}

COORDINATOR LOG:
${JSON.stringify(coordinatorLog ? coordinatorLog.slice(0, 12) : [], null, 2)}

WHAT-IF EVENTS TRIGGERED:
${JSON.stringify(whatIfEvents || [], null, 2)}

SHELTER OCCUPANCY AT END:
${JSON.stringify(shelterLog || {}, null, 2)}`;
};

module.exports = { getReportPrompt };