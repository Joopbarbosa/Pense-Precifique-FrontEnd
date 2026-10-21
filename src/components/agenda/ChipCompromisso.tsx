import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { ORIGEM } from './origem'

/**
 * V0.18.0 (#1034) — um compromisso na grade. Atrasado ganha destaque (RN-NOVA-4); concluído fica riscado e cancelado fica
 * esmaecido e riscado (RN-NOVA-5). O texto de atraso diz "Atrasada" na compra (RN-NOVA-18).
 */
export function textoAtraso(c: Compromisso): string | null {
  if (!c.atrasado) return null
  const palavra = c.origem === 'COMPRA' ? 'Atrasada' : 'Atrasado'
  return `${palavra} há ${c.diasAtraso} ${c.diasAtraso === 1 ? 'dia' : 'dias'}`
}

export default function ChipCompromisso({ compromisso: c, onAbrir, compacto }: {
  compromisso: Compromisso
  onAbrir: (c: Compromisso) => void
  compacto?: boolean
}) {
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
      data-atrasado={c.atrasado ? 'sim' : 'nao'}
      onClick={() => onAbrir(c)}
      title={[c.titulo, atraso, ...c.marcacoes, ...c.avisos].filter(Boolean).join(' — ')}
      className={clsx(
        'flex w-full min-w-0 flex-col rounded-lg border px-2 py-1 text-left text-xs leading-tight transition-colors hover:brightness-95',
        c.atrasado ? 'border-danger-strong bg-danger-strong text-white' : concluido ? 'border-azul/20 bg-azul/10 text-dark' : origem.chip,
        cancelado && 'opacity-50',
      )}
    >
      <span className={clsx('flex min-w-0 items-center gap-1 font-semibold', c.atrasado && 'text-white', (concluido || cancelado) && 'line-through text-subtle')}>
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', c.atrasado ? 'bg-white' : concluido || cancelado ? 'bg-subtle' : origem.ponto)} aria-hidden />
        {c.horario && <span className="shrink-0">{c.horario}</span>}
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
