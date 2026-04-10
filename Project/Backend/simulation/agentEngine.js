const { disasterEngine } = require('./disasterEngine');
const { cityGraph } = require('./cityGraph');

// Calculate movement toward destination each tick
const interpolatePosition = (agent, fraction) => {
  if (!agent.destinationLat || !agent.destinationLng) return;
  agent.lat = agent.lat + (agent.destinationLat - agent.lat) * fraction;
  agent.lng = agent.lng + (agent.destinationLng - agent.lng) * fraction;
};

// Get destination coordinates from world state
const getDestinationCoords = (agent, worldState) => {
  // Try to find shelter matching agent destination
  if (worldState.shelters && worldState.shelters.length > 0) {
    const matchingShelter = worldState.shelters.find(s =>
      s.name.toLowerCase().includes(agent.destination.toLowerCase()) ||
      agent.destination.toLowerCase().includes(s.name.toLowerCase()) ||
      s.zone.toLowerCase().includes(agent.zone.toLowerCase())
    );
    if (matchingShelter) {
      return { lat: matchingShelter.lat, lng: matchingShelter.lng };
    }
    // Fallback to nearest shelter
    const nearest = cityGraph.getNearestShelter(agent.lat, agent.lng);
    if (nearest) return { lat: nearest.lat, lng: nearest.lng };
  }

  // Fallback to safe zone centroid
  const safeNodes = Object.values(cityGraph.nodes).filter(n =>
    worldState.zones.safe.some(z =>
      n.zone && n.zone.toLowerCase().includes(z.toLowerCase())
    )
  );
  if (safeNodes.length > 0) {
    return { lat: safeNodes[0].lat, lng: safeNodes[0].lng };
  }

  return null;
};

