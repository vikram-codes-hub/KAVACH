import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useSimulationContext } from '../../Context/SimulationContext'

const LINK_COLORS = {
  rescue:         '#3b82f6',   // blue — responder → trapped
  volunteer_help: '#22c55e',   // green — volunteer → person
  distress_call:  '#f59e0b',   // amber — agent → coordinator
  broken:         '#ef4444'    // red — no phone, broken link
}

export default function CommNetworkOverlay({ visible }) {
  const map        = useMap()
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const frameRef   = useRef(0)
  const { commLinks, pageState } = useSimulationContext()

  useEffect(() => {
    if (!map) return

    const container = map.getContainer()
    const canvas    = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;'
    container.appendChild(canvas)
    canvasRef.current = canvas

    const resize = () => {
      canvas.width  = container.offsetWidth
      canvas.height = container.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (container.contains(canvas)) container.removeChild(canvas)
    }
  }, [map])

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (!canvasRef.current || !map) return

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    const draw = () => {
      frameRef.current++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!visible || !commLinks || commLinks.length === 0) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const pulse = (Math.sin(frameRef.current * 0.06) + 1) / 2  // 0→1

      commLinks.forEach(link => {
        if (!link.from) return
        const fromPt = map.latLngToContainerPoint([link.from.lat, link.from.lng])

        if (link.type === 'broken') {
          // Broken link: pulsing red X at agent position
          const x = fromPt.x, y = fromPt.y
          const alpha = 0.4 + pulse * 0.5
          ctx.strokeStyle = `rgba(239,68,68,${alpha})`
          ctx.lineWidth = 2
          ctx.beginPath(); ctx.moveTo(x-6, y-6); ctx.lineTo(x+6, y+6); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(x+6, y-6); ctx.lineTo(x-6, y+6); ctx.stroke()
          return
        }

        if (!link.to) return
        const toPt = map.latLngToContainerPoint([link.to.lat, link.to.lng])

        const color = LINK_COLORS[link.type] || '#ffffff'
        const alpha = link.type === 'distress_call'
          ? 0.3 + pulse * 0.4
          : 0.5 + pulse * 0.3

        // Draw line
        ctx.beginPath()
        ctx.moveTo(fromPt.x, fromPt.y)
        ctx.lineTo(toPt.x, toPt.y)
        ctx.strokeStyle = color.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', '')

        // Parse hex to rgba properly
        const r = parseInt(color.slice(1,3),16)
        const g = parseInt(color.slice(3,5),16)
        const b = parseInt(color.slice(5,7),16)
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.lineWidth   = link.type === 'rescue' ? 2 : 1.5
        ctx.setLineDash(link.type === 'distress_call' ? [4, 4] : [])
        ctx.stroke()
        ctx.setLineDash([])

        // Animated dot travelling along the line
        if (link.active) {
          const t   = (frameRef.current * 0.015 + link.from.id * 0.1) % 1
          const dx  = toPt.x - fromPt.x
          const dy  = toPt.y - fromPt.y
          const dotX = fromPt.x + dx * t
          const dotY = fromPt.y + dy * t

          ctx.beginPath()
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
          ctx.fill()
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [map, commLinks, visible])

  return null
}