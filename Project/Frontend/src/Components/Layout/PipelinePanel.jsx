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
      gap: 0
    }}>

      {/* Panel header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Simulation Pipeline
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)'
        }}>
          4 steps
        </span>
      </div>

      {/* Step cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>

        {/* Step 01 — World State */}
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

        {/* Step 02 — Agent Generation */}
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

        {/* Step 03 — Simulation Config */}
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

        {/* Step 04 — Simulation Run */}
        <StepCard
          number="04"
          title="Simulation Run"
          endpoint="POST /api/simulation/start"
          description="Real-time multi-agent simulation with BFS disaster spread and agent decision engine."
          status={stepStatuses.simRun}
          highlight={pageState === 'ready'}
        >
          <SimRunStep
            status={stepStatuses.simRun}
            data={stepData.simRun}
          />
        </StepCard>

        {/* Report — appears after simulation complete */}
        {(pageState === 'report' || reportReady) && (
          <div style={{
            borderTop: '1px solid var(--border)'
          }}>
            <ReportPanel />
          </div>
        )}

      </div>
    </div>
  )
}