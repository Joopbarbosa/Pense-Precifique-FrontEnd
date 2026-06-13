import React, { useState } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  className?: string
}

const sizes = {
  sm: { height: 36, padding: '0 14px', fontSize: 13.5 },
  md: { height: 46, padding: '0 20px', fontSize: 14.5 },
  lg: { height: 52, padding: '0 24px', fontSize: 15.5 },
}

const variants = {
  primary: {
    background: '#F97316',
    color: '#fff',
    border: 'none',
    boxShadow: '0 8px 18px -8px rgba(249,115,22,0.7)',
  },
  secondary: {
    background: '#2A9D8F',
    color: '#fff',
    border: 'none',
    boxShadow: '0 8px 18px -8px rgba(42,157,143,0.7)',
  },
  ghost: {
    background: '#fff',
    color: '#5C594F',
    border: '1.5px solid #EFEDE8',
    boxShadow: 'none',
  },
  danger: {
    background: '#FBEDE9',
    color: '#C0492B',
    border: '1.5px solid rgba(192,73,43,0.4)',
    boxShadow: 'none',
  },
}

const hoverBg: Record<string, string> = {
  ghost: '#FAF8F5',
  danger: '#F7E0DA',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      onClick,
      disabled = false,
      type = 'button',
      fullWidth = false,
      icon,
      iconRight,
      className,
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false)
    const [pressed, setPressed] = useState(false)

    const v = variants[variant]
    const s = sizes[size]

    const dynamicStyle: React.CSSProperties = {}
    if (!disabled) {
      if (hovered) {
        if (hoverBg[variant]) {
          dynamicStyle.background = hoverBg[variant]
        } else {
          dynamicStyle.filter = 'brightness(1.05)'
        }
      }
      if (pressed && (variant === 'primary' || variant === 'secondary')) {
        dynamicStyle.transform = 'scale(0.97)'
      }
    }

    return (
      <button
        ref={ref}
        type={type}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={className}
        onMouseEnter={() => !disabled && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => !disabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          height: s.height,
          padding: s.padding,
          fontSize: s.fontSize,
          background: v.background,
          color: v.color,
          border: v.border,
          boxShadow: v.boxShadow,
          borderRadius: 'var(--r-btn)',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
          transition: 'filter .15s, transform .12s, background .15s',
          flexShrink: fullWidth ? 1 : 0,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.5 : 1,
          ...dynamicStyle,
        }}
      >
        {icon && <span style={{ display: 'flex' }}>{icon}</span>}
        {children}
        {iconRight && <span style={{ display: 'flex' }}>{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
