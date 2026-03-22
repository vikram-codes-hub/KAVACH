import { useSimulationContext } from '../../Context/SimulationContext'

export default function TopNav({
  stepLabel,
  stepStatus,
  currentTick,
  currentTime,
  stats,
  pageState
}) {
  const { worldState, disasterLabel, locationName } = useSimulationContext()

  const getStatusDot = () => {
    switch (stepStatus) {
      case 'processing': return { color: '#f59e0b', label: 'Processing', pulse: true }
      case 'ready':      return { color: '#22c55e', label: 'Ready', pulse: false }
      case 'running':    return { color: '#3b82f6', label: 'Simulation Running', pulse: true }
      case 'completed':  return { color: '#22c55e', label: 'Complete', pulse: false }
      case 'error':      return { color: '#ef4444', label: 'Error', pulse: false }
      default:           return { color: '#555555', label: 'Idle', pulse: false }
    }
  }

  const dot = getStatusDot()

  return (
    <div style={{
      height: 'var(--topnav-height)',
      background: '#0a0a0a',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      flexShrink: 0,
      zIndex: 100
    }}>

      {/* Left — Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 180
      }}>
        <span style={{ fontSize: 16 }}>🌊</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.06em'
        }}>
         KAVACH
        </span>
        {worldState && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            borderLeft: '1px solid var(--border)',
            paddingLeft: 8,
            marginLeft: 4
          }}>
            {locationName}
          </span>
        )}
      </div>

      {/* Center — Step progress tabs */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
      }}>
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'World State' },
          { num: 3, label: 'Agents' },
          { num: 4, label: 'Simulate' }
        ].map((step, i) => {
          const isActive = (() => {
            if (pageState === 'upload' && step.num === 1)      return true
            if (pageState === 'processing' && step.num <= 2)   return true
            if (pageState === 'ready' && step.num <= 3)        return true
            if (['running', 'report'].includes(pageState))     return true
            return false
          })()

          const isCurrent = (() => {
            if (pageState === 'upload' && step.num === 1)       return true
            if (pageState === 'processing' && step.num === 2)   return true
            if (pageState === 'ready' && step.num === 3)        return true
            if (pageState === 'running' && step.num === 4)      return true
            if (pageState === 'report' && step.num === 4)       return true
            return false
          })()

          return (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 3,
                background: isCurrent ? 'rgba(255,107,43,0.12)' :
                            isActive  ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isCurrent ? '1px solid rgba(255,107,43,0.4)' :
                        isActive  ? '1px solid var(--border)' : '1px solid transparent'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: isCurrent ? 'var(--accent-orange)' :
                         isActive  ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 400
                }}>
                  {String(step.num).padStart(2, '0')}
                </span>
                <span style={{
                  fontSize: 10,
                  color: isCurrent ? 'var(--text-primary)' :
                         isActive  ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isCurrent ? 600 : 400
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < 3 && (
                <div style={{
                  width: 16,
                  height: 1,
                  background: isActive ? 'var(--border-light)' : 'var(--border)'
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Right — Status + Tick + Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 280,
        justifyContent: 'flex-end'
      }}>

        {/* Tick counter — shown when running */}
        {['running', 'report'].includes(pageState) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '3px 10px'
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)'
            }}>
              TICK
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              {currentTick}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-secondary)'
            }}>
              {currentTime}
            </span>
          </div>
        )}

        {/* Live stats — shown when running */}
        {['running', 'report'].includes(pageState) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatPill label="SAFE"    value={stats.safe}    color="#22c55e" />
            <StatPill label="MOVING"  value={stats.moving}  color="#f59e0b" />
            <StatPill label="TRAPPED" value={stats.trapped} color="#ef4444" />
          </div>
        )}

        {/* Status dot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dot.color,
            animation: dot.pulse ? 'pulse-dot 1.5s infinite' : 'none',
            flexShrink: 0
          }} />
          <span style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap'
          }}>
            {dot.label}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

// Small stat pill component
function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      <div style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: color,
        flexShrink: 0
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)'
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        color
      }}>
        {value}
      </span>
    </div>
  )
}