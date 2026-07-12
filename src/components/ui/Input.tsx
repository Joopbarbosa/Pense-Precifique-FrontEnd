import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface InputProps {
  label?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  icon?: React.ReactNode
  disabled?: boolean
  required?: boolean
  id?: string
  autoComplete?: string
}

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  icon,
  disabled = false,
  required = false,
  id,
  autoComplete,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={id} className="mb-[7px] text-[13.5px] font-semibold text-body">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-[13px] top-1/2 flex -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}

        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={clsx(
            'h-12 w-full rounded-input text-[15px] text-dark outline-none transition-[border-color,box-shadow] duration-150 font-[inherit]',
            icon ? 'pl-10' : 'pl-4',
            isPassword ? 'pr-11' : 'pr-4',
            disabled
              ? 'cursor-not-allowed bg-[#F5F4F2] border-[1.5px] border-line'
              : error
              ? 'cursor-text bg-[#FFFBFA] border-[1.5px] border-[#F2B8A6]'
              : 'cursor-text bg-white border-[1.5px] border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            disabled={disabled}
            tabIndex={-1}
            className={clsx(
              'absolute right-2 top-1/2 flex -translate-y-1/2 items-center border-none bg-transparent p-1.5 text-muted',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-1.5 flex items-center gap-[5px] text-[13px] text-danger">
          <AlertCircle size={15} className="flex-shrink-0 text-danger" />
          {error}
        </div>
      )}

      {hint && !error && (
        <p className="mt-1.5 mb-0 text-[13px] text-muted">{hint}</p>
      )}
    </div>
  )
}
