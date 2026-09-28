import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, BadgePercent, Calculator, Monitor, Receipt, TrendingUp, Wallet, AlertCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Spinner from '../ui/Spinner'
import { BigNumber, BigNumberGroup, Button, SegmentedControl } from '../ui'
import GraficoPrecoInsumos from './GraficoPrecoInsumos'
import ModalListagemRegistros, { type FiltroInicial } from '../shared/ModalListagemRegistros'
import { formatarData, hojeIso, moeda } from './formato'
import { BRL } from '../venda/formato'
import { compraService } from '../../services/compraService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_EIXO, GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { DashboardComprasResponse, NumeroPainel } from '../../types/compra'

// #577/#578 (RN-NOVA-29) — Dashboard de compras. Tudo vem calculado do backend (só compras CONFIRMADAS,
// período + período anterior); aqui só escolha de período, formatação e os cliques que abrem a modal de
// listagem de compras (RN-NOVA-24). #598: página própria no menu Compras. #601 (RN-NOVA-37): lupa em
// todos os números, exceto CMV (lupa, listagem de vendas e cliques no CMV ficam para o #615).
// #604 (RN-NOVA-34): cartões padrão (`BigNumber`) com esconder/mostrar.

type Periodo = 'mes' | '3' | '6' | '12' | 'personalizado'
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes', label: 'Mês atual' },
  { id: '3', label: '3 meses' },
  { id: '6', label: '6 meses' },
  { id: '12', label: '12 meses' },
  { id: 'personalizado', label: 'Personalizado' },
]

