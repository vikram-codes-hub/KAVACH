const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const router = express.Router();

const { extractText } = require('../services/pdfParser');
const { extractWorldState } = require('../services/geminiService');
const { extractWorldState: groqExtractWorldState } = require('../services/groqService');
const { generateAgents } = require('../services/claudeService');
const { cityGraph } = require('../simulation/cityGraph');
const { getWorldStatePrompt } = require('../prompts/worldStatePrompt');
const { getAgentGenerationPrompt } = require('../prompts/agentGenerationPrompt');

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'), false);
  }
});

// ── Enrich agents ─────────────────────────────────────────────
const enrichAgents = (agents, worldState) => {
  return agents.map(agent => {
    const zoneRisk = (() => {
      if (worldState.zones.red.some(z =>
        z.toLowerCase().includes(agent.zone.toLowerCase()) ||
        agent.zone.toLowerCase().includes(z.toLowerCase())
      )) return 'red';
      if (worldState.zones.amber.some(z =>
        z.toLowerCase().includes(agent.zone.toLowerCase()) ||
        agent.zone.toLowerCase().includes(z.toLowerCase())
      )) return 'amber';
      return 'safe';
    })();

    const floodReachesAt = zoneRisk === 'red' ? 3 : zoneRisk === 'amber' ? 6 : 999;

    const routeBlocked = (() => {
      if (!worldState.blocked_roads || worldState.blocked_roads.length === 0) return false;
      return worldState.blocked_roads.some(road =>
        road.toLowerCase().includes(agent.zone.toLowerCase()) ||
        road.toLowerCase().includes((agent.neighborhood || '').toLowerCase()) ||
        (agent.neighborhood || '').toLowerCase().includes(road.toLowerCase())
      );
    })();

    const nearestShelter = (() => {
      if (!worldState.shelters || worldState.shelters.length === 0) return 'Nearest Shelter';
      const zoneMatch = worldState.shelters.find(s =>
        s.zone && (s.zone.toLowerCase().includes(agent.zone.toLowerCase()) ||
        agent.zone.toLowerCase().includes(s.zone.toLowerCase()))
      );
      return zoneMatch ? zoneMatch.name : worldState.shelters[0].name;
    })();

    const destCoords = (() => {
      if (!worldState.shelters || worldState.shelters.length === 0)
        return { lat: worldState.map_center.lat, lng: worldState.map_center.lng };
      const shelter = worldState.shelters.find(s => s.name === nearestShelter) || worldState.shelters[0];
      return { lat: shelter.lat, lng: shelter.lng };
    })();

    return {
      ...agent,
      zoneRisk,
      floodReachesAt,
      routeBlocked,
      receivedAlert: agent.hasSmartphone,
      nearestShelter,
      rescueAvailable: !!(worldState.responders && worldState.responders.length > 0),
      destinationLat: destCoords.lat,
      destinationLng: destCoords.lng,
      status: 'active',
      currentThought: agent.initialThought,
      needsRescue: false,
      rescueType: null,
      _trappedLogged: false,
      _safeLogged: false,
      _misinformed: false
    };
  });
};

// ── Robust JSON array extractor ───────────────────────────────
const extractJsonArray = (text) => {
  // Strip markdown fences
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Strategy 1: direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    const firstArray = Object.values(parsed).find(v => Array.isArray(v));
    if (firstArray) return firstArray;
  } catch (_) {}

  // Strategy 2: find outermost [ ... ]
  const start = cleaned.indexOf('[');
  const end   = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }

  // Strategy 3: scrape individual { } objects
  const objects = [];
  let depth = 0, objStart = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(cleaned.slice(objStart, i + 1));
          if (obj.id !== undefined) objects.push(obj);
        } catch (_) {}
        objStart = -1;
      }
    }
  }
  if (objects.length > 0) return objects;

  throw new Error(`No JSON array found. Response preview: ${cleaned.slice(0, 300)}`);
};

// ── Hard coordinate correction ────────────────────────────────
// Groq hallucinates coordinates from training data — this clamps
// every agent to within 0.08° of the actual map_center from worldState

