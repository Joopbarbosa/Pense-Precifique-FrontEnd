import clsx from 'clsx'
import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Compromisso } from '../../types/agenda'
import { duracaoEmMinutos } from '../../utils/agenda'
import { ORIGEM } from './origem'
import CartaoResumo from './CartaoResumo'

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

export default function ChipCompromisso({ compromisso: c, onAbrir, compacto, preencher, arrastavel }: {
  compromisso: Compromisso
  onAbrir: (c: Compromisso) => void
  compacto?: boolean
  /** Ocupa a altura toda do bloco (grade de horas: o bloco tem a altura de 1 hora). */
  preencher?: boolean
  /** Compromisso avulso que a usuária pode levar para outro dia arrastando (linha de dia inteiro e Mês, #1065). */
  arrastavel?: boolean
}) {
  const [ancora, setAncora] = useState<DOMRect | null>(null)
  const origem = ORIGEM[c.origem]
  const atraso = textoAtraso(c)
  const concluido = c.situacao === 'CONCLUIDO'
  const cancelado = c.situacao === 'CANCELADO'
  return (
    <button
      type="button"
      data-testid="compromisso"
      data-origem={c.origem}
      data-situacao={c.situacao}
      data-tom={c.atrasado ? 'perigo' : concluido ? 'sucesso' : ORIGEM[c.origem].tom}
      data-atrasado={c.atrasado ? 'sim' : 'nao'}
      onClick={() => onAbrir(c)}
      onMouseEnter={e => {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) setAncora(e.currentTarget.getBoundingClientRect())
      }}
      onMouseLeave={() => setAncora(null)}
      draggable={arrastavel || undefined}
      onDragStart={arrastavel ? e => { e.dataTransfer.setData('text/plain', c.chave); e.dataTransfer.effectAllowed = 'move' } : undefined}
      title={[c.titulo, atraso, ...c.marcacoes, ...c.avisos].filter(Boolean).join(' — ')}
      className={clsx(
        'flex w-full min-w-0 flex-col rounded-lg border px-2 py-1 text-left text-xs leading-tight transition-colors hover:brightness-95',
        c.atrasado ? 'border-danger-strong bg-danger-strong text-white' : concluido ? 'border-success bg-success text-white' : origem.chip,
        cancelado && 'opacity-50',
        preencher && 'h-full overflow-hidden',
      )}
    >
      <span className={clsx('flex min-w-0 items-center gap-1 font-semibold', (c.atrasado || concluido) && 'text-white', cancelado && 'line-through text-subtle')}>
        {!concluido && <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', c.atrasado ? 'bg-white' : cancelado ? 'bg-subtle' : origem.ponto)} aria-hidden />}
        {c.horario && <span className="shrink-0">{c.horario}</span>}
        {concluido && <Check size={13} className="shrink-0" aria-hidden />}
        <span className={clsx('truncate', (concluido || cancelado) && 'line-through')}>{c.titulo}</span>
      </span>
      {!compacto && (atraso || c.marcacoes.length > 0) && (
        <span className="mt-0.5 truncate text-[11px] font-medium">
          {[atraso, ...c.marcacoes].filter(Boolean).join(' · ')}
        </span>
      )}
      {ancora && <CartaoResumo compromisso={c} ancora={ancora} atraso={atraso} />}
    </button>
  )
}
