import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationContext } from '../../Context/SimulationContext'

// ── Zone styles ───────────────────────────────────────────────
const ZONE_STYLES = {
  red: {
    color:       '#ef4444',
    fillColor:   '#ef4444',
    fillOpacity: 0.15,
    weight:      2,
    opacity:     0.8,
    dashArray:   null
  },
  amber: {
    color:       '#f59e0b',
    fillColor:   '#f59e0b',
    fillOpacity: 0.10,
    weight:      1.5,
    opacity:     0.6,
    dashArray:   null
  },
  safe: {
    color:       '#22c55e',
    fillColor:   '#22c55e',
    fillOpacity: 0.08,
    weight:      1.5,
    opacity:     0.5,
    dashArray:   '6,4'
  }
}

// ── Known district bounding boxes for Uttarakhand ────────────
// These are real approximate bounding boxes — fallback when
// infrastructure coords are insufficient
const KNOWN_DISTRICTS = {
  'dehradun':    { lat: 30.316, lng: 78.032, size: 0.15 },
  'haridwar':    { lat: 29.945, lng: 78.164, size: 0.10 },
  'rishikesh':   { lat: 30.087, lng: 78.268, size: 0.07 },
  'mussoorie':   { lat: 30.459, lng: 78.064, size: 0.06 },
  'chamoli':     { lat: 30.417, lng: 79.317, size: 0.18 },
  'rudraprayag': { lat: 30.285, lng: 78.980, size: 0.12 },
  'uttarkashi':  { lat: 30.727, lng: 78.435, size: 0.15 },
  'tehri':       { lat: 30.378, lng: 78.480, size: 0.12 },
  'pauri':       { lat: 30.147, lng: 78.780, size: 0.12 },
  'nainital':    { lat: 29.380, lng: 79.464, size: 0.10 },
  'almora':      { lat: 29.597, lng: 79.659, size: 0.12 },
  // Rajasthan
  'jaipur':      { lat: 26.912, lng: 75.787, size: 0.20 },
  'ramganj':     { lat: 26.895, lng: 75.760, size: 0.06 },
  'sanganer':    { lat: 26.827, lng: 75.791, size: 0.06 },
  'mansarovar':  { lat: 26.846, lng: 75.754, size: 0.05 },
  'malviya':     { lat: 26.852, lng: 75.797, size: 0.05 },
  'jagatpura':   { lat: 26.821, lng: 75.831, size: 0.05 },
  'vaishali':    { lat: 26.921, lng: 75.738, size: 0.05 },
  'civil lines': { lat: 26.934, lng: 75.814, size: 0.04 },
  // Generic fallbacks
  'walled city': { lat: 26.924, lng: 75.826, size: 0.04 },
  'chandpole':   { lat: 26.928, lng: 75.822, size: 0.03 },
}

// Get bounding polygon for a zone
const buildZonePolygon = (zoneName, worldState, zoneType, zoneIndex, totalZones) => {
  if (!worldState) return null
  const center = worldState.map_center
  if (!center) return null

  // Try known district match first
  const lowerName = zoneName.toLowerCase()
  for (const [key, district] of Object.entries(KNOWN_DISTRICTS)) {
    if (lowerName.includes(key) || key.includes(lowerName.split(' ')[0])) {
      const { lat, lng, size } = district
      const pad = zoneType === 'red' ? size : zoneType === 'amber' ? size * 0.9 : size * 0.8
      return buildOctagon(lat, lng, pad)
    }
  }

  // Try infrastructure coords
  const coords = []
  const sources = [
    ...(worldState.shelters   || []),
    ...(worldState.hospitals  || []),
    ...(worldState.responders || [])
  ]
  sources.forEach(item => {
    if (!item.zone) return
    if (
      item.zone.toLowerCase().includes(lowerName) ||
      lowerName.includes(item.zone.toLowerCase())
    ) {
      if (item.lat && item.lng) coords.push([item.lat, item.lng])
    }
  })

  if (coords.length >= 2) {
    const lats = coords.map(c => c[0])
    const lngs = coords.map(c => c[1])
    const pad  = zoneType === 'red' ? 0.035 : 0.028
    return buildOctagon(
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      pad
    )
  }

  // Fallback: spread around map center
  const col = zoneIndex % 3
  const row = Math.floor(zoneIndex / 3)
  const spread = 0.06
  const cLat = center.lat + (row - 1) * spread * 1.2
  const cLng = center.lng + (col - 1) * spread * 1.2
  const size  = zoneType === 'red' ? 0.04 : zoneType === 'amber' ? 0.035 : 0.03
  return buildOctagon(cLat, cLng, size)
}

// Build an octagonal polygon — looks more like a real district than a rectangle
const buildOctagon = (lat, lng, size) => {
  const s  = size
  const s2 = size * 0.7
  return [
    [lat + s2, lng - s ],
    [lat + s,  lng - s2],
    [lat + s,  lng + s2],
    [lat + s2, lng + s ],
    [lat - s2, lng + s ],
    [lat - s,  lng + s2],
    [lat - s,  lng - s2],
    [lat - s2, lng - s ]
  ]
}

