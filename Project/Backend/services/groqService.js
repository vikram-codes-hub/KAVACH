const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FAST_MODEL   = 'llama-3.1-8b-instant';
const REPORT_MODEL = 'llama-3.3-70b-versatile';

// Known Indian city coordinates — used to correct hallucinated map centers
const INDIA_CITY_COORDS = {
  // Uttarakhand
  'dehradun':     { lat: 30.3165, lng: 78.0322 },
  'haridwar':     { lat: 29.9457, lng: 78.1642 },
  'rishikesh':    { lat: 30.0869, lng: 78.2676 },
  'chamoli':      { lat: 30.4167, lng: 79.3167 },
  'gopeshwar':    { lat: 30.4167, lng: 79.3167 },
  'rudraprayag':  { lat: 30.2847, lng: 78.9800 },
  'uttarkashi':   { lat: 30.7268, lng: 78.4354 },
  'tehri':        { lat: 30.3782, lng: 78.4803 },
  'srinagar':     { lat: 30.2236, lng: 78.7782 },
  'joshimath':    { lat: 30.5579, lng: 79.5642 },
  'nainital':     { lat: 29.3803, lng: 79.4636 },
  'almora':       { lat: 29.5971, lng: 79.6591 },
  'pithoragarh':  { lat: 29.5826, lng: 80.2181 },
  'pauri':        { lat: 30.1468, lng: 78.7795 },
  // Rajasthan
  'jaipur':       { lat: 26.9124, lng: 75.7873 },
  'jodhpur':      { lat: 26.2389, lng: 73.0243 },
  'udaipur':      { lat: 24.5854, lng: 73.7125 },
  'kota':         { lat: 25.2138, lng: 75.8648 },
  'ajmer':        { lat: 26.4499, lng: 74.6399 },
  // Maharashtra
  'mumbai':       { lat: 19.0760, lng: 72.8777 },
  'pune':         { lat: 18.5204, lng: 73.8567 },
  'nagpur':       { lat: 21.1458, lng: 79.0882 },
  // Kerala
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'kochi':        { lat: 9.9312, lng: 76.2673 },
  'kozhikode':    { lat: 11.2588, lng: 75.7804 },
  'thrissur':     { lat: 10.5276, lng: 76.2144 },
  'idukki':       { lat: 9.9189, lng: 77.1025 },
  'wayanad':      { lat: 11.6854, lng: 76.1320 },
  // Gujarat
  'ahmedabad':    { lat: 23.0225, lng: 72.5714 },
  'surat':        { lat: 21.1702, lng: 72.8311 },
  'vadodara':     { lat: 22.3072, lng: 73.1812 },
  // Bihar
  'patna':        { lat: 25.5941, lng: 85.1376 },
  'gaya':         { lat: 24.7955, lng: 85.0002 },
  // Odisha
  'bhubaneswar':  { lat: 20.2961, lng: 85.8245 },
  'puri':         { lat: 19.8135, lng: 85.8312 },
  // West Bengal
  'kolkata':      { lat: 22.5726, lng: 88.3639 },
  'siliguri':     { lat: 26.7271, lng: 88.3953 },
  // Assam
  'guwahati':     { lat: 26.1445, lng: 91.7362 },
  // Himachal Pradesh
  'shimla':       { lat: 31.1048, lng: 77.1734 },
  'manali':       { lat: 32.2396, lng: 77.1887 },
  'dharamshala':  { lat: 32.2190, lng: 76.3234 },
  // Jammu & Kashmir
  'srinagar jk':  { lat: 34.0837, lng: 74.7973 },
  'jammu':        { lat: 32.7266, lng: 74.8570 },
  // Andhra Pradesh / Telangana
  'hyderabad':    { lat: 17.3850, lng: 78.4867 },
  'visakhapatnam':{ lat: 17.6868, lng: 83.2185 },
  // Tamil Nadu
  'chennai':      { lat: 13.0827, lng: 80.2707 },
  'madurai':      { lat: 9.9252, lng: 78.1198 },
  // Karnataka
  'bengaluru':    { lat: 12.9716, lng: 77.5946 },
  'mysuru':       { lat: 12.2958, lng: 76.6394 },
  // Madhya Pradesh
  'bhopal':       { lat: 23.2599, lng: 77.4126 },
  'indore':       { lat: 22.7196, lng: 75.8577 },
  // Uttar Pradesh
  'lucknow':      { lat: 26.8467, lng: 80.9462 },
  'varanasi':     { lat: 25.3176, lng: 82.9739 },
  'agra':         { lat: 27.1767, lng: 78.0081 },
  // Punjab / Haryana
  'chandigarh':   { lat: 30.7333, lng: 76.7794 },
  'amritsar':     { lat: 31.6340, lng: 74.8723 },
};

