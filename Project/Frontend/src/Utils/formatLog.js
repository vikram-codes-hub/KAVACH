// Format log entries for SystemDashboard terminal display

// Log level colors for terminal
export const LOG_LEVEL_COLORS = {
  info:    '#00ff88',  // green
  success: '#00ff88',  // green
  warn:    '#f59e0b',  // amber
  warning: '#f59e0b',  // amber
  error:   '#ef4444',  // red
  debug:   '#6b7280'   // gray
}

// Log level prefixes
export const LOG_LEVEL_PREFIX = {
  info:    '  ',
  success: '✓ ',
  warn:    '⚠ ',
  warning: '⚠ ',
  error:   '✗ ',
  debug:   '· '
}

// Format a single log entry for display
export const formatLogEntry = (entry) => {
  const { timestamp, message, level } = entry
  const color = LOG_LEVEL_COLORS[level] || LOG_LEVEL_COLORS.info
  const prefix = LOG_LEVEL_PREFIX[level] || '  '

  return {
    timestamp,
    message: `${prefix}${message}`,
    color,
    level
  }
}

// Format tick event message
export const formatTickEvent = (tick, time, event) => {
  return `[TICK ${String(tick).padStart(2, '0')}]  ${time}  ${event}`
}

// Format agent event
export const formatAgentEvent = (agent, event) => {
  return `${agent.name} (${agent.role}) — ${event}`
}

// Format coordinator log entry
export const formatCoordinatorLog = (log) => {
  if (log.overloaded) {
    return `⚠ Tick ${log.tick} — Coordinator overloaded — ${log.pending} pending, ${log.actioned} actioned`
  }
  return `Tick ${log.tick} — ${log.actioned} requests actioned, ${log.pending} pending`
}

// Truncate long messages for terminal display
export const truncateMessage = (message, maxLength = 80) => {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength - 3) + '...'
}

// Format timestamp to shorter display
export const formatTimestamp = (timestamp) => {
  // Already formatted as HH:MM:SS.mmm
  return timestamp
}

// Get terminal line style based on level
export const getTerminalLineStyle = (level) => {
  return {
    color: LOG_LEVEL_COLORS[level] || LOG_LEVEL_COLORS.info,
    opacity: level === 'debug' ? 0.5 : 1
  }
}

// Format pipeline step for terminal
export const formatPipelineStep = (stepNumber, stepName, status) => {
  const statusStr = status === 'completed' ? '✓ DONE' :
                    status === 'processing' ? '⟳ RUNNING' :
                    status === 'error'      ? '✗ FAILED' : '· PENDING'
  return `[STEP ${stepNumber}] ${stepName.padEnd(30)} ${statusStr}`
}

// Format resource requirement for terminal
export const formatResourceReq = (resource, current, required) => {
  const deficit = required - current
  if (deficit <= 0) return `${resource}: OK (${current}/${required})`
  return `${resource}: DEFICIT ${deficit} (have ${current}, need ${required})`
}