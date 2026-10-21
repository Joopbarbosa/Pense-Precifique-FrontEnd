import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { DIAS_SEMANA_CURTO, diaDaSemana, diaDoMes } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

/**
 * V0.18.0 (#1034, RN-NOVA-2) — visões Dia e Semana: linha de dia inteiro acima das faixas de hora. As faixas vão da abertura mais
 * cedo ao fechamento mais tarde da empresa e se ampliam para caber um compromisso fora delas; sem horário de funcionamento,
 * cobrem as 24 horas. Sem limite de compromissos por dia.
 */
export default function GradeHoras({ dias, hoje, porDia, faixa, onAbrir }: {
  dias: string[]
  hoje: string
  porDia: Map<string, Compromisso[]>
  /** Horas (0 a 23) de abertura mais cedo e de último fechamento da empresa; nulo = 24 horas. */
  faixa: { inicio: number; fim: number } | null
  onAbrir: (c: Compromisso) => void
}) {
  const horaDe = (c: Compromisso) => Number((c.horario ?? '00:00').slice(0, 2))
  const comHorario = dias.flatMap(d => (porDia.get(d) ?? []).filter(c => c.horario))
  let inicio = faixa ? faixa.inicio : 0
  let fim = faixa ? faixa.fim : 23
  for (const c of comHorario) {
    inicio = Math.min(inicio, horaDe(c))
    fim = Math.max(fim, horaDe(c))
  }
  const horas = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i)
  const colunas = { gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }
  const minimo = dias.length === 1 ? 'min-w-[320px]' : 'min-w-[760px]'

  return (
    <div className="overflow-x-auto">
      <div className={clsx(minimo, 'overflow-hidden rounded-card border border-line bg-white')} data-testid="grade-horas">
        <div className="grid border-b border-line bg-cream text-center text-xs font-semibold text-subtle" style={colunas}>
          <div />
          {dias.map(d => (
            <div key={d} className={clsx('flex flex-col items-center gap-0.5 py-2', d === hoje && 'text-orange')} data-testid={`cabecalho-dia-${d}`}>
              <span className="uppercase">{DIAS_SEMANA_CURTO[diaDaSemana(d)]}</span>
              <span className={clsx(d === hoje && 'grid h-6 min-w-6 place-items-center rounded-full bg-orange px-1 text-white')}>{diaDoMes(d)}</span>
            </div>
          ))}
        </div>
        <div className="grid border-b border-line" style={colunas} data-testid="linha-dia-inteiro">
          <div className="p-1.5 text-right text-[11px] font-semibold text-subtle">dia inteiro</div>
          {dias.map(d => (
            <div key={d} data-testid={`dia-${d}`} className={clsx('flex min-h-[44px] flex-col gap-1 border-l border-line p-1.5', d === hoje && 'bg-orange/5')}>
              {(porDia.get(d) ?? []).filter(c => !c.horario).map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}
            </div>
          ))}
        </div>
        {horas.map(h => (
          <div key={h} className="grid border-b border-line last:border-b-0" style={colunas}>
            <div className="p-1.5 text-right text-[11px] font-semibold text-subtle">{String(h).padStart(2, '0')}:00</div>
            {dias.map(d => (
              <div key={d} className={clsx('flex min-h-[40px] flex-col gap-1 border-l border-line p-1', d === hoje && 'bg-orange/5')}>
                {(porDia.get(d) ?? []).filter(c => c.horario && horaDe(c) === h).map(c => (
                  <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
