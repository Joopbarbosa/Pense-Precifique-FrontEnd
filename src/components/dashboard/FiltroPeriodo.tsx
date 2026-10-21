import { dataLocalIso } from '../../utils/data'
import type { ReactNode } from 'react'
import clsx from 'clsx'

import { PERIODOS, type Periodo } from './periodo'

/**
 * #615 (DT-NOVA-10) — filtro de período dos dashboards (Mês atual, 3, 6, 12 meses e Personalizado). O estado fica com a
 * página; `rotuloDireita` mostra o período exibido e o comparado.
 */
export default function FiltroPeriodo({ periodo, onPeriodo, deLivre, ateLivre, onDeLivre, onAteLivre, rotuloDireita, rotuloDatas = 'do painel' }: {
  periodo: Periodo
  onPeriodo: (p: Periodo) => void
  deLivre: string
  ateLivre: string
  onDeLivre: (v: string) => void
  onAteLivre: (v: string) => void
  rotuloDireita?: ReactNode
  rotuloDatas?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="filtro-periodo">
      {PERIODOS.map(p => {
        const on = periodo === p.id
        return (
          <button key={p.id} type="button" onClick={() => onPeriodo(p.id)} aria-pressed={on}
            className={clsx('inline-flex h-[34px] items-center rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-colors',
              on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
            {p.label}
          </button>
        )
      })}
      {periodo === 'personalizado' && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-body">
          <input type="date" aria-label={`Data inicial ${rotuloDatas}`} value={deLivre} max={ateLivre || dataLocalIso()} onChange={e => onDeLivre(e.target.value)}
            className="h-[34px] rounded-input border-[1.5px] border-line bg-white px-2.5 font-[inherit] text-[13px] outline-hidden focus:border-teal" />
          até
          <input type="date" aria-label={`Data final ${rotuloDatas}`} value={ateLivre} min={deLivre || undefined} max={dataLocalIso()} onChange={e => onAteLivre(e.target.value)}
            className="h-[34px] rounded-input border-[1.5px] border-line bg-white px-2.5 font-[inherit] text-[13px] outline-hidden focus:border-teal" />
        </div>
      )}
      {rotuloDireita && <span className="ml-auto text-[12.5px] text-muted">{rotuloDireita}</span>}
    </div>
  )
}
