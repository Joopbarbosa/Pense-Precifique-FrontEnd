import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import { DIAS_SEMANA_CURTO, DURACAO_BLOCO_MIN, diaDaSemana, diaDoMes, minutosAgoraBrasilia, posicionarBlocos } from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

const LARGURA_HORAS = 56
/** Altura de uma hora na grade; o bloco do compromisso tem 1 hora. */
const HORA_PX = 56
const HORAS = Array.from({ length: 24 }, (_, h) => h)
/** Hora que fica no alto da grade quando hoje não está na tela. */
const HORA_INICIAL = 7

/**
 * V0.18.0 (#1034, RN-NOVA-2 v3, #1061) — visões Dia e Semana no modelo do Google Agenda: as 24 horas numa coluna à esquerda, linha
 * de dia inteiro no topo e cada compromisso com horário como um bloco na sua hora de início (1 hora de altura); os que se
 * sobrepõem ficam lado a lado. A grade rola por dentro (cabeçalho e dia inteiro fixos), abre na hora atual e marca o minuto de
 * agora com um traço laranja (#1052).
 */
export default function GradeHoras({ dias, hoje, porDia, onAbrir, sinalHoje }: {
  dias: string[]
  hoje: string
  porDia: Map<string, Compromisso[]>
  onAbrir: (c: Compromisso) => void
  /** Muda a cada clique em "Hoje": a grade volta a rolar para a hora atual. */
  sinalHoje?: number
}) {
  const colunas = { gridTemplateColumns: `${LARGURA_HORAS}px repeat(${dias.length}, minmax(0, 1fr))` }
  const minimo = dias.length === 1 ? 'min-w-[320px]' : 'min-w-[760px]'

  const [agora, setAgora] = useState(() => minutosAgoraBrasilia())
  useEffect(() => {
    const id = window.setInterval(() => setAgora(minutosAgoraBrasilia()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const colunaDeHoje = dias.indexOf(hoje)
  const topoDoTraco = (agora / 60) * HORA_PX

  // abre (e volta, no "Hoje") na hora atual, um pouco abaixo do topo; sem hoje na tela, abre às 7h
  const rolagem = useRef<HTMLDivElement>(null)
  const chaveDaTela = `${dias[0]}|${dias.length}|${sinalHoje ?? 0}`
  useEffect(() => {
    const el = rolagem.current
    if (!el) return
    el.scrollTop = colunaDeHoje >= 0 ? Math.max(topoDoTraco - 2 * HORA_PX, 0) : HORA_INICIAL * HORA_PX
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
                {(porDia.get(d) ?? []).filter(c => !c.horario).map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}
              </div>
            ))}
          </div>
        </div>
        <div className="relative grid" style={{ ...colunas, height: HORAS.length * HORA_PX }}>
          <div className="relative">
            {HORAS.map(h => (
              <span key={h} className={clsx('absolute right-1.5 text-[11px] font-semibold text-subtle', h > 0 && '-translate-y-1/2')}
                style={{ top: h === 0 ? 2 : h * HORA_PX }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {dias.map(d => (
            <div key={d} data-testid={`coluna-${d}`}
              className={clsx('relative border-l border-line bg-[linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[length:100%_56px]', d === hoje && 'bg-orange/5')}>
              {posicionarBlocos(porDia.get(d) ?? []).map(b => (
                <div key={b.compromisso.chave} className="absolute px-px py-px"
                  style={{
                    top: (b.inicio / 60) * HORA_PX,
                    height: (DURACAO_BLOCO_MIN / 60) * HORA_PX,
                    left: `${(b.coluna / b.colunas) * 100}%`,
                    width: `${100 / b.colunas}%`,
                  }}>
                  <ChipCompromisso compromisso={b.compromisso} onAbrir={onAbrir} preencher />
                </div>
              ))}
            </div>
          ))}
          {colunaDeHoje >= 0 && (
            <div data-testid="traco-hora-atual" aria-hidden className="pointer-events-none absolute z-10"
              style={{ left: LARGURA_HORAS, right: 0, top: topoDoTraco }}>
              <div className="h-0.5 w-full bg-orange" />
              <div className="absolute -top-[3px] h-2 w-2 rounded-full bg-orange"
                style={{ left: `calc((100% / ${dias.length}) * ${colunaDeHoje} - 4px)` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