const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Mês atual e "N meses" começam no dia 1 — o backend compara com os mesmos N meses anteriores. */
function intervalo(p: Periodo): { de: string; ate: string } {
  const hoje = new Date()
  const meses = p === 'mes' ? 1 : Number(p)
  return { de: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)), ate: isoLocal(hoje) }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`
const pct = (n: number | null | undefined) => n == null ? '—' : `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const ultimoDia = (mesIso: string) => {
  const [a, m] = mesIso.split('-').map(Number)
  return `${mesIso.slice(0, 7)}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

/**
 * #599 (RN-NOVA-37) — o comparativo diz com qual período compara: "em ago/2026" quando o anterior é um mês
 * cheio; senão "de 22/08 a 31/08/2026" (ano nas duas pontas só quando muda).
 */
export function rotuloPeriodoAnterior(de: string, ate: string): string {
  const mesCheio = de.slice(8) === '01' && de.slice(0, 7) === ate.slice(0, 7) && ate === ultimoDia(de)
  if (mesCheio) return `em ${MESES[Number(de.slice(5, 7)) - 1]}/${de.slice(0, 4)}`
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  return de.slice(0, 4) === ate.slice(0, 4) ? `de ${dm(de)} a ${formatarData(ate)}` : `de ${formatarData(de)} a ${formatarData(ate)}`
}

function Comparacao({ n, formato, periodo }: { n: { anterior: number | null; variacaoPercentual: number | null }; formato: (v: number) => string; periodo: string }) {
  if (n.anterior == null) return <span className="text-faint">Sem dado {periodo}</span>
  const v = n.variacaoPercentual
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="comparativo">
      {v != null && v !== 0 && (v > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      <span className="font-semibold text-body">{v == null ? '—' : `${v > 0 ? '+' : ''}${pct(v)}`}</span>
      <span>vs. {formato(n.anterior)} {periodo}</span>
    </span>
  )
}

function Painel({ titulo, subtitulo, children, acoes, testid }: { titulo: string; subtitulo?: string; children: ReactNode; acoes?: ReactNode; testid?: string }) {
  return (
    <div data-testid={testid} className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <div className="text-[13px] font-bold text-dark">{titulo}</div>
          {subtitulo && <div className="text-[12px] text-muted">{subtitulo}</div>}
        </div>
        {acoes}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function Dica({ active, payload, formato }: { active?: boolean; payload?: { payload: { rotulo: string; extra?: string }; value: number }[]; formato: (v: number) => string }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-input border border-line bg-white px-3 py-2 text-[12.5px] shadow-card">
      <div className="font-semibold text-dark">{p.payload.rotulo}</div>
      <div className="text-body [font-variant-numeric:tabular-nums]">{formato(p.value)}</div>
      {p.payload.extra && <div className="text-muted">{p.payload.extra}</div>}
    </div>
  )
}

const vazio = (texto: string) => <div className="py-10 text-center text-sm text-muted">{texto}</div>
const eixo = { fontSize: 11.5, fill: GRAFICO_EIXO }
const reaisCurto = (v: number) => BRL(Number(v)).replace(',00', '')

/** Ranking horizontal (10 maiores); o clique na barra abre a listagem daquele item. */
function Ranking({ dados, cor, formato, onClique, testid }: {
  dados: { id: string; rotulo: string; valor: number; extra?: string }[]
  cor: string
  formato: (v: number) => string
  onClique: (id: string, rotulo: string) => void
  testid: string
}) {
  return (
    <div style={{ height: Math.max(120, dados.length * 34 + 20) }} data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRAFICO_GRID} />
          <XAxis type="number" tickFormatter={v => formato(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="rotulo" width={140} tick={{ ...eixo, fill: '#5B5750' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Dica formato={formato} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22} cursor="pointer"
            onClick={(d: { payload?: { id: string; rotulo: string } }) => d.payload && onClique(d.payload.id, d.payload.rotulo)}>
            {dados.map(d => <Cell key={d.id} fill={cor} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardCompras() {
  const mobile = useIsMobile()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [deLivre, setDeLivre] = useState('')
  const [ateLivre, setAteLivre] = useState(hojeIso())
  const [d, setD] = useState<DashboardComprasResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [descontoEm, setDescontoEm] = useState<'PERCENTUAL' | 'VALOR'>('PERCENTUAL')
  const [listagem, setListagem] = useState<{ titulo: string; filtro: FiltroInicial } | null>(null)

  const faixa = periodo === 'personalizado' ? { de: deLivre, ate: ateLivre } : intervalo(periodo)

  const carregar = () => {
    if (!faixa.de || !faixa.ate) return
    setCarregando(true); setErro(null)
    compraService.dashboard(faixa.de, faixa.ate)
      .then(setD)
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o painel.')))
      .finally(() => setCarregando(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [faixa.de, faixa.ate])

  const abrir = (titulo: string, filtro: FiltroInicial) => setListagem({ titulo, filtro: { status: ['CONFIRMADA'], ...filtro } })
  const anterior = d ? rotuloPeriodoAnterior(d.deAnterior, d.ateAnterior) : ''
  const doPeriodo: FiltroInicial = d ? { de: d.de, ate: d.ate } : {}
  const numero = (n: NumeroPainel, f: (v: number) => string) => n.valor == null ? '—' : f(n.valor)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" data-testid="filtro-periodo">
        {PERIODOS.map(p => {
          const on = periodo === p.id
          return (
            <button key={p.id} type="button" onClick={() => setPeriodo(p.id)} aria-pressed={on}
              className={clsx('inline-flex h-[34px] items-center rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-colors',
                on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
              {p.label}
            </button>
          )
        })}
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-body">
            <input type="date" aria-label="Data inicial do painel" value={deLivre} max={ateLivre || hojeIso()} onChange={e => setDeLivre(e.target.value)}
              className="h-[34px] rounded-input border-[1.5px] border-line bg-white px-2.5 font-[inherit] text-[13px] outline-none focus:border-teal" />
            até
            <input type="date" aria-label="Data final do painel" value={ateLivre} min={deLivre || undefined} max={hojeIso()} onChange={e => setAteLivre(e.target.value)}
              className="h-[34px] rounded-input border-[1.5px] border-line bg-white px-2.5 font-[inherit] text-[13px] outline-none focus:border-teal" />
          </div>
        )}
        {d && (
          <span className="ml-auto text-[12.5px] text-muted">
            {formatarData(d.de)} a {formatarData(d.ate)} · comparado a {formatarData(d.deAnterior)} a {formatarData(d.ateAnterior)}
          </span>
        )}
      </div>

      {erro ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          {erro} <Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button>
        </div>
      ) : !d || (carregando && !d) ? (
        <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando painel…</div>
      ) : (
        <div className={clsx('flex flex-col gap-4 transition-opacity', carregando && 'opacity-60')}>
          <BigNumberGroup tela="dashboard-compras" testid="numeros-dashboard">
            <BigNumber testid="card-dashboard" icone={<Wallet size={14} />} titulo="Gasto no período" valor={numero(d.gasto, BRL)}
              onLupa={() => abrir('Gasto no período', doPeriodo)}>
              <Comparacao n={d.gasto} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<Receipt size={14} />} titulo="Compras e ticket médio"
              valor={<>{d.quantidadeCompras.valor ?? 0} <span className="text-[15px] font-semibold text-muted">· ticket {numero(d.ticketMedio, BRL)}</span></>}
              onLupa={() => abrir('Compras do período', doPeriodo)}>
              <Comparacao n={d.ticketMedio} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<BadgePercent size={14} />} titulo="Economia com desconto" valor={BRL(d.economia.valor)}
              onLupa={() => abrir('Compras com desconto', { ...doPeriodo, comDesconto: true })}>
              <span>{pct(d.economia.percentual)} sobre {BRL(d.economia.totalCheio)} cheios</span>
              <Comparacao n={d.economia} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<Calculator size={14} />} titulo="CMV" valor={<>{BRL(d.cmv.valor)} <span className="text-[15px] font-semibold text-muted">· {pct(d.cmv.percentual)}</span></>}>
              <span>Custo de material do que foi vendido ÷ faturamento de {BRL(d.cmv.faturamento)}</span>
              {d.cmv.estimado > 0 && <span data-testid="cmv-estimado">inclui {BRL(d.cmv.estimado)} estimado (vendas anteriores a esta versão)</span>}
              {d.cmv.vendasSemCusto > 0 && <span>{d.cmv.vendasSemCusto} {d.cmv.vendasSemCusto === 1 ? 'venda' : 'vendas'} sem custo</span>}
              <Comparacao n={d.cmv} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<AlertCircle size={14} />} titulo="Compras não pagas" valor={BRL(d.naoPagas.valor)}
              onLupa={() => abrir('Compras não pagas', { naoPagas: true })}>
              <span>{d.naoPagas.quantidade} {d.naoPagas.quantidade === 1 ? 'compra' : 'compras'} · hoje, sem depender do período</span>
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<TrendingUp size={14} />} titulo="Maior aumento no período"
              valor={d.maiorAumento ? <span className="text-warning-alt">+{pct(d.maiorAumento.variacaoPercentual)}</span> : <span className="text-[15px] font-semibold text-faint">Sem dados suficientes</span>}
              onLupa={d.maiorAumento ? () => abrir(`Compras com ${d.maiorAumento!.insumo.nome}`,
                { ...doPeriodo, itemId: d.maiorAumento!.insumo.id, rotulos: [d.maiorAumento!.insumo.nome] }) : undefined}>
              {d.maiorAumento && <span>{d.maiorAumento.insumo.nome}: {moeda(d.maiorAumento.precoInicial)} → {moeda(d.maiorAumento.precoFinal)}</span>}
            </BigNumber>
          </BigNumberGroup>

          {mobile ? (
            <div className="flex items-center gap-2.5 rounded-card border border-line bg-cream px-4 py-3.5 text-[13.5px] text-body">
              <Monitor size={18} className="flex-shrink-0 text-teal" /> {MENSAGEM_GRAFICO_CELULAR}
            </div>
          ) : <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Painel titulo="Gasto por mês" subtitulo="Clique numa barra para ver as compras do mês" testid="grafico-gasto-mes">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes) }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={72} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={BRL} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
                      <Bar dataKey="gasto" fill={PALETA_SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} cursor="pointer"
                        onClick={(x: { payload?: { mes: string } }) => x.payload && abrir(`Compras de ${rotuloMes(x.payload.mes)}`,
                          { de: x.payload.mes, ate: ultimoDia(x.payload.mes) })} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <Painel titulo="CMV por mês" subtitulo="Custo de material do que foi vendido no mês" testid="grafico-cmv-mes">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes), extra: `Faturamento ${BRL(m.faturamento)}` }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={72} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={BRL} />} cursor={{ fill: 'rgba(232,102,27,0.06)' }} />
                      <Bar dataKey="cmv" fill={PALETA_SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <Painel titulo="CMV % por mês" subtitulo="CMV ÷ faturamento do mês" testid="grafico-cmv-percentual">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes) }))} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={52} tickFormatter={v => `${v}%`} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={v => pct(v)} />} />
                      {/* #599 — mês sem faturamento vem 0% do backend: a linha não tem buraco. */}
                      <Line dataKey="cmvPercentual" stroke={PALETA_SERIES[1]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <Painel titulo="Insumos que mais subiram" subtitulo="1ª × última compra do período · clique para ver as compras" testid="grafico-insumos-subiram">
                {d.insumosQueMaisSubiram.length === 0 ? vazio('Nenhum insumo subiu de preço no período.') : (
                  <Ranking testid="ranking-insumos" cor={PALETA_SERIES[1]} formato={v => pct(v)}
                    dados={d.insumosQueMaisSubiram.map(i => ({ id: i.insumo.id, rotulo: i.insumo.nome, valor: i.variacaoPercentual,
                      extra: `${moeda(i.precoInicial)} → ${moeda(i.precoFinal)}` }))}
                    onClique={(id, nome) => abrir(`Compras com ${nome}`, { ...doPeriodo, itemId: id, rotulos: [nome] })} />
                )}
              </Painel>
              <Painel titulo="Fornecedores de quem mais compramos" subtitulo="Clique para ver as compras do fornecedor" testid="grafico-fornecedores-gasto">
                {d.fornecedoresPorGasto.length === 0 ? vazio('Nenhuma compra com fornecedor no período.') : (
                  <Ranking testid="ranking-fornecedores" cor={PALETA_SERIES[0]} formato={reaisCurto}
                    dados={d.fornecedoresPorGasto.map(f => ({ id: f.fornecedor.id, rotulo: f.fornecedor.nome, valor: f.valor,
                      extra: `${f.quantidadeCompras} ${f.quantidadeCompras === 1 ? 'compra' : 'compras'}` }))}
                    onClique={(id, nome) => abrir(`Compras de ${nome}`, { ...doPeriodo, fornecedorId: id, rotulos: [nome] })} />
                )}
              </Painel>
              <Painel titulo="Fornecedores que mais deram desconto" subtitulo="Clique para ver as compras do fornecedor" testid="grafico-fornecedores-desconto"
                acoes={<SegmentedControl options={[{ value: 'PERCENTUAL' as const, label: '%' }, { value: 'VALOR' as const, label: 'R$' }]}
                  value={descontoEm} onChange={setDescontoEm} height="h-8" display="inline-flex" optionWidth="w-10" textSize="text-[12.5px]" />}>
                {d.fornecedoresPorDescontoPercentual.length === 0 ? vazio('Nenhum desconto de fornecedor no período.') : (
                  <Ranking testid="ranking-descontos" cor={PALETA_SERIES[2]} formato={descontoEm === 'PERCENTUAL' ? v => pct(v) : reaisCurto}
                    dados={(descontoEm === 'PERCENTUAL' ? d.fornecedoresPorDescontoPercentual : d.fornecedoresPorDescontoValor).map(f => ({
                      id: f.fornecedor.id, rotulo: f.fornecedor.nome, valor: descontoEm === 'PERCENTUAL' ? (f.percentual ?? 0) : f.desconto,
                      extra: `${BRL(f.desconto)} de ${BRL(f.totalCheio)} cheios` }))}
                    onClique={(id, nome) => abrir(`Compras de ${nome}`, { ...doPeriodo, fornecedorId: id, rotulos: [nome] })} />
                )}
              </Painel>
            </div>
            <GraficoPrecoInsumos inicial={d.maiorAumento ? { id: d.maiorAumento.insumo.id, nome: d.maiorAumento.insumo.nome, unidade: d.maiorAumento.insumo.unidade } : null} />
          </>}
        </div>
      )}

      {listagem && (
        <ModalListagemRegistros titulo={listagem.titulo} subtitulo="Compras confirmadas" fonte={{ tipo: 'compras' }}
          filtro={listagem.filtro} onClose={() => setListagem(null)} />
      )}
    </div>
  )
}
