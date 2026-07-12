import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  padding?: number | string
  style?: React.CSSProperties
  onClick?: () => void
  hoverable?: boolean
  className?: string
}

interface CardHeaderProps {
  children: React.ReactNode
  border?: boolean
}

interface CardFooterProps {
  children: React.ReactNode
  border?: boolean
}

export function Card({ children, padding = 0, style, onClick, hoverable, className }: CardProps) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        hoverable && 'transition-[box-shadow,transform] duration-[180ms] hover:-translate-y-[3px] hover:shadow-[0_10px_26px_-10px_rgba(0,0,0,0.18)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ padding: padding || undefined, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, border = true }: CardHeaderProps) {
  return (
    <div className={clsx('px-5 py-4', border && 'border-b border-line')}>
      {children}
    </div>
  )
}

export function CardFooter({ children, border = true }: CardFooterProps) {
  return (
    <div className={clsx('flex flex-wrap gap-[11px] px-5 py-4', border && 'border-t border-line')}>
      {children}
    </div>
  )
}

export default Card
