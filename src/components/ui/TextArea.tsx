import type { ReactNode } from 'react'
import clsx from 'clsx'

/** RN-NOVA-18 (V0.15.0, #559) — limite global de descrição/observação/justificativa. */
export const LIMITE_TEXTO_LONGO = 500

interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Default {@link LIMITE_TEXTO_LONGO}. O backend valida de novo (`fieldErrors`) — isto é só a trava de digitação. */
  maxLength?: number
  /** Texto à esquerda do contador (ex.: aviso de mínimo de caracteres). */
  hint?: ReactNode
  erro?: string
  minHeight?: string
  textSize?: string
  disabled?: boolean
  id?: string
  ariaLabel?: string
}

/**
 * Textarea com contador `n/500` — DT-NOVA-11: um único ponto reutilizável para os campos de texto
 * livre do sistema, em vez de repetir maxLength + contador em cada tela.
 */
export default function TextArea({
  value, onChange, placeholder, maxLength = LIMITE_TEXTO_LONGO, hint, erro,
  minHeight = 'min-h-[86px]', textSize = 'text-[14.5px]', disabled, id, ariaLabel,
}: TextAreaProps) {
  const perto = value.length >= maxLength * 0.9
  return (
    <div>
      <textarea
        id={id}
        aria-label={ariaLabel}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'box-border w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-3 font-[inherit] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus disabled:cursor-not-allowed disabled:bg-[#F5F4F2]',
          minHeight, textSize,
          erro ? 'border-[#F2B8A6]' : 'border-line',
        )}
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        <span className={erro ? 'text-danger-deep' : 'text-muted'}>{erro ?? hint}</span>
        <span className={clsx('flex-shrink-0 [font-variant-numeric:tabular-nums]', perto ? 'font-semibold text-warning-alt' : 'text-muted')}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
