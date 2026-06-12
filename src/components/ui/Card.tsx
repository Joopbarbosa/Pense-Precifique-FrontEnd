import { useState } from 'react'

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
  const [hovered, setHovered] = useState(false)

  const baseStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #F0EEE9',
    borderRadius: 'var(--r-card)',
    boxShadow: hoverable && hovered
      ? '0 10px 26px -10px rgba(0,0,0,0.18)'
      : '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    transform: hoverable && hovered ? 'translateY(-3px)' : 'none',
    transition: hoverable ? 'box-shadow .18s, transform .18s' : undefined,
    cursor: onClick ? 'pointer' : undefined,
    padding: padding || undefined,
    ...style,
  }

  return (
    <div
      style={baseStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={hoverable ? () => setHovered(true) : undefined}
      onMouseLeave={hoverable ? () => setHovered(false) : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, border = true }: CardHeaderProps) {
  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: border ? '1px solid #EFEDE8' : 'none',
    }}>
      {children}
    </div>
  )
}

export function CardFooter({ children, border = true }: CardFooterProps) {
  return (
    <div style={{
      padding: '16px 20px',
      borderTop: border ? '1px solid #EFEDE8' : 'none',
      display: 'flex',
      gap: 11,
      flexWrap: 'wrap',
    }}>
      {children}
    </div>
  )
}

export default Card
