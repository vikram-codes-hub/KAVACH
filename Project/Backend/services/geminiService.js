const { GoogleGenerativeAI } = require('@google/generative-ai');  
const { getWorldStatePrompt } = require('../prompts/worldStatePrompt');
const { getReportPrompt } = require('../prompts/reportPrompt');
const { getVerdictPrompt } = require('../prompts/verdictPrompt');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Strip markdown code fences if Gemini wraps JSON despite instructions
const stripCodeFences = (text) => {
  return text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
};

// Extract JSON from response text safely
const parseJSON = (text) => {
  const stripped = stripCodeFences(text);
  try {
    return JSON.parse(stripped);
  } catch (err) {
    // Try to find JSON object in the text
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error(`JSON parse failed after extraction attempt: ${e.message}`);
      }
    }
    throw new Error(`No valid JSON found in response: ${err.message}`);
  }
};

// Call 1 — Extract world state from PDF text
const extractWorldState = async (pdfText) => {
  console.log('[GEMINI] Starting world state extraction...');

  try {
    const prompt = getWorldStatePrompt(pdfText);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('[GEMINI] World state response received');

    const worldState = parseJSON(responseText);

    // Validate minimum required fields
    if (!worldState.zones || !worldState.disaster) {
      throw new Error('World state missing required fields: zones or disaster');
    }

    if (!worldState.zones.red || worldState.zones.red.length === 0) {
      throw new Error('World state has no red zones defined');
    }

    if (!worldState.map_center) {
      // Fallback: calculate map center from shelters
      if (worldState.shelters && worldState.shelters.length > 0) {
        const avgLat = worldState.shelters.reduce((sum, s) => sum + s.lat, 0) / worldState.shelters.length;
        const avgLng = worldState.shelters.reduce((sum, s) => sum + s.lng, 0) / worldState.shelters.length;
        worldState.map_center = { lat: avgLat, lng: avgLng, zoom: 12 };
      } else {
        // Default to India center if nothing else available
        worldState.map_center = { lat: 20.5937, lng: 78.9629, zoom: 5 };
      }
    }

    console.log(`[GEMINI] World state extracted — ${worldState.zones.red.length} red zones, ${worldState.zones.amber.length} amber zones, ${worldState.zones.safe.length} safe zones`);
    return worldState;

  } catch (err) {
    console.error('[GEMINI] World state extraction failed:', err.message);
    throw err;
  }
};

// Call 2 — Generate bottleneck report after simulation ends
const generateReport = async (simulationLog) => {
  console.log('[GEMINI] Starting bottleneck report generation...');

  try {
    const prompt = getReportPrompt(simulationLog);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Report is HTML — strip any accidental code fences
    const cleanedReport = responseText
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    console.log(`[GEMINI] Bottleneck report generated — ${cleanedReport.length} characters`);
    return cleanedReport;

  } catch (err) {
    console.error('[GEMINI] Report generation failed:', err.message);
    throw err;
  }
};

// Call 3 — Generate final verdict after report
const generateVerdict = async (simulationLog, bottleneckReport) => {
  console.log('[GEMINI] Starting final verdict generation...');

  try {
    const prompt = getVerdictPrompt(simulationLog, bottleneckReport);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Verdict is HTML — strip any accidental code fences
    const cleanedVerdict = responseText
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    console.log(`[GEMINI] Final verdict generated — ${cleanedVerdict.length} characters`);
    return cleanedVerdict;

  } catch (err) {
    console.error('[GEMINI] Verdict generation failed:', err.message);
    throw err;
  }
};

module.exports = {
  extractWorldState,
  generateReport,
  generateVerdict
};