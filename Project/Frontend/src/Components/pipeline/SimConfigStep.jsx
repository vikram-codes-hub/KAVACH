import { useSimulationContext } from '../../Context/SimulationContext'

export default function SimConfigStep({ status, data }) {
  const { worldState, agents } = useSimulationContext()

  if (!data && !worldState) return null

  const disaster    = worldState?.disaster || {}
  const shelters    = worldState?.shelters || []
  const responders  = worldState?.responders || []
  const blockedRoads = worldState?.blocked_roads || []

  const total = agents.length || 100

  const distribution = {
    blue:  agents.filter(a => a.group === 'blue').length,
    red:   agents.filter(a => a.group === 'red').length,
    amber: agents.filter(a => a.group === 'amber').length,
    green: agents.filter(a => a.group === 'green').length
  }

  const totalCapacity = shelters.reduce((sum, s) => sum + (s.capacity || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Simulation parameters grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <ConfigBox label="TOTAL TICKS"       value="10"          sub="simulation steps" />
        <ConfigBox label="TICK INTERVAL"     value="1500ms"      sub="per tick default" />
        <ConfigBox label="START TIME"        value="06:00 AM"    sub="disaster onset" />
        <ConfigBox label="END TIME"          value="08:30 AM"    sub="2.5 hours total" />
        <ConfigBox label="ACTIVE AGENTS"     value={total}       sub="across 4 groups" />
        <ConfigBox
          label="SHELTER CAPACITY"
          value={totalCapacity || '—'}
          sub="total beds available"
        />
      </div>

      {/* Disaster origin */}
      <div style={{
        padding: '7px 10px',
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 4
      }}>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4
        }}>
          DISASTER ORIGIN
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          {disaster.type || 'Unknown'} · {disaster.severity || 'Unknown'} severity
        </div>
        <div style={{
          fontSize: 10, color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)', marginTop: 2
        }}>
          Spreading from{' '}
          <span style={{ color: '#ef4444' }}>
            {worldState?.zones?.red?.[0] || 'red zones'}
          </span>
          {' '}outward via BFS algorithm
        </div>
      </div>

      {/* Agent distribution bar */}
      <div>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 5
        }}>
          AGENT CONFIGURATION — {total} TOTAL
        </div>

        <div style={{
          display: 'flex', height: 8, borderRadius: 4,
          overflow: 'hidden', gap: 1, marginBottom: 6
        }}>
          <BarSegment flex={distribution.blue}  color="#3b82f6" />
          <BarSegment flex={distribution.red}   color="#ef4444" />
          <BarSegment flex={distribution.amber} color="#f59e0b" />
          <BarSegment flex={distribution.green} color="#22c55e" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {[
            { color: '#3b82f6', label: 'Responders', count: distribution.blue },
            { color: '#ef4444', label: 'Vulnerable',  count: distribution.red },
            { color: '#f59e0b', label: 'Mobile',      count: distribution.amber },
            { color: '#22c55e', label: 'Volunteers',  count: distribution.green }
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontWeight: 700, color: item.color, lineHeight: 1
              }}>
                {item.count}
              </div>
              <div style={{
                fontSize: 8, color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)', marginTop: 2
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Initial conditions */}
      <div>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 5
        }}>
          INITIAL CONDITIONS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <ConditionRow icon="🚫" color="#ef4444"
            label={`${blockedRoads.length} road${blockedRoads.length !== 1 ? 's' : ''} blocked from advisory`}
          />
          <ConditionRow icon="🏠" color="#22c55e"
            label={`${shelters.length} shelter${shelters.length !== 1 ? 's' : ''} activated — ${totalCapacity} total capacity`}
          />
          <ConditionRow icon="🚨" color="#3b82f6"
            label={`${responders.length} responder unit${responders.length !== 1 ? 's' : ''} deployed`}
          />
          <ConditionRow icon="📱" color="#f59e0b"
            label={`${agents.filter(a => !a.hasSmartphone).length} agents will receive zero digital alert`}
          />
          <ConditionRow icon="⚠" color="#ef4444"
            label={`${agents.filter(a => a.vulnerability === 'critical').length} agents with critical vulnerability`}
          />
        </div>
      </div>

      {/* Tick timeline */}
      <div>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 5
        }}>
          TICK TIMELINE
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          overflowX: 'auto', paddingBottom: 2
        }}>
          {Array.from({ length: 11 }, (_, i) => {
            const totalMinutes = i * 15
            const hours = 6 + Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            const isKey = i === 0 || i === 3 || i === 6 || i === 10
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', flex: 1, minWidth: 28
              }}>
                <div style={{
                  width: isKey ? 8 : 5, height: isKey ? 8 : 5,
                  borderRadius: '50%',
                  background: i === 0 ? '#22c55e' : i === 10 ? '#ef4444' :
                               isKey ? '#f59e0b' : 'var(--border-light)',
                  marginBottom: 3, flexShrink: 0
                }} />
                {isKey && (
                  <div style={{
                    fontSize: 7, color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap'
                  }}>
                    {time}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{
          height: 3,
          background: 'linear-gradient(to right, #22c55e, #f59e0b, #ef4444)',
          borderRadius: 2, marginTop: 2
        }} />
      </div>

    </div>
  )
}

function ConfigBox({ label, value, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      borderRadius: 4, padding: '7px 9px'
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
        color: 'var(--text-primary)', lineHeight: 1, marginBottom: 3
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 1
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', opacity: 0.7
      }}>
        {sub}
      </div>
    </div>
  )
}

function BarSegment({ flex, color }) {
  return (
    <div style={{ flex, background: color, minWidth: flex > 0 ? 4 : 0 }} />
  )
}

function ConditionRow({ icon, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 10, color: 'var(--text-secondary)',
      fontFamily: 'var(--font-body)', padding: '2px 0'
    }}>
      <span style={{ fontSize: 10, flexShrink: 0 }}>{icon}</span>
      <span style={{ color }}>{label}</span>
    </div>
  )
}