// Main agent decision function — called every tick for every agent
const processAgentTick = (agent, currentTick, worldState, shelterOccupancy) => {
  // Clone agent to avoid mutation issues
  const updated = { ...agent };

  // Set destination coords if not set yet
  if (!updated.destinationLat || !updated.destinationLng) {
    const coords = getDestinationCoords(updated, worldState);
    if (coords) {
      updated.destinationLat = coords.lat;
      updated.destinationLng = coords.lng;
    }
  }

  // Check route blocked status
  const routeBlocked = disasterEngine.isRouteBlocked(
    updated.lat, updated.lng,
    updated.destinationLat || updated.lat,
    updated.destinationLng || updated.lng
  );
  updated.routeBlocked = routeBlocked;

  // Check if disaster has reached agent zone
  const zoneAffected = disasterEngine.isZoneAffected(updated.zone);

  // Determine agent's zone classification
  const inRedZone   = worldState.zones.red.some(z => updated.zone?.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(updated.zone?.toLowerCase()));
  const inAmberZone = worldState.zones.amber.some(z => updated.zone?.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(updated.zone?.toLowerCase()));
  const inSafeZone  = !inRedZone && !inAmberZone;

  // ── DECISION CHAIN ──────────────────────────────────────────

  // 1. Already safe — do not change
  if (updated.status === 'safe') {
    updated.currentThought = inSafeZone
      ? `I am at ${updated.destination}. Monitoring the situation and helping coordinate arrivals.`
      : `I am safe at ${updated.destination}. Hoping others make it too.`;
    return updated;
  }

  // 2. Already confirmed trapped at critical state — keep trapped
  if (updated.status === 'trapped' && updated.vulnerability === 'critical' && currentTick >= 8) {
    updated.currentThought = _getCriticalTrappedThought(updated, currentTick);
    return updated;
  }

  // 3. Blue group — responders managing infrastructure
  if (updated.group === 'blue') {
    return _processResponder(updated, currentTick, worldState, shelterOccupancy);
  }

  // 4. Green group — volunteers (zone-aware)
  if (updated.group === 'green') {
    return _processVolunteer(updated, currentTick, worldState, zoneAffected, inRedZone, inAmberZone, inSafeZone);
  }

  // 5. Safe zone civilians — low urgency, orderly behaviour
  if (inSafeZone) {
    return _processSafeZoneAgent(updated, currentTick, worldState);
  }

  // 6. Amber zone civilians — cautious, preparing to move
  if (inAmberZone) {
    return _processAmberZoneAgent(updated, currentTick, worldState, routeBlocked, zoneAffected);
  }

  // 7. Red zone — full urgency decision chain below
  // Agent has not received alert and disaster has not reached them yet
  if (!updated.receivedAlert && currentTick < 4 && !zoneAffected) {
    updated.status = 'unaware';
    updated.currentThought = _getUnawareThought(updated, currentTick);
    return updated;
  }

  // 6. Disaster has not reached agent's tick threshold yet
  if (currentTick < updated.floodReachesAt && !zoneAffected) {
    updated.status = 'moving';
    interpolatePosition(updated, 0.15);
    updated.currentThought = _getMovingThought(updated, currentTick, worldState);
    return updated;
  }

  // 7. Critical vulnerability — cannot self evacuate — generate rescue request
  if (updated.vulnerability === 'critical') {
    updated.status = 'trapped';
    updated.needsRescue = true;
    updated.rescueType = _getRescueType(updated);
    updated.currentThought = _getCriticalTrappedThought(updated, currentTick);
    return updated;
  }

  // 8. Has vehicle and route is not blocked — can move
  if (updated.hasVehicle && !routeBlocked) {
    updated.status = 'moving';
    interpolatePosition(updated, 0.25); // vehicles move faster
    updated.currentThought = _getDrivingThought(updated, currentTick);

    // Check if reached destination
    if (_hasReachedDestination(updated)) {
      updated.status = 'safe';
      updated.currentThought = `I have reached ${updated.destination}. I am safe.`;
    }
    return updated;
  }

  // 9. No vehicle but route is open and vulnerability is low/medium — walk
  if (!updated.hasVehicle && !routeBlocked && updated.vulnerability !== 'high') {
    updated.status = 'moving';
    interpolatePosition(updated, 0.08); // walking is slower
    updated.currentThought = _getWalkingThought(updated, currentTick);

    if (_hasReachedDestination(updated)) {
      updated.status = 'safe';
      updated.currentThought = `Reached ${updated.destination} on foot. Exhausted but safe.`;
    }
    return updated;
  }

  // 10. Route is blocked — check if alternate exists
  if (routeBlocked) {
    // High vulnerability with blocked route — trapped
    if (updated.vulnerability === 'high' || updated.vulnerability === 'critical') {
      updated.status = 'trapped';
      updated.needsRescue = true;
      updated.rescueType = _getRescueType(updated);
      updated.currentThought = _getBlockedTrappedThought(updated, currentTick, worldState);
      return updated;
    }

    // Medium/low vulnerability with blocked route — try to find alternate
    if (currentTick >= 6) {
      updated.status = 'trapped';
      updated.needsRescue = true;
      updated.rescueType = 'route_information';
      updated.currentThought = `Every road I know is blocked. I have been trying to leave ${updated.neighborhood} for hours. Someone please send help.`;
      return updated;
    }

    // Early ticks — still waiting for route to clear
    updated.status = 'blocked';
    updated.currentThought = _getWaitingThought(updated, currentTick, worldState);
    return updated;
  }

  // 11. Disaster zone reached agent but they have no vulnerability issues
  if (zoneAffected && currentTick >= updated.floodReachesAt) {
    if (updated.hasVehicle) {
      updated.status = 'moving';
      interpolatePosition(updated, 0.2);
      updated.currentThought = `The ${worldState.disaster.type.toLowerCase()} has reached my area. Driving out now as fast as I can.`;
    } else {
      updated.status = 'moving';
      interpolatePosition(updated, 0.06);
      updated.currentThought = `Water is rising in ${updated.neighborhood}. Walking toward ${updated.destination}. Please let the road be clear.`;
    }
    return updated;
  }

  // 12. Fallback — keep moving
  updated.status = 'moving';
  interpolatePosition(updated, 0.1);
  updated.currentThought = `Trying to reach ${updated.destination}. Situation is unclear.`;
  return updated;
};

// ── GROUP-SPECIFIC PROCESSORS ────────────────────────────────

