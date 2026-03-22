import { useSimulationContext } from '../../Context/SimulationContext'
import AgentCard from './AgentCard'

export default function AgentGrid() {
  const {
    agents,
    selectedAgent,
    setSelectedAgent,
    pageState
  } = useSimulationContext()

  if (!agents || agents.length === 0) return null

  // Group agents by their group type
  const groups = {
    blue:  agents.filter(a => a.group === 'blue'),
    red:   agents.filter(a => a.group === 'red'),
    amber: agents.filter(a => a.group === 'amber'),
    green: agents.filter(a => a.group === 'green')
  }

  const groupConfig = [
    {
      key: 'blue',
      label: 'Responders',
      color: '#3b82f6',
      icon: '🚨'
    },
    {
      key: 'red',
      label: 'Vulnerable',
      color: '#ef4444',
      icon: '🆘'
    },
    {
      key: 'amber',
      label: 'Mobile Citizens',
      color: '#f59e0b',
      icon: '🚶'
    },
    {
      key: 'green',
      label: 'Volunteers',
      color: '#22c55e',
      icon: '🤝'
    }
  ]

  // Stats for running simulation
  const stats = {
    safe:     agents.filter(a => a.status === 'safe').length,
    trapped:  agents.filter(a => a.status === 'trapped').length,
    moving:   agents.filter(a => ['moving', 'active', 'helping'].includes(a.status)).length
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>

      {/* Quick stats bar — shown during simulation */}
      {['running', 'report'].includes(pageState) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6
        }}>
          <MiniStat label="SAFE"    value={stats.safe}    color="#22c55e" />
          <MiniStat label="MOVING"  value={stats.moving}  color="#f59e0b" />
          <MiniStat label="TRAPPED" value={stats.trapped} color="#ef4444" />
        </div>
      )}

      {/* Group sections */}
      {groupConfig.map(group => {
        const groupAgents = groups[group.key]
        if (!groupAgents || groupAgents.length === 0) return null

        return (
          <div key={group.key}>

            {/* Group header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: `1px solid ${group.color}20`
            }}>
              <span style={{ fontSize: 11 }}>{group.icon}</span>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: group.color,
                letterSpacing: '0.05em'
              }}>
                {group.label.toUpperCase()}
              </span>
              <span style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                {groupAgents.length} agents
              </span>

              {/* Live status counts for this group */}
              {['running', 'report'].includes(pageState) && (
                <div style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  gap: 6
                }}>
                  {groupAgents.filter(a => a.status === 'trapped').length > 0 && (
                    <span style={{
                      fontSize: 9,
                      color: '#ef4444',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {groupAgents.filter(a => a.status === 'trapped').length} trapped
                    </span>
                  )}
                  {groupAgents.filter(a => a.status === 'safe').length > 0 && (
                    <span style={{
                      fontSize: 9,
                      color: '#22c55e',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {groupAgents.filter(a => a.status === 'safe').length} safe
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Agent cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 5
            }}>
              {groupAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent?.id === agent.id}
                  onClick={() => setSelectedAgent(
                    selectedAgent?.id === agent.id ? null : agent
                  )}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Selected agent detail panel */}
      {selectedAgent && (
        <SelectedAgentDetail agent={selectedAgent} />
      )}

    </div>
  )
}

// Mini stat box
function MiniStat({ label, value, color }) {
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 4,
      padding: '5px 8px',
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 16,
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
        marginTop: 2,
        letterSpacing: '0.05em'
      }}>
        {label}
      </div>
    </div>
  )
}

// Selected agent full detail panel
function SelectedAgentDetail({ agent }) {
  const groupColor = {
    blue:  '#3b82f6',
    red:   '#ef4444',
    amber: '#f59e0b',
    green: '#22c55e'
  }[agent.group] || '#888'

  const statusColor = {
    safe:       '#22c55e',
    trapped:    '#ef4444',
    moving:     '#f59e0b',
    managing:   '#3b82f6',
    helping:    '#86efac',
    blocked:    '#f97316',
    overloaded: '#ef4444',
    unaware:    '#6b7280',
    active:     '#a78bfa'
  }[agent.status] || '#888'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${groupColor}30`,
      borderRadius: 6,
      padding: '12px 12px',
      borderLeft: `3px solid ${groupColor}`
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            marginTop: 1
          }}>
            {agent.role} · {agent.age} years old
          </div>
        </div>

        {agent.status && (
          <div style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: statusColor,
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
            borderRadius: 3,
            padding: '3px 8px'
          }}>
            {agent.status.toUpperCase()}
          </div>
        )}
      </div>

      {/* Location */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-terminal)',
        marginBottom: 8
      }}>
        📍 {agent.neighborhood} · {agent.zone}
      </div>

      {/* Current thought */}
      {agent.currentThought && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 4,
          marginBottom: 8,
          borderLeft: `2px solid ${statusColor}50`
        }}>
          "{agent.currentThought}"
        </div>
      )}

      {/* Backstory */}
      {agent.backstory && (
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5,
          marginBottom: 8
        }}>
          {agent.backstory}
        </div>
      )}

      {/* Properties grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4
      }}>
        <PropRow
          label="Vehicle"
          value={agent.hasVehicle ? 'Yes' : 'No'}
          valueColor={agent.hasVehicle ? '#22c55e' : '#ef4444'}
        />
        <PropRow
          label="Smartphone"
          value={agent.hasSmartphone ? 'Yes' : 'No'}
          valueColor={agent.hasSmartphone ? '#22c55e' : '#ef4444'}
        />
        <PropRow
          label="Alert Received"
          value={agent.receivedAlert ? 'Yes' : 'No'}
          valueColor={agent.receivedAlert ? '#22c55e' : '#ef4444'}
        />
        <PropRow
          label="Vulnerability"
          value={agent.vulnerability}
          valueColor={{
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#f97316',
            critical: '#ef4444'
          }[agent.vulnerability] || '#888'}
        />
        <PropRow
          label="Destination"
          value={agent.destination || 'Unknown'}
          valueColor="var(--text-secondary)"
        />
        <PropRow
          label="Zone Risk"
          value={agent.zoneRisk || 'Unknown'}
          valueColor={
            agent.zoneRisk === 'red'   ? '#ef4444' :
            agent.zoneRisk === 'amber' ? '#f59e0b' :
            '#22c55e'
          }
        />
      </div>

      {/* Rescue need */}
      {agent.needsRescue && (
        <div style={{
          marginTop: 8,
          padding: '5px 8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 3,
          fontSize: 10,
          color: '#ef4444',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700
        }}>
          🆘 RESCUE NEEDED — {agent.rescueType?.replace(/_/g, ' ').toUpperCase() || 'IMMEDIATE'}
        </div>
      )}
    </div>
  )
}

// Property row
function PropRow({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '3px 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <span style={{
        fontSize: 9,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 9,
        color: valueColor,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        textTransform: 'capitalize'
      }}>
        {value}
      </span>
    </div>
  )
}