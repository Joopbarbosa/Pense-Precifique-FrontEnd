import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { ExternalLink, LineChart as IconeLinha, Monitor, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, ModalShell, SegmentedControl } from '../ui'
import Spinner from '../ui/Spinner'
import { InsumoPicker } from './Pickers'
import { formatarData, hojeIso, moeda, qtd } from './formato'
import { compraService } from '../../services/compraService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_EIXO, GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { EvolucaoPrecoResponse } from '../../types/compra'

// #548 (RN-NOVA-15) — evolução do preço pago, no desenho do protótipo aprovado (DT-NOVA-14):
// Recharts, até 5 insumos, modo padrão "Variação %" (com alternância para "R$ por unidade"), paleta
// categórica fixa. A cor segue o insumo (slot atribuído ao escolher), nunca a posição na lista.
// Todos os valores (preço pago e variação) vêm prontos da API.
// #600 (RN-NOVA-37) — sem "Ver como tabela": clicar na linha ou num ponto de um insumo abre a modal com a
// evolução daquele insumo no período (mais recente primeiro; clique na linha abre a compra em aba nova).

type Modo = 'pct' | 'brl'
type Periodo = '1' | '3' | '6' | '12' | 'custom'
type Selecionado = { id: string; nome: string; unidade: string; slot: number }

const MAX_INSUMOS = 5
const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '1', label: '1 mês' }, { value: '3', label: '3 meses' }, { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' }, { value: 'custom', label: 'Personalizado' },
]
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const ts = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d).getTime() }
const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mesesAtras = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return isoDe(d) }
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

type Linha = { t: number; com: string; data: string; [k: string]: number | string | null }

/** Marcas do eixo X (como no protótipo): semanais no período de 1 mês, senão no 1º dia de cada mês. */
function marcasX(deIso: string, ateIso: string, semanal: boolean): number[] {
  const ini = ts(deIso), fim = ts(ateIso)
  const out: number[] = []
  if (semanal) {
    for (let d = new Date(ini); d.getTime() <= fim; d.setDate(d.getDate() + 7)) out.push(d.getTime())
    return out
  }
  const meses = (fim - ini) / (30 * 86400000)
  const passo = meses > 7 ? 2 : 1
  const d0 = new Date(ini); const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1)
  for (; d.getTime() <= fim; d.setMonth(d.getMonth() + passo)) out.push(d.getTime())
  return out
}