export default function ZoneOverlays() {
  const map = useMap()
  const {
    worldState,
    affectedNodes,
    currentTick,
    pageState,
    shelterOccupancy
  } = useSimulationContext()

  const zoneLayersRef   = useRef({})  // zoneName -> { polygon, label }
  const markerLayersRef = useRef([])
  const pulseIntRef     = useRef(null)
  const pulseValRef     = useRef(0)
  const floodLayersRef  = useRef([])

  // ── Inject CSS once ─────────────────────────────────────
  useEffect(() => {
    const id = 'kavach-zone-styles'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.innerHTML = `
      .kavach-tooltip {
        background: rgba(8,8,8,0.95) !important;
        border: 1px solid #2a2a2a !important;
        border-radius: 5px !important;
        color: #f0f0f0 !important;
        font-family: 'DM Sans', sans-serif !important;
        font-size: 11px !important;
        padding: 6px 10px !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6) !important;
        white-space: nowrap !important;
      }
      .leaflet-tooltip-top.kavach-tooltip::before {
        border-top-color: #2a2a2a !important;
      }
      .zone-label-pill {
        pointer-events: none;
        user-select: none;
      }
    `
    document.head.appendChild(style)
  }, [])

  // ── Draw zone polygons ───────────────────────────────────
  useEffect(() => {
    if (!worldState || !map) return

    // Clear old layers
    Object.values(zoneLayersRef.current).forEach(({ polygon, label }) => {
      try { map.removeLayer(polygon) } catch (_) {}
      try { map.removeLayer(label)   } catch (_) {}
    })
    zoneLayersRef.current = {}
    if (pulseIntRef.current) clearInterval(pulseIntRef.current)

    const allZones = [
      ...worldState.zones.red.map(  (z, i) => ({ name: z, type: 'red',   idx: i })),
      ...worldState.zones.amber.map((z, i) => ({ name: z, type: 'amber', idx: worldState.zones.red.length + i })),
      ...worldState.zones.safe.map( (z, i) => ({ name: z, type: 'safe',  idx: worldState.zones.red.length + worldState.zones.amber.length + i }))
    ]

    allZones.forEach(({ name, type, idx }) => {
      const polygon = buildZonePolygon(name, worldState, type, idx, allZones.length)
      if (!polygon) return

      const style = { ...ZONE_STYLES[type] }
      const layer = L.polygon(polygon, style)

      // Centroid for label
      const cLat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length
      const cLng = polygon.reduce((s, p) => s + p[1], 0) / polygon.length

      const textColor = type === 'red' ? '#fca5a5' : type === 'amber' ? '#fde68a' : '#86efac'
      const borderColor = type === 'red' ? '#ef444460' : type === 'amber' ? '#f59e0b60' : '#22c55e60'
      const bgColor = type === 'red' ? 'rgba(239,68,68,0.15)' : type === 'amber' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)'
      const typeLabel = type === 'red' ? '🔴' : type === 'amber' ? '🟡' : '🟢'

      const labelIcon = L.divIcon({
        className: 'zone-label-pill',
        html: `
          <div style="
            background: rgba(5,5,5,0.82);
            color: ${textColor};
            font-size: 10px;
            font-family: 'Space Mono', monospace;
            font-weight: 700;
            padding: 3px 9px 3px 7px;
            border-radius: 12px;
            border: 1px solid ${borderColor};
            white-space: nowrap;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 4px;
            backdrop-filter: blur(4px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          ">
            <span style="font-size:8px">${typeLabel}</span>
            ${name}
          </div>`,
        iconAnchor: [60, 10],
        iconSize:   [120, 20]
      })

      const labelMarker = L.marker([cLat, cLng], {
        icon: labelIcon,
        interactive: false,
        zIndexOffset: 200
      })

      layer.addTo(map)
      labelMarker.addTo(map)
      zoneLayersRef.current[name] = { polygon: layer, label: labelMarker, type }
    })

    // ── Smooth pulse for red zones ─────────────────────────
    let step = 0
    pulseIntRef.current = setInterval(() => {
      step++
      const opacity = 0.12 + Math.sin(step * 0.08) * 0.08
      Object.values(zoneLayersRef.current).forEach(({ polygon, type }) => {
        if (type === 'red') {
          polygon.setStyle({ fillOpacity: Math.max(0.04, opacity) })
        }
      })
    }, 80)

    return () => {
      if (pulseIntRef.current) clearInterval(pulseIntRef.current)
    }
  }, [worldState, map])

  // ── Infrastructure markers ──────────────────────────────
  useEffect(() => {
    if (!worldState || !map) return
    markerLayersRef.current.forEach(m => { try { map.removeLayer(m) } catch (_) {} })
    markerLayersRef.current = []

    // Shelters
    ;(worldState.shelters || []).forEach(shelter => {
      const occupancy = shelterOccupancy?.[shelter.name] || 0
      const pct       = Math.round((occupancy / (shelter.capacity || 1)) * 100)
      const full      = pct >= 100
      const nearFull  = pct >= 80

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background: ${full ? '#450a0a' : '#052e16'};
            border: 2px solid ${full ? '#ef4444' : nearFull ? '#f59e0b' : '#22c55e'};
            border-radius: 5px;
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px;
            box-shadow: 0 0 10px ${full ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.4)'};
            position: relative;
          ">
            🏠
            ${full ? `<div style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;font-size:7px;font-family:monospace;font-weight:700;padding:1px 3px;border-radius:2px;">FULL</div>` : ''}
          </div>`,
        iconAnchor: [14, 14]
      })

      const m = L.marker([shelter.lat, shelter.lng], { icon })
        .bindTooltip(`
          <div style="font-family:monospace">
            <b>${shelter.name}</b><br/>
            <span style="font-size:10px;color:#aaa">Capacity: ${shelter.capacity} persons</span><br/>
            <span style="font-size:10px;color:${full ? '#ef4444' : '#22c55e'}">
              ${full ? '⚠ FULL' : `${occupancy}/${shelter.capacity} occupied (${pct}%)`}
            </span>
          </div>`,
          { className: 'kavach-tooltip', direction: 'top', offset: [0, -5] }
        )

      m.addTo(map)
      markerLayersRef.current.push(m)
    })

    // Hospitals
    ;(worldState.hospitals || []).forEach(hospital => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background: #450a0a;
            border: 2px solid #ef4444;
            border-radius: 50%;
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px;
            box-shadow: 0 0 10px rgba(239,68,68,0.5);
          ">🏥</div>`,
        iconAnchor: [14, 14]
      })

      const m = L.marker([hospital.lat, hospital.lng], { icon })
        .bindTooltip(`
          <div style="font-family:monospace">
            <b>${hospital.name}</b><br/>
            <span style="font-size:10px;color:#aaa">Emergency Medical Hub</span>
          </div>`,
          { className: 'kavach-tooltip', direction: 'top', offset: [0, -5] }
        )

      m.addTo(map)
      markerLayersRef.current.push(m)
    })

    // Responders
    ;(worldState.responders || []).forEach(responder => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background: #0c1a2e;
            border: 2px solid #3b82f6;
            border-radius: 5px;
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px;
            box-shadow: 0 0 10px rgba(59,130,246,0.5);
          ">🚨</div>`,
        iconAnchor: [14, 14]
      })

      const m = L.marker([responder.lat, responder.lng], { icon })
        .bindTooltip(`
          <div style="font-family:monospace">
            <b>${responder.name}</b><br/>
            <span style="font-size:10px;color:#aaa">${responder.type}</span>
          </div>`,
          { className: 'kavach-tooltip', direction: 'top', offset: [0, -5] }
        )

      m.addTo(map)
      markerLayersRef.current.push(m)
    })

  }, [worldState, map, shelterOccupancy])

  // ── Disaster spread — intensify red zones per tick ──────
  useEffect(() => {
    if (!worldState || !map) return
    if (currentTick === 0) return

    // Red zones get darker and border intensifies as ticks advance
    const intensity = Math.min(currentTick / 10, 1)

    Object.values(zoneLayersRef.current).forEach(({ polygon, type }) => {
      if (type === 'red') {
        polygon.setStyle({
          fillOpacity: 0.15 + intensity * 0.20,
          weight:      2 + intensity * 2,
          color:       `rgb(${Math.round(239 + intensity * 16)}, ${Math.round(68 - intensity * 40)}, ${Math.round(68 - intensity * 40)})`
        })
      }
      if (type === 'amber' && currentTick >= 3) {
        polygon.setStyle({
          fillOpacity: 0.10 + intensity * 0.10,
          weight: 1.5 + intensity * 1
        })
      }
    })

    // Add blue flood spread circles at affected nodes
    floodLayersRef.current.forEach(l => { try { map.removeLayer(l) } catch (_) {} })
    floodLayersRef.current = []

    if (affectedNodes && affectedNodes.length > 0 && worldState.map_center) {
      // Draw flood origin ripple at red zone centroids
      worldState.zones.red.forEach(zoneName => {
        const zoneData = zoneLayersRef.current[zoneName]
        if (!zoneData) return

        const polygon = zoneData.polygon
        const bounds  = polygon.getBounds()
        const center  = bounds.getCenter()

        const ripple = L.circle([center.lat, center.lng], {
          radius:      currentTick * 800,
          color:       '#3b82f6',
          fillColor:   '#3b82f6',
          fillOpacity: Math.max(0.02, 0.12 - currentTick * 0.01),
          weight:      1,
          opacity:     0.4,
          dashArray:   '4,4'
        })

        ripple.addTo(map)
        floodLayersRef.current.push(ripple)
      })
    }

  }, [currentTick, affectedNodes, worldState, map])

  return null
}