import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import type { Compromisso } from '../../types/agenda'
import { rotuloDoDia } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'
import ModalDia from './ModalDia'

/** RN-NOVA-35 (#1162) — no máximo 3 compromissos por dia; havendo mais, o "+N" abre a lista completa do dia. */
const MAXIMO_POR_DIA = 3

/** V0.18.0 (#1158, #1162) — compromissos de dia inteiro do período da grade, por dia e sem rolagem, abertos pelo rótulo "dia inteiro". */
export default function ModalDiaInteiro({ dias, porDia, onClose, onAbrir }: {
  dias: string[]
  porDia: Map<string, Compromisso[]>
  onClose: () => void
  onAbrir: (c: Compromisso) => void
}) {
  const [diaAberto, setDiaAberto] = useState<string | null>(null)
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
              {g.itens.slice(0, MAXIMO_POR_DIA).map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}
              {g.itens.length > MAXIMO_POR_DIA && (
                <button type="button" data-testid={`mais-dia-inteiro-${g.dia}`} onClick={() => setDiaAberto(g.dia)}
                  className="self-start border-none bg-transparent p-0 font-[inherit] text-xs font-semibold text-teal underline">
                  +{g.itens.length - MAXIMO_POR_DIA}
                </button>
              )}
            </section>
          ))}
        </div>
      )}
      {diaAberto && (
        <ModalDia dia={diaAberto} compromissos={grupos.find(g => g.dia === diaAberto)?.itens ?? []} onClose={() => setDiaAberto(null)} onAbrir={onAbrir} />
      )}
    </ModalShell>
  )
}
