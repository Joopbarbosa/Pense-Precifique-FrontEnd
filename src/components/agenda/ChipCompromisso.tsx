import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { duracaoEmMinutos } from '../../utils/agenda'
import { ORIGEM } from './origem'

/**
 * V0.18.0 (#1034) — um compromisso na grade. Atrasado ganha destaque (RN-NOVA-4); concluído fica riscado e cancelado fica
 * esmaecido e riscado (RN-NOVA-5). O texto de atraso diz "Atrasada" na compra (RN-NOVA-18).
 */
export function textoAtraso(c: Compromisso): string | null {
  if (!c.atrasado) return null
  const palavra = c.origem === 'COMPRA' ? 'Atrasada' : 'Atrasado'
  if (c.minutosAtraso > 0) return `${palavra} há ${duracaoEmMinutos(c.minutosAtraso)}`
  return `${palavra} há ${c.diasAtraso} ${c.diasAtraso === 1 ? 'dia' : 'dias'}`
}

export default function ChipCompromisso({ compromisso: c, onAbrir, compacto, continuacao, naoTermina, sangria }: {
  compromisso: Compromisso
  onAbrir: (c: Compromisso) => void
  compacto?: boolean
  /** Dia seguinte ao original de um atrasado: a barra se liga ao trecho anterior (RN-NOVA-4 v2). */
  continuacao?: boolean
  /** O atrasado segue no dia seguinte: a barra se liga ao próximo trecho. */
  naoTermina?: boolean
  /** Margem negativa (px, classe) que leva a barra até a borda da célula para ligar os dias. */
  sangria?: { esquerda: string; direita: string }
}) {
  const origem = ORIGEM[c.origem]
  const atraso = textoAtraso(c)
  return (
    <button
      type="button"
      data-testid="compromisso"
      data-origem={c.origem}
      data-situacao={c.situacao}
      data-atrasado={c.atrasado ? 'sim' : 'nao'}
      data-continuacao={continuacao ? 'sim' : 'nao'}
      onClick={() => onAbrir(c)}
      title={[c.titulo, atraso, ...c.marcacoes, ...c.avisos].filter(Boolean).join(' — ')}
      className={clsx(
        'flex w-full min-w-0 flex-col rounded-lg border px-2 py-1 text-left text-xs leading-tight transition-colors hover:brightness-95',
        c.atrasado ? 'border-danger-line bg-danger-bg text-danger-deep' : origem.chip,
        c.situacao === 'CANCELADO' && 'opacity-50',
        continuacao && 'rounded-l-none border-l-0',
        naoTermina && 'rounded-r-none border-r-0',
        continuacao && sangria?.esquerda,
        naoTermina && sangria?.direita,
      )}
    >
      <span className={clsx('flex min-w-0 items-center gap-1 font-semibold', c.situacao !== 'PENDENTE' && 'line-through')}>
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', c.atrasado ? 'bg-danger' : origem.ponto)} aria-hidden />
        {continuacao && <span className="shrink-0" aria-hidden>↳</span>}
        {c.horario && !continuacao && <span className="shrink-0">{c.horario}</span>}
        <span className="truncate">{c.titulo}</span>
      </span>
      {!compacto && (atraso || c.marcacoes.length > 0) && (
        <span className="mt-0.5 truncate text-[11px] font-medium">
          {[atraso, ...c.marcacoes].filter(Boolean).join(' · ')}
        </span>
      )}
    </button>
  )
}
