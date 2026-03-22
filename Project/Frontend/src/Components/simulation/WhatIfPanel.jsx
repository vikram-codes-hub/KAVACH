import { useState } from 'react'
import { useSimulationContext } from '../../Context/SimulationContext'

const TRIGGERS = [
  {
    id: 'close_bridge',
    label: 'Close Main Bridge',
    icon: '🌉',
    description: 'Remove key road — agents reroute or get trapped',
    group: 'danger',
    color: '#ef4444'
  },
  {
    id: 'shelter_full',
    label: 'Shelter A Full',
    icon: '🏠',
    description: 'Mark primary shelter at capacity — overflow triggered',
    group: 'danger',
    color: '#ef4444'
  },
  {
    id: 'hospital_power',
    label: 'Hospital Power Failure',
    icon: '🏥',
    description: 'Cut hospital power — equipment at risk',
    group: 'danger',
    color: '#ef4444'
  },
  {
    id: 'misinformation',
    label: 'Spread Misinformation',
    icon: '📱',
    description: 'False social media post reroutes 3 agents',
    group: 'warning',
    color: '#f59e0b'
  },
  {
    id: 'heavy_rain',
    label: 'Heavy Rain',
    icon: '🌧',
    description: 'Disaster spreads 40% faster — movement slowed',
    group: 'warning',
    color: '#f59e0b'
  },
  {
    id: 'deploy_ndrf',
    label: 'Deploy Extra NDRF',
    icon: '🚁',
    description: 'Rescue 2 critical trapped agents immediately',
    group: 'help',
    color: '#22c55e'
  }
]

export default function WhatIfPanel() {
  const { handleWhatIf, pageState, isRunning } = useSimulationContext()
  const [triggered, setTriggered] = useState({})

  const isActive = pageState === 'running' || isRunning

  const handleClick = (triggerId) => {
    if (triggered[triggerId]) return
    handleWhatIf(triggerId)
    setTriggered(prev => ({ ...prev, [triggerId]: true }))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>

      {/* Header */}
      <div style={{
        fontSize: 9,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        marginBottom: 2
      }}>
        WHAT-IF SCENARIOS
      </div>

      {/* Group: Danger */}
      <GroupLabel label="CRITICAL TRIGGERS" color="#ef4444" />
      {TRIGGERS.filter(t => t.group === 'danger').map(trigger => (
        <TriggerButton
          key={trigger.id}
          trigger={trigger}
          triggered={triggered[trigger.id]}
          disabled={!isActive}
          onClick={() => handleClick(trigger.id)}
        />
      ))}

      {/* Group: Warning */}
      <GroupLabel label="STRESS TRIGGERS" color="#f59e0b" />
      {TRIGGERS.filter(t => t.group === 'warning').map(trigger => (
        <TriggerButton
          key={trigger.id}
          trigger={trigger}
          triggered={triggered[trigger.id]}
          disabled={!isActive}
          onClick={() => handleClick(trigger.id)}
        />
      ))}

      {/* Group: Help */}
      <GroupLabel label="INTERVENTION" color="#22c55e" />
      {TRIGGERS.filter(t => t.group === 'help').map(trigger => (
        <TriggerButton
          key={trigger.id}
          trigger={trigger}
          triggered={triggered[trigger.id]}
          disabled={!isActive}
          onClick={() => handleClick(trigger.id)}
        />
      ))}

      {/* Disabled hint */}
      {!isActive && (
        <div style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          textAlign: 'center',
          marginTop: 2,
          fontStyle: 'italic'
        }}>
          Available during simulation
        </div>
      )}

    </div>
  )
}

function GroupLabel({ label, color }) {
  return (
    <div style={{
      fontSize: 8,
      color,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.06em',
      opacity: 0.7,
      marginTop: 2
    }}>
      {label}
    </div>
  )
}

function TriggerButton({ trigger, triggered, disabled, onClick }) {
  const [hover, setHover] = useState(false)

  const isDisabled = disabled || triggered

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '7px 10px',
        background: triggered
          ? 'rgba(255,255,255,0.02)'
          : hover && !isDisabled
            ? `${trigger.color}10`
            : 'rgba(255,255,255,0.02)',
        border: triggered
          ? `1px solid ${trigger.color}20`
          : hover && !isDisabled
            ? `1px solid ${trigger.color}50`
            : '1px solid var(--border)',
        borderRadius: 4,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !triggered ? 0.4 : triggered ? 0.5 : 1,
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textAlign: 'left'
      }}
    >
      {/* Icon */}
      <span style={{
        fontSize: 14,
        flexShrink: 0,
        filter: triggered ? 'grayscale(1)' : 'none'
      }}>
        {triggered ? '✓' : trigger.icon}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          color: triggered
            ? 'var(--text-muted)'
            : 'var(--text-primary)',
          marginBottom: 1
        }}>
          {trigger.label}
        </div>
        <div style={{
          fontSize: 9,
          fontFamily: 'var(--font-body)',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {triggered ? 'Triggered' : trigger.description}
        </div>
      </div>

      {/* Color dot */}
      {!triggered && (
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: trigger.color,
          flexShrink: 0,
          opacity: isDisabled ? 0.3 : 1
        }} />
      )}
    </button>
  )
}