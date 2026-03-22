import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

let globalSocket = null  // ADD THIS — singleton socket

export default function useSocket({
  onTickUpdate,
  onSimulationComplete,
  onReportReady,
  onLogEvent,
  onPipelineStep,
  onNotification
}) {
  const socketRef = useRef(null)
  const callbacksRef = useRef({})

  // Keep callbacks ref updated without recreating socket
  callbacksRef.current = {
    onTickUpdate,
    onSimulationComplete,
    onReportReady,
    onLogEvent,
    onPipelineStep,
    onNotification
  }

  useEffect(() => {
    // Reuse existing socket if already connected
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket
      _attachListeners(globalSocket, callbacksRef)
      return
    }

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 10000
    })

    globalSocket = socket
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err.message)
    })

    _attachListeners(socket, callbacksRef)

    return () => {
      _detachListeners(socket)
    }
  }, [])

  return socketRef.current
}

function _attachListeners(socket, callbacksRef) {
  socket.on('tick-update', (data) => {
    callbacksRef.current.onTickUpdate?.(data)
  })
  socket.on('simulation-complete', (data) => {
    callbacksRef.current.onSimulationComplete?.(data)
  })
  socket.on('report-ready', (data) => {
    callbacksRef.current.onReportReady?.(data)
  })
  socket.on('log-event', (data) => {
    callbacksRef.current.onLogEvent?.(data)
  })
  socket.on('pipeline-step', (data) => {
    callbacksRef.current.onPipelineStep?.(data)
  })
  socket.on('notification', (data) => {
    callbacksRef.current.onNotification?.(data)
  })
}

function _detachListeners(socket) {
  socket.off('tick-update')
  socket.off('simulation-complete')
  socket.off('report-ready')
  socket.off('log-event')
  socket.off('pipeline-step')
  socket.off('notification')
}