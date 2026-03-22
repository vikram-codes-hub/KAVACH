const { disasterEngine } = require('./disasterEngine');
const { cityGraph } = require('./cityGraph');
const { processAgentTick } = require('./agentEngine');
const { generateNeeds, processCoordinatorQueue } = require('./needsEngine');

// ── AI service imports — Claude first, then Gemini, then Groq ─
const { generateReport: claudeReport, generateVerdict: claudeVerdict } = require('../services/claudeService');
const { generateReport: geminiReport, generateVerdict: geminiVerdict }  = require('../services/geminiService');
const { generateReport: groqReport,   generateVerdict: groqVerdict, generateFallbackReport } = require('../services/groqService');
const { getReportPrompt }  = require('../prompts/reportPrompt');
const { getVerdictPrompt } = require('../prompts/verdictPrompt');

const TOTAL_TICKS       = 10;
const DEFAULT_TICK_SPEED = 1500;

class SimulationRunner {
  constructor() {
    this.currentTick  = 0;
    this.isRunning    = false;
    this.tickInterval = null;
    this.tickSpeed    = DEFAULT_TICK_SPEED;

    this.agents       = [];
    this.worldState   = null;
    this.io           = null;

    this.simulationLog      = [];
    this.pendingNeeds       = [];
    this.coordinatorLog     = [];
    this.shelterOccupancy   = {};
    this.whatIfEvents       = [];
    this.allNeedsGenerated  = [];
  }

  // ── Start ────────────────────────────────────────────────────
  start(agents, worldState, io) {
    if (this.isRunning) {
      console.warn('[TICK] Simulation already running');
      return;
    }

    this.agents           = agents.map(a => ({ ...a }));
    this.worldState       = worldState;
    this.io               = io;
    this.isRunning        = true;
    this.currentTick      = 0;
    this.pendingNeeds     = [];
    this.simulationLog    = [];
    this.coordinatorLog   = [];
    this.whatIfEvents     = [];
    this.allNeedsGenerated = [];

    // Initialise shelter occupancy
    this.shelterOccupancy = {};
    if (worldState.shelters) {
      worldState.shelters.forEach(shelter => {
        this.shelterOccupancy[shelter.name] = 0;
      });
    }

    cityGraph.buildFromWorldState(worldState);
    disasterEngine.initialize(worldState);

    console.log('[TICK] Simulation started');
    this._emitLog('Simulation started — 10 ticks at ' + this.tickSpeed + 'ms intervals', 'success');
    this._emitLog(`Disaster type: ${worldState.disaster.type} — Location: ${worldState.disaster.location}`, 'info');

    this._runTick();
    this.tickInterval = setInterval(() => { this._runTick(); }, this.tickSpeed);
  }

