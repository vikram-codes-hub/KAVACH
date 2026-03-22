import { useRef } from 'react'
import { useSimulationContext } from '../../Context/SimulationContext'
import VerdictSection from './VerdictSection'

// Report CSS — exact styles from the HTML report files you provided
const REPORT_CSS = `
  .report { max-width: 100%; background: #fff; padding: 36px 40px; color: #1a1a1a; font-family: 'Times New Roman', serif; }
  .report-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 20px; }
  .gov-line { font-size: 10px; letter-spacing: 0.08em; color: #444; text-transform: uppercase; text-align: center; }
  .report-title { font-size: 18px; font-weight: bold; text-align: center; margin: 8px 0 4px; letter-spacing: 0.03em; }
  .report-sub { font-size: 12px; text-align: center; color: #333; }
  .alert-strip { border: 2px solid #cc0000; padding: 6px 14px; text-align: center; margin: 14px 0; }
  .alert-strip p { font-size: 13px; font-weight: bold; color: #cc0000; margin: 0; letter-spacing: 0.05em; }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 12px 0; }
  .meta-table td { padding: 4px 8px; border: 1px solid #ccc; }
  .meta-table td:first-child { font-weight: bold; background: #f5f5f5; width: 35%; }
  .section-title { font-size: 12px; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.04em; margin: 20px 0 8px; }
  .body-text { font-size: 11.5px; line-height: 1.8; margin: 0 0 8px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .summary-box { border: 1px solid #ccc; padding: 8px; text-align: center; }
  .summary-box .snum { font-size: 22px; font-weight: bold; }
  .summary-box .slbl { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .s-safe { border-color: #2d7a2d; } .s-safe .snum { color: #2d7a2d; }
  .s-trapped { border-color: #cc0000; } .s-trapped .snum { color: #cc0000; }
  .s-partial { border-color: #cc7700; } .s-partial .snum { color: #cc7700; }
  .s-total { border-color: #1a1a1a; } .s-total .snum { color: #1a1a1a; }
  .failure-block { border-left: 4px solid #cc0000; padding: 10px 14px; margin: 10px 0; background: #fff8f8; }
  .failure-num { font-size: 10px; font-weight: bold; color: #cc0000; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .failure-title { font-size: 12px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px; }
  .failure-body { font-size: 11px; line-height: 1.7; color: #333; }
  .failure-agent { font-style: italic; color: #cc0000; }
  .failure-pop { font-size: 10px; color: #555; margin-top: 4px; font-style: italic; }
  .warning-block { border-left: 4px solid #cc7700; padding: 10px 14px; margin: 10px 0; background: #fffaf0; }
  .warning-num { font-size: 10px; font-weight: bold; color: #cc7700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .success-block { border-left: 4px solid #2d7a2d; padding: 10px 14px; margin: 10px 0; background: #f5fff5; }
  .success-num { font-size: 10px; font-weight: bold; color: #2d7a2d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .timeline-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 10px 0; }
  .timeline-table th { background: #1a1a1a; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; letter-spacing: 0.03em; }
  .timeline-table td { padding: 5px 8px; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  .timeline-table tr:nth-child(even) { background: #f9f9f9; }
  .td-tick { font-weight: bold; color: #1a1a1a; white-space: nowrap; }
  .td-event { color: #333; }
  .td-impact { color: #cc0000; font-style: italic; }
  .resource-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0; }
  .resource-table th { background: #333; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; }
  .resource-table td { padding: 5px 8px; border-bottom: 0.5px solid #ddd; }
  .res-full { color: #cc0000; font-weight: bold; }
  .res-ok { color: #2d7a2d; font-weight: bold; }
  .res-warn { color: #cc7700; font-weight: bold; }
  .bar-wrap { display: flex; align-items: center; gap: 6px; }
  .bar-bg { flex: 1; height: 8px; background: #eee; border-radius: 2px; }
  .bar-fill { height: 100%; border-radius: 2px; }
  .bar-red { background: #cc0000; }
  .bar-green { background: #2d7a2d; }
  .bar-amber { background: #cc7700; }
  .rec-block { border: 1px solid #1a1a1a; padding: 10px 14px; margin: 8px 0; }
  .rec-num { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .rec-title { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
  .rec-body { font-size: 11px; line-height: 1.7; color: #333; }
  .volunteer-row { display: flex; gap: 8px; padding: 4px 0; border-bottom: 0.5px solid #ddd; font-size: 11px; }
  .volunteer-row:last-child { border-bottom: none; }
  .vname { font-weight: bold; min-width: 160px; }
  .vrescued { color: #2d7a2d; }
  .sig-section { display: flex; justify-content: space-between; margin-top: 30px; font-size: 10px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #1a1a1a; width: 150px; margin: 20px auto 4px; }
  .stamp { border: 2px solid #1a1a1a; padding: 6px 10px; text-align: center; font-size: 9px; font-weight: bold; letter-spacing: 0.05em; display: inline-block; }
  .footer { border-top: 1px solid #aaa; margin-top: 20px; padding-top: 8px; font-size: 9px; color: #666; display: flex; justify-content: space-between; }
  .page-label { font-size: 10px; color: #888; text-align: center; margin-top: 6px; }
  hr { border: none; border-top: 0.5px solid #ccc; margin: 14px 0; }
  .highlight-box { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 12px; margin: 10px 0; font-size: 11px; }
  .agent-tag { display: inline-block; background: #cc0000; color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
  .agent-tag-green { background: #2d7a2d; }
  .agent-tag-amber { background: #cc7700; }
  .verdict-banner { border: 3px solid #1a1a1a; padding: 16px 20px; text-align: center; margin: 14px 0; background: #f5f5f5; }
  .verdict-score-row { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 8px; }
  .score-circle { width: 90px; height: 90px; border-radius: 50%; border: 4px solid #cc0000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .score-num { font-size: 28px; font-weight: bold; color: #cc0000; line-height: 1; }
  .score-lbl { font-size: 9px; color: #cc0000; text-transform: uppercase; letter-spacing: 0.04em; }
  .verdict-title { font-size: 15px; font-weight: bold; letter-spacing: 0.03em; }
  .verdict-sub { font-size: 11px; color: #555; margin-top: 4px; }
  .verdict-meaning { font-size: 11px; color: #cc0000; font-weight: bold; margin-top: 6px; }
  .resource-section { margin: 14px 0; }
  .rs-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; background: #1a1a1a; color: #fff; padding: 4px 10px; margin-bottom: 0; }
  .team-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 8px 0; }
  .team-table th { background: #333; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; letter-spacing: 0.03em; }
  .team-table td { padding: 5px 8px; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  .team-table tr:nth-child(even) { background: #f9f9f9; }
  .td-role { font-weight: bold; color: #1a1a1a; }
  .td-current { color: #cc0000; font-weight: bold; }
  .td-required { color: #2d7a2d; font-weight: bold; }
  .td-deficit { color: #cc7700; font-weight: bold; }
  .td-zone { color: #555; font-size: 9.5px; font-style: italic; }
  .td-reason { color: #333; font-size: 9.5px; }
  .zone-verdict { border: 1px solid; border-radius: 4px; padding: 10px 14px; margin: 8px 0; }
  .zv-red { border-color: #cc0000; background: #fff8f8; }
  .zv-amber { border-color: #cc7700; background: #fffaf0; }
  .zv-safe { border-color: #2d7a2d; background: #f5fff5; }
  .zv-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .zv-badge { font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
  .zvb-red { background: #cc0000; color: #fff; }
  .zvb-amber { background: #cc7700; color: #fff; }
  .zvb-safe { background: #2d7a2d; color: #fff; }
  .zv-name { font-size: 12px; font-weight: bold; }
  .zv-readiness { font-size: 11px; font-weight: bold; margin-left: auto; }
  .zvr-red { color: #cc0000; }
  .zvr-amber { color: #cc7700; }
  .zvr-green { color: #2d7a2d; }
  .zv-body { font-size: 11px; line-height: 1.7; color: #333; }
  .zv-needs { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
  .need-tag { font-size: 9px; font-weight: bold; padding: 2px 7px; border: 1px solid; border-radius: 2px; }
  .nt-red { border-color: #cc0000; color: #cc0000; }
  .nt-amber { border-color: #cc7700; color: #cc7700; }
  .nt-green { border-color: #2d7a2d; color: #2d7a2d; }
  .inaction-box { border: 2px solid #cc0000; padding: 12px 16px; margin: 12px 0; background: #fff8f8; }
  .inaction-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #cc0000; margin-bottom: 8px; }
  .inaction-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 0.5px solid #ffcccc; font-size: 11px; }
  .inaction-row:last-child { border-bottom: none; }
  .ir-label { color: #333; }
  .ir-value { font-weight: bold; color: #cc0000; }
  .readiness-breakdown { margin: 12px 0; }
  .rb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
  .rb-label { font-size: 10px; min-width: 180px; color: #333; }
  .rb-bar { flex: 1; height: 10px; background: #eee; border-radius: 2px; overflow: hidden; }
  .rb-fill { height: 100%; border-radius: 2px; }
  .rb-score { font-size: 10px; font-weight: bold; min-width: 35px; text-align: right; }
  .fill-red { background: #cc0000; }
  .fill-amber { background: #cc7700; }
  .fill-green { background: #2d7a2d; }
  .final-box { background: #1a1a1a; color: #fff; padding: 16px 20px; margin: 14px 0; }
  .final-box-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin-bottom: 8px; }
  .final-statement { font-size: 13px; line-height: 1.8; }
  .final-highlight { color: #ffcc00; font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f0f0f0; border: 1px solid #ccc; margin: 4px 0; font-size: 11px; }
  .total-label { font-weight: bold; }
  .total-val { font-weight: bold; font-size: 13px; }
`

