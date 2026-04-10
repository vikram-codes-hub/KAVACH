const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ── Allowed origins — localhost + deployed frontend ───────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://kavach-frontend-two.vercel.app',
  process.env.FRONTEND_URL  // fallback from .env if set
].filter(Boolean);

// ── Socket.io with CORS ───────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ── Express CORS ──────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
const uploadRoute = require('./routes/upload');
app.use('/api', uploadRoute);

// Store io globally so simulation modules can access it
global.io = io;

// Active simulation runner reference
let activeSimulation = null;

// ── Socket.io connection handler ──────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  const emitPipelineStep = (stepNumber, status, data = {}) => {
    socket.emit('pipeline-step', { stepNumber, status, data });
  };

  const emitLog = (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    socket.emit('log-event', { timestamp, message, level });
  };

  socket.emitLog = emitLog;
  socket.emitPipelineStep = emitPipelineStep;

  // Intervention handler
  socket.on('intervention', (payload) => {
    console.log(`[INTERVENTION] ${payload.type}`);
    if (activeSimulation) {
      activeSimulation.handleIntervention(payload);
    } else {
      emitLog('No active simulation for intervention', 'error');
    }
  });

  // Multi-scenario comparison — runs 3 deterministic simulations and returns stats
  socket.on('run-scenario-comparison', async () => {
    const simState = global.simState;
    if (!simState) return socket.emit('scenario-error', { message: 'No simulation state loaded' });

    emitLog('Running 3-scenario comparison (no LLM)...', 'info');

    const { SimulationRunner } = require('./simulation/tickLoop');
    const { processAgentTick } = require('./simulation/agentEngine');
    const { disasterEngine }   = require('./simulation/disasterEngine');
    const { cityGraph }        = require('./simulation/cityGraph');

    const runScenario = (agents, worldState, modifier) => {
      const agentsCopy = agents.map(a => ({ ...a }));
      modifier(agentsCopy, worldState);

      cityGraph.buildFromWorldState(worldState);
      disasterEngine.initialize(worldState);

      const shelterOcc = {};
      (worldState.shelters || []).forEach(s => { shelterOcc[s.name] = 0; });

      let pendingNeeds = [];
      const tickStats  = [];

      for (let tick = 0; tick <= 10; tick++) {
        disasterEngine.spreadDisaster(tick);
        const updated = agentsCopy.map(a => processAgentTick(a, tick, worldState, shelterOcc));
        updated.forEach((a, i) => { agentsCopy[i] = a; });

        // Simple shelter update
        (worldState.shelters || []).forEach(s => {
          shelterOcc[s.name] = Math.min(
            agentsCopy.filter(a => a.status === 'safe' && a.zone === s.zone).length,
            s.capacity
          );
        });

        tickStats.push({
          tick,
          safe:    agentsCopy.filter(a => a.status === 'safe').length,
          trapped: agentsCopy.filter(a => a.status === 'trapped').length,
          moving:  agentsCopy.filter(a => ['moving','active','helping'].includes(a.status)).length
        });
      }

      const finalSafe    = agentsCopy.filter(a => a.status === 'safe').length;
      const finalTrapped = agentsCopy.filter(a => a.status === 'trapped').length;
      return {
        tickStats,
        finalSafe,
        finalTrapped,
        survivalRate: Math.round((finalSafe / agentsCopy.length) * 100)
      };
    };

    try {
      // Scenario A: Current plan (no changes)
      const scenarioA = runScenario(simState.agents, simState.worldState, () => {});

      // Scenario B: +2 NDRF teams (rescue 2 extra critical agents from tick 3)
      const scenarioB = runScenario(simState.agents, simState.worldState, (agents) => {
        agents
          .filter(a => a.vulnerability === 'critical')
          .slice(0, 2)
          .forEach(a => { a.floodReachesAt = 8; a.rescueAvailable = true; });
      });

      // Scenario C: Full recommendations (alert all, +NDRF, +ambulance)
      const scenarioC = runScenario(simState.agents, simState.worldState, (agents) => {
        agents.forEach(a => {
          a.receivedAlert = true;
          if (a.vulnerability === 'critical' || a.vulnerability === 'high') {
            a.floodReachesAt = Math.min(a.floodReachesAt + 3, 999);
            a.rescueAvailable = true;
          }
        });
      });

      socket.emit('scenario-comparison-result', {
        scenarios: [
          { label: 'Current Plan',          color: '#ef4444', ...scenarioA },
          { label: '+2 NDRF Teams',          color: '#f59e0b', ...scenarioB },
          { label: 'Full Recommendations',  color: '#22c55e', ...scenarioC }
        ]
      });
      emitLog(`✓ Scenario comparison: A=${scenarioA.survivalRate}% B=${scenarioB.survivalRate}% C=${scenarioC.survivalRate}%`, 'success');
    } catch (err) {
      socket.emit('scenario-error', { message: err.message });
    }
  });

  // What-if triggers
  socket.on('what-if-trigger', (payload) => {
    console.log(`[WHATIF] Trigger received: ${payload.triggerType}`);
    emitLog(`What-if triggered: ${payload.triggerType}`, 'warn');
    if (activeSimulation) {
      activeSimulation.handleWhatIf(payload, io);
    } else {
      emitLog('No active simulation to apply what-if trigger', 'error');
    }
  });

  // Start simulation
  socket.on('start-simulation', () => {
    console.log(`[SIM] Start simulation requested by ${socket.id}`);
    emitLog('Simulation start requested', 'info');

    const { SimulationRunner } = require('./simulation/tickLoop');

    if (activeSimulation && activeSimulation.isRunning) {
      emitLog('Simulation already running', 'warn');
      return;
    }

    const simState = global.simState;
    if (!simState || !simState.agents || !simState.worldState) {
      emitLog('Cannot start — no simulation state loaded. Upload a PDF first.', 'error');
      socket.emit('sim-error', { message: 'No simulation state. Upload PDF first.' });
      return;
    }

    activeSimulation = new SimulationRunner();
    activeSimulation.start(simState.agents, simState.worldState, io);
    emitLog('Simulation started — 10 ticks at 1500ms intervals', 'success');
  });

  // Tick speed control
  socket.on('set-tick-speed', (speed) => {
    if (activeSimulation) {
      activeSimulation.setSpeed(speed);
      emitLog(`Tick speed updated to ${speed}ms`, 'info');
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CrisisSwarm Backend',
    port: process.env.PORT || 5000,
    simLoaded: !!global.simState,
    simRunning: activeSimulation?.isRunning || false
  });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║     CrisisSwarm Backend Running      ║
║     Port: ${PORT}                       ║
║     Allowed origins:                 ║
${ALLOWED_ORIGINS.map(o => `║       ${o.padEnd(30)}║`).join('\n')}
╚══════════════════════════════════════╝
  `);
});

module.exports = { io };