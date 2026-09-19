import clsx from 'clsx'
import type { ReactNode } from 'react'

interface SegmentedControlOption<T> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Altura do controle inteiro — default bate com a referência canônica (FormInsumoPage). */
  height?: string
  /** `flex` (padrão, ocupa a largura do pai) ou `inline-flex` (largura pelo conteúdo — ex. filtro ao lado de uma busca). */
  display?: 'flex' | 'inline-flex'
  /** Largura de cada opção — `flex-1` (padrão, preenche) ou fixa (ex. `w-20`, ou `whitespace-nowrap px-4` p/ largura automática). */
  optionWidth?: string
  textSize?: string
  /** Classes aditivas no container — nunca uma dimensão já coberta por `height`/`display` (ex. `flex-shrink-0`, `w-fit`). */
  className?: string
  /**
   * Cor de cada opção quando ativa, na mesma ordem de `options` — sobrescreve o padrão binário
   * (laranja à esquerda, verde à direita). Usar só quando a tela já tem paleta própria e não deve
   * herdar o par laranja/verde do resto do sistema (ex.: modal de cancelamento do Orçamento, tema
   * laranja único — ver risco registrado no plano de retrabalho do Caixa, V0.12.0).
   */
  activeColors?: string[]
}

/**
 * Alternador de 2+ opções — unifica as cópias inline que existiam em Insumo/Orçamento/Caixa
 * (V0.12.0, #498). Com exatamente 2 opções, a esquerda ativa em laranja e a direita em verde
 * (teal) — decisão de produto que corrige o par %/R$ e Sim/Não, que antes viravam teal os dois
 * lados indistintamente (bug reportado em #493). Com 3+ opções (ex.: filtro Tudo/Catálogo/
 * Produto) não há polaridade binária — a ativa continua no teal único de sempre.
 */
export default function SegmentedControl<T>({
  options, value, onChange,
  height = 'h-12', display = 'flex', optionWidth = 'flex-1', textSize = 'text-[14.5px]', className,
  activeColors,
}: SegmentedControlProps<T>) {
  const binaria = options.length === 2

  return (
    <div className={clsx(display, 'overflow-hidden rounded-input border-[1.5px] border-line', height, className)}>
      {options.map((opt, i) => {
        const ativo = opt.value === value
        const corAtiva = activeColors
          ? activeColors[i]
          : binaria
            ? (i === 0 ? 'bg-orange text-white' : 'bg-teal text-white')
            : 'bg-teal text-white'
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              optionWidth, textSize,
              'border-none font-[inherit] font-semibold transition-colors duration-150',
              ativo ? corAtiva : 'bg-white text-dim'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