// ── Hard coordinate correction ────────────────────────────────
const correctCoordinates = (agents, worldState) => {
  const centerLat = worldState.map_center.lat;
  const centerLng = worldState.map_center.lng;
  const MAX_DRIFT = 0.08;

  // SAFETY CHECK — if map_center itself is outside India, fix it first
  if (centerLat < 6 || centerLat > 37 || centerLng < 68 || centerLng > 98) {
    console.error(`[UPLOAD] map_center is outside India: ${centerLat}, ${centerLng} — agents will be wrong`);
  }

  const seen = new Set();

  return agents.map((agent, i) => {
    let lat = parseFloat(agent.lat);
    let lng = parseFloat(agent.lng);

    // Check 1: outside India entirely
    const outsideIndia = isNaN(lat) || isNaN(lng) || lat < 6 || lat > 37 || lng < 68 || lng > 98;

    // Check 2: too far from map center
    const latOff = Math.abs(lat - centerLat);
    const lngOff = Math.abs(lng - centerLng);
    const tooFarFromCenter = latOff > MAX_DRIFT || lngOff > MAX_DRIFT;

    if (outsideIndia || tooFarFromCenter) {
      // Spread agents in a grid pattern around map_center
      const row    = Math.floor(i / 8);
      const col    = i % 8;
      const spread = 0.05;
      lat = centerLat + (row - 3) * (spread / 5) + (Math.random() - 0.5) * 0.005;
      lng = centerLng + (col - 4) * (spread / 5) + (Math.random() - 0.5) * 0.005;
      console.log(`[UPLOAD] Agent ${i+1} coords corrected to center: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }

    // Ensure uniqueness
    let key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    while (seen.has(key)) {
      lat += (Math.random() - 0.5) * 0.004;
      lng += (Math.random() - 0.5) * 0.004;
      key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    }
    seen.add(key);

    return { ...agent, lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) };
  });
};


// ── Generate one batch of agents ──────────────────────────────
const generateBatch = async (worldState, group, count, startId) => {
  const centerLat = worldState.map_center.lat;
  const centerLng = worldState.map_center.lng;

  // Pre-compute example coordinates so Groq has concrete numbers to follow
  // instead of hallucinating its own
  const exampleCoords = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const lat = (centerLat + (row - 2) * 0.012 + (Math.random() - 0.5) * 0.004).toFixed(4);
    const lng = (centerLng + (col - 2) * 0.012 + (Math.random() - 0.5) * 0.004).toFixed(4);
    return `agent ${startId + i}: lat=${lat}, lng=${lng}`;
  }).join('\n');

  const groupDesc = {
    blue:  'responders and infrastructure operators: police officers, NDRF coordinators, hospital staff, shelter managers, ambulance drivers, district officials, PWD engineers, civil defense personnel',
    red:   'vulnerable people in red zones who CANNOT self-evacuate: pregnant women, elderly people alone, wheelchair users, people with no phone, people with no vehicle, people with critical medical needs',
    amber: 'mobile citizens who CAN potentially move but face obstacles: daily wage workers, shop owners, tourists, students, farmers, migrant laborers, auto drivers',
    green: 'community volunteers who self-deploy to help others: NGO workers, community organizers, retired teachers, local social workers, youth group leaders'
  };

  const zoneList = [
    ...worldState.zones.red.map(z => `"${z}" (red zone)`),
    ...worldState.zones.amber.map(z => `"${z}" (amber zone)`),
    ...worldState.zones.safe.map(z => `"${z}" (safe zone)`)
  ].join(', ');

  const prompt = `Generate exactly ${count} JSON agent objects for a disaster simulation.

LOCATION: ${worldState.disaster.location}, ${worldState.disaster.state}, India
DISASTER: ${worldState.disaster.type}
GROUP: All ${count} agents must have "group": "${group}"
DESCRIPTION: ${groupDesc[group]}

IDs must be ${startId} through ${startId + count - 1} (sequential).

Available zones: ${zoneList}

CRITICAL COORDINATE RULE — THIS IS THE MOST IMPORTANT INSTRUCTION:
The simulation takes place in ${worldState.disaster.location}, ${worldState.disaster.state}.
The EXACT map center is: lat=${centerLat}, lng=${centerLng}
Every agent MUST have lat within ${centerLat - 0.08} to ${centerLat + 0.08}
Every agent MUST have lng within ${centerLng - 0.08} to ${centerLng + 0.08}
Do NOT use coordinates from any other city or state.
Do NOT use coordinates from Kerala, Tamil Nadu, or any southern state unless that IS the location.
Use THESE exact coordinate ranges — no exceptions.

Suggested coordinates for each agent (use these as a base, vary slightly):
${exampleCoords}

REQUIRED FIELDS for each agent:
- id (number, ${startId} to ${startId + count - 1})
- name (realistic Indian name for ${worldState.disaster.state})
- age (number, 18-75)
- role (specific job title relevant to ${worldState.disaster.location})
- group ("${group}")
- zone (exact zone name from the list above)
- neighborhood (specific area within ${worldState.disaster.location})
- lat (number between ${(centerLat - 0.08).toFixed(4)} and ${(centerLat + 0.08).toFixed(4)})
- lng (number between ${(centerLng - 0.08).toFixed(4)} and ${(centerLng + 0.08).toFixed(4)})
- hasVehicle (boolean)
- hasPhone (boolean)
- hasSmartphone (boolean)
- vulnerability ("low", "medium", "high", or "critical")
- destination (where they need to go in ${worldState.disaster.location})
- backstory (one sentence about their situation in ${worldState.disaster.location})
- initialThought (first person thought at disaster onset, references ${worldState.disaster.location})

${group === 'red' ? 'All red agents must have vulnerability "high" or "critical". Give them diverse failure modes: no phone, disabled, elderly alone, blocked route.' : ''}
${group === 'blue' ? 'All blue agents must have hasPhone: true. Give them diverse official roles.' : ''}

Return ONLY the JSON array. Start your response with [ and end with ]. No other text.`;

  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You output only raw JSON arrays for disaster simulation agents.
Your entire response must start with [ and end with ].
No markdown, no explanation, no text outside the JSON array.
CRITICAL: All lat/lng coordinates must be within 0.08 degrees of lat=${centerLat}, lng=${centerLng}.
This simulation is in ${worldState.disaster.location}, ${worldState.disaster.state} — use coordinates for that location only.`
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 8000
  });

  const text = completion.choices[0].message.content;
  const agents = extractJsonArray(text);

  // Enforce correct group and sequential IDs
  const fixed = agents.slice(0, count).map((a, i) => ({
    ...a,
    id:    startId + i,
    group: group
  }));

  // Hard-correct any hallucinated coordinates to actual location
  return correctCoordinates(fixed, worldState);
};

// ── Generate all 100 agents via 4 sequential Groq batches ────
const generateAgentsViaGroq = async (worldState, emitLog) => {
  emitLog('Generating 50 agents via Groq — 4 group batches...', 'info');

  const batches = [
    { group: 'blue',  count: 13, startId: 1  },
    { group: 'red',   count: 12, startId: 14 },
    { group: 'amber', count: 13, startId: 26 },
    { group: 'green', count: 12, startId: 39 }
  ];

  const allAgents = [];

  for (const batch of batches) {
    emitLog(`Generating ${batch.group} group (agents ${batch.startId}–${batch.startId + batch.count - 1})...`, 'info');
    try {
      const agents = await generateBatch(worldState, batch.group, batch.count, batch.startId);
      allAgents.push(...agents);
      emitLog(`✓ ${batch.group} batch — ${agents.length} agents ready`, 'success');
    } catch (err) {
      emitLog(`✗ ${batch.group} batch failed: ${err.message}`, 'error');
      throw new Error(`Batch failed for group ${batch.group}: ${err.message}`);
    }
  }

  emitLog(`✓ All ${allAgents.length} agents generated via Groq`, 'success');

  // Final safety pass — correct any remaining coordinate drift
  const corrected = correctCoordinates(allAgents, worldState);
  emitLog(`✓ Coordinates validated and corrected to ${worldState.disaster.location} bounds`, 'info');

  return corrected;
};

// ── Route ─────────────────────────────────────────────────────
router.post('/upload', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  const io = global.io;

  const emitLog = (message, level = 'info') => {
    if (io) {
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit',
        second: '2-digit', fractionalSecondDigits: 3
      });
      io.emit('log-event', { timestamp, message, level });
    }
    console.log(`[UPLOAD] ${message}`);
  };

  const emitPipelineStep = (stepNumber, status, data = {}) => {
    if (io) io.emit('pipeline-step', { stepNumber, status, data });
  };

  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });

    emitLog(`Loading disaster advisory — ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`, 'info');
    emitPipelineStep(1, 'processing', {});

    // ── STEP 1 — PDF text extraction ──────────────────────
    emitLog('Extracting text from PDF...', 'info');
    const pdfText = await extractText(req.file.buffer);
    if (!pdfText || pdfText.trim().length < 50) {
      emitLog('PDF text extraction returned minimal content — proceeding with available text', 'warn');
    } else {
      emitLog(`✓ PDF parsed — ${pdfText.length} characters extracted`, 'success');
    }

    // ── STEP 2 — World state extraction ───────────────────
    emitLog('World state extraction started → Gemini 1.5 Flash', 'info');
    let worldState = null;

    try {
      worldState = await extractWorldState(pdfText);
      emitLog(`✓ World state extracted — ${worldState.zones.red.length} red, ${worldState.zones.amber.length} amber, ${worldState.zones.safe.length} safe zones`, 'success');
    } catch (geminiErr) {
      emitLog(`Gemini failed — trying Groq backup`, 'warn');
      try {
        const prompt = getWorldStatePrompt(pdfText);
        worldState = await groqExtractWorldState(pdfText, prompt);
        emitLog('✓ World state extracted via Groq backup', 'success');
      } catch (groqErr) {
        emitLog(`✗ World state extraction failed on both services: ${groqErr.message}`, 'error');
        return res.status(500).json({
          success: false,
          error: 'World state extraction failed on both Gemini and Groq',
          details: groqErr.message
        });
      }
    }

    if (!worldState.map_center) {
      if (worldState.shelters && worldState.shelters.length > 0) {
        const avgLat = worldState.shelters.reduce((s, x) => s + x.lat, 0) / worldState.shelters.length;
        const avgLng = worldState.shelters.reduce((s, x) => s + x.lng, 0) / worldState.shelters.length;
        worldState.map_center = { lat: avgLat, lng: avgLng, zoom: 12 };
      } else {
        worldState.map_center = { lat: 20.5937, lng: 78.9629, zoom: 5 };
      }
    }

    emitPipelineStep(1, 'completed', {
      zones:        worldState.zones,
      blockedRoads: worldState.blocked_roads,
      shelters:     worldState.shelters,
      hospitals:    worldState.hospitals,
      responders:   worldState.responders,
      disaster:     worldState.disaster,
      mapCenter:    worldState.map_center
    });

    // ── STEP 3 — Build city graph ──────────────────────────
    emitLog('Building disaster graph from world state...', 'info');
    cityGraph.buildFromWorldState(worldState);
    emitLog(`✓ Graph built — ${Object.keys(cityGraph.nodes).length} nodes`, 'success');

    // ── STEP 4 — Agent generation ──────────────────────────
    emitLog('Agent generation started → Groq llama-3.3-70b-versatile (50 agents)', 'info');
    emitPipelineStep(2, 'processing', {});

    let rawAgents = null;

    try {
      rawAgents = await generateAgents(worldState, emitLog);
      emitLog(`✓ All ${rawAgents.length} agents generated by Claude`, 'success');
    } catch (claudeErr) {
      emitLog(`Claude unavailable (${claudeErr.message.includes('credit') ? 'no credits' : 'error'}) — using Groq`, 'warn');
      try {
        rawAgents = await generateAgentsViaGroq(worldState, emitLog);
      } catch (groqErr) {
        emitLog(`✗ Groq agent generation failed: ${groqErr.message}`, 'error');
        return res.status(500).json({
          success: false,
          error: 'Agent generation failed on both Claude and Groq',
          details: groqErr.message
        });
      }
    }

    // ── STEP 5 — Enrich agents ─────────────────────────────
    emitLog(`Enriching ${rawAgents.length} agents with simulation properties...`, 'info');
    const enrichedAgents = enrichAgents(rawAgents, worldState);
    emitLog(`✓ All ${enrichedAgents.length} agents enriched and positioned on map`, 'success');

    const distribution = {
      blue:  enrichedAgents.filter(a => a.group === 'blue').length,
      red:   enrichedAgents.filter(a => a.group === 'red').length,
      amber: enrichedAgents.filter(a => a.group === 'amber').length,
      green: enrichedAgents.filter(a => a.group === 'green').length
    };

    emitPipelineStep(2, 'completed', { agents: enrichedAgents, agentCount: enrichedAgents.length, distribution });
    emitPipelineStep(3, 'completed', {
      tickCount: 10, tickSpeed: 1500,
      startTime: '06:00 AM', endTime: '08:30 AM',
      disasterType: worldState.disaster.type,
      location: worldState.disaster.location,
      distribution
    });
    emitPipelineStep(4, 'pending', {});

    global.simState = { worldState, agents: enrichedAgents };

    const elapsed = Date.now() - startTime;
    emitLog(`✓ Simulation ready — ${enrichedAgents.length} agents, ${elapsed}ms total`, 'success');
    emitLog('Press Start Simulation to begin the 10-tick disaster simulation', 'info');

    return res.json({
      success: true,
      worldState,
      agents: enrichedAgents,
      mapCenter: worldState.map_center,
      graphNodes: cityGraph.getAllNodes(),
      graphEdges: cityGraph.getAllEdges(),
      processingTime: elapsed
    });

  } catch (err) {
    console.error('[UPLOAD] Unexpected error:', err);
    emitLog(`✗ Upload processing failed: ${err.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: 'Upload processing failed',
      details: err.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    simLoaded: !!global.simState,
    agentCount: global.simState?.agents?.length || 0
  });
});

module.exports = router;