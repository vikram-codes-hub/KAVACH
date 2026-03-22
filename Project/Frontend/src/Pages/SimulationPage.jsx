import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import TopNav from '../Components/Layout/TopNav'
import SystemDashboard from '../Components/Layout/SystemDashboard'
import MapView from '../Components/map/MapView'
import PipelinePanel from '../Components/pipeline/PipelinePanel'
import { SimulationContext } from '../Context/SimulationContext'
import useSocket from '../Hooks/useSocket.js'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')


export default function SimulationPage() {
  const [pageState, setPageState] = useState('upload')
  const [worldState, setWorldState]   = useState(null)
  const [agents, setAgents]           = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [graphNodes, setGraphNodes]   = useState([])
  const [graphEdges, setGraphEdges]   = useState([])
  const [mapCenter, setMapCenter]     = useState({ lat: 20.5937, lng: 78.9629, zoom: 5 })

  const [stepStatuses, setStepStatuses] = useState({
    worldState: 'pending',
    agentGen:   'pending',
    simConfig:  'pending',
    simRun:     'pending'
  })
  const [stepData, setStepData] = useState({
    worldState: null,
    agentGen:   null,
    simConfig:  null,
    simRun:     null
  })

  const [currentTick, setCurrentTick]         = useState(0)
  const [currentTime, setCurrentTime]         = useState('06:00 AM')
  const [isRunning, setIsRunning]             = useState(false)
  const [tickSpeed, setTickSpeed]             = useState(1500)
  const [affectedNodes, setAffectedNodes]     = useState([])
  const [affectedRoads, setAffectedRoads]     = useState([])
  const [shelterOccupancy, setShelterOccupancy] = useState({})
  const [pendingRequests, setPendingRequests] = useState(0)
  const [disasterColor, setDisasterColor]     = useState('#3b82f6')
  const [disasterLabel, setDisasterLabel]     = useState('Disaster')
  const [stats, setStats] = useState({
    safe: 0, moving: 0, trapped: 0, managing: 0, total: 0
  })

  const [logEntries, setLogEntries] = useState([])
  const [bottleneckReport, setBottleneckReport] = useState(null)
  const [verdict, setVerdict]                   = useState(null)
  const [reportReady, setReportReady]           = useState(false)
  const [notifications, setNotifications] = useState([])
  const [terminalExpanded, setTerminalExpanded] = useState(false)

  useEffect(() => {
    if (agents.length > 0 && pageState === 'processing') {
      setPageState('ready')
      setStepStatuses({
        worldState: 'completed',
        agentGen:   'completed',
        simConfig:  'completed',
        simRun:     'pending'
      })
    }
  }, [agents])

  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit',
      second: '2-digit', fractionalSecondDigits: 3
    })
    setLogEntries(prev => [...prev.slice(-200), { timestamp, message, level }])
  }, [])

  const handleTickUpdate = useCallback((data) => {
    setCurrentTick(data.tick)
    setCurrentTime(data.time)
    setAgents(data.agents || [])
    setAffectedNodes(data.affectedNodes || data.floodedNodes || [])
    setAffectedRoads(data.affectedRoads || data.floodedRoads || [])
    setShelterOccupancy(data.shelterOccupancy || {})
    setPendingRequests(data.pendingRequests || 0)
    setDisasterColor(data.disasterColor || '#3b82f6')
    setDisasterLabel(data.disasterLabel || 'Disaster')
    if (data.graphEdges) setGraphEdges(data.graphEdges)
    setStats({
      safe:     data.safe     || 0,
      moving:   data.moving   || 0,
      trapped:  data.trapped  || 0,
      managing: data.managing || 0,
      total:    data.agents?.length || 20
    })
    setPageState('running')
  }, [])

  const handleSimulationComplete = useCallback((data) => {
    addLog('Simulation complete — generating reports...', 'success')
    setIsRunning(false)
    setPageState('report')
    setStepStatuses(prev => ({ ...prev, simRun: 'completed' }))
  }, [addLog])

  const handleReportReady = useCallback((data) => {
    setBottleneckReport(data.bottleneckReport)
    setVerdict(data.verdict)
    setReportReady(true)
    addLog('✓ Report ready — scroll down to view', 'success')
  }, [addLog])

  const handleLogEvent = useCallback((data) => {
    addLog(data.message, data.level)
  }, [addLog])

  const handlePipelineStep = useCallback((data) => {
    const { stepNumber, status, data: stepPayload } = data
    const stepKeys = ['worldState', 'agentGen', 'simConfig', 'simRun']
    const key = stepKeys[stepNumber - 1]
    if (!key) return
    setStepStatuses(prev => ({ ...prev, [key]: status }))
    if (stepPayload) setStepData(prev => ({ ...prev, [key]: stepPayload }))
    if (stepNumber === 2 && status === 'completed' && stepPayload?.agents) {
      setAgents(stepPayload.agents)
    }
  }, [])

  const handleNotification = useCallback((data) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { ...data, id }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  const socket = useSocket({
    onTickUpdate:         handleTickUpdate,
    onSimulationComplete: handleSimulationComplete,
    onReportReady:        handleReportReady,
    onLogEvent:           handleLogEvent,
    onPipelineStep:       handlePipelineStep,
    onNotification:       handleNotification
  })

  const handleUpload = useCallback(async (file) => {
    setPageState('processing')
    setStepStatuses({ worldState: 'processing', agentGen: 'pending', simConfig: 'pending', simRun: 'pending' })
    setLogEntries([])
    setAgents([])
    setWorldState(null)
    setReportReady(false)
    setBottleneckReport(null)
    setVerdict(null)
    addLog(`Loading disaster advisory — ${file.name}`, 'info')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (response.data.success) {
        const { worldState, agents, mapCenter, graphNodes, graphEdges } = response.data
        setWorldState(worldState)
        setAgents(agents)
        setMapCenter(mapCenter)
        setGraphNodes(graphNodes || [])
        setGraphEdges(graphEdges || [])
        setStepStatuses({ worldState: 'completed', agentGen: 'completed', simConfig: 'completed', simRun: 'pending' })
        setPageState('ready')
        addLog(`✓ Ready — ${agents.length} agents positioned on map`, 'success')
      }
    } catch (err) {
      addLog(`✗ Upload failed: ${err.response?.data?.error || err.message}`, 'error')
      setPageState('upload')
      setStepStatuses({ worldState: 'error', agentGen: 'pending', simConfig: 'pending', simRun: 'pending' })
    }
  }, [addLog])

  const handleStartSimulation = useCallback(() => {
    if (!socket) return
    socket.emit('start-simulation')
    setIsRunning(true)
    setPageState('running')
    setStepStatuses(prev => ({ ...prev, simRun: 'processing' }))
    addLog('Simulation started — 10 ticks at 1500ms intervals', 'success')
  }, [socket, addLog])

  const handleSpeedChange = useCallback((speed) => {
    setTickSpeed(speed)
    if (socket) socket.emit('set-tick-speed', speed)
  }, [socket])

  const handleWhatIf = useCallback((triggerType, extra = {}) => {
    if (!socket) return
    socket.emit('what-if-trigger', { triggerType, ...extra })
    addLog(`What-if triggered: ${triggerType}`, 'warn')
  }, [socket, addLog])

  const getStepLabel = () => {
    if (pageState === 'upload')      return 'Step 1/4  Upload Advisory'
    if (pageState === 'processing')  return 'Step 2/4  Extracting World State'
    if (pageState === 'ready')       return 'Step 4/4  Ready to Simulate'
    if (pageState === 'running')     return 'Step 4/4  Simulation Running'
    if (pageState === 'report')      return 'Step 4/4  Report Ready'
    return 'KAVACH'
  }

  const getStepStatus = () => {
    if (pageState === 'processing') return 'processing'
    if (pageState === 'ready')      return 'ready'
    if (pageState === 'running')    return 'running'
    if (pageState === 'report')     return 'completed'
    return 'idle'
  }

  const terminalHeight = terminalExpanded ? 280 : 130

  const contextValue = {
    pageState, worldState, agents, selectedAgent, setSelectedAgent,
    graphNodes, graphEdges, mapCenter, stepStatuses, stepData,
    currentTick, currentTime, isRunning, tickSpeed,
    affectedNodes, affectedRoads, shelterOccupancy, pendingRequests,
    disasterColor, disasterLabel, stats, logEntries,
    bottleneckReport, verdict, reportReady, notifications,
    terminalExpanded, setTerminalExpanded,
    handleUpload, handleStartSimulation, handleSpeedChange, handleWhatIf
  }

  return (
    <SimulationContext.Provider value={contextValue}>
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden'
      }}>

        <TopNav
          stepLabel={getStepLabel()}
          stepStatus={getStepStatus()}
          currentTick={currentTick}
          currentTime={currentTime}
          stats={stats}
          pageState={pageState}
        />

        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0
        }}>

          {/* Left — Map 55% */}
          <div style={{
            width: '55%',
            position: 'relative',
            overflow: 'hidden',
            background: '#0a0f1a',
            flexShrink: 0
          }}>
            <MapView />

            {/* Notifications */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              pointerEvents: 'none'
            }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  background: 'rgba(10,10,10,0.95)',
                  border: `1px solid ${
                    n.type === 'danger'  ? 'var(--accent-red)'   :
                    n.type === 'warning' ? 'var(--accent-amber)' :
                    n.type === 'success' ? 'var(--accent-green)' :
                    'var(--accent-blue)'
                  }`,
                  borderRadius: 4,
                  padding: '6px 14px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap'
                }}>
                  ⚠ {n.message}
                </div>
              ))}
            </div>

            {/* Upload overlay */}
            {pageState === 'upload' && (
              <UploadOverlay onUpload={handleUpload} />
            )}
          </div>

          {/* Right — Pipeline 45% */}
          <div style={{
            width: '45%',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-panel)'
          }}>
            <PipelinePanel />
          </div>
        </div>

        <SystemDashboard
          expanded={terminalExpanded}
          onToggleExpand={() => setTerminalExpanded(e => !e)}
          height={terminalHeight}
        />
      </div>
    </SimulationContext.Provider>
  )
}

