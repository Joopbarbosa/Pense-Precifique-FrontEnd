import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'

/** RN-NOVA-18 (V0.15.0, #559) — limite global de descrição/observação/justificativa. */
export const LIMITE_TEXTO_LONGO = 500

interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Default {@link LIMITE_TEXTO_LONGO}. O backend valida de novo (`fieldErrors`) — isto é só a trava de digitação. */
  maxLength?: number
  /**
   * Mínimo de caracteres exigido pelo backend (ex.: 30 da INS-007/justificativas). Só exibe o aviso
   * "Mínimo de N caracteres" (verde quando atingido); quem bloqueia é a API.
   */
  minimo?: number
  /** Texto à esquerda do contador (quando não há `minimo` nem `erro`). */
  hint?: ReactNode
  erro?: string
  rows?: number
  minHeight?: string
  textSize?: string
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  ariaLabel?: string
}

/**
 * Textarea com contador `n/500` — DT-NOVA-11: um único ponto reutilizável para os campos de texto
 * livre do sistema, em vez de repetir maxLength + contador em cada tela.
 */
export default function TextArea({
  value, onChange, placeholder, maxLength = LIMITE_TEXTO_LONGO, minimo, hint, erro, rows,
  minHeight = 'min-h-[86px]', textSize = 'text-[14.5px]', disabled, autoFocus, id, ariaLabel,
}: TextAreaProps) {
  const perto = value.length >= maxLength * 0.9
  // Sem espaços nas pontas, como o backend conta o mínimo.
  const minimoAtingido = minimo != null && value.trim().length >= minimo

  const esquerda = erro
    ? <span className="text-danger-deep">{erro}</span>
    : minimo != null
      ? (
        <span className={clsx('inline-flex items-center gap-1', minimoAtingido ? 'text-success' : 'text-muted')}>
          {minimoAtingido && <Check size={12} strokeWidth={3} />}
          Mínimo de {minimo} caracteres
        </span>
      )
      : <span className="text-muted">{hint}</span>

  return (
    <div>
      <textarea
        id={id}
        aria-label={ariaLabel}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={rows}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'box-border block w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-2.5 font-[inherit] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus disabled:cursor-not-allowed disabled:bg-[#F5F4F2]',
          !rows && minHeight, textSize,
          erro ? 'border-[#F2B8A6]' : 'border-line',
        )}
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        {esquerda}
        <span className={clsx('flex-shrink-0 [font-variant-numeric:tabular-nums]', perto ? 'font-semibold text-warning-alt' : 'text-muted')}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
