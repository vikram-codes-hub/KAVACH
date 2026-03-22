export default function WorldStateStep({ status, data }) {
  if (!data) return null

  const { zones, blockedRoads, shelters, hospitals, responders, disaster } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Disaster info */}
      {disaster && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 4,
          padding: '6px 10px'
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#ef4444',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: 2
          }}>
            {disaster.type?.toUpperCase()} — {disaster.severity?.toUpperCase()}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)'
          }}>
            {disaster.location}, {disaster.state}
            {disaster.river && ` · ${disaster.river} overflow`}
          </div>
        </div>
      )}

      {/* Zone counters */}
      {zones && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6
        }}>
          <StatBox
            label="RED ZONES"
            value={zones.red?.length || 0}
            color="#ef4444"
          />
          <StatBox
            label="AMBER ZONES"
            value={zones.amber?.length || 0}
            color="#f59e0b"
          />
          <StatBox
            label="SAFE ZONES"
            value={zones.safe?.length || 0}
            color="#22c55e"
          />
        </div>
      )}

      {/* Infrastructure counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6
      }}>
        <StatBox
          label="SHELTERS"
          value={shelters?.length || 0}
          color="#3b82f6"
        />
        <StatBox
          label="HOSPITALS"
          value={hospitals?.length || 0}
          color="#a855f7"
        />
        <StatBox
          label="RESPONDERS"
          value={responders?.length || 0}
          color="#06b6d4"
        />
      </div>

      {/* Zone tags */}
      {zones && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Red zones */}
          {zones.red?.length > 0 && (
            <div>
              <div style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                marginBottom: 4,
                letterSpacing: '0.06em'
              }}>
                RED ZONES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {zones.red.map((z, i) => (
                  <ZoneTag key={i} name={z} color="#ef4444" bg="rgba(239,68,68,0.1)" />
                ))}
              </div>
            </div>
          )}

          {/* Amber zones */}
          {zones.amber?.length > 0 && (
            <div>
              <div style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                marginBottom: 4,
                letterSpacing: '0.06em'
              }}>
                AMBER ZONES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {zones.amber.map((z, i) => (
                  <ZoneTag key={i} name={z} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
                ))}
              </div>
            </div>
          )}

          {/* Safe zones */}
          {zones.safe?.length > 0 && (
            <div>
              <div style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                marginBottom: 4,
                letterSpacing: '0.06em'
              }}>
                SAFE ZONES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {zones.safe.map((z, i) => (
                  <ZoneTag key={i} name={z} color="#22c55e" bg="rgba(34,197,94,0.1)" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blocked roads */}
      {blockedRoads?.length > 0 && (
        <div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            letterSpacing: '0.06em'
          }}>
            BLOCKED ROADS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {blockedRoads.map((road, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)'
              }}>
                <div style={{
                  width: 16,
                  height: 3,
                  background: '#ef4444',
                  borderRadius: 1,
                  flexShrink: 0
                }} />
                {road}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shelter list */}
      {shelters?.length > 0 && (
        <div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            letterSpacing: '0.06em'
          }}>
            ACTIVE SHELTERS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {shelters.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                padding: '3px 6px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 3
              }}>
                <span>🏠 {s.name}</span>
                <span style={{
                  color: '#22c55e',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9
                }}>
                  {s.capacity} cap
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// Stat box component
function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '6px 8px',
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

// Zone tag component
function ZoneTag({ name, color, bg }) {
  return (
    <span style={{
      fontSize: 9,
      fontFamily: 'var(--font-body)',
      color,
      background: bg,
      border: `1px solid ${color}40`,
      borderRadius: 3,
      padding: '2px 6px',
      whiteSpace: 'nowrap'
    }}>
      {name}
    </span>
  )
}