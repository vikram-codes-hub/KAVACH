export default function TickCounter({ currentTick, currentTime }) {
  const tickProgress = Math.round((currentTick / 10) * 100)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>

      {/* Tick + time row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1
          }}>
            {String(currentTick).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)'
          }}>
            / 10 ticks
          </span>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          padding: '3px 10px'
        }}>
          {currentTime}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${tickProgress}%`,
          background: tickProgress < 40
            ? '#22c55e'
            : tickProgress < 70
              ? '#f59e0b'
              : '#ef4444',
          borderRadius: 2,
          transition: 'width 0.5s ease, background 0.5s ease'
        }} />
      </div>

      {/* Tick markers */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: 2
      }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i <= currentTick
                ? i < 4  ? '#22c55e'
                : i < 7  ? '#f59e0b'
                : '#ef4444'
                : 'var(--border)',
              transition: 'background 0.3s ease'
            }}
          />
        ))}
      </div>

      {/* Phase label */}
      <div style={{
        fontSize: 9,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em'
      }}>
        {currentTick < 4
          ? '● EARLY PHASE — Initial response'
          : currentTick < 7
            ? '● MID PHASE — Cascade events'
            : currentTick < 10
              ? '● CRITICAL PHASE — Peak overload'
              : '● SIMULATION COMPLETE'}
      </div>

    </div>
  )
}