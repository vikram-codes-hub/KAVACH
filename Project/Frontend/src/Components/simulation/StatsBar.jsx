export default function StatsBar({ stats }) {
  const total = stats.total || 20
  const survivalRate = total > 0
    ? Math.round((stats.safe / total) * 100)
    : 0

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>

      {/* Stat pills row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4
      }}>
        <StatPill
          label="SAFE"
          value={stats.safe || 0}
          color="#22c55e"
          pulse={false}
        />
        <StatPill
          label="MOVING"
          value={stats.moving || 0}
          color="#f59e0b"
          pulse={false}
        />
        <StatPill
          label="TRAPPED"
          value={stats.trapped || 0}
          color="#ef4444"
          pulse={stats.trapped > 0}
        />
        <StatPill
          label="MANAGING"
          value={stats.managing || 0}
          color="#3b82f6"
          pulse={false}
        />
      </div>

      {/* Survival rate bar */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 3
        }}>
          <span style={{
            fontSize: 8,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em'
          }}>
            SURVIVAL RATE
          </span>
          <span style={{
            fontSize: 9,
            color: survivalRate >= 70
              ? '#22c55e'
              : survivalRate >= 40
                ? '#f59e0b'
                : '#ef4444',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}>
            {survivalRate}%
          </span>
        </div>

        {/* Stacked bar */}
        <div style={{
          height: 6,
          background: 'var(--border)',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex'
        }}>
          {/* Safe */}
          <div style={{
            width: `${(stats.safe / total) * 100}%`,
            background: '#22c55e',
            transition: 'width 0.5s ease'
          }} />
          {/* Moving */}
          <div style={{
            width: `${((stats.moving || 0) / total) * 100}%`,
            background: '#f59e0b',
            transition: 'width 0.5s ease'
          }} />
          {/* Managing */}
          <div style={{
            width: `${((stats.managing || 0) / total) * 100}%`,
            background: '#3b82f6',
            transition: 'width 0.5s ease'
          }} />
          {/* Trapped */}
          <div style={{
            width: `${((stats.trapped || 0) / total) * 100}%`,
            background: '#ef4444',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

    </div>
  )
}

function StatPill({ label, value, color, pulse }) {
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}25`,
      borderRadius: 3,
      padding: '5px 4px',
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        color,
        lineHeight: 1,
        animation: pulse ? 'pulse-badge 1s infinite' : 'none'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 7,
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