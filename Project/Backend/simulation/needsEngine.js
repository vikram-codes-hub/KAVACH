// needsEngine.js
// Generates help request objects from agent states every tick
// These feed into the coordinator queue in tickLoop.js

const generateNeeds = (agents, currentTick, worldState) => {
  const needs = [];

  agents.forEach(agent => {
    // Only generate needs for agents who are in trouble
    if (!['trapped', 'overloaded', 'blocked', 'unaware'].includes(agent.status)) {
      return;
    }

    // Do not re-generate needs for already rescued agents
    if (agent.status === 'safe') return;

    const need = _buildNeed(agent, currentTick, worldState);
    if (need) needs.push(need);
  });

  // Sort by priority — critical first
  needs.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });

  return needs;
};

// Build a single need object for an agent
const _buildNeed = (agent, currentTick, worldState) => {
  const timeStr = _tickToTime(currentTick);

  // Base need structure
  const need = {
    id: `need_${agent.id}_tick${currentTick}`,
    agentId: agent.id,
    agentName: agent.name,
    agentAge: agent.age,
    agentRole: agent.role,
    agentGroup: agent.group,
    zone: agent.zone,
    neighborhood: agent.neighborhood,
    lat: agent.lat,
    lng: agent.lng,
    tick: currentTick,
    time: timeStr,
    fulfilled: false,
    fulfilledAtTick: null,
    disasterType: worldState.disaster.type
  };

  // Determine need type and priority based on agent properties
  switch (agent.status) {

    case 'trapped':
      return _buildTrappedNeed(need, agent, currentTick);

    case 'overloaded':
      return _buildOverloadedNeed(need, agent, currentTick);

    case 'blocked':
      return _buildBlockedNeed(need, agent, currentTick);

    case 'unaware':
      // Only generate need if disaster has reached their zone
      if (currentTick >= agent.floodReachesAt) {
        return _buildUnawareNeed(need, agent, currentTick);
      }
      return null;

    default:
      return null;
  }
};

// Needs for trapped agents
const _buildTrappedNeed = (need, agent, currentTick) => {

  // Critical vulnerability — medical emergency
  if (agent.vulnerability === 'critical') {

    // Pregnant woman or obstetric emergency
    if (_isPregnant(agent)) {
      return {
        ...need,
        needType: 'ambulance',
        priority: 'critical',
        description: `${agent.name} (${agent.age}, ${agent.role}) requires immediate ambulance — obstetric emergency in ${agent.neighborhood}. Called 112 at ${_tickToTime(1)}. Route blocked since Tick ${Math.min(currentTick, 6)}.`,
        resourceRequired: 'ambulance',
        callCount: Math.max(1, currentTick - 1),
        escalating: currentTick >= 6
      };
    }

    // Wheelchair user or mobility impaired
    if (_isMobilityImpaired(agent)) {
      return {
        ...need,
        needType: 'accessible_vehicle',
        priority: 'critical',
        description: `${agent.name} (${agent.age}, ${agent.role}) requires accessible/stretcher vehicle — mobility impaired, cannot self-evacuate from ${agent.neighborhood}. Has called ${Math.max(1, currentTick - 1)} times.`,
        resourceRequired: 'accessible_vehicle',
        callCount: Math.max(1, currentTick - 1),
        escalating: true
      };
    }

    // Elderly or bedridden
    if (agent.age >= 65 || _isBedridden(agent)) {
      return {
        ...need,
        needType: 'ambulance',
        priority: 'critical',
        description: `${agent.name} (${agent.age}, ${agent.role}) — elderly/bedridden, cannot self-evacuate from ${agent.neighborhood}. Requires immediate rescue team.`,
        resourceRequired: 'ambulance',
        callCount: Math.max(1, currentTick - 1),
        escalating: currentTick >= 5
      };
    }

    // Generic critical
    return {
      ...need,
      needType: 'rescue_team',
      priority: 'critical',
      description: `${agent.name} (${agent.age}, ${agent.role}) — critical vulnerability, trapped in ${agent.neighborhood}. Immediate rescue required.`,
      resourceRequired: 'rescue_team',
      callCount: 1,
      escalating: false
    };
  }

  // High vulnerability — urgent but not immediately life threatening
  if (agent.vulnerability === 'high') {

    // Group with dependents — teacher with students
    if (_hasGroupDependents(agent)) {
      return {
        ...need,
        needType: 'group_transport',
        priority: 'high',
        description: `${agent.name} (${agent.role}) — responsible for group of dependents in ${agent.neighborhood}. Requires group transport to ${agent.destination || 'shelter'}.`,
        resourceRequired: 'group_transport',
        callCount: 1,
        escalating: currentTick >= 5
      };
    }

    // Trapped on rooftop or elevated position
    if (_isRooftopTrapped(agent)) {
      return {
        ...need,
        needType: 'rescue_boat',
        priority: 'high',
        description: `${agent.name} (${agent.role}) — trapped on rooftop in ${agent.neighborhood}. Surrounded by water. Requires rescue boat or elevated access.`,
        resourceRequired: 'rescue_boat',
        callCount: Math.max(1, currentTick - 4),
        escalating: currentTick >= 7
      };
    }

    return {
      ...need,
      needType: 'rescue_team',
      priority: 'high',
      description: `${agent.name} (${agent.age}, ${agent.role}) — high vulnerability, trapped in ${agent.neighborhood}. Route blocked. Requires rescue assistance.`,
      resourceRequired: 'rescue_team',
      callCount: 1,
      escalating: false
    };
  }

  // Medium/low vulnerability — route information or minor assistance
  return {
    ...need,
    needType: 'route_information',
    priority: 'medium',
    description: `${agent.name} (${agent.role}) — blocked in ${agent.neighborhood}. Requesting alternate route information to reach ${agent.destination || 'shelter'}.`,
    resourceRequired: 'route_information',
    callCount: 1,
    escalating: false
  };
};