const _processResponder = (agent, currentTick, worldState, shelterOccupancy) => {
  const updated = { ...agent };

  // Shelter manager
  if (updated.role.toLowerCase().includes('shelter') ||
      updated.role.toLowerCase().includes('manager')) {
    const shelterName = updated.neighborhood;
    const occupancy = shelterOccupancy[shelterName] || 0;
    const capacity = _getShelterCapacity(shelterName, worldState);

    if (occupancy >= capacity) {
      updated.status = 'overloaded';
      updated.currentThought = `Shelter is full — ${occupancy}/${capacity} persons. I am turning people away. This is devastating. We need overflow shelter immediately.`;
    } else {
      updated.status = 'managing';
      updated.currentThought = `Managing ${shelterName} — ${occupancy}/${capacity} persons sheltered. Coordinating arrivals.`;
    }
    return updated;
  }

  // Hospital administrator or doctor
  if (updated.role.toLowerCase().includes('hospital') ||
      updated.role.toLowerCase().includes('doctor') ||
      updated.role.toLowerCase().includes('nurse') ||
      updated.role.toLowerCase().includes('medical')) {
    if (currentTick >= 8) {
      updated.status = 'overloaded';
      updated.currentThought = `Hospital at 140% capacity. No beds. Patients in corridors. Called government — no response. We are overwhelmed.`;
    } else if (currentTick >= 5) {
      updated.status = 'managing';
      updated.currentThought = `Emergency ward filling fast. Triaging incoming patients. Blood supply running low. Requesting resupply.`;
    } else {
      updated.status = 'managing';
      updated.currentThought = `Preparing emergency ward. All staff called in. Ambulances deployed. Ready to receive casualties.`;
    }
    return updated;
  }

  // NDRF coordinator
  if (updated.role.toLowerCase().includes('ndrf') ||
      updated.role.toLowerCase().includes('coordinator')) {
    if (currentTick >= 6) {
      updated.status = 'overloaded';
      updated.currentThought = `9 requests in queue. I can only action 3 per tick. 6 people waiting. The system is overwhelmed. I need more teams now.`;
    } else if (currentTick >= 3) {
      updated.status = 'managing';
      updated.currentThought = `Coordinating rescue teams. ${currentTick * 2} requests received. Dispatching ambulances. Tracking shelter capacities.`;
    } else {
      updated.status = 'managing';
      updated.currentThought = `Alert issued. Teams on standby. Monitoring situation across all zones.`;
    }
    return updated;
  }

  // Ambulance driver or police
  updated.status = 'managing';
  updated.currentThought = `Deployed and responding. Tick ${currentTick} — coordinating with control room.`;
  return updated;
};

const _processVolunteer = (agent, currentTick, worldState, zoneAffected, inRedZone, inAmberZone, inSafeZone) => {
  const updated = { ...agent };

  // Safe zone volunteer — coordination role, not frontline
  if (inSafeZone) {
    if (currentTick === 0) {
      updated.status = 'active';
      updated.currentThought = `Setting up a coordination point here at ${updated.neighborhood}. Calling other volunteers to register incoming evacuees.`;
      return updated;
    }
    if (currentTick >= 2) {
      updated.status = 'helping';
      updated.currentThought = `Registering evacuees arriving from red zones. Distributing food and water. ${currentTick * 8} persons processed so far.`;
      return updated;
    }
    updated.status = 'active';
    updated.currentThought = `Safe zone is calm. Preparing to receive evacuees. Coordinating with shelter managers.`;
    return updated;
  }

  // Amber zone volunteer — cautious, helping neighbours before self-evacuating
  if (inAmberZone) {
    if (currentTick === 0) {
      updated.status = 'active';
      updated.currentThought = `Alert received. Checking on elderly neighbours before I leave. Situation is tense but not critical yet.`;
      return updated;
    }
    if (currentTick >= 2 && currentTick <= 4) {
      updated.status = 'helping';
      interpolatePosition(updated, 0.1);
      updated.currentThought = `Helping a few neighbours pack and move. Water level is rising slowly. We have some time but not much.`;
      return updated;
    }
    if (currentTick >= 5) {
      updated.status = 'helping';
      interpolatePosition(updated, 0.08);
      updated.currentThought = `Situation worsening in ${updated.neighborhood}. Moving the last group toward ${updated.destination}. Roads still passable.`;
      return updated;
    }
    updated.status = 'active';
    updated.currentThought = `Monitoring water levels. Alerting neighbours who may not have received the official warning.`;
    return updated;
  }

  // Red zone volunteer — frontline, high urgency
  if (currentTick === 0) {
    updated.status = 'active';
    updated.currentThought = `Just saw the alert on WhatsApp. I know this area — I know who needs help. Going out now.`;
    return updated;
  }

  if (currentTick >= 2 && currentTick <= 5) {
    updated.status = 'helping';
    interpolatePosition(updated, 0.12);
    updated.currentThought = _getVolunteerHelpingThought(updated, currentTick, worldState);
    return updated;
  }

  if (currentTick === 7 && Math.random() < 0.3) {
    updated.status = 'blocked';
    updated.currentThought = `I went back for one more person and now the road behind me is flooded. I am stranded between ${updated.neighborhood} and the shelter. Cannot go forward or back.`;
    return updated;
  }

  if (currentTick >= 6) {
    updated.status = 'helping';
    updated.currentThought = `On my ${currentTick - 4}th trip. Exhausted but people still need help. Official rescue has not reached this lane yet.`;
    return updated;
  }

  updated.status = 'active';
  updated.currentThought = `Coordinating with neighbors. Checking who needs help in ${updated.neighborhood}.`;
  return updated;
};