function TooltipPreco({ active, payload, sel }: { active?: boolean; payload?: { dataKey: string; color: string; payload: Linha }[]; sel: Selecionado[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="min-w-[220px] rounded-xl border border-line bg-white px-3 py-2.5 text-[12.5px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
      <div className="mb-1.5 font-semibold text-dark">{r.com} · {formatarData(r.data)}</div>
      {payload.map(p => {
        const ins = sel.find(s => s.id === p.dataKey)
        if (!ins) return null
        return (
          <div key={p.dataKey} className="grid grid-cols-[10px_1fr_auto] items-baseline gap-x-2 border-t border-line-soft py-1 first-of-type:border-t-0">
            <span className="h-2.5 w-2.5 self-center rounded-full" style={{ background: p.color }} />
            <span className="text-body">{ins.nome}</span>
            <span className="text-right font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(r[`${ins.id}_brl`] as number)}/{ins.unidade}</span>
            <span className="col-span-2 col-start-2 text-[11.5px] text-muted">
              {pct(r[`${ins.id}_pct`] as number)} desde a 1ª compra do período{r[`${ins.id}_forn`] ? ` · ${r[`${ins.id}_forn`]}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function GraficoPrecoInsumos({ inicial }: { inicial?: { id: string; nome: string; unidade: string } | null }) {
  const mobile = useIsMobile()
  const [sel, setSel] = useState<Selecionado[]>([])
  const [modo, setModo] = useState<Modo>('pct')
  const [periodo, setPeriodo] = useState<Periodo>('3')
  const [de, setDe] = useState(mesesAtras(3))
  const [ate, setAte] = useState(hojeIso())
  const [dados, setDados] = useState<EvolucaoPrecoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [evolucaoDe, setEvolucaoDe] = useState<string | null>(null)

  // Pré-seleciona o insumo com maior aumento (se houver), para o gráfico não abrir vazio.
  useEffect(() => {
    if (inicial && sel.length === 0) setSel([{ ...inicial, slot: 0 }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial?.id])

  const intervalo = useMemo(() => periodo === 'custom' ? { de, ate } : { de: mesesAtras(Number(periodo)), ate: hojeIso() }, [periodo, de, ate])

  useEffect(() => {
    if (mobile || sel.length === 0) { setDados(null); return }
    let cancelado = false
    setLoading(true); setErro(null)
    compraService.evolucaoPreco(sel.map(s => s.id), intervalo.de, intervalo.ate)
      .then(r => { if (!cancelado) setDados(r) })
      .catch(err => { if (!cancelado) setErro(extractApiError(err, 'Não foi possível carregar o gráfico.')) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [sel, intervalo, mobile])

  const adicionar = (i: { id: string; nome: string; unidadeMedida: string }) => {
    setSel(prev => {
      if (prev.length >= MAX_INSUMOS || prev.some(s => s.id === i.id)) return prev
      const livres = [0, 1, 2, 3, 4].filter(n => !prev.some(s => s.slot === n))
      return [...prev, { id: i.id, nome: i.nome, unidade: i.unidadeMedida, slot: livres[0] }]
    })
  }
  const remover = (id: string) => setSel(prev => prev.filter(s => s.id !== id))

  // Linhas do gráfico: uma por (compra, data); o mesmo insumo duas vezes na mesma compra (vários
  // fornecedores) vira outra linha, para nenhum ponto sumir.
  const linhas = useMemo<Linha[]>(() => {
    if (!dados) return []
    const rows: Linha[] = []
    dados.series.forEach(s => s.pontos.forEach(pt => {
      let row = rows.find(r => r.com === pt.identificador && r.data === pt.data && r[s.insumo.id] == null)
      if (!row) { row = { t: ts(pt.data), com: pt.identificador, data: pt.data }; rows.push(row) }
      row[s.insumo.id] = modo === 'pct' ? pt.variacaoPercentual : pt.precoUnitarioPago
      row[`${s.insumo.id}_brl`] = pt.precoUnitarioPago
      row[`${s.insumo.id}_pct`] = pt.variacaoPercentual
      row[`${s.insumo.id}_forn`] = pt.fornecedor
    }))
    return rows.sort((a, b) => a.t - b.t)
  }, [dados, modo])

  const semPontos = !!dados && dados.series.every(s => s.pontos.length === 0)
  const dominio: [number, number] = [ts(intervalo.de), ts(intervalo.ate)]

  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-bold text-dark"><IconeLinha size={16} className="text-teal" /> Evolução do preço pago</div>
          <div className="text-[12.5px] text-muted">Um ponto por compra confirmada · até {MAX_INSUMOS} insumos</div>
        </div>
      </div>

      {mobile ? (
        <div className="flex items-center gap-2.5 px-5 py-4 text-[13.5px] text-body"><Monitor size={18} className="flex-shrink-0 text-teal" /> {MENSAGEM_GRAFICO_CELULAR}</div>
      ) : (
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Mostrar como</span>
              <SegmentedControl options={[{ value: 'pct' as Modo, label: 'Variação %' }, { value: 'brl' as Modo, label: 'R$ por unidade' }]} value={modo} onChange={setModo}
                activeColors={['bg-teal text-white', 'bg-teal text-white']} height="h-9" display="inline-flex" optionWidth="whitespace-nowrap px-3.5" textSize="text-[12.5px]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Período</span>
              <SegmentedControl options={PERIODOS} value={periodo} onChange={setPeriodo} height="h-9" display="inline-flex" optionWidth="whitespace-nowrap px-3" textSize="text-[12.5px]" />
            </div>
            {periodo === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" aria-label="De" value={de} max={ate} onChange={e => setDe(e.target.value)} className="h-9 rounded-input border-[1.5px] border-line px-2.5 font-[inherit] text-[13px]" />
                <span className="text-muted">até</span>
                <input type="date" aria-label="Até" value={ate} min={de} max={hojeIso()} onChange={e => setAte(e.target.value)} className="h-9 rounded-input border-[1.5px] border-line px-2.5 font-[inherit] text-[13px]" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Insumos no gráfico">
            {sel.map(s => (
              <span key={s.id} data-testid="chip-insumo" className="inline-flex items-center gap-2 rounded-full border border-subtle/40 bg-white py-1 pl-3 pr-1.5 text-[13px] font-semibold text-dark">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETA_SERIES[s.slot] }} />
                {s.nome}
                <button type="button" aria-label={`Tirar ${s.nome} do gráfico`} onClick={() => remover(s.id)} className="grid h-6 w-6 place-items-center rounded-full border-none bg-transparent text-muted hover:bg-cream hover:text-danger"><X size={13} /></button>
              </span>
            ))}
            {sel.length < MAX_INSUMOS && (
              <div className="w-[260px]"><InsumoPicker size="sm" excluir={sel.map(s => s.id)} onSelect={adicionar} placeholder="Adicionar insumo ao gráfico…" /></div>
            )}
          </div>

          {sel.length === 0 ? (
            <div className="grid h-[240px] place-items-center rounded-input border border-dashed border-line text-sm text-muted">Escolha um insumo para ver como o preço pago mudou.</div>
          ) : loading && !dados ? (
            <div className="flex h-[320px] items-center justify-center gap-2.5 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando gráfico…</div>
          ) : erro ? (
            <div role="alert" className="grid h-[240px] place-items-center text-sm text-danger">{erro}</div>
          ) : semPontos ? (
            <div className="grid h-[240px] place-items-center rounded-input border border-dashed border-line text-sm text-muted">Nenhuma compra confirmada destes insumos no período.</div>
          ) : (
            <div className={clsx('h-[320px] transition-opacity', loading && 'opacity-60')} data-testid="grafico-preco">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={linhas} margin={{ top: 12, right: 18, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke={GRAFICO_GRID} vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" domain={dominio} ticks={marcasX(intervalo.de, intervalo.ate, periodo === '1')} interval={0}
                    tick={{ fill: GRAFICO_EIXO, fontSize: 12 }} stroke={GRAFICO_GRID} tickLine={false}
                    tickFormatter={t => { const d = new Date(t); return periodo === '1' ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` }} />
                  <YAxis tick={{ fill: GRAFICO_EIXO, fontSize: 12 }} stroke={GRAFICO_GRID} tickLine={false} axisLine={false} width={modo === 'pct' ? 52 : 72}
                    tickFormatter={v => modo === 'pct' ? `${v > 0 ? '+' : ''}${Math.round(Number(v))}%` : moeda(Number(v)).replace(/,?0+$/, '')} />
                  {modo === 'pct' && <ReferenceLine y={0} stroke={GRAFICO_EIXO} strokeDasharray="3 3" strokeOpacity={0.6} />}
                  <Tooltip content={<TooltipPreco sel={sel} />} cursor={{ stroke: GRAFICO_EIXO, strokeDasharray: '3 3' }} />
                  {sel.map(s => (
                    <Line key={s.id} dataKey={s.id} name={s.nome} stroke={PALETA_SERIES[s.slot]} strokeWidth={2} connectNulls isAnimationActive={false}
                      cursor="pointer" onClick={() => setEvolucaoDe(s.id)}
                      dot={{ r: 4, fill: PALETA_SERIES[s.slot], stroke: '#fff', strokeWidth: 2, cursor: 'pointer', onClick: () => setEvolucaoDe(s.id) }}
                      activeDot={{ r: 6, fill: PALETA_SERIES[s.slot], stroke: '#fff', strokeWidth: 2, cursor: 'pointer', onClick: () => setEvolucaoDe(s.id) }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {sel.length > 0 && !semPontos && dados && (
            <>
              <p className="m-0 border-t border-line pt-3 text-[12px] text-muted">
                {modo === 'pct'
                  ? 'Variação %: cada insumo começa em 0% na primeira compra do período, então preços de grandezas diferentes cabem no mesmo eixo. O preço em reais aparece no tooltip. Clique na linha de um insumo para ver as compras dele.'
                  : 'R$ por unidade: mostra o preço real pago. Com insumos de valores muito diferentes, os mais baratos ficam achatados perto do zero. Clique na linha de um insumo para ver as compras dele.'}
              </p>
            </>
          )}
        </div>
      )}
      {evolucaoDe && dados && (() => {
        const serie = dados.series.find(x => x.insumo.id === evolucaoDe)
        return serie ? <ModalEvolucaoInsumo serie={serie} de={dados.de} ate={dados.ate} onClose={() => setEvolucaoDe(null)} /> : null
      })()}
    </div>
  )
}

/**
 * #600 — compras do insumo no período, da mais recente para a mais antiga. A variação é em relação à
 * compra anterior (conta de exibição sobre os preços que vieram da API: (atual − anterior) ÷ anterior).
 */
function ModalEvolucaoInsumo({ serie, de, ate, onClose }: { serie: EvolucaoPrecoResponse['series'][number]; de: string; ate: string; onClose: () => void }) {
  const cronologica = [...serie.pontos].sort((a, b) => ts(a.data) - ts(b.data))
  const linhas = cronologica.map((p, i) => {
    const anterior = i > 0 ? cronologica[i - 1].precoUnitarioPago : null
    return { ...p, variacao: anterior ? ((p.precoUnitarioPago - anterior) / anterior) * 100 : null }
  }).reverse()
  const grade = 'md:grid-cols-[0.9fr_0.8fr_1.4fr_0.9fr_1fr_0.8fr_20px]'
  return (
    <ModalShell open onClose={onClose} width={860} icon={<IconeLinha size={16} />} title={`Evolução do preço — ${serie.insumo.nome}`}
      subtitle={`${formatarData(de)} a ${formatarData(ate)}`} footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
      <div className="rounded-input border border-line" data-testid="modal-evolucao">
        <div className={clsx('hidden gap-3 bg-cream px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint md:grid', grade)}>
          <span>Data</span><span>Compra</span><span>Fornecedor</span><span>Quantidade</span><span>Preço un. pago</span><span>Variação</span><span />
        </div>
        {linhas.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted">Nenhuma compra no período.</div> : linhas.map((l, k) => (
          <button key={`${l.compraId}-${k}`} type="button" data-testid="linha-evolucao" onClick={() => window.open(`/compras/${l.compraId}`, '_blank', 'noopener')}
            className={clsx('grid w-full cursor-pointer grid-cols-2 gap-x-3 gap-y-1 border-0 border-t border-solid border-line bg-white px-4 py-2.5 text-left font-[inherit] text-[13.5px] first:border-t-0 hover:bg-cream md:items-center', grade)}>
            <span className="text-body [font-variant-numeric:tabular-nums]">{formatarData(l.data)}</span>
            <span className="font-semibold text-dark">{l.identificador}</span>
            <span className="truncate text-body">{l.fornecedor ?? <span className="italic text-faint">Sem fornecedor</span>}</span>
            <span className="text-body [font-variant-numeric:tabular-nums]">{qtd(l.quantidade)} {serie.insumo.unidade}</span>
            <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(l.precoUnitarioPago)}/{serie.insumo.unidade}</span>
            <span data-testid="variacao-evolucao" className={clsx('[font-variant-numeric:tabular-nums]', l.variacao == null ? 'text-faint' : l.variacao > 0 ? 'font-semibold text-warning-alt' : l.variacao < 0 ? 'font-semibold text-success' : 'text-body')}>
              {l.variacao == null ? '1ª do período' : pct(Math.round(l.variacao * 10) / 10)}
            </span>
            <span className="hidden text-muted md:block"><ExternalLink size={14} /></span>
          </button>
        ))}
      </div>
    </ModalShell>
  )
}
