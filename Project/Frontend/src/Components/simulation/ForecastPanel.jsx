import { useState, useEffect } from 'react'
import { useSimulationContext } from '../../Context/SimulationContext'
import { getSocket } from '../../Hooks/useSocket'

export default function ForecastPanel() {
  const { currentTick, pageState } = useSimulationContext()

  const [forecast,    setForecast]    = useState(null)
  const [scenarios,   setScenarios]   = useState(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [activeTab,   setActiveTab]   = useState('forecast')

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onForecast  = (data) => setForecast(data)
    const onScenario  = (data) => { setScenarios(data.scenarios); setScenarioLoading(false) }
    const onScenarioErr = () => setScenarioLoading(false)
    socket.on('tick-forecast', onForecast)
    socket.on('scenario-comparison-result', onScenario)
    socket.on('scenario-error', onScenarioErr)
    return () => {
      socket.off('tick-forecast', onForecast)
      socket.off('scenario-comparison-result', onScenario)
      socket.off('scenario-error', onScenarioErr)
    }
  }, [])

  const sendIntervention = (type, value) => getSocket()?.emit('intervention', { type, value })

  const runComparison = () => {
    setScenarioLoading(true)
    setScenarios(null)
    getSocket()?.emit('run-scenario-comparison')
  }

  if (!['running', 'ready', 'report'].includes(pageState)) return null

  return (
    <div style={{
      background: 'rgba(8,8,8,0.95)', border: '1px solid #1a1a1a',
      borderRadius: 8, padding: '12px 14px', marginTop: 12,
      fontFamily: "'Space Mono', monospace"
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[
          { id: 'forecast',  label: '📡 Forecast' },
          { id: 'intervene', label: '⚡ Intervene' },
          { id: 'compare',   label: '📊 Compare' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '5px 0', fontSize: 9, fontFamily: 'inherit',
            background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
            border: `1px solid ${activeTab === tab.id ? '#3a3a3a' : '#1a1a1a'}`,
            borderRadius: 4, color: activeTab === tab.id ? '#f0f0f0' : '#555',
            cursor: 'pointer', letterSpacing: '0.04em'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── FORECAST TAB ─────────────────────────────────────── */}
      {activeTab === 'forecast' && (
        <div>
          <div style={{ fontSize: 9, color: '#555', marginBottom: 8, letterSpacing: '0.05em' }}>
            PREDICTIVE TICK FORECASTING {currentTick < 5 ? '— AVAILABLE AT TICK 5' : ''}
          </div>

          {currentTick < 5 && (
            <div style={{ color: '#444', fontSize: 10, textAlign: 'center', padding: '16px 0' }}>
              Forecast activates at Tick 5<br/>
              <span style={{ color: '#333', fontSize: 9 }}>Collecting trend data...</span>
            </div>
          )}

          {forecast && currentTick >= 5 && (
            <div>
              {/* Cascade risk alert */}
              {forecast.cascadeRisk && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid #ef444440',
                  borderRadius: 4, padding: '6px 8px', marginBottom: 8
                }}>
                  <div style={{ color: '#ef4444', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>
                    ⚠ CASCADE FAILURE IMMINENT
                  </div>
                  <div style={{ color: '#fca5a5', fontSize: 9, marginTop: 2 }}>
                    {forecast.pendingRequests} pending requests — coordinator overload in ~2 ticks
                  </div>
                </div>
              )}

              {/* Projected stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                {[
                  { label: 'Proj. Safe',    val: forecast.projectedSafe,    color: '#22c55e' },
                  { label: 'Proj. Trapped', val: forecast.projectedTrapped, color: '#ef4444' },
                  { label: 'Proj. Survival',val: forecast.projectedSurvivalRate + '%', color: '#f59e0b' }
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    background: '#0a0a0a', border: '1px solid #1a1a1a',
                    borderRadius: 4, padding: '6px 8px', textAlign: 'center'
                  }}>
                    <div style={{ color, fontSize: 14, fontWeight: 700 }}>{val}</div>
                    <div style={{ color: '#555', fontSize: 8, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* At-risk agents */}
              {forecast.atRiskAgents?.length > 0 && (
                <div>
                  <div style={{ color: '#555', fontSize: 8, letterSpacing: '0.05em', marginBottom: 4 }}>
                    AGENTS AT HIGHEST RISK
                  </div>
                  {forecast.atRiskAgents.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '3px 0', borderBottom: '1px solid #111'
                    }}>
                      <span style={{ color: '#ccc', fontSize: 9 }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ color: '#888', fontSize: 8 }}>{a.zone}</span>
                        <span style={{
                          background: a.vulnerability === 'critical' ? '#450a0a' : '#431407',
                          color: a.vulnerability === 'critical' ? '#ef4444' : '#f97316',
                          fontSize: 7, padding: '1px 4px', borderRadius: 2
                        }}>{a.vulnerability.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendation */}
              <div style={{
                marginTop: 8, padding: '6px 8px',
                background: forecast.cascadeRisk ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
                border: `1px solid ${forecast.cascadeRisk ? '#ef444430' : '#3b82f630'}`,
                borderRadius: 4
              }}>
                <div style={{ color: '#888', fontSize: 8, marginBottom: 2 }}>RECOMMENDATION</div>
                <div style={{ color: forecast.cascadeRisk ? '#fca5a5' : '#93c5fd', fontSize: 9 }}>
                  {forecast.recommendation}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INTERVENE TAB ────────────────────────────────────── */}
      {activeTab === 'intervene' && (
        <div>
          <div style={{ fontSize: 9, color: '#555', marginBottom: 10, letterSpacing: '0.05em' }}>
            DEPLOY RESOURCES — CHANGES TAKE EFFECT NEXT TICK
          </div>

          {[
            {
              type: 'deploy_ndrf', value: 2, icon: '🚁',
              label: 'Deploy 2 NDRF Teams',
              desc: 'Rescues up to 2 critical/high vulnerability trapped agents',
              color: '#3b82f6'
            },
            {
              type: 'add_ambulance', value: 2, icon: '🚑',
              label: 'Add 2 Ambulances',
              desc: 'Reaches agents waiting for medical evacuation',
              color: '#ef4444'
            },
            {
              type: 'broadcast_alert', value: null, icon: '📢',
              label: 'Emergency Broadcast',
              desc: 'Alerts all unaware agents via loudspeaker/radio',
              color: '#f59e0b'
            },
            {
              type: 'open_shelter', value: 50, icon: '🏠',
              label: 'Open Overflow Shelter',
              desc: 'Adds 50 capacity to the fullest shelter',
              color: '#22c55e'
            }
          ].map(({ type, value, icon, label, desc, color }) => (
            <button key={type}
              onClick={() => sendIntervention(type, value)}
              disabled={pageState !== 'running'}
              style={{
                width: '100%', marginBottom: 6, padding: '8px 10px',
                background: '#0a0a0a', border: `1px solid #1a1a1a`,
                borderRadius: 5, cursor: pageState === 'running' ? 'pointer' : 'not-allowed',
                textAlign: 'left', opacity: pageState === 'running' ? 1 : 0.4,
                transition: 'border-color 0.15s'
              }}
              onMouseEnter={e => { if (pageState === 'running') e.currentTarget.style.borderColor = color + '60' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <div>
                  <div style={{ color: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>{label}</div>
                  <div style={{ color: '#555', fontSize: 8, marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            </button>
          ))}

          {pageState !== 'running' && (
            <div style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
              Interventions available during active simulation
            </div>
          )}
        </div>
      )}

      {/* ── COMPARE TAB ──────────────────────────────────────── */}
      {activeTab === 'compare' && (
        <div>
          <div style={{ fontSize: 9, color: '#555', marginBottom: 8, letterSpacing: '0.05em' }}>
            MULTI-SCENARIO COMPARISON — NO LLM REQUIRED
          </div>

          <button onClick={runComparison} disabled={scenarioLoading || !global?.simState}
            style={{
              width: '100%', padding: '8px', marginBottom: 12,
              background: scenarioLoading ? '#0a0a0a' : '#0f172a',
              border: '1px solid #1e3a5f', borderRadius: 5,
              color: scenarioLoading ? '#555' : '#60a5fa',
              fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
              letterSpacing: '0.05em'
            }}>
            {scenarioLoading ? '⏳ Running 3 scenarios...' : '▶ Run Scenario Comparison'}
          </button>

          {scenarios && (
            <div>
              {/* Survival rate bars */}
              {scenarios.map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: s.color, fontSize: 9, fontWeight: 700 }}>{s.label}</span>
                    <span style={{ color: '#888', fontSize: 9 }}>
                      {s.survivalRate}% survival | {s.finalTrapped} trapped
                    </span>
                  </div>
                  <div style={{ background: '#111', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      width: `${s.survivalRate}%`, height: '100%',
                      background: s.color, borderRadius: 3,
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              ))}

              {/* Tick-by-tick chart */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: '#555', fontSize: 8, marginBottom: 6, letterSpacing: '0.05em' }}>
                  TRAPPED AGENTS OVER TIME
                </div>
                <svg width="100%" height="80" viewBox="0 0 260 80" style={{ overflow: 'visible' }}>
                  {scenarios.map((s, si) => {
                    const pts = s.tickStats.map((t, i) => {
                      const x = (i / 10) * 250 + 5
                      const y = 75 - (t.trapped / 50) * 65
                      return `${x},${y}`
                    }).join(' ')
                    return (
                      <polyline key={si} points={pts}
                        fill="none" stroke={s.color} strokeWidth="1.5"
                        strokeOpacity="0.8" />
                    )
                  })}
                  {/* X axis labels */}
                  {[0,2,4,6,8,10].map(t => (
                    <text key={t} x={(t/10)*250+5} y="80"
                      fontSize="7" fill="#444" textAnchor="middle">T{t}</text>
                  ))}
                </svg>
              </div>

              {/* Delta summary */}
              {scenarios.length >= 3 && (
                <div style={{
                  marginTop: 8, padding: '6px 8px',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid #22c55e30',
                  borderRadius: 4
                }}>
                  <div style={{ color: '#86efac', fontSize: 9 }}>
                    Full recommendations save{' '}
                    <strong>{scenarios[2].finalSafe - scenarios[0].finalSafe} additional agents</strong>
                    {' '}(+{scenarios[2].survivalRate - scenarios[0].survivalRate}% survival rate)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}