// Safe zone civilians — no immediate threat, orderly and calm
const _processSafeZoneAgent = (agent, currentTick, worldState) => {
  const updated = { ...agent };

  if (currentTick <= 2) {
    updated.status = 'active';
    updated.currentThought = `Heard about the ${worldState.disaster.type.toLowerCase()} on the news. We are safe here but monitoring closely. Relatives in red zones are not picking up.`;
    return updated;
  }

  if (currentTick <= 5) {
    updated.status = 'active';
    updated.currentThought = `Shelter nearby is filling up with evacuees. Helping where I can — distributing food, charging phones. No personal danger here.`;
    return updated;
  }

  // Some safe zone agents move toward shelter to help
  if (currentTick >= 6 && !updated.hasReachedShelterHelp) {
    updated.status = 'moving';
    updated.hasReachedShelterHelp = true;
    interpolatePosition(updated, 0.1);
    updated.currentThought = `Going to the shelter to volunteer. They need more hands to manage the incoming evacuees from ${worldState.zones.red[0]}.`;
    return updated;
  }

  updated.status = 'safe';
  updated.currentThought = `Safe zone is stable. Helping coordinate relief supplies arriving from the district headquarters.`;
  return updated;
};

// Amber zone civilians — aware, preparing, cautious but not panicking
const _processAmberZoneAgent = (agent, currentTick, worldState, routeBlocked, zoneAffected) => {
  const updated = { ...agent };

  if (currentTick <= 1) {
    updated.status = 'active';
    updated.currentThought = `Alert received. Packing essentials. Water level is rising but we are not in immediate danger yet. Watching the situation.`;
    return updated;
  }

  if (currentTick <= 3 && !zoneAffected) {
    updated.status = 'moving';
    interpolatePosition(updated, updated.hasVehicle ? 0.2 : 0.1);
    updated.currentThought = updated.hasVehicle
      ? `Driving family to ${updated.destination} as a precaution. Roads are busy but clear. Better to leave early.`
      : `Walking toward ${updated.destination} with family. Situation is manageable right now. Staying calm.`;
    return updated;
  }

  // Amber zone worsening — treat like red zone from tick 4+
  if (zoneAffected || currentTick >= 4) {
    if (updated.vulnerability === 'critical') {
      updated.status = 'trapped';
      updated.needsRescue = true;
      updated.rescueType = _getRescueType(updated);
      updated.currentThought = `The water reached our area faster than expected. I cannot move on my own. Calling for help from ${updated.neighborhood}.`;
      return updated;
    }
    if (routeBlocked) {
      updated.status = 'blocked';
      updated.currentThought = `Route to ${updated.destination} is now blocked. Waiting for an alternate. Situation is getting serious.`;
      return updated;
    }
    updated.status = 'moving';
    interpolatePosition(updated, updated.hasVehicle ? 0.22 : 0.09);
    updated.currentThought = `Amber zone flooding now. Moving urgently toward ${updated.destination}. No time to wait.`;
    return updated;
  }

  updated.status = 'moving';
  interpolatePosition(updated, 0.12);
  updated.currentThought = `Cautiously moving toward ${updated.destination}. Amber zone — staying alert.`;
  return updated;
};

