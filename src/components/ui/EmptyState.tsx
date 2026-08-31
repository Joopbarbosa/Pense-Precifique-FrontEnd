import { PackageOpen } from 'lucide-react'
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
      <div className="px-6 py-12 text-center">
        <div className="text-[15px] font-semibold text-dark">{title}</div>
        {description && (
          <p className="mb-0 mt-1.5 text-[13.5px] text-muted">{description}</p>
        )}
        {action && (
          <Button variant="secondary" size="sm" icon={action.icon} onClick={action.onClick} className="mt-3.5">
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="relative mt-2 overflow-hidden rounded-card border border-[#F0EEE9] bg-white px-7 py-[72px] text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {dots.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * 0.5} fill="#F97316" opacity={0.5 + (i % 3) * 0.18} />
          ))}
        </svg>
        <div
          className="absolute -top-[50px] right-10 h-40 w-40 animate-[floaty_10s_ease-in-out_infinite] rounded-[46%_54%_60%_40%/50%_44%_56%_50%] bg-teal/[0.08]"
        />
      </div>

      {/* Content */}
      <div className="relative">
        <span
          className="mb-[18px] inline-grid h-[74px] w-[74px] place-items-center rounded-full"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon ?? <PackageOpen size={32} />}
        </span>

        <h2 className="m-0 text-xl font-bold text-dark">
          {title}
        </h2>

        {description && (
          <p className="mx-auto mb-[22px] mt-2 max-w-[380px] text-[14.5px] leading-[1.55] text-muted">
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
