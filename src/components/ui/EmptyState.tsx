import { Icons } from './Icons'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  iconColor?: string
  iconBg?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  compact?: boolean
}

const dots = [
  [14,20,2.4],[26,12,1.8],[40,24,2],[80,16,2.4],
  [88,28,1.8],[72,12,2],[18,78,2],[34,86,2.4],
  [66,82,2],[84,74,1.8],
] as [number, number, number][]

export default function EmptyState({
  icon,
  iconColor = '#2A9D8F',
  iconBg = 'rgba(42,157,143,0.10)',
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#3A372F' }}>{title}</div>
        {description && (
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#A29E96' }}>{description}</p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      marginTop: 8,
      padding: '72px 28px',
      textAlign: 'center',
      background: '#fff',
      border: '1px solid #F0EEE9',
      borderRadius: 'var(--r-card)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {dots.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * 0.5} fill="#F97316" opacity={0.5 + (i % 3) * 0.18} />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          width: 160, height: 160,
          borderRadius: '46% 54% 60% 40% / 50% 44% 56% 50%',
          background: 'rgba(42,157,143,0.08)',
          top: -50, right: 40,
          animation: 'floaty 10s ease-in-out infinite',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative' }}>
        <span style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 74, height: 74,
          borderRadius: '50%',
          background: iconBg,
          color: iconColor,
          marginBottom: 18,
        }}>
          {icon ?? <Icons.emptyBox />}
        </span>

        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#3A372F' }}>
          {title}
        </h2>

        {description && (
          <p style={{ margin: '8px auto 22px', maxWidth: 380, fontSize: 14.5, color: '#A29E96', lineHeight: 1.55 }}>
            {description}
          </p>
        )}

        {action && (
          <Button
            variant="primary"
            size="lg"
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