// ── THOUGHT GENERATORS ───────────────────────────────────────

const _getUnawareThought = (agent, tick) => {
  const thoughts = [
    `Still asleep. No alarm. No alert reached my basic phone.`,
    `I heard some rain but it does not seem serious. Nobody has told me anything.`,
    `My neighbor just knocked — says there is flooding nearby. First I am hearing of it.`,
    `I have no smartphone so I missed the government app alert. Just woke up to water outside.`
  ];
  return thoughts[Math.min(tick, thoughts.length - 1)];
};

const _getMovingThought = (agent, tick, worldState) => {
  return `Heading to ${agent.destination}. The ${worldState.disaster.type.toLowerCase()} warning came ${tick * 15} minutes ago. Roads are crowded but passable so far.`;
};

const _getDrivingThought = (agent, tick) => {
  return `Driving toward ${agent.destination}. Traffic is heavy. Checking road updates on phone. Hope the bridge is still open.`;
};

const _getWalkingThought = (agent, tick) => {
  return `Walking to ${agent.destination} — no vehicle. ${tick * 15} minutes since the alert. Carrying what I can. Children are with me.`;
};

const _getCriticalTrappedThought = (agent, tick) => {
  const timeStr = `${6 + Math.floor(tick * 15 / 60)}:${String((tick * 15) % 60).padStart(2, '0')} AM`;
  return `I called 112 at 6:00 AM. It is now ${timeStr}. Nobody has come. I cannot move on my own. Please send help to ${agent.neighborhood}.`;
};

const _getBlockedTrappedThought = (agent, tick, worldState) => {
  return `The road from ${agent.neighborhood} is completely blocked by the ${worldState.disaster.type.toLowerCase()}. I have called for help ${tick - 1} times. I am stuck here with no way out.`;
};

const _getWaitingThought = (agent, tick, worldState) => {
  return `Waiting for the ${worldState.disaster.type.toLowerCase()} to ease enough to move. Route to ${agent.destination} is blocked. Tick ${tick} — still here.`;
};

const _getVolunteerHelpingThought = (agent, tick, worldState) => {
  const actions = [
    `Helping elderly neighbor pack essentials. Taking them to ${agent.destination}.`,
    `Carrying a child on my back through knee-deep water. Official help has not come here.`,
    `Just dropped off 3 people at shelter. Going back for 2 more I know are stuck.`,
    `Using my auto to ferry people. No official vehicle has come to ${agent.neighborhood} yet.`
  ];
  return actions[Math.min(tick - 2, actions.length - 1)];
};

// ── HELPERS ──────────────────────────────────────────────────

const _hasReachedDestination = (agent) => {
  if (!agent.destinationLat || !agent.destinationLng) return false;
  const dist = Math.sqrt(
    Math.pow(agent.lat - agent.destinationLat, 2) +
    Math.pow(agent.lng - agent.destinationLng, 2)
  );
  return dist < 0.005; // within ~500m
};

const _getRescueType = (agent) => {
  if (agent.vulnerability === 'critical') {
    if (agent.role.toLowerCase().includes('pregnant') ||
        agent.backstory.toLowerCase().includes('pregnant')) {
      return 'ambulance';
    }
    if (agent.backstory.toLowerCase().includes('wheelchair') ||
        agent.backstory.toLowerCase().includes('mobility') ||
        agent.backstory.toLowerCase().includes('disabled')) {
      return 'accessible_vehicle';
    }
    return 'ambulance';
  }
  if (agent.role.toLowerCase().includes('teacher') ||
      agent.backstory.toLowerCase().includes('students') ||
      agent.backstory.toLowerCase().includes('children')) {
    return 'group_transport';
  }
  return 'rescue_team';
};

const _getShelterCapacity = (shelterName, worldState) => {
  if (!worldState.shelters) return 40;
  const shelter = worldState.shelters.find(s =>
    s.name.toLowerCase().includes(shelterName.toLowerCase()) ||
    shelterName.toLowerCase().includes(s.name.toLowerCase())
  );
  return shelter ? shelter.capacity : 40;
};

module.exports = { processAgentTick };