const express = require('express');
const multer  = require('multer');
const Groq    = require('groq-sdk');
const router  = express.Router();

const { extractText }                              = require('../services/pdfParser');
const { extractWorldState }                        = require('../services/geminiService');
const { extractWorldState: groqExtractWorldState } = require('../services/groqService');
const { generateAgents }                           = require('../services/claudeService');
const { cityGraph }                                = require('../simulation/cityGraph');
const { getWorldStatePrompt }                      = require('../prompts/worldStatePrompt');
const { getDemographics, getAgentConstraints }     = require('../services/demographicData');

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'), false);
  }
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Build zone-center map from infrastructure coords ──────────
const buildZoneCenters = (worldState) => {
  const centerLat = worldState.map_center.lat;
  const centerLng = worldState.map_center.lng;

  const allZones = [
    ...worldState.zones.red.map((z, i)   => ({ name: z, i })),
    ...worldState.zones.amber.map((z, i) => ({ name: z, i: worldState.zones.red.length + i })),
    ...worldState.zones.safe.map((z, i)  => ({ name: z, i: worldState.zones.red.length + worldState.zones.amber.length + i }))
  ];

  const centers = {};
  allZones.forEach(({ name, i }) => {
    const lowerName = name.toLowerCase();
    const sources = [
      ...(worldState.shelters   || []),
      ...(worldState.hospitals  || []),
      ...(worldState.responders || [])
    ].filter(s => s.zone && s.lat && s.lng && (
      s.zone.toLowerCase().includes(lowerName) ||
      lowerName.includes(s.zone.toLowerCase())
    ));

    if (sources.length > 0) {
      centers[name] = {
        lat: sources.reduce((s, x) => s + x.lat, 0) / sources.length,
        lng: sources.reduce((s, x) => s + x.lng, 0) / sources.length
      };
    } else {
      const col = i % 3;
      const row = Math.floor(i / 3);
      centers[name] = {
        lat: centerLat + (row - 1) * 0.06,
        lng: centerLng + (col - 1) * 0.06
      };
    }
  });
  return centers;
};

// ── Always force agents onto their zone center ────────────────
const correctCoordinates = (agents, worldState) => {
  const zoneCenters = buildZoneCenters(worldState);
  const centerLat   = worldState.map_center.lat;
  const centerLng   = worldState.map_center.lng;
  const seen = new Set();

  return agents.map((agent) => {
    const zc = zoneCenters[agent.zone] || { lat: centerLat, lng: centerLng };
    let lat = zc.lat + (Math.random() - 0.5) * 0.018;
    let lng = zc.lng + (Math.random() - 0.5) * 0.018;

    let key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    while (seen.has(key)) {
      lat += (Math.random() - 0.5) * 0.003;
      lng += (Math.random() - 0.5) * 0.003;
      key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    }
    seen.add(key);
    return { ...agent, lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) };
  });
};

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
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    const firstArray = Object.values(parsed).find(v => Array.isArray(v));
    if (firstArray) return firstArray;
  } catch (_) {}

  const start = cleaned.indexOf('[');
  const end   = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }

  const objects = [];
  let depth = 0, objStart = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') { if (depth === 0) objStart = i; depth++; }
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { const obj = JSON.parse(cleaned.slice(objStart, i + 1)); if (obj.id !== undefined) objects.push(obj); } catch (_) {}
        objStart = -1;
      }
    }
  }
  if (objects.length > 0) return objects;
  throw new Error(`No JSON array found. Preview: ${cleaned.slice(0, 200)}`);
};