  // ── Stop ─────────────────────────────────────────────────────
  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.isRunning = false;
    console.log('[TICK] Simulation stopped');
  }

  // ── Speed control ────────────────────────────────────────────
  setSpeed(speed) {
    this.tickSpeed = Math.max(500, Math.min(3000, speed));
    if (this.isRunning && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => { this._runTick(); }, this.tickSpeed);
    }
    console.log(`[TICK] Speed set to ${this.tickSpeed}ms`);
  }

  // ── What-if triggers ─────────────────────────────────────────
  handleWhatIf(payload, io) {
    const { triggerType } = payload;
    this.whatIfEvents.push({ triggerType, tick: this.currentTick });

    switch (triggerType) {

      case 'close_bridge':
        const roadToClose = payload.roadName ||
          (this.worldState.blocked_roads && this.worldState.blocked_roads[0]) ||
          'main_bridge';
        cityGraph.removeRoad(roadToClose);
        this.agents.forEach(agent => {
          if (agent.status === 'moving') {
            const blocked = disasterEngine.isRouteBlocked(
              agent.lat, agent.lng,
              agent.destinationLat || agent.lat,
              agent.destinationLng || agent.lng
            );
            if (blocked) {
              agent.status = 'trapped';
              agent.routeBlocked = true;
              agent.needsRescue = true;
              agent.currentThought = `The bridge just collapsed. My only route out is gone. I am trapped in ${agent.neighborhood}.`;
            }
          }
        });
        this._emitLog('⚠ What-if: Bridge closed — agents rerouting', 'warn');
        this._emitNotification('Bridge closed — route blocked for moving agents', 'danger');
        break;

      case 'shelter_full':
        const shelterName = payload.shelterName ||
          (this.worldState.shelters && this.worldState.shelters[0]?.name) ||
          'Shelter A';
        if (this.worldState.shelters) {
          const shelter = this.worldState.shelters.find(s =>
            s.name.toLowerCase().includes(shelterName.toLowerCase())
          );
          if (shelter) {
            this.shelterOccupancy[shelter.name] = shelter.capacity;
            this._emitLog(`⚠ What-if: ${shelter.name} marked as full`, 'warn');
            this._emitNotification(`${shelter.name} is now full — evacuees being redirected`, 'warning');
          }
        }
        break;

      case 'hospital_power':
        this.worldState._hospitalOffline = true;
        this.agents.forEach(agent => {
          if (agent.group === 'blue' && (
            agent.role.toLowerCase().includes('doctor') ||
            agent.role.toLowerCase().includes('hospital') ||
            agent.role.toLowerCase().includes('nurse')
          )) {
            agent.status = 'overloaded';
            agent.currentThought = `Hospital power just failed. Switching to backup generator — but we only have 4 hours of fuel. All equipment at risk.`;
          }
        });
        this._emitLog('⚠ What-if: Hospital power failure triggered', 'warn');
        this._emitNotification('Hospital power failure — backup generator activated', 'danger');
        break;

      case 'misinformation':
        let reroutedCount = 0;
        this.agents.forEach(agent => {
          if (agent.group === 'amber' && agent.status === 'moving' && reroutedCount < 3) {
            agent._misinformed = true;
            agent.currentThought = `Someone posted on WhatsApp that the Bisalpur Bridge is open. Changing my route. Hope it is true.`;
            agent.destinationLat = agent.lat + 0.01;
            agent.destinationLng = agent.lng + 0.01;
            reroutedCount++;
          }
        });
        this._emitLog(`⚠ What-if: Misinformation spread — ${reroutedCount} agents rerouted`, 'warn');
        this._emitNotification(`Misinformation spreading — ${reroutedCount} agents taking wrong route`, 'warning');
        break;

      case 'heavy_rain':
        this.agents.forEach(agent => {
          if (agent.group === 'amber' || agent.group === 'red') {
            agent.floodReachesAt = Math.max(1, Math.floor((agent.floodReachesAt || 6) * 0.7));
          }
          agent._movementPenalty = 0.4;
        });
        this._emitLog('⚠ What-if: Heavy rain — disaster spreading 40% faster', 'warn');
        this._emitNotification('Heavy rain triggered — disaster spreading faster, movement slowed', 'warning');
        break;

      case 'deploy_ndrf':
        const criticalTrapped = this.agents
          .filter(a => a.status === 'trapped' && a.vulnerability === 'critical')
          .slice(0, 2);
        criticalTrapped.forEach(agent => {
          agent.status = 'moving';
          agent.needsRescue = false;
          agent.currentThought = `Extra NDRF team just arrived at ${agent.neighborhood}. Being evacuated now. Finally.`;
        });
        if (criticalTrapped.length === 0) {
          this.agents.filter(a => a.status === 'trapped').slice(0, 2).forEach(agent => {
            agent.status = 'moving';
            agent.needsRescue = false;
            agent.currentThought = `NDRF reinforcement team has reached me. Moving to safety now.`;
          });
        }
        this._emitLog(`✓ What-if: Extra NDRF deployed — ${criticalTrapped.length} agents rescued`, 'success');
        this._emitNotification(`Extra NDRF team deployed — rescuing ${criticalTrapped.length} critical agents`, 'success');
        break;

      default:
        console.warn(`[WHATIF] Unknown trigger: ${triggerType}`);
    }

    this._pushTickState(this.currentTick, { whatIfTriggered: triggerType });
  }

  // ── PRIVATE ──────────────────────────────────────────────────

  _runTick() {
    if (this.currentTick > TOTAL_TICKS) {
      this.stop();
      return;
    }

    console.log(`[TICK] Running tick ${this.currentTick}`);
    this._emitLog(`[TICK ${this.currentTick}]  ${this._tickToTime(this.currentTick)}  — Processing ${this.agents.length} agents`, 'info');

    // Step 1 — Spread disaster
    const disasterState = disasterEngine.spreadDisaster(this.currentTick);
    this._emitLog(
      `Disaster spread — ${disasterState.affectedNodes.length} zones affected, ${disasterState.newlyAffected.length} newly`,
      disasterState.newlyAffected.length > 0 ? 'warn' : 'info'
    );

    // Step 2 — Process each agent
    this.agents = this.agents.map(agent =>
      processAgentTick(agent, this.currentTick, this.worldState, this.shelterOccupancy)
    );

    // Step 3 — Update shelter occupancy
    this._updateShelterOccupancy();

    // Step 4 — Generate needs
    const newNeeds = generateNeeds(this.agents, this.currentTick, this.worldState);
    newNeeds.forEach(need => {
      const exists = this.pendingNeeds.some(p =>
        p.agentId === need.agentId && p.needType === need.needType
      );
      if (!exists) {
        this.pendingNeeds.push(need);
        this.allNeedsGenerated.push(need);
      }
    });

    // Step 5 — Coordinator processes queue (max 3 per tick)
    const coordinatorResult = processCoordinatorQueue(
      this.pendingNeeds, this.agents, this.currentTick
    );
    this.pendingNeeds = coordinatorResult.stillPending;

    this.coordinatorLog.push({
      tick:      this.currentTick,
      time:      this._tickToTime(this.currentTick),
      received:  newNeeds.length,
      actioned:  coordinatorResult.actionedCount,
      pending:   coordinatorResult.pendingCount,
      overloaded: coordinatorResult.overloaded
    });

    if (coordinatorResult.overloaded) {
      this._emitLog(
        `⚠ Coordinator overloaded — ${coordinatorResult.pendingCount} requests pending, only 3 actioned`,
        'warn'
      );
    }

    // Step 6 — Compute stats
    const stats = this._computeStats();

    // Step 7 — Log tick state
    const tickState = {
      tick:             this.currentTick,
      time:             this._tickToTime(this.currentTick),
      agents:           this.agents.map(a => ({ ...a })),
      disasterState,
      shelterOccupancy: { ...this.shelterOccupancy },
      newNeeds,
      coordinatorResult,
      pendingCount:     this.pendingNeeds.length,
      stats,
      whatIfEvents:     this.whatIfEvents.filter(e => e.tick === this.currentTick)
    };
    this.simulationLog.push(tickState);

    // Step 8 — Emit to frontend
    this._pushTickState(this.currentTick, { stats });

    // Step 9 — Log key events
    this._logKeyEvents(stats);

    // Step 10 — Check completion
    if (this.currentTick === TOTAL_TICKS) {
      this._onSimulationComplete();
    }

    this.currentTick++;
  }

  _onSimulationComplete() {
    console.log('[TICK] Simulation complete — generating reports');
    this._emitLog('Simulation complete — generating reports...', 'info');

    this.io.emit('simulation-complete', {
      simulationLog: this.simulationLog,
      agents:        this.agents,
      worldState:    this.worldState,
      stats:         this._computeStats()
    });

    const fullLog = {
      agents:         this.agents,
      worldState:     this.worldState,
      ticks:          this.simulationLog,
      needs:          this.allNeedsGenerated,
      coordinatorLog: this.coordinatorLog,
      shelterLog:     this.shelterOccupancy,
      whatIfEvents:   this.whatIfEvents,
      finalStats:     this._computeStats()
    };

    this._generateReports(fullLog);
  }

  // ── Report generation — Claude → Gemini → Groq → Fallback ───
  async _generateReports(simulationLog) {
    let bottleneckReport = null;
    let verdict          = null;

    // ── BOTTLENECK REPORT ───────────────────────────────────

    // 1. Claude (best quality)
    try {
      this._emitLog('Generating bottleneck report → Claude claude-sonnet-4-5...', 'info');
      bottleneckReport = await claudeReport(simulationLog);
      this._emitLog('✓ Bottleneck report generated by Claude', 'success');
    } catch (claudeErr) {
      console.error('[REPORT] Claude failed:', claudeErr.message);
      this._emitLog(
        `Claude report failed (${claudeErr.message.includes('credit') ? 'no credits' : claudeErr.message.slice(0, 50)}) — trying Gemini...`,
        'warn'
      );

      // 2. Gemini
      try {
        this._emitLog('Generating bottleneck report → Gemini 2.0 Flash...', 'info');
        bottleneckReport = await geminiReport(simulationLog);
        this._emitLog('✓ Bottleneck report generated by Gemini', 'success');
      } catch (geminiErr) {
        console.error('[REPORT] Gemini failed:', geminiErr.message);
        this._emitLog('Gemini failed — trying Groq llama-3.3-70b...', 'warn');

        // 3. Groq
        try {
          const reportPrompt = getReportPrompt(simulationLog);
          bottleneckReport = await groqReport(reportPrompt);
          this._emitLog('✓ Bottleneck report generated by Groq', 'success');
        } catch (groqErr) {
          console.error('[REPORT] Groq failed:', groqErr.message);
          this._emitLog('All AI report generation failed — using structured fallback', 'warn');

          // 4. Hard fallback
          bottleneckReport = generateFallbackReport(simulationLog);
          this._emitLog('✓ Fallback report generated from simulation data', 'success');
        }
      }
    }

    // ── FINAL VERDICT ───────────────────────────────────────

    // 1. Claude
    try {
      this._emitLog('Generating final verdict → Claude claude-sonnet-4-5...', 'info');
      verdict = await claudeVerdict(simulationLog, bottleneckReport);
      this._emitLog('✓ Final verdict generated by Claude', 'success');
    } catch (claudeErr) {
      console.error('[VERDICT] Claude failed:', claudeErr.message);
      this._emitLog(
        `Claude verdict failed (${claudeErr.message.includes('credit') ? 'no credits' : claudeErr.message.slice(0, 50)}) — trying Gemini...`,
        'warn'
      );

      // 2. Gemini
      try {
        this._emitLog('Generating final verdict → Gemini 2.0 Flash...', 'info');
        verdict = await geminiVerdict(simulationLog, bottleneckReport);
        this._emitLog('✓ Final verdict generated by Gemini', 'success');
      } catch (geminiErr) {
        console.error('[VERDICT] Gemini failed:', geminiErr.message);
        this._emitLog('Gemini verdict failed — trying Groq llama-3.3-70b...', 'warn');

        // 3. Groq
        try {
          const verdictPrompt = getVerdictPrompt(simulationLog, bottleneckReport);
          verdict = await groqVerdict(verdictPrompt);
          this._emitLog('✓ Final verdict generated by Groq', 'success');
        } catch (groqErr) {
          console.error('[VERDICT] Groq failed:', groqErr.message);
          this._emitLog('All AI verdict generation failed — using structured fallback', 'warn');

          // 4. Structured minimal fallback
          const stats        = this._computeStats();
          const survivalRate = Math.round((stats.safe / stats.total) * 100);
          const trapped      = simulationLog.agents.filter(a => a.status === 'trapped');
          const readiness    = Math.max(20, Math.min(65, survivalRate - trapped.length * 8));
          const loc          = simulationLog.worldState.disaster.location;
          const type         = simulationLog.worldState.disaster.type;

          verdict = `
<hr>
<div class="section-title">9. Final Verdict — Disaster Response Readiness Assessment</div>

<div class="verdict-banner">
  <div class="verdict-score-row">
    <div style="text-align:left">
      <div class="verdict-title">${loc.toUpperCase()} ${type.toUpperCase()} — RESPONSE READINESS VERDICT</div>
      <div class="verdict-sub">Based on CrisisSwarm Multi-Agent Simulation — ${simulationLog.agents.length} agents — 10 ticks</div>
      <div class="verdict-meaning">Current plan is CRITICALLY UNDER-RESOURCED for this disaster scenario</div>
    </div>
    <div class="score-circle">
      <div class="score-num">${readiness}%</div>
      <div class="score-lbl">Readiness Score</div>
    </div>
  </div>
  <p style="font-size:11px;color:#333;margin:6px 0 0;text-align:left">
    <strong>Score Interpretation:</strong> ${readiness}% readiness means the current response plan would leave approximately ${100 - readiness}% of critical failure scenarios unresolved.
    ${trapped.length} of ${simulationLog.agents.length} agents were unrescued — each representing a systemic gap in the response framework.
  </p>
</div>

<div class="section-title">9A — Readiness Score Breakdown by Category</div>
<div class="readiness-breakdown">
  <div class="rb-row"><div class="rb-label">Medical Emergency Response</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:${Math.max(15, survivalRate - 20)}%"></div></div><div class="rb-score" style="color:#cc0000">${Math.max(15, survivalRate - 20)}%</div></div>
  <div class="rb-row"><div class="rb-label">Alert &amp; Communication Coverage</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:35%"></div></div><div class="rb-score" style="color:#cc0000">35%</div></div>
  <div class="rb-row"><div class="rb-label">Shelter Capacity &amp; Management</div><div class="rb-bar"><div class="rb-fill fill-amber" style="width:55%"></div></div><div class="rb-score" style="color:#cc7700">55%</div></div>
  <div class="rb-row"><div class="rb-label">Accessibility &amp; Inclusion</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:0%"></div></div><div class="rb-score" style="color:#cc0000">0%</div></div>
  <div class="rb-row"><div class="rb-label">Coordinator &amp; NDRF Capacity</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:33%"></div></div><div class="rb-score" style="color:#cc0000">33%</div></div>
  <div class="rb-row"><div class="rb-label">Evacuation Route Redundancy</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:25%"></div></div><div class="rb-score" style="color:#cc0000">25%</div></div>
  <div class="rb-row"><div class="rb-label">Misinformation Control</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:10%"></div></div><div class="rb-score" style="color:#cc0000">10%</div></div>
  <div class="rb-row"><div class="rb-label">Volunteer Integration</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:5%"></div></div><div class="rb-score" style="color:#cc0000">5%</div></div>
  <div class="rb-row"><div class="rb-label">Road Connectivity Backup</div><div class="rb-bar"><div class="rb-fill fill-red" style="width:20%"></div></div><div class="rb-score" style="color:#cc0000">20%</div></div>
  <div class="rb-row"><div class="rb-label">Community Self-Organization</div><div class="rb-bar"><div class="rb-fill fill-green" style="width:75%"></div></div><div class="rb-score" style="color:#2d7a2d">75%</div></div>
</div>

<div class="section-title">9D — Cost of Inaction</div>
<div class="inaction-box">
  <div class="inaction-title">If Current Plan Is Deployed Unchanged In This Scenario</div>
  <div class="inaction-row"><span class="ir-label">Agents unrescued at simulation end</span><span class="ir-value">${trapped.length} confirmed</span></div>
  <div class="inaction-row"><span class="ir-label">Official system survival rate</span><span class="ir-value">${survivalRate}% (${stats.safe} of ${stats.total})</span></div>
  <div class="inaction-row" style="border-top:1px solid #cc0000;margin-top:4px;padding-top:8px">
    <span class="ir-label" style="font-weight:bold">Projected survival rate with all recommendations implemented</span>
    <span class="ir-value" style="color:#2d7a2d">${Math.min(96, survivalRate + trapped.length * 8)}% (${Math.round(((Math.min(96, survivalRate + trapped.length * 8)) / 100) * stats.total)} of ${stats.total})</span>
  </div>
</div>

<div class="section-title">9E — Final Statement</div>
<div class="final-box">
  <div class="final-box-title">CrisisSwarm Simulation Engine — Final Verdict</div>
  <div class="final-statement">
    The ${loc} ${type} response plan achieves a <span class="final-highlight">readiness score of ${readiness}%</span> against this disaster scenario.
    Of ${simulationLog.agents.length} simulated citizens, <span class="final-highlight">${trapped.length} were unrescued at simulation end</span> —
    not because of the disaster itself, but because of specific, preventable gaps in the response framework.<br><br>
    CrisisSwarm does not predict the future. It stress-tests the present.
    <span class="final-highlight">Every failure documented here is a gap that exists today.
    Every recommendation is actionable today.
    The question is not whether the next disaster will come — it is whether these gaps will still exist when it does.</span>
  </div>
</div>`;
          this._emitLog('✓ Structured fallback verdict generated', 'success');
        }
      }
    }

    // ── Emit to frontend ──────────────────────────────────────
    this.io.emit('report-ready', {
      bottleneckReport,
      verdict,
      stats: this._computeStats()
    });

    this._emitLog('✓ Report ready — scroll down in the pipeline panel to view', 'success');
  }

  // ── Helpers ───────────────────────────────────────────────────

  _updateShelterOccupancy() {
    if (!this.worldState.shelters) return;
    this.worldState.shelters.forEach(shelter => {
      const occupants = this.agents.filter(agent =>
        agent.status === 'safe' &&
        agent.destination &&
        (agent.destination.toLowerCase().includes(shelter.name.toLowerCase()) ||
         shelter.name.toLowerCase().includes(agent.destination.toLowerCase()) ||
         agent.zone === shelter.zone)
      ).length;
      this.shelterOccupancy[shelter.name] = Math.min(occupants, shelter.capacity);
    });
  }

  _computeStats() {
    const safe     = this.agents.filter(a => a.status === 'safe').length;
    const trapped  = this.agents.filter(a => a.status === 'trapped').length;
    const moving   = this.agents.filter(a => ['moving','active','helping'].includes(a.status)).length;
    const managing = this.agents.filter(a => ['managing','overloaded'].includes(a.status)).length;

    return {
      safe,
      trapped,
      moving,
      managing,
      total:            this.agents.length,
      survivalRate:     Math.round((safe / this.agents.length) * 100),
      disasterCoverage: disasterEngine.getDisasterCoverage()
    };
  }

  _pushTickState(tick, extra = {}) {
    const mapData = disasterEngine.getMapData();
    const stats   = this._computeStats();

    this.io.emit('tick-update', {
      tick,
      time:             this._tickToTime(tick),
      agents:           this.agents,
      floodedNodes:     mapData.floodedNodes,
      floodedRoads:     mapData.floodedRoads,
      affectedNodes:    mapData.affectedNodes,
      affectedRoads:    mapData.affectedRoads,
      disasterColor:    mapData.disasterColor,
      disasterLabel:    mapData.disasterLabel,
      disasterCoverage: mapData.disasterCoverage,
      shelterOccupancy: this.shelterOccupancy,
      pendingRequests:  this.pendingNeeds.length,
      safe:             stats.safe,
      moving:           stats.moving,
      trapped:          stats.trapped,
      managing:         stats.managing,
      graphEdges:       cityGraph.getAllEdges(),
      ...extra
    });
  }

  _logKeyEvents(stats) {
    this.agents.filter(a => a.status === 'trapped').forEach(agent => {
      if (!agent._trappedLogged) {
        this._emitLog(
          `⚠ ${agent.name} — TRAPPED in ${agent.neighborhood} — ${agent.rescueType || 'rescue'} needed`,
          'warn'
        );
        agent._trappedLogged = true;
      }
    });

    this.agents.filter(a => a.status === 'safe' && !a._safeLogged).forEach(agent => {
      this._emitLog(`✓ ${agent.name} reached safety at ${agent.destination}`, 'success');
      agent._safeLogged = true;
    });

    if (this.pendingNeeds.length >= 6) {
      this._emitLog(`⚠ COORDINATOR OVERLOAD — ${this.pendingNeeds.length} pending requests`, 'warn');
    }
  }

  _emitLog(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    this.io.emit('log-event', { timestamp, message, level });
    console.log(`[LOG] ${timestamp} ${message}`);
  }

  _emitNotification(message, type = 'info') {
    this.io.emit('notification', { message, type, tick: this.currentTick });
  }

  _tickToTime(tick) {
    const totalMinutes = tick * 15;
    const hours        = 6 + Math.floor(totalMinutes / 60);
    const minutes      = totalMinutes % 60;
    const period       = hours < 12 ? 'AM' : 'PM';
    const displayHour  = hours > 12 ? hours - 12 : hours;
    return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}

module.exports = { SimulationRunner };