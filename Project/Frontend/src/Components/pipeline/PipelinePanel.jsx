import { useSimulationContext } from '../../Context/SimulationContext'
import StepCard from './StepCard'
import WorldStateStep from './WorldStateStep'
import AgentGenStep from './AgentGenStep'
import SimConfigStep from './SimConfigStep'
import SimRunStep from './SimRunStep'
import ReportPanel from '../report/ReportPanel'

export default function PipelinePanel() {
  const {
    stepStatuses,
    stepData,
    pageState,
    reportReady
  } = useSimulationContext()

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      scrollbarWidth: 'thin',
      scrollbarColor: '#1e1e1e transparent'
    }}>

      {/* ── Panel header — exactly like MiroFish ── */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-panel)'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#888',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          Simulation Pipeline
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: '#444',
          background: '#1a1a1a',
          border: '1px solid #252525',
          padding: '2px 7px',
          borderRadius: 3
        }}>
          4 STEPS
        </span>
      </div>

      {/* ── Pipeline step cards ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>

        <StepCard
          number="01"
          title="World State Extraction"
          endpoint="POST /api/upload"
          description="Gemini 1.5 Flash analyzes the disaster advisory PDF and extracts zones, roads, shelters, hospitals, and responder positions."
          status={stepStatuses.worldState}
        >
          <WorldStateStep
            status={stepStatuses.worldState}
            data={stepData.worldState}
          />
        </StepCard>

        <StepCard
          number="02"
          title="Agent Generation"
          endpoint="POST /api/agents"
          description="Claude claude-sonnet-4-5 generates 20 representative citizens specific to this disaster scenario and location."
          status={stepStatuses.agentGen}
        >
          <AgentGenStep
            status={stepStatuses.agentGen}
            data={stepData.agentGen}
          />
        </StepCard>

        <StepCard
          number="03"
          title="Simulation Configuration"
          endpoint="POST /api/simulation/config"
          description="Simulation parameters derived from world state and agent distribution."
          status={stepStatuses.simConfig}
        >
          <SimConfigStep
            status={stepStatuses.simConfig}
            data={stepData.simConfig}
          />
        </StepCard>

        <StepCard
          number="04"
          title="Simulation Run"
          endpoint="POST /api/simulation/start"
          description="Real-time multi-agent simulation with BFS disaster spread and agent decision engine."
          status={stepStatuses.simRun}
          highlight={
            pageState === 'ready' ||
            pageState === 'running' ||
            pageState === 'report'
          }
        >
          <SimRunStep
            status={stepStatuses.simRun}
            data={stepData.simRun}
          />
        </StepCard>

        {(pageState === 'report' || reportReady) && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <ReportPanel />
          </div>
        )}

        {/* ── Pre-upload hint — only visible before PDF is uploaded ── */}
        {pageState === 'upload' && (
          <div style={{
            margin: '16px',
            padding: '14px 16px',
            background: 'rgba(255,107,43,0.04)',
            border: '1px dashed rgba(255,107,43,0.2)',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#ff6b2b',
              letterSpacing: '0.06em'
            }}>
              ↖ UPLOAD PDF TO BEGIN
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: '#444',
              lineHeight: 1.6
            }}>
              Upload an Uttarakhand disaster advisory on the left to start the pipeline. Each step will activate automatically.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}