// Fix hallucinated map_center by matching location name to known coords
const fixMapCenter = (worldState) => {
  if (!worldState.map_center) return worldState;

  const lat = worldState.map_center.lat;
  const lng = worldState.map_center.lng;

  // If coordinates are clearly outside India bounds → fix
  const outsideIndia = lat < 6 || lat > 37 || lng < 68 || lng > 98;

  if (!outsideIndia) return worldState; // coords look fine

  console.log(`[GROQ] map_center (${lat}, ${lng}) is outside India — fixing from location name`);

  const locationStr = [
    worldState.disaster?.location || '',
    worldState.disaster?.district || '',
    worldState.disaster?.state || ''
  ].join(' ').toLowerCase();

  // Try to match known city
  for (const [city, coords] of Object.entries(INDIA_CITY_COORDS)) {
    if (locationStr.includes(city)) {
      console.log(`[GROQ] Fixed map_center to ${city}: lat=${coords.lat}, lng=${coords.lng}`);
      worldState.map_center = { ...coords, zoom: 12 };
      return worldState;
    }
  }

  // Fallback — use shelter coordinates if available
  if (worldState.shelters && worldState.shelters.length > 0) {
    const s = worldState.shelters[0];
    if (s.lat >= 6 && s.lat <= 37 && s.lng >= 68 && s.lng <= 98) {
      console.log(`[GROQ] Fixed map_center from shelter: lat=${s.lat}, lng=${s.lng}`);
      worldState.map_center = { lat: s.lat, lng: s.lng, zoom: 12 };
      return worldState;
    }
  }

  // Last resort — center of India
  console.warn('[GROQ] Could not determine location — defaulting to India center');
  worldState.map_center = { lat: 20.5937, lng: 78.9629, zoom: 5 };
  return worldState;
};

