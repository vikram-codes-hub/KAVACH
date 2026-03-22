import {
  getAgentFillColor,
  getVulnerabilityColor,
  GROUP_LABELS
} from '../../Utils/agentColors'

export default function AgentCard({ agent, isSelected, onClick }) {
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
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.02)',
        border: isSelected
          ? `1px solid ${groupColor}60`
          : '1px solid var(--border)',
        borderRadius: 4,
        padding: '8px 9px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        borderLeft: `3px solid ${groupColor}`
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 4,
        marginBottom: 4
      }}>
        {/* Name + handle */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-terminal)',
            marginTop: 1
          }}>
            @{agent.neighborhood?.replace(/\s+/g, '_').toLowerCase().slice(0, 16)}
          </div>
        </div>

        {/* Group badge */}
        <div style={{
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: groupColor,
          background: `${groupColor}15`,
          border: `1px solid ${groupColor}30`,
          borderRadius: 2,
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          {GROUP_LABELS[agent.group] || agent.group}
        </div>
      </div>

      {/* Role */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        marginBottom: 5,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {agent.role}
        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
          · {agent.age}y
        </span>
      </div>

      {/* Backstory — shown when selected */}
      {isSelected && agent.backstory && (
        <div style={{
          fontSize: 10,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5,
          marginBottom: 6,
          padding: '5px 7px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 3,
          borderLeft: `2px solid ${groupColor}40`
        }}>
          {agent.backstory}
        </div>
      )}

      {/* Current thought — shown when selected */}
      {isSelected && agent.currentThought && (
        <div style={{
          fontSize: 10,
          color: statusColor,
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5,
          marginBottom: 6,
          fontStyle: 'italic'
        }}>
          "{agent.currentThought}"
        </div>
      )}

      {/* Property tags */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: agent.status ? 5 : 0
      }}>
        <PropTag
          label={agent.vulnerability}
          color={getVulnerabilityColor(agent.vulnerability)}
        />
        {agent.hasVehicle && (
          <PropTag label="Vehicle" color="#6b7280" />
        )}
        {agent.hasSmartphone && (
          <PropTag label="Smartphone" color="#6b7280" />
        )}
        {!agent.hasSmartphone && agent.hasPhone && (
          <PropTag label="Basic Phone" color="#6b7280" />
        )}
        {!agent.hasPhone && (
          <PropTag label="No Phone" color="#ef4444" />
        )}
      </div>

      {/* Status badge — shown during/after simulation */}
      {agent.status && agent.status !== 'active' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
          paddingTop: 4,
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
            animation: agent.status === 'trapped'
              ? 'pulse-badge 1s infinite'
              : 'none'
          }} />
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: statusColor,
            letterSpacing: '0.05em'
          }}>
            {agent.status.toUpperCase()}
          </span>
          {agent.needsRescue && (
            <span style={{
              fontSize: 8,
              color: '#ef4444',
              fontFamily: 'var(--font-mono)',
              marginLeft: 'auto'
            }}>
              RESCUE NEEDED
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Small property tag
function PropTag({ label, color }) {
  return (
    <span style={{
      fontSize: 8,
      fontFamily: 'var(--font-mono)',
      color,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: 2,
      padding: '1px 5px',
      textTransform: 'capitalize'
    }}>
      {label}
    </span>
  )
}