// Needs for overloaded responders
const _buildOverloadedNeed = (need, agent, currentTick) => {

  // Shelter at capacity
  if (_isShelterManager(agent)) {
    return {
      ...need,
      needType: 'shelter_space',
      priority: 'high',
      description: `${agent.name} — Shelter at ${agent.neighborhood} has reached maximum capacity. Turning away evacuees. Requires overflow shelter or capacity expansion immediately.`,
      resourceRequired: 'overflow_shelter',
      callCount: 1,
      escalating: true
    };
  }

  // Hospital overloaded
  if (_isMedicalStaff(agent)) {
    return {
      ...need,
      needType: 'medical_support',
      priority: 'high',
      description: `${agent.name} (${agent.role}) — Hospital at 140% capacity. Blood supply critical. Requesting additional medical staff, supplies, and patient transfer support.`,
      resourceRequired: 'medical_support',
      callCount: 1,
      escalating: currentTick >= 8
    };
  }

  // Coordinator overloaded
  if (_isCoordinator(agent)) {
    return {
      ...need,
      needType: 'coordinator_support',
      priority: 'medium',
      description: `${agent.name} — NDRF Coordinator at 300% overload. ${currentTick >= 6 ? '9' : currentTick * 2} pending requests. Requires additional coordinators or teams.`,
      resourceRequired: 'additional_teams',
      callCount: 1,
      escalating: currentTick >= 6
    };
  }

  return {
    ...need,
    needType: 'operational_support',
    priority: 'medium',
    description: `${agent.name} (${agent.role}) — operational overload at ${agent.neighborhood}. Requires additional support resources.`,
    resourceRequired: 'support',
    callCount: 1,
    escalating: false
  };
};

// Needs for blocked agents
const _buildBlockedNeed = (need, agent, currentTick) => {
  return {
    ...need,
    needType: 'route_information',
    priority: 'medium',
    description: `${agent.name} (${agent.role}) — route from ${agent.neighborhood} to ${agent.destination || 'shelter'} is blocked. Requesting alternate route or escort.`,
    resourceRequired: 'route_information',
    callCount: 1,
    escalating: false
  };
};

// Needs for unaware agents when disaster reaches them
const _buildUnawareNeed = (need, agent, currentTick) => {
  return {
    ...need,
    needType: 'alert_notification',
    priority: 'high',
    description: `${agent.name} (${agent.role}) in ${agent.neighborhood} — no smartphone, received zero alert. Disaster has now reached their zone. Requires immediate door-to-door notification or loudspeaker alert.`,
    resourceRequired: 'alert_officer',
    callCount: 0,
    escalating: true
  };
};

// ── COORDINATOR QUEUE PROCESSOR ──────────────────────────────

// Process pending needs queue — coordinator can action max 3 per tick
const processCoordinatorQueue = (pendingNeeds, agents, currentTick) => {
  const MAX_ACTIONS_PER_TICK = 3;
  const actioned = [];
  const stillPending = [];

  let actionsThisTick = 0;

  pendingNeeds.forEach(need => {
    if (actionsThisTick >= MAX_ACTIONS_PER_TICK) {
      stillPending.push(need);
      return;
    }

    // Action this need
    const agent = agents.find(a => a.id === need.agentId);
    if (!agent) {
      stillPending.push(need);
      return;
    }

    // Apply rescue effect based on need type
    const result = _applyRescueEffect(agent, need, currentTick);

    if (result.success) {
      need.fulfilled = true;
      need.fulfilledAtTick = currentTick;
      actioned.push({ need, agent, result });
      actionsThisTick++;
    } else {
      // Resource unavailable — stays pending
      stillPending.push(need);
    }
  });

  return {
    actioned,
    stillPending,
    overloaded: pendingNeeds.length > MAX_ACTIONS_PER_TICK,
    pendingCount: stillPending.length,
    actionedCount: actioned.length
  };
};

