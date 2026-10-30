import { CalendarDays } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import type { Compromisso } from '../../types/agenda'
import { rotuloDoDia } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

/** V0.18.0 (#1034, RN-NOVA-2) — lista completa de um dia, aberta pelo "+N" da visão Mês. */
export default function ModalDia({ dia, compromissos, onClose, onAbrir }: {
  dia: string
  compromissos: Compromisso[]
  onClose: () => void
  onAbrir: (c: Compromisso) => void
}) {
  return (
    <ModalShell open onClose={onClose} title={rotuloDoDia(dia)} width={560} icon={<CalendarDays size={15} />}>
      {compromissos.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Nenhum compromisso neste dia.</p>
      ) : (
        <div className="flex flex-col gap-2" data-testid="lista-do-dia">
          {compromissos.map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}
        </div>
      )}
    </ModalShell>
  )
}
