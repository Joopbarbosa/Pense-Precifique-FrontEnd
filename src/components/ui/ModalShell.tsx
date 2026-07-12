import { useEffect } from 'react'
import { X } from 'lucide-react'

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
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-[1.5px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${width}px, 100%)` }}
        className="relative z-[110] flex max-h-[90vh] animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px]"
                style={{ background: iconBg, color: iconColor }}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {subtitle && (
                <div className="mb-0.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                  {subtitle}
                </div>
              )}
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[16.5px] font-bold text-dark">
                {title}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-[22px]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-shrink-0 justify-end gap-2.5 border-t border-line px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
