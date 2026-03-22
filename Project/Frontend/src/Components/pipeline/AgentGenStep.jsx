import { useSimulationContext } from '../../Context/SimulationContext'
import AgentCard from '../agents/AgentCard'

const AGENT_TARGET = 50

export default function AgentGenStep({ status, data }) {
  const { agents, selectedAgent, setSelectedAgent } = useSimulationContext()

  // While generating
  if (status === 'processing') {
    const progress = Math.min(agents.length, AGENT_TARGET)
    const pct = Math.round((progress / AGENT_TARGET) * 100)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Processing badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 4
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#f59e0b',
            animation: 'pulse-badge 1s infinite',
            flexShrink: 0
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#f59e0b' }}>
            Generating agents → Groq llama-3.3-70b-versatile
          </span>
        </div>

        {/* Progress bar + counter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-secondary)'
          }}>
            <span>{progress} / {AGENT_TARGET} agents generated</span>
            <span style={{ color: '#f59e0b' }}>{pct}%</span>
          </div>
          <div style={{
            height: 3,
            background: 'var(--border)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(to right, #f59e0b, #ff6b2b)',
              borderRadius: 2,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Partial cards — show first few as they stream in */}
        {agents.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            maxHeight: 300,
            overflowY: 'auto'
          }}>
            {agents.slice(0, 10).map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              />
            ))}
            {agents.length > 10 && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                padding: '6px 0'
              }}>
                + {agents.length - 10} more generating...
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Completed
  if (status === 'completed') {
    const displayAgents = agents.length > 0 ? agents : (data?.agents || [])
    const total = displayAgents.length

    const distribution = data?.distribution || {
      blue:  displayAgents.filter(a => a.group === 'blue').length,
      red:   displayAgents.filter(a => a.group === 'red').length,
      amber: displayAgents.filter(a => a.group === 'amber').length,
      green: displayAgents.filter(a => a.group === 'green').length
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Distribution bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            marginBottom: 2
          }}>
            AGENT DISTRIBUTION — {total} TOTAL
          </div>

          <div style={{
            display: 'flex', height: 6, borderRadius: 3,
            overflow: 'hidden', gap: 1
          }}>
            <div style={{ flex: distribution.blue,  background: '#3b82f6', borderRadius: '3px 0 0 3px' }} />
            <div style={{ flex: distribution.red,   background: '#ef4444' }} />
            <div style={{ flex: distribution.amber, background: '#f59e0b' }} />
            <div style={{ flex: distribution.green, background: '#22c55e', borderRadius: '0 3px 3px 0' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { color: '#3b82f6', label: 'Responders', count: distribution.blue },
              { color: '#ef4444', label: 'Vulnerable',  count: distribution.red },
              { color: '#f59e0b', label: 'Mobile',      count: distribution.amber },
              { color: '#22c55e', label: 'Volunteers',  count: distribution.green }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: item.color, flexShrink: 0
                }} />
                <span style={{
                  fontSize: 9, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)'
                }}>
                  {item.count} {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent cards grid — 2 col, scrollable */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          maxHeight: 500,
          overflowY: 'auto',
          paddingRight: 2,
          scrollbarWidth: 'thin',
          scrollbarColor: '#1e1e1e transparent'
        }}>
          {displayAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
            />
          ))}
        </div>

      </div>
    )
  }

  return null
}