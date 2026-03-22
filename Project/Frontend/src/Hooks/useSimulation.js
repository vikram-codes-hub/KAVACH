import { useSimulationContext } from '../context/SimulationContext'

// This hook provides convenient derived state and helpers
// consumed by components that need simulation-specific logic

export default function useSimulation() {
  const ctx = useSimulationContext()

  // ── DERIVED STATE ─────────────────────────────────────────

  // Is the simulation in an active state
  const isActive = ['running', 'report'].includes(ctx.pageState)

  // Is upload complete and ready to start
  const isReady = ctx.pageState === 'ready'

  // Is currently processing PDF
  const isProcessing = ctx.pageState === 'processing'

  // Has report been generated
  const hasReport = ctx.pageState === 'report' && ctx.reportReady

  // Current tick as percentage for progress bar
  const tickProgress = Math.round((ctx.currentTick / 10) * 100)

  // Survival rate
  const survivalRate = ctx.stats.total > 0
    ? Math.round((ctx.stats.safe / ctx.stats.total) * 100)
    : 0

  // Agent counts by group
  const agentsByGroup = {
    blue:  ctx.agents.filter(a => a.group === 'blue'),
    red:   ctx.agents.filter(a => a.group === 'red'),
    amber: ctx.agents.filter(a => a.group === 'amber'),
    green: ctx.agents.filter(a => a.group === 'green')
  }

  // Agent counts by status
  const agentsByStatus = {
    safe:     ctx.agents.filter(a => a.status === 'safe'),
    trapped:  ctx.agents.filter(a => a.status === 'trapped'),
    moving:   ctx.agents.filter(a => a.status === 'moving'),
    managing: ctx.agents.filter(a => a.status === 'managing'),
    helping:  ctx.agents.filter(a => a.status === 'helping'),
    blocked:  ctx.agents.filter(a => a.status === 'blocked'),
    overloaded: ctx.agents.filter(a => a.status === 'overloaded'),
    unaware:  ctx.agents.filter(a => a.status === 'unaware')
  }

  // Get agent color based on status and group
  const getAgentColor = (agent) => {
    if (agent.status === 'trapped')    return '#ef4444'
    if (agent.status === 'safe')       return '#22c55e'
    if (agent.status === 'overloaded') return '#f97316'
    if (agent.status === 'blocked')    return '#f59e0b'
    if (agent.status === 'helping')    return '#86efac'
    if (agent.status === 'unaware')    return '#6b7280'

    switch (agent.group) {
      case 'blue':  return '#3b82f6'
      case 'red':   return '#ef4444'
      case 'amber': return '#f59e0b'
      case 'green': return '#22c55e'
      default:      return '#888888'
    }
  }

  // Get agent status label
  const getAgentStatusLabel = (agent) => {
    switch (agent.status) {
      case 'safe':       return 'SAFE'
      case 'trapped':    return 'TRAPPED'
      case 'moving':     return 'MOVING'
      case 'managing':   return 'MANAGING'
      case 'helping':    return 'HELPING'
      case 'blocked':    return 'BLOCKED'
      case 'overloaded': return 'OVERLOADED'
      case 'unaware':    return 'UNAWARE'
      case 'active':     return 'ACTIVE'
      default:           return 'UNKNOWN'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'safe':       return '#22c55e'
      case 'trapped':    return '#ef4444'
      case 'moving':     return '#f59e0b'
      case 'managing':   return '#3b82f6'
      case 'helping':    return '#86efac'
      case 'blocked':    return '#f97316'
      case 'overloaded': return '#ef4444'
      case 'unaware':    return '#6b7280'
      case 'active':     return '#a78bfa'
      default:           return '#888888'
    }
  }

  // Get group label
  const getGroupLabel = (group) => {
    switch (group) {
      case 'blue':  return 'Responder'
      case 'red':   return 'Vulnerable'
      case 'amber': return 'Mobile Citizen'
      case 'green': return 'Volunteer'
      default:      return 'Unknown'
    }
  }

  // Get group color
  const getGroupColor = (group) => {
    switch (group) {
      case 'blue':  return '#3b82f6'
      case 'red':   return '#ef4444'
      case 'amber': return '#f59e0b'
      case 'green': return '#22c55e'
      default:      return '#888888'
    }
  }

  // Get disaster color from worldState
  const getDisasterColor = () => {
    return ctx.disasterColor || '#3b82f6'
  }

  // Get tick time label
  const getTickTimeLabel = (tick) => {
    const totalMinutes = tick * 15
    const hours = 6 + Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const period = hours < 12 ? 'AM' : 'PM'
    const displayHour = hours > 12 ? hours - 12 : hours
    return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
  }

  // Get shelter occupancy percentage
  const getShelterOccupancy = (shelterName) => {
    if (!ctx.worldState?.shelters) return 0
    const shelter = ctx.worldState.shelters.find(s => s.name === shelterName)
    if (!shelter) return 0
    const occupancy = ctx.shelterOccupancy[shelterName] || 0
    return Math.round((occupancy / shelter.capacity) * 100)
  }

  // Check if node is affected
  const isNodeAffected = (nodeId) => {
    return ctx.affectedNodes.includes(nodeId)
  }

  // Get coordinator overload status
  const isCoordinatorOverloaded = ctx.pendingRequests >= 6

  // Get critical trapped agents
  const criticalTrapped = ctx.agents.filter(
    a => a.status === 'trapped' && a.vulnerability === 'critical'
  )

  // Disaster type display name
  const disasterTypeName = ctx.worldState?.disaster?.type || 'Disaster'

  // Location display
  const locationName = ctx.worldState?.disaster?.location || ''
  const stateName = ctx.worldState?.disaster?.state || ''

  return {
    // Context passthrough
    ...ctx,

    // Derived state
    isActive,
    isReady,
    isProcessing,
    hasReport,
    tickProgress,
    survivalRate,
    agentsByGroup,
    agentsByStatus,
    isCoordinatorOverloaded,
    criticalTrapped,
    disasterTypeName,
    locationName,
    stateName,

    // Helper functions
    getAgentColor,
    getAgentStatusLabel,
    getStatusColor,
    getGroupLabel,
    getGroupColor,
    getDisasterColor,
    getTickTimeLabel,
    getShelterOccupancy,
    isNodeAffected
  }
}