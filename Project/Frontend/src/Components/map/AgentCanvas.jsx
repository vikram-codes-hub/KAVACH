import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import { useSimulationContext } from '../../Context/SimulationContext'
import {
  getAgentFillColor,
  getAgentBorderColor,
  getAgentRadius,
  shouldPulse,
  getPulseColor
} from '../../Utils/agentColors'

export default function AgentCanvas() {
  const map = useMap()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animFrameRef = useRef(null)
  const pulseRef = useRef(0)
  const {
    agents,
    selectedAgent,
    setSelectedAgent,
    pageState
  } = useSimulationContext()

  // ── CANVAS SETUP ─────────────────────────────────────────
  useEffect(() => {
    if (!map) return

    const mapContainer = map.getContainer()

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.zIndex = '500'
    canvas.style.pointerEvents = 'all'
    canvas.style.cursor = 'default'

    mapContainer.appendChild(canvas)
    canvasRef.current = canvas
    containerRef.current = mapContainer

    // Size canvas
    const resize = () => {
      canvas.width = mapContainer.offsetWidth
      canvas.height = mapContainer.offsetHeight
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mapContainer)

    // Click handler
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      handleCanvasClick(x, y)
    }

    canvas.addEventListener('click', handleClick)

    // Mousemove for cursor change
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const hit = findAgentAtPixel(x, y)
      canvas.style.cursor = hit ? 'pointer' : 'default'
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousemove', handleMouseMove)
      resizeObserver.disconnect()
      if (mapContainer.contains(canvas)) {
        mapContainer.removeChild(canvas)
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [map])

  // ── FIND AGENT AT PIXEL ──────────────────────────────────
  const findAgentAtPixel = useCallback((x, y) => {
    if (!map || !agents.length) return null

    for (const agent of agents) {
      const point = map.latLngToContainerPoint([agent.lat, agent.lng])
      const radius = getAgentRadius(agent, false) + 4
      const dist = Math.sqrt(
        Math.pow(point.x - x, 2) +
        Math.pow(point.y - y, 2)
      )
      if (dist <= radius) return agent
    }
    return null
  }, [map, agents])

  // ── CLICK HANDLER ────────────────────────────────────────
  const handleCanvasClick = useCallback((x, y) => {
    const hit = findAgentAtPixel(x, y)
    if (hit) {
      setSelectedAgent(prev =>
        prev && prev.id === hit.id ? null : hit
      )
    } else {
      setSelectedAgent(null)
    }
  }, [findAgentAtPixel, setSelectedAgent])

  // ── DRAW LOOP ────────────────────────────────────────────
  useEffect(() => {
    if (!map || !canvasRef.current) return
    if (!['ready', 'running', 'report'].includes(pageState)) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    let frame = 0

    const draw = () => {
      if (!canvas || !map) return

      frame++
      pulseRef.current = (Math.sin(frame * 0.08) + 1) / 2 // 0 to 1

      const w = canvas.width
      const h = canvas.height

      // Clear
      ctx.clearRect(0, 0, w, h)

      if (!agents || agents.length === 0) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      // Draw all agents
      agents.forEach(agent => {
        const point = map.latLngToContainerPoint([agent.lat, agent.lng])
        const x = point.x
        const y = point.y

        // Skip if off canvas
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return

        const isSelected = selectedAgent && selectedAgent.id === agent.id
        const radius = getAgentRadius(agent, isSelected)
        const fillColor = getAgentFillColor(agent)
        const borderColor = getAgentBorderColor(agent, isSelected)
        const pulse = shouldPulse(agent)
        const pulseColor = getPulseColor(agent)

        // Draw pulse ring
        if (pulse) {
          const pulseRadius = radius + 4 + pulseRef.current * 8
          const pulseAlpha = 0.6 - pulseRef.current * 0.5
          ctx.beginPath()
          ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
          ctx.fillStyle = pulseColor.replace(')', `, ${pulseAlpha})`).replace('rgba', 'rgba')
          ctx.fill()
        }

        // Draw selection ring
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(x, y, radius + 5, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'
          ctx.lineWidth = 2
          ctx.stroke()

          // Outer pulsing selection ring
          const selPulse = radius + 8 + pulseRef.current * 4
          ctx.beginPath()
          ctx.arc(x, y, selPulse, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,255,255,${0.3 - pulseRef.current * 0.2})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Draw agent dot shadow
        ctx.beginPath()
        ctx.arc(x + 1, y + 1, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fill()

        // Draw agent dot fill
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()

        // Draw border
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = borderColor
        ctx.lineWidth = isSelected ? 2 : 1.5
        ctx.stroke()

        // Draw status icon inside dot for key statuses
        if (agent.status === 'trapped') {
          ctx.fillStyle = '#ffffff'
          ctx.font = `bold ${radius * 0.9}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('!', x, y)
        } else if (agent.status === 'safe') {
          ctx.fillStyle = '#ffffff'
          ctx.font = `bold ${radius * 0.8}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('✓', x, y)
        }

        // Draw tooltip on selected agent
        if (isSelected) {
          drawAgentTooltip(ctx, agent, x, y, w, h)
        }
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [map, agents, selectedAgent, pageState])

  return null
}

// ── TOOLTIP RENDERER ─────────────────────────────────────────
function drawAgentTooltip(ctx, agent, x, y, canvasW, canvasH) {
  const padding = 10
  const lineH = 16
  const maxWidth = 220

  const lines = [
    { text: agent.name, bold: true, color: '#f0f0f0', size: 12 },
    { text: agent.role, bold: false, color: '#888888', size: 10 },
    { text: `${agent.zone} · ${agent.neighborhood}`, bold: false, color: '#555555', size: 9 },
    { text: '─────────────────────', bold: false, color: '#333333', size: 9 },
    { text: agent.currentThought || agent.initialThought || '', bold: false, color: '#cccccc', size: 10, wrap: true }
  ]

  // Status badge line
  const statusColors = {
    safe: '#22c55e', trapped: '#ef4444', moving: '#f59e0b',
    managing: '#3b82f6', helping: '#86efac', blocked: '#f97316',
    overloaded: '#ef4444', unaware: '#6b7280', active: '#a78bfa'
  }

  // Calculate tooltip dimensions
  const tooltipH = lines.length * lineH + padding * 2 + 8
  const tooltipW = maxWidth

  // Position tooltip — keep on screen
  let tx = x + 14
  let ty = y - tooltipH / 2

  if (tx + tooltipW > canvasW - 10) tx = x - tooltipW - 14
  if (ty < 10) ty = 10
  if (ty + tooltipH > canvasH - 10) ty = canvasH - tooltipH - 10

  // Background
  ctx.fillStyle = 'rgba(10,10,10,0.95)'
  ctx.strokeStyle = statusColors[agent.status] || '#333333'
  ctx.lineWidth = 1

  // Rounded rect
  const r = 4
  ctx.beginPath()
  ctx.moveTo(tx + r, ty)
  ctx.lineTo(tx + tooltipW - r, ty)
  ctx.quadraticCurveTo(tx + tooltipW, ty, tx + tooltipW, ty + r)
  ctx.lineTo(tx + tooltipW, ty + tooltipH - r)
  ctx.quadraticCurveTo(tx + tooltipW, ty + tooltipH, tx + tooltipW - r, ty + tooltipH)
  ctx.lineTo(tx + r, ty + tooltipH)
  ctx.quadraticCurveTo(tx, ty + tooltipH, tx, ty + tooltipH - r)
  ctx.lineTo(tx, ty + r)
  ctx.quadraticCurveTo(tx, ty, tx + r, ty)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Status bar on left
  ctx.fillStyle = statusColors[agent.status] || '#333333'
  ctx.fillRect(tx, ty + r, 3, tooltipH - r * 2)

  // Status badge
  const statusLabel = agent.status?.toUpperCase() || 'UNKNOWN'
  ctx.fillStyle = statusColors[agent.status] || '#333333'
  ctx.font = 'bold 8px Space Mono, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(statusLabel, tx + tooltipW - padding, ty + padding)

  // Draw lines
  let currentY = ty + padding
  ctx.textAlign = 'left'

  lines.forEach((line, i) => {
    if (!line.text) return

    ctx.fillStyle = line.color
    ctx.font = `${line.bold ? 'bold' : 'normal'} ${line.size}px ${line.bold ? 'DM Sans' : 'Fira Code'}, monospace`
    ctx.textBaseline = 'top'

    if (line.wrap) {
      // Word wrap for thought text
      const words = line.text.split(' ')
      let currentLine = ''
      let wrappedY = currentY

      words.forEach(word => {
        const testLine = currentLine + word + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > tooltipW - padding * 2 - 8 && currentLine !== '') {
          ctx.fillText(currentLine.trim(), tx + padding + 6, wrappedY)
          currentLine = word + ' '
          wrappedY += lineH - 2
        } else {
          currentLine = testLine
        }
      })
      if (currentLine.trim()) {
        ctx.fillText(currentLine.trim(), tx + padding + 6, wrappedY)
      }
      currentY = wrappedY + lineH
    } else {
      // Truncate if too long
      let text = line.text
      const maxW = tooltipW - padding * 2 - 8
      while (ctx.measureText(text).width > maxW && text.length > 3) {
        text = text.slice(0, -1)
      }
      if (text !== line.text) text += '...'
      ctx.fillText(text, tx + padding + 6, currentY)
      currentY += lineH
    }
  })

  // Properties row at bottom
  const props = []
  if (agent.hasVehicle)     props.push('🚗 Vehicle')
  if (agent.hasSmartphone)  props.push('📱 Smartphone')
  if (!agent.hasSmartphone && agent.hasPhone) props.push('📞 Basic Phone')
  if (!agent.hasPhone)      props.push('❌ No Phone')

  if (props.length > 0) {
    ctx.fillStyle = '#444444'
    ctx.font = '8px Fira Code, monospace'
    ctx.fillText(props.join('  '), tx + padding + 6, ty + tooltipH - padding - 8)
  }
}