import { formatarData, dataLocalIso } from '../../utils/data'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { BadgePercent, Calculator, Monitor, Receipt, TrendingUp, Wallet, AlertCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Spinner from '../ui/Spinner'
import ModalVendasCmv, { type FiltroVendasCmv } from './ModalVendasCmv'
import { BigNumber, BigNumberGroup, Button, SegmentedControl } from '../ui'
import GraficoPrecoInsumos from './GraficoPrecoInsumos'
import ModalListagemRegistros, { type FiltroInicial } from '../shared/ModalListagemRegistros'
import { moeda } from './formato'
import { BRL } from '../venda/formato'
import { compraService } from '../../services/compraService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import Comparacao from '../dashboard/Comparacao'
import FiltroPeriodo from '../dashboard/FiltroPeriodo'
import Painel from '../dashboard/Painel'
import { Dica, Ranking, eixo, reaisCurto, vazio } from '../dashboard/graficos'
import { intervalo, pct, rotuloMes, rotuloPeriodoAnterior, ultimoDia, type Periodo } from '../dashboard/periodo'
import type { DashboardComprasResponse, NumeroPainel } from '../../types/compra'

// #577/#578 (RN-NOVA-29) — Dashboard de compras. Tudo vem calculado do backend (só compras CONFIRMADAS,
// período + período anterior); aqui só escolha de período, formatação e os cliques que abrem a modal de
// listagem de compras (RN-NOVA-24). #598: página própria no menu Compras. #601 (RN-NOVA-37): lupa em
// todos os números; #615 acrescenta lupa/listagem de vendas e cliques nos gráficos do CMV.
// #604 (RN-NOVA-34): cartões padrão (`BigNumber`) com esconder/mostrar.

export default function DashboardCompras() {
  const mobile = useIsMobile()
  const [vendasCmv, setVendasCmv] = useState<FiltroVendasCmv | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [deLivre, setDeLivre] = useState('')
  const [ateLivre, setAteLivre] = useState(dataLocalIso())
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
  useEffect(carregar, [faixa.de, faixa.ate])

  const abrir = (titulo: string, filtro: FiltroInicial) => setListagem({ titulo, filtro: { status: ['CONFIRMADA'], ...filtro } })
  const abrirCmv = (mes?: string) => { if (d) setVendasCmv({ de: d.de, ate: d.ate, ...(mes ? { mes: mes.slice(0, 7) } : {}) }) }
  const anterior = d ? rotuloPeriodoAnterior(d.deAnterior, d.ateAnterior) : ''
  const doPeriodo: FiltroInicial = d ? { de: d.de, ate: d.ate } : {}
  const numero = (n: NumeroPainel, f: (v: number) => string) => n.valor == null ? '—' : f(n.valor)

  return (
    <div className="flex flex-col gap-4">
      <FiltroPeriodo periodo={periodo} onPeriodo={setPeriodo} deLivre={deLivre} ateLivre={ateLivre} onDeLivre={setDeLivre} onAteLivre={setAteLivre}
        rotuloDireita={d && <>{formatarData(d.de)} a {formatarData(d.ate)} · comparado a {formatarData(d.deAnterior)} a {formatarData(d.ateAnterior)}</>} />

      {erro ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
          {erro} <Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button>
        </div>
      ) : !d || (carregando && !d) ? (
        <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando painel…</div>
      ) : (
        <div className={clsx('flex flex-col gap-4 transition-opacity', carregando && 'opacity-60')}>
          <BigNumberGroup tela="dashboard-compras" testid="numeros-dashboard">
            <BigNumber testid="card-dashboard" icone={<Wallet size={14} />} titulo="Gasto no período" ajuda="comp-gasto" valor={numero(d.gasto, BRL)}
              onLupa={() => abrir('Gasto no período', doPeriodo)}>
              <Comparacao n={d.gasto} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<Receipt size={14} />} titulo="Compras e ticket médio" ajuda="comp-compras-ticket" 
              valor={<>{d.quantidadeCompras.valor ?? 0} <span className="text-[15px] font-semibold text-muted">· ticket {numero(d.ticketMedio, BRL)}</span></>}
              onLupa={() => abrir('Compras do período', doPeriodo)}>
              <Comparacao n={d.ticketMedio} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<BadgePercent size={14} />} titulo="Economia com desconto" ajuda="comp-economia" valor={BRL(d.economia.valor)}
              onLupa={() => abrir('Compras com desconto', { ...doPeriodo, comDesconto: true })}>
              <span>{pct(d.economia.percentual)} sobre {BRL(d.economia.totalCheio)} cheios</span>
              <Comparacao n={d.economia} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<Calculator size={14} />} titulo="CMV" ajuda="comp-cmv" onLupa={() => abrirCmv()} valor={<>{BRL(d.cmv.valor)} <span className="text-[15px] font-semibold text-muted">· {pct(d.cmv.percentual)}</span></>}>
              <span>Custo de material do que foi vendido ÷ faturamento de {BRL(d.cmv.faturamento)}</span>
              {d.cmv.estimado > 0 && <span data-testid="cmv-estimado">inclui {BRL(d.cmv.estimado)} estimado (vendas anteriores a esta versão)</span>}
              {d.cmv.vendasSemCusto > 0 && <span>{d.cmv.vendasSemCusto} {d.cmv.vendasSemCusto === 1 ? 'venda' : 'vendas'} sem custo</span>}
              <Comparacao n={d.cmv} formato={BRL} periodo={anterior} />
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<AlertCircle size={14} />} titulo="Compras não pagas" ajuda="comp-nao-pagas" valor={BRL(d.naoPagas.valor)}
              onLupa={() => abrir('Compras não pagas', { naoPagas: true })}>
              <span>{d.naoPagas.quantidade} {d.naoPagas.quantidade === 1 ? 'compra' : 'compras'} · hoje, sem depender do período</span>
            </BigNumber>
            <BigNumber testid="card-dashboard" icone={<TrendingUp size={14} />} titulo="Maior aumento no período" ajuda="comp-maior-aumento" 
              valor={d.maiorAumento ? <span className="text-warning-alt">+{pct(d.maiorAumento.variacaoPercentual)}</span> : <span className="text-[15px] font-semibold text-faint">Sem dados suficientes</span>}
              onLupa={d.maiorAumento ? () => abrir(`Compras com ${d.maiorAumento!.insumo.nome}`,
                { ...doPeriodo, itemId: d.maiorAumento!.insumo.id, rotulos: [d.maiorAumento!.insumo.nome] }) : undefined}>
              {d.maiorAumento && <span>{d.maiorAumento.insumo.nome}: {moeda(d.maiorAumento.precoInicial)} → {moeda(d.maiorAumento.precoFinal)}</span>}
            </BigNumber>
          </BigNumberGroup>

          {mobile ? (
            <div className="flex items-center gap-2.5 rounded-card border border-line bg-cream px-4 py-3.5 text-[13.5px] text-body">
              <Monitor size={18} className="shrink-0 text-teal" /> {MENSAGEM_GRAFICO_CELULAR}
            </div>
          ) : <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Painel titulo="Gasto por mês" ajuda="comp-gasto-mes" subtitulo="Clique numa barra para ver as compras do mês" testid="grafico-gasto-mes">
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
              <Painel titulo="CMV por mês" ajuda="comp-cmv-mes" subtitulo="Custo de material do que foi vendido no mês" testid="grafico-cmv-mes">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes), extra: `Faturamento ${BRL(m.faturamento)}` }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={72} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={BRL} />} cursor={{ fill: 'rgba(232,102,27,0.06)' }} />
                      <Bar dataKey="cmv" fill={PALETA_SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={36} cursor="pointer"
                        onClick={(x: { payload?: { mes: string } }) => x.payload && abrirCmv(x.payload.mes)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <Painel titulo="CMV % por mês" ajuda="comp-cmv-pct-mes" subtitulo="CMV ÷ faturamento do mês" testid="grafico-cmv-percentual">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart onClick={(x: { activePayload?: { payload?: { mes?: string } }[] }) => { const mes = x.activePayload?.[0]?.payload?.mes; if (mes) abrirCmv(mes) }} data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes) }))} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={52} tickFormatter={v => `${v}%`} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={v => pct(v)} />} />
                      {/* #599 — mês sem faturamento vem 0% do backend: a linha não tem buraco. */}
                      <Line dataKey="cmvPercentual" stroke={PALETA_SERIES[1]} strokeWidth={2} cursor="pointer" dot={{ r: 4, strokeWidth: 2, fill: '#fff', cursor: 'pointer' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <Painel titulo="Insumos que mais subiram" ajuda="comp-subiram" subtitulo="1ª × última compra do período · clique para ver as compras" testid="grafico-insumos-subiram">
                {d.insumosQueMaisSubiram.length === 0 ? vazio('Nenhum insumo subiu de preço no período.') : (
                  <Ranking testid="ranking-insumos" cor={PALETA_SERIES[1]} formato={v => pct(v)}
                    dados={d.insumosQueMaisSubiram.map(i => ({ id: i.insumo.id, rotulo: i.insumo.nome, valor: i.variacaoPercentual,
                      extra: `${moeda(i.precoInicial)} → ${moeda(i.precoFinal)}` }))}
                    onClique={(id, nome) => abrir(`Compras com ${nome}`, { ...doPeriodo, itemId: id, rotulos: [nome] })} />
                )}
              </Painel>
              <Painel titulo="Fornecedores de quem mais compramos" ajuda="comp-forn-gasto" subtitulo="Clique para ver as compras do fornecedor" testid="grafico-fornecedores-gasto">
                {d.fornecedoresPorGasto.length === 0 ? vazio('Nenhuma compra com fornecedor no período.') : (
                  <Ranking testid="ranking-fornecedores" cor={PALETA_SERIES[0]} formato={reaisCurto}
                    dados={d.fornecedoresPorGasto.map(f => ({ id: f.fornecedor.id, rotulo: f.fornecedor.nome, valor: f.valor,
                      extra: `${f.quantidadeCompras} ${f.quantidadeCompras === 1 ? 'compra' : 'compras'}` }))}
                    onClique={(id, nome) => abrir(`Compras de ${nome}`, { ...doPeriodo, fornecedorId: id, rotulos: [nome] })} />
                )}
              </Painel>
              <Painel titulo="Fornecedores que mais deram desconto" ajuda="comp-forn-desconto" subtitulo="Clique para ver as compras do fornecedor" testid="grafico-fornecedores-desconto"
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
            <GraficoPrecoInsumos de={d.de} ate={d.ate}
              inicial={d.maiorAumento ? { id: d.maiorAumento.insumo.id, nome: d.maiorAumento.insumo.nome, unidade: d.maiorAumento.insumo.unidade ?? '' } : null} />
          </>}
        </div>
      )}

      {vendasCmv && <ModalVendasCmv filtro={vendasCmv} onClose={() => setVendasCmv(null)} />}
      {listagem && (
        <ModalListagemRegistros titulo={listagem.titulo} subtitulo="Compras confirmadas" fonte={{ tipo: 'compras' }}
          filtro={listagem.filtro} onClose={() => setListagem(null)} />
      )}
    </div>
  )
}
