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