// ── UPLOAD OVERLAY ────────────────────────────────────────────
function UploadOverlay({ onUpload }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') onUpload(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) onUpload(file)
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(10,10,10,0.92)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      backdropFilter: 'blur(4px)'
    }}>

      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 4,
        letterSpacing: '0.08em',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        KAVACH
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        marginBottom: 32,
        textAlign: 'center',
        letterSpacing: '0.02em'
      }}>
        Multi-Agent Disaster Response Simulation Platform
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-input').click()}
        style={{
          width: 340,
          height: 160,
          border: `2px dashed ${dragging ? 'var(--accent-orange)' : 'var(--border-light)'}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: dragging ? 'rgba(255,107,43,0.05)' : 'rgba(255,255,255,0.02)',
          gap: 8
        }}
      >
        <div style={{ fontSize: 28 }}>📄</div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-primary)',
          textAlign: 'center'
        }}>
          Upload Disaster Advisory PDF
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)'
        }}>
          Drag & drop or click to browse<br />
          Supports any Indian district emergency advisory
        </div>
      </div>

      <input
        id="pdf-input"
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Bottom hint */}
      <div style={{
        marginTop: 16,
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
        lineHeight: 1.8
      }}>
        Works with NDMA advisories, DDMA bulletins, IMD warnings<br />
        Any Indian state · Any disaster type
      </div>
    </div>
  )
}