import { useEffect } from 'react'
import { Icons } from './Icons'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  iconBg?: string
  iconColor?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export default function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconBg = 'rgba(249,115,22,0.10)',
  iconColor = '#F97316',
  children,
  footer,
  width = 520,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(20,18,16,0.4)',
        backdropFilter: 'blur(1.5px)',
        animation: 'fadeIn .2s ease both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 110,
          width: `min(${width}px, 100%)`,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '20px 24px',
          borderBottom: '1px solid #EFEDE8',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {icon && (
              <span style={{
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                width: 40,
                height: 40,
                borderRadius: 11,
                background: iconBg,
                color: iconColor,
              }}>
                {icon}
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              {subtitle && (
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#A29E96',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  {subtitle}
                </div>
              )}
              <div style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: '#3A372F',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {title}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 9,
              border: 'none',
              background: '#F1F0EC',
              color: '#7C786F',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icons.x />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '22px 24px',
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #EFEDE8',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
