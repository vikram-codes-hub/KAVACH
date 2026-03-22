const getAgentGenerationPrompt = (worldState) => {
  return `You are generating disaster simulation agents for CrisisSwarm, a multi-agent disaster response simulation platform.
The simulation is set in ${worldState.disaster.location}, ${worldState.disaster.state}, India during a ${worldState.disaster.type} disaster.
Based on the world state below, generate exactly 50 realistic citizen agents who would live and work in the affected zones.
Return ONLY a valid JSON array with no explanation, no markdown, no code blocks, no preamble.
The JSON must be parseable directly.

DISTRIBUTION RULES — MANDATORY — DO NOT DEVIATE:
- Exactly 13 agents must have group value "blue" — responders or infrastructure operators
- Exactly 12 agents must have group value "red" — vulnerable people in red zones who CANNOT self-evacuate
- Exactly 13 agents must have group value "amber" — mobile citizens who CAN potentially move but face real obstacles
- Exactly 12 agents must have group value "green" — community volunteers who self-deploy to help others

UNIQUENESS RULES — MANDATORY:
Each agent must represent a DIFFERENT TYPE of person. Do not generate two similar agents.
The 100 agents together must cover a WIDE demographic range. Distribute across agents:
- Multiple pregnant women or new mothers (different stages, different zones)
- Multiple elderly people living alone (60–85 years, different mobility levels)
- Multiple people with no smartphone (feature phone only or no phone at all)
- Multiple people with mobility disabilities or wheelchair users
- Multiple daily wage workers and migrant laborers
- Multiple shop owners and small business owners
- Multiple school teachers and college professors
- Multiple tourists and pilgrims visiting the area
- Multiple local NGO volunteers and community organizers
- Multiple government officials and administrators at different levels
- Multiple auto drivers, truck drivers, and transport operators
- Multiple young college and school students
- Multiple farmers and rural workers
- Multiple hospital doctors, nurses, ASHA workers, ANMs
- Multiple retired persons doing community work
- Multiple street vendors and hawkers
- Multiple construction workers at remote sites
- Multiple hotel and dhaba owners
- Multiple journalists and local reporters
- Multiple children (under 15) with or without guardians

DIAGNOSTIC DESIGN — MANDATORY:
Across the 25 red group agents, each must reveal a DIFFERENT SYSTEMIC FAILURE when they get into trouble. Spread these failures:
- 5 red agents reveal single ambulance route failure (pregnant women or critical medical cases in different zones)
- 5 red agents reveal digital-only alert failure (no smartphone, receives zero warning, different occupations)
- 4 red agents reveal zero accessibility vehicles (wheelchair users or mobility impaired in different neighborhoods)
- 5 red agents reveal shelter overflow (group leaders with dependents arriving after capacity fills)
- 3 red agents reveal low alert compliance (delayed evacuation converting mobile person to trapped)
- 3 red agents reveal communication blackout (no phone, no radio, no neighbor contact)

LOCATION CONTEXT — CRITICAL:
The disaster is in ${worldState.disaster.location}, ${worldState.disaster.state}.
Generate agents who are REALISTIC for this specific location:
- Use names, occupations, and neighborhoods appropriate for ${worldState.disaster.state}
- Reference real localities, markets, hospitals, schools, mandis, ghats, and landmarks from ${worldState.disaster.location}
- Socioeconomic mix must reflect the actual demographics of ${worldState.disaster.location} — include rural and urban agents
- Use the exact zone names from the world state zones list

Red zones in this scenario: ${worldState.zones.red.join(', ')}
Amber zones in this scenario: ${worldState.zones.amber.join(', ')}
Safe zones in this scenario: ${worldState.zones.safe.join(', ')}

COORDINATE RULES — CRITICAL:
- Assign REAL latitude and longitude coordinates within the actual geographic boundaries of each zone
- The location is ${worldState.disaster.location} — use real coordinates for this city/district
- Map center for this scenario is lat ${worldState.map_center.lat}, lng ${worldState.map_center.lng}
- Place agents within 0.08 degrees of the map center, distributed across their zones
- Red zone agents must be placed within red zone geographic boundaries
- Safe zone agents (responders) must be placed in safe zone areas
- Do NOT use identical coordinates for two agents — vary by at least 0.002 degrees
- Do NOT place any agent outside India
- Spread agents realistically — not all clustered at one point

RETURN FORMAT — each agent must have ALL these exact fields:
{
  "id": number (1 to 100),
  "name": "realistic full name appropriate for ${worldState.disaster.state}",
  "age": number,
  "role": "specific occupation grounded in ${worldState.disaster.location} economy",
  "group": "blue" | "red" | "amber" | "green",
  "zone": "exact zone name copied from world state zones list",
  "neighborhood": "specific locality within that zone with real place name from ${worldState.disaster.location}",
  "lat": number (real coordinate near ${worldState.map_center.lat}),
  "lng": number (real coordinate near ${worldState.map_center.lng}),
  "hasVehicle": boolean,
  "hasPhone": boolean,
  "hasSmartphone": boolean,
  "vulnerability": "low" | "medium" | "high" | "critical",
  "destination": "specific place they need to reach during the disaster",
  "backstory": "one sentence explaining their specific situation and why they are vulnerable or important in this scenario",
  "initialThought": "what they are thinking at tick zero when the disaster begins — first person, specific, emotionally real, references their actual location"
}

VALIDATION BEFORE RETURNING:
- Count blue agents — must be exactly 13
- Count red agents — must be exactly 12
- Count amber agents — must be exactly 13
- Count green agents — must be exactly 12
- Every agent has a unique id from 1 to 50
- No two agents have identical lat/lng
- Every red group agent has vulnerability "high" or "critical"
- Every blue group agent has hasPhone true
- At least 8 agents have hasSmartphone false
- At least 5 agents have hasVehicle false AND hasSmartphone false
- Age range spans from 8 to 82 across all agents

World state:
${JSON.stringify(worldState, null, 2)}`;
};

module.exports = { getAgentGenerationPrompt };