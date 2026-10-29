import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Compromisso } from '../../types/agenda'
import {
  DIAS_SEMANA_CURTO, diaDaSemana, diaDoMes, ehMovel, ehEsticavel, horarioDeMinutos, minutosAgoraBrasilia, minutosDoHorario, numeroDaSemana, posicionarBlocos,
} from '../../utils/agenda'
import ChipCompromisso from './ChipCompromisso'

const LARGURA_HORAS = 56
/** Altura de uma hora na grade. */
const HORA_PX = 56
const HORAS = Array.from({ length: 24 }, (_, h) => h)
/** Hora que fica no alto da grade quando hoje não está na tela. */
const HORA_INICIAL = 7
const DIA_MIN = 24 * 60
/** Passo do arrastar e do esticar, e do clique que cria (#1064, #1065). */
const PASSO_ARRASTE_MIN = 15
const PASSO_CLIQUE_MIN = 30
const LIMITE_MOVIMENTO_PX = 4

const arredondar = (minutos: number, passo: number) => Math.round(minutos / passo) * passo

interface Gesto {
  tipo: 'mover' | 'esticar'
  c: Compromisso
  x0: number
  y0: number
  inicio0: number
  fim0: number
  moveu: boolean
}

interface Arrasto { chave: string; dia: string; inicio: number; fim: number }

/**
 * V0.18.0 (#1034, RN-NOVA-2 v4) — visões Dia e Semana no modelo do Google Agenda: as 24 horas numa coluna à esquerda, linha de dia
 * inteiro no topo e cada compromisso com horário como um bloco que começa na hora de início e dura até o término (1 hora, sem
 * término); os que se sobrepõem ficam lado a lado. A grade rola por dentro (cabeçalho e dia inteiro fixos), abre na hora atual e marca
 * o minuto de agora com um traço laranja (#1052). A linha de dia inteiro tem altura máxima e rola por dentro, para muitos compromissos não cobrirem a grade. Clicar num espaço vazio cria um evento (#1064); o compromisso avulso pendente se
 * arrasta para outro dia e hora e se estica pela borda de baixo (#1065).
 */
/** RN-NOVA-45 (#1183) — máximo de compromissos de dia inteiro por dia na Semana; o resto vira "+N". */
const LIMITE_DIA_INTEIRO = 2

