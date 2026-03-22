const Anthropic = require('@anthropic-ai/sdk');
const { getAgentGenerationPrompt } = require('../prompts/agentGenerationPrompt');
const { getReportPrompt }  = require('../prompts/reportPrompt');
const { getVerdictPrompt } = require('../prompts/verdictPrompt');

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Strip markdown code fences
const stripCodeFences = (text) => {
  return text
    .replace(/```json\n?/gi, '')
    .replace(/```html\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
};

// ── Agent parsing + validation (unchanged) ───────────────────

const parseAgents = (text) => {
  const stripped = stripCodeFences(text);

  try {
    const parsed = JSON.parse(stripped);
    if (!Array.isArray(parsed)) throw new Error('Claude response is not a JSON array');
    if (parsed.length !== 50) console.warn(`[CLAUDE] Expected 50 agents, got ${parsed.length}`);
    return parsed;
  } catch (err) {
    const arrayMatch = stripped.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          console.log(`[CLAUDE] Extracted array with ${parsed.length} agents`);
          return parsed;
        }
      } catch (e) {
        throw new Error(`Array parse failed after extraction: ${e.message}`);
      }
    }
    throw new Error(`No valid JSON array found in Claude response: ${err.message}`);
  }
};

const validateAgent = (agent, index) => {
  const required = [
    'id', 'name', 'age', 'role', 'group', 'zone',
    'neighborhood', 'lat', 'lng', 'hasVehicle', 'hasPhone',
    'hasSmartphone', 'vulnerability', 'destination',
    'backstory', 'initialThought'
  ];

  const missing = required.filter(field => agent[field] === undefined || agent[field] === null);
  if (missing.length > 0) {
    console.warn(`[CLAUDE] Agent ${index + 1} missing fields: ${missing.join(', ')}`);
    missing.forEach(field => {
      if (['hasVehicle','hasPhone','hasSmartphone'].includes(field)) agent[field] = false;
      else if (field === 'vulnerability') agent[field] = 'medium';
      else if (field === 'lat')  agent[field] = 20.5937;
      else if (field === 'lng')  agent[field] = 78.9629;
      else if (field === 'id')   agent[field] = index + 1;
      else agent[field] = 'Unknown';
    });
  }

  if (!['blue','red','amber','green'].includes(agent.group)) {
    console.warn(`[CLAUDE] Agent ${agent.id} invalid group: ${agent.group} — defaulting to amber`);
    agent.group = 'amber';
  }
  if (!['low','medium','high','critical'].includes(agent.vulnerability)) {
    agent.vulnerability = 'medium';
  }
  return agent;
};

const validateDistribution = (agents) => {
  const groups = { blue: 0, red: 0, amber: 0, green: 0 };
  agents.forEach(a => { if (groups[a.group] !== undefined) groups[a.group]++; });
  console.log(`[CLAUDE] Distribution — blue:${groups.blue} red:${groups.red} amber:${groups.amber} green:${groups.green}`);
  return groups;
};

// ── Agent generation (fallback — Groq is primary) ────────────

const generateAgents = async (worldState, emitLog) => {
  console.log('[CLAUDE] Starting agent generation...');
  if (emitLog) emitLog('Agent generation started → Claude claude-sonnet-4-5', 'info');

  try {
    const prompt = getAgentGenerationPrompt(worldState);

    const response = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 8000,
      messages:   [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text;
    console.log(`[CLAUDE] Response received — ${responseText.length} characters`);

    let agents = parseAgents(responseText);
    agents = agents.map((agent, index) => {
      if (emitLog && index % 10 === 0) {
        emitLog(`→ Agent ${index + 1}/${agents.length}: ${agent.name || 'Unknown'} — ${agent.role || 'Unknown'} — ${agent.zone || 'Unknown'}`, 'info');
      }
      return validateAgent(agent, index);
    });

    if (emitLog && agents.length > 0) {
      const last = agents[agents.length - 1];
      emitLog(`→ Agent ${agents.length}/${agents.length}: ${last.name} — ${last.role} — ${last.zone}`, 'info');
      emitLog(`✓ All ${agents.length} agents generated successfully`, 'success');
    }

    validateDistribution(agents);
    return agents;

  } catch (err) {
    console.error('[CLAUDE] Agent generation failed:', err.message);
    if (emitLog) emitLog(`✗ Claude agent generation failed: ${err.message}`, 'error');
    throw err;
  }
};

// ── Report generation (PRIMARY for reports) ──────────────────
// Claude is used FIRST for reports — much better quality than Groq
// Only 2 API calls total (report + verdict) so rate limits are not an issue

const generateReport = async (simulationLog) => {
  console.log('[CLAUDE] Generating bottleneck report...');

  const prompt = getReportPrompt(simulationLog);

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 8000,
    system: `You are a senior official at the National Disaster Management Authority of India writing a formal post-simulation bottleneck analysis report.
Return ONLY raw HTML content starting with <div class="report-header">.
Do NOT include <html>, <head>, <body>, or <style> tags.
Do NOT include markdown, code fences, or explanatory text before or after the HTML.
Use ONLY the CSS classes specified in the prompt.
Every agent name you use must come from the simulation data provided.
Write in formal government report language throughout.`,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;
  const cleaned = stripCodeFences(responseText);

  if (!cleaned.includes('<div') && !cleaned.includes('<table')) {
    throw new Error(`Claude report response does not appear to be HTML. Starts with: ${cleaned.slice(0, 150)}`);
  }

  console.log(`[CLAUDE] Report generated — ${cleaned.length} characters`);
  return cleaned;
};

// ── Verdict generation (PRIMARY for verdict) ─────────────────

const generateVerdict = async (simulationLog, bottleneckReport) => {
  console.log('[CLAUDE] Generating final verdict...');

  const prompt = getVerdictPrompt(simulationLog, bottleneckReport);

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 8000,
    system: `You are a senior resource planning official at the National Disaster Management Authority of India writing a formal disaster readiness verdict.
Return ONLY raw HTML content starting with <hr>.
Do NOT include <html>, <head>, <body>, or <style> tags.
Do NOT include markdown, code fences, or explanatory text before or after the HTML.
Use ONLY the CSS classes specified in the prompt.
Every number must be derived from the simulation data. Every agent name must come from the simulation data.
Write in formal government report language throughout.`,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;
  const cleaned = stripCodeFences(responseText);

  if (!cleaned.includes('<hr') && !cleaned.includes('<div')) {
    throw new Error(`Claude verdict response does not appear to be HTML. Starts with: ${cleaned.slice(0, 150)}`);
  }

  console.log(`[CLAUDE] Verdict generated — ${cleaned.length} characters`);
  return cleaned;
};

module.exports = {
  generateAgents,
  generateReport,
  generateVerdict
};