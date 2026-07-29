import React from 'react'
import clsx from 'clsx'

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

const sizeClasses = {
  sm: 'h-9 px-3.5 text-[13.5px]',
  md: 'h-[46px] px-5 text-[14.5px]',
  lg: 'h-[52px] px-6 text-[15.5px]',
}

const variantClasses = {
  primary: 'bg-orange text-white border-none shadow-[0_8px_18px_-8px_rgba(249,115,22,0.7)] hover:brightness-105 active:scale-[0.97]',
  secondary: 'bg-teal text-white border-none shadow-[0_8px_18px_-8px_rgba(42,157,143,0.7)] hover:brightness-105 active:scale-[0.97]',
  ghost: 'bg-white text-body border-[1.5px] border-line shadow-none hover:bg-cream',
  danger: 'bg-danger-bg text-danger border-[1.5px] border-danger/40 shadow-none hover:bg-[#F7E0DA]',
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
    return (
      <button
        ref={ref}
        type={type}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold font-[inherit] transition-[filter,transform,background-color] duration-150',
          disabled ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer',
          fullWidth ? 'w-full flex-shrink' : 'flex-shrink-0',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {icon && <span className="flex">{icon}</span>}
        {children}
        {iconRight && <span className="flex">{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