const stripCodeFences = (text) => {
  return text
    .replace(/```json\n?/gi, '')
    .replace(/```html\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
};

const extractWorldState = async (pdfText, prompt) => {
  console.log('[GROQ] Attempting world state extraction as Gemini backup...');

  try {
    const completion = await groq.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a disaster data extractor for Indian emergency management systems. Return only valid JSON. No explanation, no markdown, no code blocks. All coordinates must be real Indian coordinates for the location mentioned in the text.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    const stripped = stripCodeFences(responseText);

    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Groq world state parse failed: ${err.message}`);
      }
    }

    // Fix hallucinated coordinates
    parsed = fixMapCenter(parsed);

    // Also fix shelter/hospital/responder coordinates
    if (parsed.shelters) {
      parsed.shelters = parsed.shelters.map(s => {
        if (s.lat < 6 || s.lat > 37 || s.lng < 68 || s.lng > 98) {
          s.lat = parsed.map_center.lat + (Math.random() - 0.5) * 0.04;
          s.lng = parsed.map_center.lng + (Math.random() - 0.5) * 0.04;
        }
        return s;
      });
    }
    if (parsed.hospitals) {
      parsed.hospitals = parsed.hospitals.map(h => {
        if (h.lat < 6 || h.lat > 37 || h.lng < 68 || h.lng > 98) {
          h.lat = parsed.map_center.lat + (Math.random() - 0.5) * 0.04;
          h.lng = parsed.map_center.lng + (Math.random() - 0.5) * 0.04;
        }
        return h;
      });
    }
    if (parsed.responders) {
      parsed.responders = parsed.responders.map(r => {
        if (r.lat < 6 || r.lat > 37 || r.lng < 68 || r.lng > 98) {
          r.lat = parsed.map_center.lat + (Math.random() - 0.5) * 0.04;
          r.lng = parsed.map_center.lng + (Math.random() - 0.5) * 0.04;
        }
        return r;
      });
    }

    console.log(`[GROQ] World state extraction successful — center: ${parsed.map_center.lat}, ${parsed.map_center.lng}`);
    return parsed;

  } catch (err) {
    console.error('[GROQ] World state extraction failed:', err.message);
    throw err;
  }
};

const generateReport = async (prompt) => {
  console.log('[GROQ] Generating bottleneck report via llama-3.3-70b-versatile...');
  try {
    const completion = await groq.chat.completions.create({
      model: REPORT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a senior NDMA official writing a formal disaster response report.
Return ONLY raw HTML content starting with <div class="report-header">.
Do NOT include <html>, <head>, <body>, or <style> tags.
Do NOT include markdown, code fences, or any text before the first HTML tag.
Use ONLY the CSS classes specified in the prompt.
Your entire response must be valid HTML that can be injected directly into a webpage.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    });

    const cleaned = stripCodeFences(completion.choices[0].message.content);
    if (!cleaned.includes('<div') && !cleaned.includes('<table')) {
      throw new Error(`Response does not appear to be HTML: ${cleaned.slice(0, 100)}`);
    }
    console.log(`[GROQ] Report generated — ${cleaned.length} chars`);
    return cleaned;
  } catch (err) {
    console.error('[GROQ] Report generation failed:', err.message);
    throw err;
  }
};

const generateVerdict = async (prompt) => {
  console.log('[GROQ] Generating final verdict via llama-3.3-70b-versatile...');
  try {
    const completion = await groq.chat.completions.create({
      model: REPORT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a senior NDMA resource planning official writing a formal disaster readiness verdict.
Return ONLY raw HTML content starting with <hr>.
Do NOT include <html>, <head>, <body>, or <style> tags.
Do NOT include markdown, code fences, or any text before the first HTML tag.
Use ONLY the CSS classes specified in the prompt.
Your entire response must be valid HTML that can be injected directly into a webpage.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    });

    const cleaned = stripCodeFences(completion.choices[0].message.content);
    if (!cleaned.includes('<hr') && !cleaned.includes('<div')) {
      throw new Error(`Response does not appear to be HTML: ${cleaned.slice(0, 100)}`);
    }
    console.log(`[GROQ] Verdict generated — ${cleaned.length} chars`);
    return cleaned;
  } catch (err) {
    console.error('[GROQ] Verdict generation failed:', err.message);
    throw err;
  }
};

const generateFallbackReport = (simulationLog) => {
  console.log('[GROQ] Generating fallback report from raw simulation data...');
  const { agents, worldState } = simulationLog;
  const trapped      = agents.filter(a => a.status === 'trapped');
  const safe         = agents.filter(a => a.status === 'safe');
  const survivalRate = Math.round((safe.length / agents.length) * 100);
  const stateAbbr    = (worldState.disaster.state || 'IN').split(' ').map(w => w[0]).join('').toUpperCase();
  const disasterAbbr = (worldState.disaster.type || 'DIS').split(' ').map(w => w[0]).join('').toUpperCase();

  const failureBlocks = trapped.map((a, i) => `
    <div class="failure-block">
      <div class="failure-num">Critical Failure ${String(i+1).padStart(2,'0')} — Life-Safety Impact: ${a.vulnerability === 'critical' ? 'Extreme' : 'High'}</div>
      <div class="failure-title">Agent Unrescued — ${a.role}</div>
      <div class="failure-body">
        <span class="agent-tag">AGENT ${a.id}</span>
        <span class="failure-agent">${a.name}, ${a.age}, ${a.role}, ${a.zone}</span><br><br>
        ${a.name} located in ${a.neighborhood}, ${a.zone}. Status at Tick 10: TRAPPED.
        ${a.currentThought || ''}<br><br>
        <strong>Root Cause:</strong> Zone risk: ${a.zoneRisk}. Route blocked: ${a.routeBlocked}.
      </div>
      <div class="failure-pop">Represents vulnerable population in ${a.zone}.</div>
    </div>`).join('');

  return `
<div class="report-header">
  <div class="gov-line">National Disaster Management Authority — Government of India</div>
  <div class="gov-line" style="margin-top:2px">${worldState.disaster.state} SDMA — District Emergency Operations Centre</div>
  <div class="report-title">POST-SIMULATION BOTTLENECK ANALYSIS REPORT</div>
  <div class="report-sub">CrisisSwarm — ${worldState.disaster.location} ${worldState.disaster.type} Scenario</div>
</div>
<div class="alert-strip">
  <p>SIMULATION CLASSIFICATION: ${trapped.length >= 3 ? 'CRITICAL' : 'HIGH'} — ${trapped.length} OF ${agents.length} AGENTS UNRESCUED</p>
</div>
<table class="meta-table">
  <tr><td>Report Reference</td><td>CRISISSWARM/${stateAbbr}/${disasterAbbr}/2024/SIM-001</td></tr>
  <tr><td>Simulation Scenario</td><td>${worldState.disaster.location} ${worldState.disaster.type}</td></tr>
  <tr><td>Total Agents</td><td>${agents.length}</td></tr>
  <tr><td>Simulation Engine</td><td>CrisisSwarm v1.0 — BFS propagation model</td></tr>
</table>
<div class="section-title">1. Executive Summary</div>
<p class="body-text">Of ${agents.length} agents, ${safe.length} reached safety and ${trapped.length} remained unrescued. Survival rate: ${survivalRate}%.</p>
<div class="summary-grid">
  <div class="summary-box s-safe"><div class="snum">${safe.length}</div><div class="slbl">Safe</div></div>
  <div class="summary-box s-trapped"><div class="snum">${trapped.length}</div><div class="slbl">Trapped</div></div>
  <div class="summary-box s-partial"><div class="snum">${agents.filter(a=>['blocked','unaware'].includes(a.status)).length}</div><div class="slbl">Partial</div></div>
  <div class="summary-box s-total"><div class="snum">${survivalRate}%</div><div class="slbl">Survival Rate</div></div>
</div>
<hr>
<div class="section-title">2. Critical Failure Analysis</div>
${failureBlocks}
<div class="footer">
  <span>CRISISSWARM/${stateAbbr}/${disasterAbbr}/2024/SIM-001</span>
  <span>Tick 10 — 8:30 AM</span>
  <span>CrisisSwarm v1.0 — Hackerz Street 4.0</span>
</div>`;
};

module.exports = { extractWorldState, generateReport, generateVerdict, generateFallbackReport };