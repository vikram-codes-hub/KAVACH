const { getDemographics, getAgentConstraints } = require('../services/demographicData');

const getAgentGenerationPrompt = (worldState) => {
  const demo = getDemographics(worldState.disaster.district, worldState.disaster.state);
  const c    = getAgentConstraints(demo, 50);

  const redZones   = worldState.zones.red.join(', ');
  const amberZones = worldState.zones.amber.join(', ');
  const safeZones  = worldState.zones.safe.join(', ');

  return `Generate 50 disaster simulation agents for ${worldState.disaster.location}, ${worldState.disaster.state} — ${worldState.disaster.type}.
Return ONLY a valid JSON array. No markdown, no explanation.

GROUPS (exact counts):
- "blue": 13 — responders (NDRF, police, hospital staff, shelter managers, ambulance drivers)
- "red": 12 — vulnerable, CANNOT self-evacuate (in red zones: ${redZones})
- "amber": 13 — mobile civilians facing obstacles (in amber zones: ${amberZones})
- "green": 12 — community volunteers (in safe/amber zones: ${safeZones}, ${amberZones})

CENSUS-BASED CONSTRAINTS (${worldState.disaster.district || worldState.disaster.location} district data):
Population: ${c.popLakh} lakh | Rural: ${c.ruralPct}% | Literacy: ${c.literacyPct}%
Across all 50 agents, include EXACTLY:
- ${c.elderlyCount} elderly agents (60+ years, living alone or with limited mobility)
- ${c.disabledCount} agents with physical disability or wheelchair dependency
- ${c.pregnantCount} pregnant women (8th/9th month, cannot self-evacuate)
- ${c.noPhoneCount} agents with hasSmartphone=false (feature phone or no phone)
- ${c.noVehicleCount} agents with hasVehicle=false
- ${c.bplCount} BPL/daily wage workers
- ${c.migrantCount} migrant labourers
- ${c.touristCount} tourists/pilgrims unfamiliar with area
Primary occupations in this district: ${c.primaryOccupations.join(', ')}
Key vulnerable groups: ${c.vulnerableGroups.join(', ')}

SYSTEMIC FAILURES (spread across red group agents):
- 3 agents: no smartphone → received zero alert
- 2 agents: pregnant/critical medical → single ambulance route failure
- 2 agents: wheelchair/mobility impaired → zero accessible vehicle
- 2 agents: shelter overflow → arrived after capacity filled
- 2 agents: route blocked → trapped despite wanting to evacuate
- 1 agent: communication blackout (no phone, no radio, no neighbour)

ZONES: red=${redZones} | amber=${amberZones} | safe=${safeZones}

FIELDS per agent (all required):
id(1-50), name(local to ${worldState.disaster.state}), age, role, group, zone(exact name above),
neighborhood, lat, lng, hasVehicle, hasPhone, hasSmartphone,
vulnerability(low/medium/high/critical), destination, backstory(1 sentence), initialThought(1st person)

RULES:
- red agents: vulnerability must be "high" or "critical"
- blue agents: hasPhone=true
- age range 8-82 across all agents
- no two identical lat/lng
- map center: ${worldState.map_center.lat}, ${worldState.map_center.lng}

World state (zones/shelters/hospitals for reference):
${JSON.stringify({ zones: worldState.zones, shelters: worldState.shelters, hospitals: worldState.hospitals, responders: worldState.responders }, null, 1)}`;
};

module.exports = { getAgentGenerationPrompt };