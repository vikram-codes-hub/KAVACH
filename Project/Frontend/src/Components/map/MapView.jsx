import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationContext } from '../../Context/SimulationContext'
import AgentCanvas from './AgentCanvas'
import ZoneOverlays from './ZoneOverlays'

import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Agent / Zone type legend entries ──────────────────────────
const AGENT_TYPES = [
  { color: '#3b82f6', label: 'Responder' },
  { color: '#f59e0b', label: 'Mobile Citizen' },
  { color: '#ef4444', label: 'Vulnerable' },
  { color: '#22c55e', label: 'Volunteer' },
]

const ZONE_TYPES = [
  { color: 'rgba(239,68,68,0.55)',   border: '#ef4444', label: 'Red Zone' },
  { color: 'rgba(245,158,11,0.45)',  border: '#f59e0b', label: 'Amber Zone' },
  { color: 'rgba(34,197,94,0.35)',   border: '#22c55e', label: 'Safe Zone' },
]

export default function MapView() {
  const { mapCenter, pageState, agents } = useSimulationContext()

  // Show legend only when there's something to show (agents loaded or simulation running)
  const showAgentLegend = agents.length > 0 || pageState === 'running'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapCenter.zoom || 12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          maxZoom={19}
        />
        <MapController />
        <ZoneOverlays />
        <AgentCanvas />
      </MapContainer>

      {/* ── Entity / Agent types legend (bottom-left, always visible after upload) ── */}
      {showAgentLegend && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 12,
          zIndex: 800,
          background: 'rgba(10,10,10,0.88)',
          border: '1px solid #252525',
          borderRadius: 6,
          padding: '10px 14px',
          backdropFilter: 'blur(6px)',
          minWidth: 160
        }}>
          {/* Agent types header */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#ff6b2b',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 8,
            fontWeight: 600
          }}>
            Agent Types
          </div>

          {AGENT_TYPES.map(({ color, label }) => (
            <LegendRow key={label} color={color} label={label} shape="circle" />
          ))}

          {/* Divider */}
          <div style={{
            height: 1,
            background: '#1e1e1e',
            margin: '9px 0'
          }} />

          {/* Zone types header */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#ff6b2b',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 8,
            fontWeight: 600
          }}>
            Zone Types
          </div>

          {ZONE_TYPES.map(({ color, border, label }) => (
            <LegendRow key={label} color={color} border={border} label={label} shape="square" />
          ))}
        </div>
      )}

      {/* ── Minimal map attribution ── */}
      <div style={{
        position: 'absolute',
        bottom: 6,
        right: 8,
        fontSize: 9,
        color: '#333',
        fontFamily: 'var(--font-mono)',
        zIndex: 800,
        pointerEvents: 'none'
      }}>
        © OSM · CARTO
      </div>
    </div>
  )
}

// Single legend row
function LegendRow({ color, border, label, shape }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 5
    }}>
      {shape === 'circle' ? (
        <div style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 4px ${color}88`
        }} />
      ) : (
        <div style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          border: `1px solid ${border}`,
          flexShrink: 0
        }} />
      )}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: '#aaa',
        letterSpacing: '0.02em'
      }}>
        {label}
      </span>
    </div>
  )
}

// Inner component to fly map to new center
function MapController() {
  const map = useMap()
  const { mapCenter } = useSimulationContext()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (!mapCenter) return
    const key = `${mapCenter.lat},${mapCenter.lng}`
    if (prevCenter.current === key) return
    prevCenter.current = key
    map.flyTo(
      [mapCenter.lat, mapCenter.lng],
      mapCenter.zoom || 12,
      { duration: 1.5, easeLinearity: 0.25 }
    )
  }, [mapCenter, map])

  return null
}