export default function GradeHoras({ dias, hoje, porDia, onAbrir, sinalHoje, onCriar, onMover, onEsticar, onMoverDia, onVerDiaInteiro }: {
  dias: string[]
  hoje: string
  porDia: Map<string, Compromisso[]>
  onAbrir: (c: Compromisso) => void
  /** Muda a cada clique em "Hoje": a grade volta a rolar para a hora atual. */
  sinalHoje?: number
  /** Clique num espaço vazio: dia, início e término ("HH:MM"). */
  onCriar?: (dia: string, inicio: string, fim: string) => void
  /** O bloco foi solto em outro dia/hora: novo dia, início e término em minutos (término nulo se o compromisso não tinha). */
  onMover?: (c: Compromisso, dia: string, inicio: number, fim: number | null) => void
  /** A borda de baixo foi esticada: novo término em minutos. */
  onEsticar?: (c: Compromisso, fim: number) => void
  /** Um avulso de dia inteiro foi solto em outro dia. */
  onMoverDia?: (chave: string, dia: string) => void
  /** Clique no rótulo "dia inteiro": lista os compromissos de dia inteiro do período (#1158). */
  onVerDiaInteiro?: () => void
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

  const colunasRef = useRef(new Map<string, HTMLDivElement>())
  const gesto = useRef<Gesto | null>(null)
  const arrastou = useRef(false)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)

  const diaDoX = (x: number, padrao: string) => {
    for (const [dia, el] of colunasRef.current) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x < r.right) return dia
    }
    return padrao
  }

  const iniciar = (e: React.PointerEvent<HTMLElement>, tipo: Gesto['tipo'], c: Compromisso, dia: string, inicio: number, fim: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    gesto.current = { tipo, c, x0: e.clientX, y0: e.clientY, inicio0: inicio, fim0: fim, moveu: false }
    setArrasto(null)
    void dia
  }

  const mover = (e: React.PointerEvent<HTMLElement>, diaOriginal: string) => {
    const g = gesto.current
    if (!g) return
    const dy = e.clientY - g.y0
    if (!g.moveu && Math.abs(dy) < LIMITE_MOVIMENTO_PX && Math.abs(e.clientX - g.x0) < LIMITE_MOVIMENTO_PX) return
    g.moveu = true
    const deltaMin = (dy / HORA_PX) * 60
    if (g.tipo === 'esticar') {
      const fim = Math.min(Math.max(arredondar(g.fim0 + deltaMin, PASSO_ARRASTE_MIN), g.inicio0 + PASSO_ARRASTE_MIN), DIA_MIN)
      setArrasto({ chave: g.c.chave, dia: diaOriginal, inicio: g.inicio0, fim })
      return
    }
    // a duração real do compromisso (sem a altura mínima do bloco): sem término continua sem término
    const duracao = g.c.horarioFim ? minutosDoHorario(g.c.horarioFim) - g.inicio0 : g.fim0 - g.inicio0
    const inicio = Math.min(Math.max(arredondar(g.inicio0 + deltaMin, PASSO_ARRASTE_MIN), 0), DIA_MIN - Math.min(duracao, PASSO_ARRASTE_MIN))
    setArrasto({ chave: g.c.chave, dia: diaDoX(e.clientX, diaOriginal), inicio, fim: Math.min(inicio + duracao, DIA_MIN) })
  }

  const soltar = (e: React.PointerEvent<HTMLElement>, diaOriginal: string) => {
    const g = gesto.current
    gesto.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!g || !g.moveu) {
      setArrasto(null)
      // com a captura do ponteiro o clique não chega ao botão do bloco: o toque sem arrastar abre o detalhe
      if (g && g.tipo === 'mover') onAbrir(g.c)
      return
    }
    arrastou.current = true
    window.setTimeout(() => { arrastou.current = false }, 0)
    const a = arrasto
    setArrasto(null)
    if (!a) return
    if (g.tipo === 'esticar') {
      if (a.fim !== g.fim0) onEsticar?.(g.c, a.fim)
      return
    }
    if (a.dia !== diaOriginal || a.inicio !== g.inicio0) onMover?.(g.c, a.dia, a.inicio, g.c.horarioFim ? a.fim : null)
  }

  const cancelar = () => { gesto.current = null; setArrasto(null) }

  const criarNoVazio = (e: React.MouseEvent<HTMLDivElement>, dia: string) => {
    if (!onCriar || e.target !== e.currentTarget) return
    const topo = e.currentTarget.getBoundingClientRect().top
    const minutos = Math.floor((((e.clientY - topo) / HORA_PX) * 60) / PASSO_CLIQUE_MIN) * PASSO_CLIQUE_MIN
    onCriar(dia, horarioDeMinutos(minutos), horarioDeMinutos(Math.min(minutos + 60, DIA_MIN - 1)))
  }

  return (
    <div ref={rolagem} data-testid="grade-horas"
      className="max-h-[calc(100dvh-152px)] min-h-[420px] overflow-auto rounded-card border border-line bg-white">
      <div className={minimo}>
        <div className="sticky top-0 z-20 bg-white" data-testid="cabecalho-fixo">
          <div className="grid border-b border-line bg-cream text-center text-xs font-semibold text-subtle" style={colunas}>
            <div className="flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide" data-testid="numero-semana">
              {dias.length === 7 ? `Sem ${numeroDaSemana(dias[0])}` : ''}
            </div>
            {dias.map(d => (
              <div key={d} className={clsx('flex flex-col items-center gap-0.5 py-2 leading-tight', d === hoje && 'text-orange')} data-testid={`cabecalho-dia-${d}`}>
                <span className="uppercase tracking-wide">{DIAS_SEMANA_CURTO[diaDaSemana(d)]}</span>
                <span className={clsx('grid h-7 min-w-7 place-items-center rounded-full px-1 text-[17px]', d === hoje && 'bg-orange text-white')}>{diaDoMes(d)}</span>
              </div>
            ))}
          </div>
          <div className="grid max-h-[104px] overflow-y-auto border-b border-line" style={colunas} data-testid="linha-dia-inteiro">
            {onVerDiaInteiro ? (
              <button type="button" data-testid="ver-dia-inteiro" onClick={onVerDiaInteiro}
                className="p-1.5 text-right text-[11px] font-semibold text-teal underline-offset-2 hover:underline">dia inteiro</button>
            ) : <div className="p-1.5 text-right text-[11px] font-semibold text-subtle">dia inteiro</div>}
            {dias.map(d => (
              <div key={d} data-testid={`dia-${d}`} className={clsx('flex min-h-[44px] flex-col gap-1 border-l border-line p-1.5', d === hoje && 'bg-orange/5')}
                onDragOver={onMoverDia ? e => e.preventDefault() : undefined}
                onDrop={onMoverDia ? e => { e.preventDefault(); const chave = e.dataTransfer.getData('text/plain'); if (chave) onMoverDia(chave, d) } : undefined}>
                {(() => {
                  const diaInteiro = (porDia.get(d) ?? []).filter(c => !c.horario)
                  const restantes = diaInteiro.length - LIMITE_DIA_INTEIRO
                  return (
                    <>
                      {diaInteiro.slice(0, LIMITE_DIA_INTEIRO).map(c => (
                        <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} arrastavel={!!onMoverDia && ehMovel(c)} />
                      ))}
                      {restantes > 0 && (
                        <button type="button" data-testid={`mais-${d}`} onClick={onVerDiaInteiro}
                          className="rounded-lg px-2 py-0.5 text-left text-xs font-semibold text-teal hover:bg-teal/10">
                          +{restantes}
                        </button>
                      )}
                    </>
                  )
                })()}
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
            <div key={d} data-testid={`coluna-${d}`} ref={el => { if (el) colunasRef.current.set(d, el); else colunasRef.current.delete(d) }}
              onClick={e => criarNoVazio(e, d)}
              className={clsx('relative border-l border-line bg-[linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[length:100%_56px]',
                d === hoje && 'bg-orange/5', onCriar && 'cursor-cell')}>
              {posicionarBlocos(porDia.get(d) ?? []).map(b => {
                const movel = !!(onMover || onEsticar) && ehEsticavel(b.compromisso)
                const emArrasto = arrasto?.chave === b.compromisso.chave
                return (
                  <div key={b.compromisso.chave} data-testid={movel ? 'bloco-movel' : undefined}
                    className={clsx('absolute px-px py-px', movel && 'touch-none', emArrasto && 'opacity-40')}
                    style={{
                      top: (b.inicio / 60) * HORA_PX,
                      height: ((b.fim - b.inicio) / 60) * HORA_PX,
                      left: `${(b.coluna / b.colunas) * 100}%`,
                      width: `${100 / b.colunas}%`,
                    }}
                    onPointerDown={movel ? e => iniciar(e, 'mover', b.compromisso, d, b.inicio, b.fim) : undefined}
                    onPointerMove={movel ? e => mover(e, d) : undefined}
                    onPointerUp={movel ? e => soltar(e, d) : undefined}
                    onPointerCancel={movel ? cancelar : undefined}
                    onClickCapture={movel ? e => { if (arrastou.current) { e.stopPropagation(); e.preventDefault() } } : undefined}>
                    <ChipCompromisso compromisso={b.compromisso} onAbrir={onAbrir} preencher />
                    {movel && onEsticar && (
                      <div data-testid="alca-esticar" aria-label="Esticar para mudar o término"
                        className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-lg"
                        onPointerDown={e => iniciar(e, 'esticar', b.compromisso, d, b.inicio, b.fim)}
                        onPointerMove={e => mover(e, d)}
                        onPointerUp={e => soltar(e, d)}
                        onPointerCancel={cancelar}
                        onClick={e => e.stopPropagation()} />
                    )}
                  </div>
                )
              })}
              {arrasto && arrasto.dia === d && (
                <div data-testid="fantasma-arrasto" className="pointer-events-none absolute inset-x-px z-10 rounded-lg border-2 border-orange bg-orange/20 px-2 py-1 text-xs font-semibold text-dark"
                  style={{ top: (arrasto.inicio / 60) * HORA_PX, height: ((arrasto.fim - arrasto.inicio) / 60) * HORA_PX }}>
                  {horarioDeMinutos(arrasto.inicio)} – {horarioDeMinutos(arrasto.fim)}
                </div>
              )}
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
