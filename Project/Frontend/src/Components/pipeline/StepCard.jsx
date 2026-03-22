export default function StepCard({ number, title, endpoint, description, status, highlight, children }) {

 
  // ... rest of component
  const getBadge = () => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-completed">COMPLETED</span>
      case 'processing':
        return <span className="badge badge-processing">PROCESSING</span>
      case 'error':
        return <span className="badge badge-error">ERROR</span>
      default:
        return <span className="badge badge-pending">PENDING</span>
    }
  }

  const isActive = status !== 'pending' || highlight
  const isDimmed = status === 'pending' && !highlight

   // DEBUG — only for step 04
  if (number === '04') {
    console.log('🟡 StepCard 04 — status:', status, 'highlight:', highlight, 'isActive:', isActive, 'isDimmed:', isDimmed)
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      opacity: isDimmed ? 0.45 : 1,
      transition: 'opacity 0.3s ease',
      background: highlight
        ? 'rgba(255,107,43,0.04)'
        : 'transparent',
      borderLeft: highlight
        ? '2px solid var(--accent-orange)'
        : status === 'processing'
          ? '2px solid #f59e0b'
          : status === 'completed'
            ? '2px solid #166534'
            : status === 'error'
              ? '2px solid #ef4444'
              : '2px solid transparent'
    }}>

      {/* Card header */}
      <div style={{
        padding: '10px 14px 6px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Number + title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              fontWeight: 700,
              color: isActive
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
              lineHeight: 1
            }}>
              {number}
            </span>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: isActive
                ? 'var(--text-primary)'
                : 'var(--text-muted)'
            }}>
              {title}
            </span>
          </div>

          {/* Endpoint */}
          <div style={{
            fontFamily: 'var(--font-terminal)',
            fontSize: 9,
            color: 'var(--text-muted)',
            marginBottom: 4,
            letterSpacing: '0.02em'
          }}>
            {endpoint}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-body)'
          }}>
            {description}
          </div>
        </div>

        {/* Badge */}
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          {getBadge()}
        </div>
      </div>

      {/* Card content */}
      {(isActive || highlight) && children && (
        <div style={{
          padding: '0 14px 12px',
          animation: 'fadeIn 0.3s ease'
        }}>
          {children}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}