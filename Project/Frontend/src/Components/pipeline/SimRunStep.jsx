import { useState } from 'react'
import { useSimulationContext } from '../../Context/SimulationContext'
import WhatIfPanel from '../simulation/WhatIfPanel'
import StatsBar from '../simulation/StatsBar'
import TickCounter from '../simulation/TickCounter'



export default function SimRunStep({ status, data }) {
  const {
    pageState,
    isRunning,
    currentTick,
    currentTime,
    tickSpeed,
    stats,
    pendingRequests,
    handleStartSimulation,
    handleSpeedChange,
    agents
  } = useSimulationContext()

  // DEBUG
  console.log('🟡 SimRunStep render — pageState:', pageState, 'agents:', agents?.length, 'status:', status)

  const [speedValue, setSpeedValue] = useState(tickSpeed)
  // ... rest of component

  const handleSpeedInput = (e) => {
    const val = Number(e.target.value)
    setSpeedValue(val)
    handleSpeedChange(val)
  }

  // No agents yet
  if (!agents || agents.length === 0) {
    return (
      <div style={{
        padding: '4px 0',
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)'
      }}>
        Complete previous steps to unlock simulation.
      </div>
    )
  }

  // Report complete
  if (pageState === 'report') {
    return (
      <CompletedView
        stats={stats}
        currentTick={currentTick}
      />
    )
  }

  // Running
  if (pageState === 'running' || isRunning) {
    return (
      <RunningView
        currentTick={currentTick}
        currentTime={currentTime}
        stats={stats}
        pendingRequests={pendingRequests}
        speedValue={speedValue}
        handleSpeedInput={handleSpeedInput}
      />
    )
  }

  // Ready — show start button whenever agents are loaded
  return (
    <ReadyView
      speedValue={speedValue}
      handleSpeedInput={handleSpeedInput}
      handleStartSimulation={handleStartSimulation}
    />
  )
}

// ── READY VIEW ────────────────────────────────────────────────
function ReadyView({ speedValue, handleSpeedInput, handleStartSimulation }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>

      {/* Ready indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 4
      }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#22c55e',
          flexShrink: 0
        }} />
        <span style={{
          fontSize: 10,
          color: '#22c55e',
          fontFamily: 'var(--font-mono)'
        }}>
          Simulation environment ready — 20 agents on map
        </span>
      </div>

      {/* Info */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        lineHeight: 1.6
      }}>
        CrisisSwarm will simulate{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          10 ticks
        </span>
        {' '}of real-world disaster response, each tick representing{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          15 minutes
        </span>
        {' '}(6:00 AM → 8:30 AM).
      </div>

      {/* Speed slider */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}>
          <span style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em'
          }}>
            SIMULATION SPEED
          </span>
          <span style={{
            fontSize: 9,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            {speedValue}ms / tick
          </span>
        </div>

        <input
          type="range"
          min={500}
          max={3000}
          step={100}
          value={speedValue}
          onChange={handleSpeedInput}
          style={{
            width: '100%',
            accentColor: 'var(--accent-orange)',
            cursor: 'pointer'
          }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 3
        }}>
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Fast (500ms)
          </span>
          <span style={{ fontSize: 8, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
            Demo (1500ms) ★
          </span>
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Slow (3000ms)
          </span>
        </div>
      </div>

      {/* START BUTTON */}
      <button
        onClick={handleStartSimulation}
        style={{
          width: '100%',
          padding: '14px',
          background: '#0f0f0f',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#ffffff',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#1a1a1a'
          e.currentTarget.style.borderColor = 'var(--accent-orange)'
          e.currentTarget.style.color = 'var(--accent-orange)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#0f0f0f'
          e.currentTarget.style.borderColor = '#444'
          e.currentTarget.style.color = '#ffffff'
        }}
      >
        ▶ Start Simulation →
      </button>

      <div style={{
        fontSize: 9,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        textAlign: 'center'
      }}>
        Use What-if panel during simulation to trigger live events
      </div>
    </div>
  )
}

// ── RUNNING VIEW ──────────────────────────────────────────────
function RunningView({
  currentTick,
  currentTime,
  stats,
  pendingRequests,
  speedValue,
  handleSpeedInput
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      <TickCounter currentTick={currentTick} currentTime={currentTime} />
      <StatsBar stats={stats} />

      {pendingRequests > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          background: pendingRequests >= 6
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(245,158,11,0.08)',
          border: `1px solid ${pendingRequests >= 6
            ? 'rgba(239,68,68,0.2)'
            : 'rgba(245,158,11,0.2)'}`,
          borderRadius: 3
        }}>
          <span style={{
            fontSize: 9,
            color: pendingRequests >= 6 ? '#ef4444' : '#f59e0b',
            fontFamily: 'var(--font-mono)'
          }}>
            {pendingRequests >= 6 ? '⚠ COORDINATOR OVERLOADED' : '⟳ COORDINATOR ACTIVE'}
          </span>
          <span style={{
            fontSize: 9,
            color: pendingRequests >= 6 ? '#ef4444' : '#f59e0b',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}>
            {pendingRequests} pending
          </span>
        </div>
      )}

      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            SPEED
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {speedValue}ms
          </span>
        </div>
        <input
          type="range"
          min={500}
          max={3000}
          step={100}
          value={speedValue}
          onChange={handleSpeedInput}
          style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
        />
      </div>

      <WhatIfPanel />
    </div>
  )
}

// ── COMPLETED VIEW ────────────────────────────────────────────
function CompletedView({ stats, currentTick }) {
  const survivalRate = stats.total > 0
    ? Math.round((stats.safe / stats.total) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{
        padding: '8px 10px',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 4,
        textAlign: 'center'
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#22c55e',
          fontWeight: 700,
          letterSpacing: '0.06em',
          marginBottom: 2
        }}>
          SIMULATION COMPLETE
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)'
        }}>
          10 ticks · 08:30 AM · Generating report...
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        <FinalStatBox label="SAFE"     value={stats.safe}    color="#22c55e" />
        <FinalStatBox label="TRAPPED"  value={stats.trapped} color="#ef4444" />
        <FinalStatBox label="SURVIVAL" value={`${survivalRate}%`} color={survivalRate >= 70 ? '#22c55e' : '#ef4444'} />
      </div>

      <div style={{
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        textAlign: 'center',
        lineHeight: 1.5
      }}>
        ↓ Scroll down to view the full report and final verdict
      </div>
    </div>
  )
}

function FinalStatBox({ label, value, color }) {
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 4,
      padding: '8px',
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 18,
        fontWeight: 700,
        color,
        lineHeight: 1
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 8,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        marginTop: 3,
        letterSpacing: '0.05em'
      }}>
        {label}
      </div>
    </div>
  )
}