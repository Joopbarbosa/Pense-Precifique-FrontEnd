import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

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
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const borderColor = error
    ? '#F2B8A6'
    : focused
    ? '#2A9D8F'
    : '#EFEDE8'

  const boxShadow = focused && !error ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none'
  const background = disabled ? '#F5F4F2' : error ? '#FFFBFA' : '#FFFFFF'

  const paddingLeft = icon ? '40px' : '16px'
  const paddingRight = isPassword ? '44px' : '16px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#5C594F',
            marginBottom: '7px',
          }}
        >
          {label}
          {required && <span style={{ color: '#C0492B', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '13px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#A29E96',
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: '48px',
            paddingLeft,
            paddingRight,
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--r-input)',
            fontSize: '15px',
            color: '#3A372F',
            background,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color .15s, box-shadow .15s',
            boxShadow,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            disabled={disabled}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: '#A29E96',
              display: 'flex',
              alignItems: 'center',
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '6px',
            fontSize: '13px',
            color: '#C0492B',
          }}
        >
          <AlertCircle size={15} style={{ color: '#C0492B', flexShrink: 0 }} />
          {error}
        </div>
      )}

      {hint && !error && (
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#A29E96' }}>{hint}</p>
      )}
    </div>
  )
}
