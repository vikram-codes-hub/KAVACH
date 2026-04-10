import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useSimulationContext } from '../../Context/SimulationContext'
import AgentCanvas from './AgentCanvas'
import ZoneOverlays from './ZoneOverlays'
import VulnerabilityHeatmap from './VulnerabilityHeatmap'
import CommNetworkOverlay from './CommNetworkOverlay'

import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showComm,    setShowComm]    = useState(false)
  const [legendOpen,  setLegendOpen]  = useState(false)

  const showAgentLegend = agents.length > 0 || pageState === 'running'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Map layer toggle buttons */}
      {showAgentLegend && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 900,
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {[
            { key: 'heatmap', label: '🌡 Vulnerability', active: showHeatmap, toggle: () => setShowHeatmap(v => !v) },
            { key: 'comm',    label: '📡 Comm Network',  active: showComm,    toggle: () => setShowComm(v => !v) }
          ].map(({ key, label, active, toggle }) => (
            <button key={key} onClick={toggle} style={{
              padding: '5px 10px', fontSize: 9, fontFamily: "'Space Mono', monospace",
              background: active ? 'rgba(255,107,43,0.15)' : 'rgba(8,8,8,0.88)',
              border: `1px solid ${active ? '#ff6b2b60' : '#252525'}`,
              borderRadius: 4, color: active ? '#ff6b2b' : '#666',
              cursor: 'pointer', letterSpacing: '0.04em', backdropFilter: 'blur(6px)',
              whiteSpace: 'nowrap'
            }}>{label}</button>
          ))}
        </div>
      )}

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
        <VulnerabilityHeatmap visible={showHeatmap} />
        <CommNetworkOverlay   visible={showComm} />
        <AgentCanvas />
      </MapContainer>

      {/* ── Legend — collapsible on mobile ── */}
      {showAgentLegend && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 12,
          zIndex: 800,
          background: 'rgba(10,10,10,0.88)',
          border: '1px solid #252525',
          borderRadius: 6,
          backdropFilter: 'blur(6px)',
          minWidth: 160,
          overflow: 'hidden'
        }}>
          {/* Legend toggle header (mobile-friendly) */}
          <button
            onClick={() => setLegendOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#ff6b2b',
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            <span>Legend</span>
            <span style={{
              transform: legendOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              fontSize: 10
            }}>▾</span>
          </button>

          {/* Legend body — hidden on small screens until toggled */}
          <div style={{
            padding: legendOpen ? '0 14px 10px' : 0,
            maxHeight: legendOpen ? 300 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.25s ease, padding 0.25s ease'
          }}
          className="map-legend-body"
          >
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

            <div style={{ height: 1, background: '#1e1e1e', margin: '9px 0' }} />

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

      <style>{`
        /* On wider screens, always show legend body */
        @media (min-width: 640px) {
          .map-legend-body {
            max-height: 300px !important;
            padding: 0 14px 10px !important;
          }
        }
      `}</style>
    </div>
  )
}

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
          width: 9, height: 9, borderRadius: '50%', background: color,
          flexShrink: 0, boxShadow: `0 0 4px ${color}88`
        }} />
      ) : (
        <div style={{
          width: 10, height: 10, borderRadius: 2, background: color,
          border: `1px solid ${border}`, flexShrink: 0
        }} />
      )}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: '#aaa', letterSpacing: '0.02em'
      }}>
        {label}
      </span>
    </div>
  )
}

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