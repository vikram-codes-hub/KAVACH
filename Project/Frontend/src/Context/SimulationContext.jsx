import { createContext, useContext } from 'react'

// Create the context
export const SimulationContext = createContext(null)

// Custom hook for consuming context
export const useSimulationContext = () => {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulationContext must be used within SimulationContext.Provider')
  }
  return context
}

// Default context shape for reference
export const defaultContextValue = {
  // Page state
  pageState: 'upload',

  // World data
  worldState: null,
  agents: [],
  selectedAgent: null,
  setSelectedAgent: () => {},
  graphNodes: [],
  graphEdges: [],
  mapCenter: { lat: 20.5937, lng: 78.9629, zoom: 5 },

  // Pipeline step statuses
  stepStatuses: {
    worldState: 'pending',
    agentGen:   'pending',
    simConfig:  'pending',
    simRun:     'pending'
  },
  stepData: {
    worldState: null,
    agentGen:   null,
    simConfig:  null,
    simRun:     null
  },

  // Simulation state
  currentTick:      0,
  currentTime:      '06:00 AM',
  isRunning:        false,
  tickSpeed:        1500,
  affectedNodes:    [],
  affectedRoads:    [],
  shelterOccupancy: {},
  pendingRequests:  0,
  disasterColor:    '#3b82f6',
  disasterLabel:    'Disaster',
  stats: {
    safe:     0,
    moving:   0,
    trapped:  0,
    managing: 0,
    total:    0
  },

  // Log
  logEntries: [],

  // Report
  bottleneckReport: null,
  verdict:          null,
  reportReady:      false,

  // Notifications
  notifications: [],

  // Actions
  handleUpload:           () => {},
  handleStartSimulation:  () => {},
  handleSpeedChange:      () => {},
  handleWhatIf:           () => {}
}