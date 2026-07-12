import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'

interface ConfirmacaoModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  subtitle?: string
  description?: string | React.ReactNode
  icon?: React.ReactNode
  iconBg?: string
  iconColor?: string
  variant?: 'danger' | 'default'
  confirmLabel: string
  confirmingLabel?: string
  cancelLabel?: string
  confirming?: boolean
  confirmDisabled?: boolean
  width?: number
  children?: React.ReactNode
}

export default function ConfirmacaoModal({
  open, onClose, onConfirm,
  title, subtitle, description,
  icon, iconBg, iconColor,
  variant = 'default',
  confirmLabel, confirmingLabel, cancelLabel = 'Cancelar',
  confirming = false,
  confirmDisabled = false,
  width = 440,
  children,
}: ConfirmacaoModalProps) {
  const isDanger = variant === 'danger'

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconBg={iconBg ?? (isDanger ? 'rgba(192,73,43,0.10)' : 'rgba(42,157,143,0.10)')}
      iconColor={iconColor ?? (isDanger ? '#C0492B' : '#2A9D8F')}
      width={width}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={confirming || confirmDisabled}
          >
            {confirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5C594F', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {children}
    </ModalShell>
  )
}
