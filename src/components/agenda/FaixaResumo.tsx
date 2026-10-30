import { AlertTriangle, CalendarClock } from 'lucide-react'
import clsx from 'clsx'
import type { AgendaResumo } from '../../types/agenda'

/** V0.18.0 (#1034, RN-NOVA-3) — as duas contagens clicáveis do topo: atrasados (de qualquer período) e o que é de hoje. */
export default function FaixaResumo({ resumo, onAtrasados, onHoje }: {
  resumo: AgendaResumo | null
  onAtrasados: () => void
  onHoje: () => void
}) {
  const atrasados = resumo?.atrasados ?? 0
  const hoje = resumo?.hoje ?? 0
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="faixa-resumo">
      <button type="button" onClick={onAtrasados} disabled={atrasados === 0} data-testid="resumo-atrasados"
        className={clsx('flex h-9 items-center gap-1.5 rounded-card border px-3 text-[13px] font-semibold',
          atrasados > 0 ? 'border-danger-line bg-danger-bg text-danger-deep hover:brightness-95' : 'border-line bg-white text-subtle')}>
        <AlertTriangle size={14} />
        {atrasados > 0 ? `${atrasados} ${atrasados === 1 ? 'atrasado' : 'atrasados'}` : 'Nenhum atrasado'}
      </button>
      <button type="button" onClick={onHoje} disabled={hoje === 0} data-testid="resumo-hoje"
        className={clsx('flex h-9 items-center gap-1.5 rounded-card border px-3 text-[13px] font-semibold',
          hoje > 0 ? 'border-teal/30 bg-teal/10 text-teal-deep hover:brightness-95' : 'border-line bg-white text-subtle')}>
        <CalendarClock size={14} />
        {hoje > 0 ? `${hoje} para hoje` : 'Nada para hoje'}
      </button>
    </div>
  )
}