// ── Generate one batch with retry on 429 ─────────────────────
const generateBatch = async (worldState, group, count, startId, demographicHints) => {
  const zoneCenters = buildZoneCenters(worldState);

  const groupZones = {
    blue:  worldState.zones.safe,
    red:   worldState.zones.red,
    amber: worldState.zones.amber,
    green: [...worldState.zones.safe, ...worldState.zones.amber]
  }[group] || [];

  // Compact zone list with real coords
  const zoneList = [
    ...worldState.zones.red.map(z   => `${z}|red|${zoneCenters[z].lat.toFixed(4)}|${zoneCenters[z].lng.toFixed(4)}`),
    ...worldState.zones.amber.map(z => `${z}|amber|${zoneCenters[z].lat.toFixed(4)}|${zoneCenters[z].lng.toFixed(4)}`),
    ...worldState.zones.safe.map(z  => `${z}|safe|${zoneCenters[z].lat.toFixed(4)}|${zoneCenters[z].lng.toFixed(4)}`)
  ].join('\n');

  // Suggested coords per agent at correct zone center
  const suggestions = Array.from({ length: count }, (_, i) => {
    const zone = groupZones[i % Math.max(groupZones.length, 1)];
    const zc   = zone ? zoneCenters[zone] : Object.values(zoneCenters)[0];
    return `${startId+i}|${zone}|${(zc.lat+(Math.random()-0.5)*0.01).toFixed(4)}|${(zc.lng+(Math.random()-0.5)*0.01).toFixed(4)}`;
  }).join('\n');

  const groupDesc = {
    blue:  'responders: NDRF, police, hospital staff, shelter managers, ambulance drivers',
    red:   'vulnerable, CANNOT self-evacuate: elderly, pregnant, wheelchair, no phone, critical medical',
    amber: 'mobile civilians with obstacles: daily wage, shop owners, tourists, students, farmers',
    green: 'community volunteers: NGO workers, community organizers, local social workers'
  };

  const prompt = `Generate ${count} JSON agents. Group:"${group}". IDs:${startId}-${startId+count-1}.
Location:${worldState.disaster.location},${worldState.disaster.state}. Disaster:${worldState.disaster.type}.
Group description: ${groupDesc[group]}

Zones (name|type|lat|lng):
${zoneList}

Use these coords (id|zone|lat|lng), vary ±0.005 max:
${suggestions}

${demographicHints}

Fields: id,name,age,role,group("${group}"),zone,neighborhood,lat,lng,hasVehicle,hasPhone,hasSmartphone,vulnerability(low/medium/high/critical),destination,backstory,initialThought
${group==='red'?'vulnerability=high or critical only.':''}${group==='blue'?'hasPhone=true.':''}
Return ONLY JSON array [ ... ]. No other text.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Output only a raw JSON array starting with [ ending with ]. No markdown.' },
          { role: 'user',   content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3500
      });
      const agents = extractJsonArray(completion.choices[0].message.content);
      const fixed  = agents.slice(0, count).map((a, i) => ({ ...a, id: startId + i, group }));
      return correctCoordinates(fixed, worldState);
    } catch (err) {
      const is429 = err.message?.includes('429') || err.status === 429 || err.error?.type === 'tokens';
      if (is429 && attempt < 2) {
        const wait = 40000 + attempt * 15000;
        console.log(`[BATCH] Rate limited on ${group}, waiting ${wait/1000}s (attempt ${attempt+2}/3)...`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
};

// ── Generate all 50 agents via 4 Groq batches ────────────────
const generateAgentsViaGroq = async (worldState, emitLog) => {
  emitLog('Generating 50 census-grounded agents via Groq...', 'info');

  const demo = getDemographics(worldState.disaster.district, worldState.disaster.state);
  const c    = getAgentConstraints(demo, 50);
  emitLog(`✓ Loaded ${worldState.disaster.district||worldState.disaster.location} district demographics (${demo.pop_lakh}L pop, ${demo.elderly_pct}% elderly, ${demo.no_smartphone_pct}% no smartphone)`, 'info');

  const demographicHints = `District demographics (${worldState.disaster.district||worldState.disaster.location}):
Elderly ${demo.elderly_pct}% | Disabled ${demo.disabled_pct}% | No smartphone ${demo.no_smartphone_pct}% | BPL ${demo.bpl_pct}%
Occupations: ${c.primaryOccupations.join(', ')}
Vulnerable groups: ${c.vulnerableGroups.join(', ')}`;

  const batches = [
    { group: 'blue',  count: 13, startId: 1  },
    { group: 'red',   count: 12, startId: 14 },
    { group: 'amber', count: 13, startId: 26 },
    { group: 'green', count: 12, startId: 39 }
  ];

  const allAgents = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    emitLog(`Generating ${batch.group} group (${batch.count} agents)...`, 'info');

    // Wait between batches to avoid TPM rate limit (12k tokens/min on free tier)
    if (bi > 0) {
      emitLog(`Waiting 8s between batches to respect rate limits...`, 'info');
      await sleep(8000);
    }

    try {
      const agents = await generateBatch(worldState, batch.group, batch.count, batch.startId, demographicHints);
      allAgents.push(...agents);
      emitLog(`✓ ${batch.group} batch — ${agents.length} agents placed in zones`, 'success');
    } catch (err) {
      emitLog(`✗ ${batch.group} batch failed: ${err.message}`, 'error');
      throw new Error(`Batch failed for group ${batch.group}: ${err.message}`);
    }
  }

  emitLog(`✓ All ${allAgents.length} census-grounded agents generated`, 'success');
  return allAgents;
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

    emitLog(`Loading advisory — ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`, 'info');
    emitPipelineStep(1, 'processing', {});

    // STEP 1 — PDF extraction
    const pdfText = await extractText(req.file.buffer);
    if (!pdfText || pdfText.trim().length < 50) {
      emitLog('PDF text minimal — proceeding with available text', 'warn');
    } else {
      emitLog(`✓ PDF parsed — ${pdfText.length} chars`, 'success');
    }

    // STEP 2 — World state extraction
    emitLog('Extracting world state → Gemini', 'info');
    let worldState = null;

    try {
      worldState = await extractWorldState(pdfText);
      emitLog(`✓ World state: ${worldState.zones.red.length} red, ${worldState.zones.amber.length} amber, ${worldState.zones.safe.length} safe zones`, 'success');
    } catch (geminiErr) {
      emitLog(`Gemini failed — trying Groq backup`, 'warn');
      try {
        const prompt = getWorldStatePrompt(pdfText);
        worldState = await groqExtractWorldState(pdfText, prompt);
        emitLog('✓ World state via Groq backup', 'success');
      } catch (groqErr) {
        emitLog(`✗ World state extraction failed: ${groqErr.message}`, 'error');
        return res.status(500).json({ success: false, error: 'World state extraction failed', details: groqErr.message });
      }
    }

    if (!worldState.map_center) {
      if (worldState.shelters?.length > 0) {
        worldState.map_center = {
          lat: worldState.shelters.reduce((s, x) => s + x.lat, 0) / worldState.shelters.length,
          lng: worldState.shelters.reduce((s, x) => s + x.lng, 0) / worldState.shelters.length,
          zoom: 12
        };
      } else {
        worldState.map_center = { lat: 20.5937, lng: 78.9629, zoom: 5 };
      }
    }

    // Attach demographic data to worldState for use in reports
    const demo = getDemographics(worldState.disaster.district, worldState.disaster.state);
    worldState._demographics = demo;

    emitPipelineStep(1, 'completed', {
      zones: worldState.zones, blockedRoads: worldState.blocked_roads,
      shelters: worldState.shelters, hospitals: worldState.hospitals,
      responders: worldState.responders, disaster: worldState.disaster,
      mapCenter: worldState.map_center,
      demographics: { district: worldState.disaster.district, popLakh: demo.pop_lakh, elderlyPct: demo.elderly_pct }
    });

    // STEP 3 — City graph
    emitLog('Building city graph...', 'info');
    cityGraph.buildFromWorldState(worldState);
    emitLog(`✓ Graph: ${Object.keys(cityGraph.nodes).length} nodes`, 'success');

    // STEP 4 — Agent generation
    emitLog('Agent generation → census-grounded model', 'info');
    emitPipelineStep(2, 'processing', {});

    let rawAgents = null;

    try {
      rawAgents = await generateAgents(worldState, emitLog);
      // Claude agents also need zone-center correction
      rawAgents = correctCoordinates(rawAgents, worldState);
      emitLog(`✓ ${rawAgents.length} agents generated by Claude`, 'success');
    } catch (claudeErr) {
      emitLog(`Claude unavailable — using Groq`, 'warn');
      try {
        rawAgents = await generateAgentsViaGroq(worldState, emitLog);
      } catch (groqErr) {
        emitLog(`✗ Agent generation failed: ${groqErr.message}`, 'error');
        return res.status(500).json({ success: false, error: 'Agent generation failed', details: groqErr.message });
      }
    }

    // STEP 5 — Enrich
    emitLog(`Enriching ${rawAgents.length} agents...`, 'info');
    const enrichedAgents = enrichAgents(rawAgents, worldState);
    emitLog(`✓ ${enrichedAgents.length} agents ready`, 'success');

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
      distribution,
      demographicNote: `Census-grounded: ${demo.pop_lakh}L district pop | ${demo.elderly_pct}% elderly | ${demo.no_smartphone_pct}% no smartphone`
    });
    emitPipelineStep(4, 'pending', {});

    global.simState = { worldState, agents: enrichedAgents };

    const elapsed = Date.now() - startTime;
    emitLog(`✓ Simulation ready — ${enrichedAgents.length} agents, ${elapsed}ms`, 'success');
    emitLog(`District data: ${demo.pop_lakh}L population | ${demo.elderly_pct}% elderly | ${demo.no_smartphone_pct}% no smartphone`, 'info');
    emitLog('Press Start Simulation to begin', 'info');

    return res.json({
      success: true,
      worldState,
      agents: enrichedAgents,
      mapCenter: worldState.map_center,
      graphNodes: cityGraph.getAllNodes(),
      graphEdges: cityGraph.getAllEdges(),
      processingTime: elapsed,
      demographics: demo
    });

  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    emitLog(`✗ Upload failed: ${err.message}`, 'error');
    return res.status(500).json({ success: false, error: 'Upload failed', details: err.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', simLoaded: !!global.simState, agentCount: global.simState?.agents?.length || 0 });
});

module.exports = router;