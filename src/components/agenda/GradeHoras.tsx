import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { DIAS_SEMANA_CURTO, diaDaSemana, diaDoMes, ehContinuacao, ehUltimoDia, minutosAgoraBrasilia } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

const SANGRIA = { esquerda: '-ml-1.5', direita: '-mr-1.5' }
const LARGURA_HORAS = 56

/**
 * V0.18.0 (#1034, RN-NOVA-2) — visões Dia e Semana: linha de dia inteiro acima das faixas de hora. As faixas vão da abertura mais
 * cedo ao fechamento mais tarde da empresa e se ampliam para caber um compromisso fora delas; sem horário de funcionamento,
 * cobrem as 24 horas. Sem limite de compromissos por dia.
 * #1052 — a grade rola por dentro (cabeçalho e dia inteiro fixos), abre na hora atual e marca o minuto de agora com um traço laranja.
 * #1057 (RN-NOVA-4 v2) — o atrasado fica no dia original, na sua hora, e nos dias seguintes aparece na linha de dia inteiro,
 * ligado ao trecho anterior, até hoje.
 */
export default function GradeHoras({ dias, hoje, porDia, faixa, onAbrir, sinalHoje }: {
  dias: string[]
  hoje: string
  porDia: Map<string, Compromisso[]>
  /** Horas (0 a 23) de abertura mais cedo e de último fechamento da empresa; nulo = 24 horas. */
  faixa: { inicio: number; fim: number } | null
  onAbrir: (c: Compromisso) => void
  /** Muda a cada clique em "Hoje": a grade volta a rolar para a hora atual. */
  sinalHoje?: number
}) {
  const horaDe = (c: Compromisso) => Number((c.horario ?? '00:00').slice(0, 2))
  // o atrasado que continua de um dia anterior vai para a linha de dia inteiro, não para uma faixa de hora
  const naFaixaDeHora = (c: Compromisso, d: string) => !!c.horario && !ehContinuacao(c, d)
  const comHorario = dias.flatMap(d => (porDia.get(d) ?? []).filter(c => naFaixaDeHora(c, d)))
  let inicio = faixa ? faixa.inicio : 0
  let fim = faixa ? faixa.fim : 23
  for (const c of comHorario) {
    inicio = Math.min(inicio, horaDe(c))
    fim = Math.max(fim, horaDe(c))
  }
  const horas = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i)
  const colunas = { gridTemplateColumns: `${LARGURA_HORAS}px repeat(${dias.length}, minmax(0, 1fr))` }
  const minimo = dias.length === 1 ? 'min-w-[320px]' : 'min-w-[760px]'

  const [agora, setAgora] = useState(() => minutosAgoraBrasilia())
  useEffect(() => {
    const id = window.setInterval(() => setAgora(minutosAgoraBrasilia()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const colunaDeHoje = dias.indexOf(hoje)
  const horaAgora = Math.floor(agora / 60)
  const traco = colunaDeHoje >= 0 && horaAgora >= inicio && horaAgora <= fim

  // abre (e volta, no "Hoje") na hora atual; sem hoje na tela, ou com a hora fora das faixas, vai à borda mais próxima
  const rolagem = useRef<HTMLDivElement>(null)
  const chaveDaTela = `${dias[0]}|${dias.length}|${sinalHoje ?? 0}`
  useEffect(() => {
    const el = rolagem.current
    if (!el) return
    if (colunaDeHoje < 0 || horaAgora < inicio) { el.scrollTop = 0; return }
    if (horaAgora > fim) { el.scrollTop = el.scrollHeight; return }
    const linha = el.querySelector<HTMLElement>(`[data-hora="${horaAgora}"]`)
    const fixo = el.querySelector<HTMLElement>('[data-testid="cabecalho-fixo"]')?.offsetHeight ?? 0
    if (linha) el.scrollTop = Math.max(linha.offsetTop - fixo - 48, 0)
    // só quando a tela muda: o passar dos minutos não pode puxar a rolagem de quem está olhando outra hora
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDaTela])

  return (
    <div ref={rolagem} data-testid="grade-horas"
      className="max-h-[calc(100dvh-340px)] min-h-[420px] overflow-auto rounded-card border border-line bg-white">
      <div className={minimo}>
        <div className="sticky top-0 z-20 bg-white" data-testid="cabecalho-fixo">
          <div className="grid border-b border-line bg-cream text-center text-xs font-semibold text-subtle" style={colunas}>
            <div />
            {dias.map(d => (
              <div key={d} className={clsx('flex flex-col items-center gap-0.5 py-2 leading-tight', d === hoje && 'text-orange')} data-testid={`cabecalho-dia-${d}`}>
                <span className="uppercase tracking-wide">{DIAS_SEMANA_CURTO[diaDaSemana(d)]}</span>
                <span className={clsx('grid h-7 min-w-7 place-items-center rounded-full px-1 text-[17px]', d === hoje && 'bg-orange text-white')}>{diaDoMes(d)}</span>
              </div>
            ))}
          </div>
          <div className="grid border-b border-line" style={colunas} data-testid="linha-dia-inteiro">
            <div className="p-1.5 text-right text-[11px] font-semibold text-subtle">dia inteiro</div>
            {dias.map(d => (
              <div key={d} data-testid={`dia-${d}`} className={clsx('flex min-h-[44px] flex-col gap-1 border-l border-line p-1.5', d === hoje && 'bg-orange/5')}>
                {(porDia.get(d) ?? []).filter(c => !naFaixaDeHora(c, d)).map(c => (
                  <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} sangria={SANGRIA}
                    continuacao={ehContinuacao(c, d)} naoTermina={c.atrasado && !ehUltimoDia(c, d)} />
                ))}
              </div>
            ))}
          </div>
        </div>
        {horas.map(h => (
          <div key={h} data-hora={h} className="relative grid border-b border-line last:border-b-0" style={colunas}>
            <div className="p-1.5 text-right text-[11px] font-semibold text-subtle">{String(h).padStart(2, '0')}:00</div>
            {dias.map(d => (
              <div key={d} className={clsx('flex min-h-[40px] flex-col gap-1 border-l border-line p-1', d === hoje && 'bg-orange/5')}>
                {(porDia.get(d) ?? []).filter(c => naFaixaDeHora(c, d) && horaDe(c) === h).map(c => (
                  <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} naoTermina={c.atrasado && !ehUltimoDia(c, d)} sangria={SANGRIA} />
                ))}
              </div>
            ))}
            {traco && h === horaAgora && (
              <div data-testid="traco-hora-atual" aria-hidden className="pointer-events-none absolute z-10"
                style={{ left: LARGURA_HORAS, right: 0, top: `${((agora % 60) / 60) * 100}%` }}>
                <div className="h-0.5 w-full bg-orange" />
                <div className="absolute -top-[3px] h-2 w-2 rounded-full bg-orange"
                  style={{ left: `calc((100% / ${dias.length}) * ${colunaDeHoje} - 4px)` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
