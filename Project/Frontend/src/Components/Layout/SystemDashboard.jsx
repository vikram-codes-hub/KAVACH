import { useEffect, useRef } from 'react'
import { useSimulationContext } from '../../Context/SimulationContext'
import {formatLogEntry} from '../../Utils/formatLog'

export default function SystemDashboard({ expanded, onToggleExpand, height }) {
  const { logEntries, worldState } = useSimulationContext()
  const scrollRef = useRef(null)
  const simId = useRef(`sim_kavach_${Math.random().toString(36).substr(2, 8)}`)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logEntries])

  return (
    <div style={{
      height: height || 130,
      minHeight: height || 130,
      maxHeight: height || 130,
      width: '100%',                        /* spans full left-to-right */
      background: 'var(--terminal-bg)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      fontFamily: 'var(--font-terminal)',
      fontSize: 11,
      transition: 'height 0.25s ease, min-height 0.25s ease, max-height 0.25s ease'
    }}>

      {/* ── Terminal header bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 14px',
        borderBottom: '1px solid #1c1c1c',
        flexShrink: 0,
        userSelect: 'none'
      }}>

        {/* Left: traffic lights + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <span style={{
            color: '#555',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)'
          }}>
            SYSTEM DASHBOARD
          </span>
          {worldState && (
            <span style={{ color: '#383838', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              — {worldState.disaster?.type} · {worldState.disaster?.location}
            </span>
          )}
        </div>

        {/* Right: sim ID + expand button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            color: '#333',
            fontSize: 10,
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-mono)'
          }}>
            {simId.current}
          </span>

          {/* Expand / collapse toggle */}
          <button
            onClick={onToggleExpand}
            title={expanded ? 'Collapse terminal' : 'Expand terminal'}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 3,
              cursor: 'pointer',
              padding: '2px 7px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#555',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#444'
              e.currentTarget.style.color = '#888'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#555'
            }}
          >
            {/* Chevron icon */}
            <svg
              width="10" height="10" viewBox="0 0 10 10"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <polyline
                points="2,3 5,7 8,3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {expanded ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>
      </div>

      {/* ── Log scroll area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '5px 14px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          /* custom thin scrollbar */
          scrollbarWidth: 'thin',
          scrollbarColor: '#222 transparent'
        }}
      >
        {logEntries.length === 0 ? (
          <div style={{
            color: '#2e2e2e',
            fontSize: 10,
            paddingTop: 4,
            fontFamily: 'var(--font-terminal)'
          }}>
            Waiting for system events...
          </div>
        ) : (
          logEntries.map((entry, i) => {
            const formatted = formatLogEntry(entry)
            return (
              <LogLine
                key={i}
                timestamp={formatted.timestamp}
                message={formatted.message}
                color={formatted.color}
                level={entry.level}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function LogLine({ timestamp, message, color, level }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      lineHeight: 1.5,
      opacity: level === 'debug' ? 0.4 : 1
    }}>
      <span style={{
        color: '#2e2e2e',
        fontSize: 10,
        flexShrink: 0,
        fontFamily: 'var(--font-terminal)',
        paddingTop: 1
      }}>
        {timestamp}
      </span>
      <span style={{
        color,
        fontSize: 10,
        fontFamily: 'var(--font-terminal)',
        wordBreak: 'break-word',
        flex: 1
      }}>
        {message}
      </span>
    </div>
  )
}