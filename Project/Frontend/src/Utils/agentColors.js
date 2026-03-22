// Agent dot colors for Canvas rendering
// Based on group and status

export const GROUP_COLORS = {
  blue:  '#3b82f6',
  red:   '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e'
}

export const STATUS_COLORS = {
  safe:       '#22c55e',
  trapped:    '#ef4444',
  moving:     '#f59e0b',
  managing:   '#3b82f6',
  helping:    '#86efac',
  blocked:    '#f97316',
  overloaded: '#ef4444',
  unaware:    '#6b7280',
  active:     '#a78bfa'
}

export const STATUS_RING_COLORS = {
  trapped:    'rgba(239,68,68,0.4)',
  overloaded: 'rgba(239,68,68,0.3)',
  safe:       'rgba(34,197,94,0.3)',
  helping:    'rgba(134,239,172,0.3)'
}

// Get dot fill color based on agent state
export const getAgentFillColor = (agent) => {
  if (agent.status === 'trapped')    return STATUS_COLORS.trapped
  if (agent.status === 'safe')       return STATUS_COLORS.safe
  if (agent.status === 'overloaded') return STATUS_COLORS.overloaded
  if (agent.status === 'blocked')    return STATUS_COLORS.blocked
  if (agent.status === 'helping')    return STATUS_COLORS.helping
  if (agent.status === 'unaware')    return STATUS_COLORS.unaware
  return GROUP_COLORS[agent.group] || '#888888'
}

// Get dot border color
export const getAgentBorderColor = (agent, isSelected) => {
  if (isSelected) return '#ffffff'
  if (agent.status === 'trapped') return '#ff0000'
  if (agent.status === 'safe')    return '#00ff88'
  return 'rgba(255,255,255,0.6)'
}

// Get dot radius based on group and status
export const getAgentRadius = (agent, isSelected) => {
  if (isSelected) return 10
  if (agent.group === 'blue') return 7  // responders slightly larger
  if (agent.status === 'trapped') return 8
  return 6
}

// Should this agent have a pulsing ring
export const shouldPulse = (agent) => {
  return agent.status === 'trapped' ||
         agent.status === 'overloaded' ||
         (agent.status === 'helping' && agent.group === 'green')
}

// Get pulse ring color
export const getPulseColor = (agent) => {
  return STATUS_RING_COLORS[agent.status] || 'rgba(255,255,255,0.2)'
}

// Get group label
export const GROUP_LABELS = {
  blue:  'Responder',
  red:   'Vulnerable',
  amber: 'Mobile Citizen',
  green: 'Volunteer'
}

// Get vulnerability color
export const VULNERABILITY_COLORS = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444'
}

export const getVulnerabilityColor = (vulnerability) => {
  return VULNERABILITY_COLORS[vulnerability] || '#888888'
}