export default function ReportPanel() {
  const {
    bottleneckReport,
    verdict,
    reportReady
  } = useSimulationContext()

  const reportRef = useRef(null)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CrisisSwarm Simulation Report</title>
          <style>
            body { margin: 20px; font-family: 'Times New Roman', serif; }
            ${REPORT_CSS}
          </style>
        </head>
        <body>
          <div class="report">
            ${bottleneckReport || ''}
            ${verdict || ''}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // Loading state
  if (!reportReady) {
    return (
      <div style={{
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#f59e0b',
          animation: 'pulse-badge 1s infinite'
        }} />
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          textAlign: 'center',
          lineHeight: 1.6
        }}>
          Generating bottleneck report
          <br />
          and final verdict...
          <br />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Powered by Gemini 1.5 Flash
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Report header bar */}
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(34,197,94,0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#22c55e'
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#22c55e',
            fontWeight: 700,
            letterSpacing: '0.06em'
          }}>
            REPORT READY
          </span>
        </div>

        {/* Print button */}
        <button
          onClick={handlePrint}
          style={{
            padding: '4px 10px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#444'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          🖨 Print / Download
        </button>
      </div>

      {/* Report content — white background, government style */}
      <div
        ref={reportRef}
        style={{
          background: '#ffffff',
          padding: 0
        }}
      >
        <style>{REPORT_CSS}</style>

        <div className="report">
          {/* Bottleneck report */}
          {bottleneckReport && (
            <div
              dangerouslySetInnerHTML={{ __html: bottleneckReport }}
            />
          )}

          {/* Final verdict */}
          {verdict && (
            <VerdictSection verdictHTML={verdict} />
          )}
        </div>
      </div>

    </div>
  )
}