// Apply the rescue effect to an agent when their need is actioned
const _applyRescueEffect = (agent, need, currentTick) => {

  switch (need.needType) {

    case 'ambulance':
      // Can only succeed if route is not blocked
      if (!agent.routeBlocked) {
        agent.status = 'moving';
        agent.currentThought = `The ambulance has finally arrived at ${_tickToTime(currentTick)}. Being taken to hospital now.`;
        return { success: true, message: `Ambulance dispatched to ${agent.name}` };
      } else {
        return { success: false, message: `Ambulance route to ${agent.name} is blocked` };
      }

    case 'accessible_vehicle':
      // Always fails if no accessible vehicle in fleet
      return {
        success: false,
        message: `No accessible vehicle available for ${agent.name} — zero in district fleet`
      };

    case 'group_transport':
      if (!agent.routeBlocked) {
        agent.status = 'moving';
        agent.currentThought = `Bus has arrived for the group. Loading children now. Heading to ${agent.destination}.`;
        return { success: true, message: `Group transport dispatched for ${agent.name}` };
      }
      return { success: false, message: `Route blocked for group transport to ${agent.name}` };

    case 'rescue_boat':
      agent.status = 'moving';
      agent.currentThought = `Rescue boat has reached me. Being evacuated from rooftop now.`;
      return { success: true, message: `Rescue boat dispatched to ${agent.name}` };

    case 'rescue_team':
      if (!agent.routeBlocked) {
        agent.status = 'moving';
        agent.currentThought = `NDRF team has reached ${agent.neighborhood}. Being escorted to safety.`;
        return { success: true, message: `Rescue team dispatched to ${agent.name}` };
      }
      return { success: false, message: `Rescue team route blocked to ${agent.name}` };

    case 'shelter_space':
      // Redirect to overflow shelter
      agent.status = 'managing';
      agent.currentThought = `Overflow redirect protocol activated. Sending excess evacuees to secondary shelter.`;
      return { success: true, message: `Overflow redirect actioned for ${agent.name}` };

    case 'route_information':
      agent.status = 'moving';
      agent.currentThought = `Control room gave me an alternate route. Taking the back road through ${agent.neighborhood}. Hope it holds.`;
      return { success: true, message: `Route information provided to ${agent.name}` };

    case 'alert_notification':
      agent.receivedAlert = true;
      agent.status = 'moving';
      agent.currentThought = `A neighbor just banged on my door — told me to evacuate immediately. I had no idea. Running now.`;
      return { success: true, message: `Alert delivered to ${agent.name} via door-to-door` };

    default:
      return { success: true, message: `Need actioned for ${agent.name}` };
  }
};

// ── HELPERS ──────────────────────────────────────────────────

const _tickToTime = (tick) => {
  const totalMinutes = tick * 15;
  const hours = 6 + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} AM`;
};

const _isPregnant = (agent) => {
  const text = (agent.backstory + ' ' + agent.role + ' ' + agent.name).toLowerCase();
  return text.includes('pregnant') || text.includes('pregnancy') || text.includes('obstetric');
};

const _isMobilityImpaired = (agent) => {
  const text = (agent.backstory + ' ' + agent.role).toLowerCase();
  return text.includes('wheelchair') || text.includes('mobility') ||
         text.includes('disabled') || text.includes('disability') ||
         text.includes('paralys') || text.includes('crutch');
};

const _isBedridden = (agent) => {
  const text = (agent.backstory + ' ' + agent.role).toLowerCase();
  return text.includes('bedridden') || text.includes('bed-ridden') ||
         text.includes('cannot walk') || text.includes('immobile');
};

const _hasGroupDependents = (agent) => {
  const text = (agent.backstory + ' ' + agent.role).toLowerCase();
  return text.includes('teacher') || text.includes('student') ||
         text.includes('children') || text.includes('school') ||
         text.includes('orphan') || text.includes('care home');
};

const _isRooftopTrapped = (agent) => {
  const text = (agent.currentThought + ' ' + agent.backstory).toLowerCase();
  return text.includes('roof') || text.includes('surrounded by water') ||
         text.includes('first floor') || text.includes('stranded');
};

const _isShelterManager = (agent) => {
  const text = (agent.role + ' ' + agent.backstory).toLowerCase();
  return text.includes('shelter') || text.includes('manager') ||
         text.includes('warden');
};

const _isMedicalStaff = (agent) => {
  const text = (agent.role + ' ' + agent.backstory).toLowerCase();
  return text.includes('doctor') || text.includes('nurse') ||
         text.includes('hospital') || text.includes('medical') ||
         text.includes('physician');
};

const _isCoordinator = (agent) => {
  const text = (agent.role + ' ' + agent.backstory).toLowerCase();
  return text.includes('coordinator') || text.includes('ndrf') ||
         text.includes('emergency') || text.includes('control room');
};

module.exports = {
  generateNeeds,
  processCoordinatorQueue
};