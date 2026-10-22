import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { DIAS_SEMANA_CURTO, diaDoMes, ehMovel } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

const LIMITE_POR_DIA = 3

/** V0.18.0 (#1034, RN-NOVA-2) — visão Mês: até 3 compromissos por dia e o indicador "+N" que abre a lista do dia. */
export default function GradeMes({ dias, mesDeReferencia, hoje, porDia, onAbrir, onVerDia, onMoverDia }: {
  dias: string[]
  mesDeReferencia: string
  hoje: string
  porDia: Map<string, Compromisso[]>
  onAbrir: (c: Compromisso) => void
  onVerDia: (dia: string) => void
  /** Um compromisso avulso foi solto em outro dia (#1065). */
  onMoverDia?: (chave: string, dia: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] overflow-hidden rounded-card border border-line bg-white">
        <div className="grid grid-cols-7 border-b border-line bg-cream text-center text-xs font-semibold uppercase tracking-wide text-subtle">
          {DIAS_SEMANA_CURTO.map(d => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7" data-testid="grade-mes">
          {dias.map(dia => {
            const itens = porDia.get(dia) ?? []
            const visiveis = itens.slice(0, LIMITE_POR_DIA)
            const restantes = itens.length - visiveis.length
            const foraDoMes = dia.slice(0, 7) !== mesDeReferencia.slice(0, 7)
            return (
              <div key={dia} data-testid={`dia-${dia}`}
                onDragOver={onMoverDia ? e => e.preventDefault() : undefined}
                onDrop={onMoverDia ? e => { e.preventDefault(); const chave = e.dataTransfer.getData('text/plain'); if (chave) onMoverDia(chave, dia) } : undefined}
                className={clsx('min-h-[112px] border-b border-r border-line p-1.5', foraDoMes && 'bg-cream/60', dia === hoje && 'bg-orange/5')}>
                <div className="mb-1 flex justify-end">
                  <button type="button" onClick={() => onVerDia(dia)} aria-label={`Ver o dia ${dia}`}
                    className={clsx('grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold',
                      dia === hoje ? 'bg-orange text-white' : foraDoMes ? 'text-faint' : 'text-body')}>
                    {diaDoMes(dia)}
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {visiveis.map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} compacto arrastavel={!!onMoverDia && ehMovel(c)} />)}
                  {restantes > 0 && (
                    <button type="button" data-testid={`mais-${dia}`} onClick={() => onVerDia(dia)}
                      className="rounded-lg px-2 py-0.5 text-left text-xs font-semibold text-teal hover:bg-teal/10">
                      +{restantes}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
