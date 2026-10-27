import { CalendarDays } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import type { Compromisso } from '../../types/agenda'
import { rotuloDoDia } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

/** V0.18.0 (#1158) — lista dos compromissos de dia inteiro do período da grade, por dia, aberta pelo rótulo "dia inteiro". */
export default function ModalDiaInteiro({ dias, porDia, onClose, onAbrir }: {
  dias: string[]
  porDia: Map<string, Compromisso[]>
  onClose: () => void
  onAbrir: (c: Compromisso) => void
}) {
  const grupos = dias
    .map(d => ({ dia: d, itens: (porDia.get(d) ?? []).filter(c => !c.horario) }))
    .filter(g => g.itens.length > 0)
  return (
    <ModalShell open onClose={onClose} title="Dia inteiro" width={560} icon={<CalendarDays size={15} />}>
      {grupos.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Nenhum compromisso de dia inteiro neste período.</p>
      ) : (
        <div className="flex flex-col gap-4" data-testid="lista-dia-inteiro">
          {grupos.map(g => (
            <section key={g.dia} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">{rotuloDoDia(g.dia)}</h3>
              {g.itens.map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}
            </section>
          ))}
        </div>
      )}
    </ModalShell>
  )
}
