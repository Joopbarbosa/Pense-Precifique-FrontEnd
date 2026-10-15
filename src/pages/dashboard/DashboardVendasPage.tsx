import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { BarChart3, Monitor, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { BigNumber, BigNumberGroup, Button } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import Comparacao from '../../components/dashboard/Comparacao'
import FiltroPeriodo from '../../components/dashboard/FiltroPeriodo'
import ListaVendas from '../../components/dashboard/ListaVendas'
import Painel from '../../components/dashboard/Painel'
import { Dica, Ranking, eixo, reaisCurto, vazio } from '../../components/dashboard/graficos'
import { intervalo, rotuloMes, rotuloPeriodoAnterior, ultimoDia, type Periodo } from '../../components/dashboard/periodo'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { dashboardVendasService } from '../../services/dashboardVendasService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { DashboardVendasResponse, FiltroListaVendas, NumeroDash, OrigemVenda } from '../../types/dashboardVendas'

// V0.17.0 — #719 (RN-NOVA-17): Dashboard de Vendas, com duas abas. Gráficos: números com lupa e gráficos clicáveis; Vendas: todas as
// vendas e orçamentos, de qualquer status. O clique num número ou gráfico abre a aba Vendas filtrada pelas vendas que o formam.

type Aba = 'graficos' | 'vendas'
const ROTULO_ORIGEM: Record<OrigemVenda, string> = { VENDA_CAIXA: 'Caixa', ORCAMENTO: 'Orçamento' }

export default function DashboardVendasPage() {
  const mobile = useIsMobile()
  const [aba, setAba] = useState<Aba>('graficos')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [deLivre, setDeLivre] = useState('')
  const [ateLivre, setAteLivre] = useState(hojeIso())
  const [d, setD] = useState<DashboardVendasResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [lista, setLista] = useState<{ filtro: FiltroListaVendas; descricao?: string } | null>(null)

  const faixa = useMemo(() => periodo === 'personalizado' ? { de: deLivre, ate: ateLivre } : intervalo(periodo), [periodo, deLivre, ateLivre])

  const carregar = () => {
    if (!faixa.de || !faixa.ate) return
    setCarregando(true); setErro(null)
    dashboardVendasService.dashboard(faixa.de, faixa.ate)
      .then(setD)
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o painel de vendas.')))
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [faixa.de, faixa.ate])

  const anterior = d ? rotuloPeriodoAnterior(d.deAnterior, d.ateAnterior) : ''
  const doPeriodo = d ? { de: d.de, ate: d.ate } : { de: faixa.de, ate: faixa.ate }
  const abrirLista = (descricao: string, extra: Partial<FiltroListaVendas> = {}, intervaloLista = doPeriodo) => {
    setLista({ filtro: { ...intervaloLista, somenteQueContam: true, ...extra }, descricao })
    setAba('vendas')
  }
  const ampliar = () => setLista(l => l ? { ...l, filtro: { ...l.filtro, somenteQueContam: false, produtoId: undefined, forma: undefined }, descricao: undefined } : l)
  const numero = (n: NumeroDash, f: (v: number) => string) => n.valor == null ? '—' : f(n.valor)

  return (
    <AppLayout active="vendas-dashboard" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Dashboard de vendas</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Quanto você vendeu, de onde veio e o que mais saiu.</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-line" role="tablist">
        {([['graficos', 'Gráficos', BarChart3], ['vendas', 'Vendas', Receipt]] as const).map(([id, rotulo, Icone]) => (
          <button key={id} role="tab" aria-selected={aba === id} type="button" onClick={() => { setAba(id); if (id === 'vendas' && !lista) setLista({ filtro: { ...doPeriodo } }) }}
            className={clsx('relative flex items-center gap-2 border-none bg-transparent px-4 py-3 font-[inherit] text-sm transition-colors',
              aba === id ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body')}>
            <Icone size={16} /> {rotulo}
            {aba === id && <span className="absolute bottom-[-1px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <FiltroPeriodo periodo={periodo} onPeriodo={p => { setPeriodo(p); setLista(null) }} deLivre={deLivre} ateLivre={ateLivre}
          onDeLivre={v => { setDeLivre(v); setLista(null) }} onAteLivre={v => { setAteLivre(v); setLista(null) }}
          rotuloDireita={d && <>{formatarData(d.de)} a {formatarData(d.ate)} · comparado a {formatarData(d.deAnterior)} a {formatarData(d.ateAnterior)}</>} />

        {aba === 'vendas' ? (
          <ListaVendas filtroInicial={lista?.filtro ?? { ...doPeriodo }} descricaoFiltro={lista?.descricao} onAmpliar={ampliar} />
        ) : erro ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
            {erro} <Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button>
          </div>
        ) : !d ? (
          <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando painel…</div>
        ) : (
          <div className={clsx('flex flex-col gap-4 transition-opacity', carregando && 'opacity-60')}>
            <BigNumberGroup tela="dashboard-vendas" testid="numeros-dashboard-vendas">
              <BigNumber testid="card-dashboard" icone={<Wallet size={14} />} titulo="Faturamento" valor={numero(d.faturamento, BRL)}
                onLupa={() => abrirLista('Faturamento do período')}>
                <Comparacao n={d.faturamento} formato={BRL} periodo={anterior} />
              </BigNumber>
              <BigNumber testid="card-dashboard" icone={<ShoppingBag size={14} />} titulo="Nº de vendas" valor={d.quantidadeVendas.valor ?? 0}
                onLupa={() => abrirLista('Vendas do período')}>
                <Comparacao n={d.quantidadeVendas} formato={v => String(v)} periodo={anterior} />
              </BigNumber>
              <BigNumber testid="card-dashboard" icone={<Receipt size={14} />} titulo="Ticket médio" valor={numero(d.ticketMedio, BRL)}
                onLupa={() => abrirLista('Vendas que formam o ticket médio')}>
                <Comparacao n={d.ticketMedio} formato={BRL} periodo={anterior} />
              </BigNumber>
            </BigNumberGroup>

            {mobile ? (
              <div className="flex items-center gap-2.5 rounded-card border border-line bg-cream px-4 py-3.5 text-[13.5px] text-body">
                <Monitor size={18} className="shrink-0 text-teal" /> {MENSAGEM_GRAFICO_CELULAR}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Painel titulo="Faturamento por mês" subtitulo="Clique numa barra para ver as vendas do mês" testid="grafico-faturamento-mes">
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d.meses.map(m => ({ ...m, rotulo: rotuloMes(m.mes), extra: `${m.quantidade} ${m.quantidade === 1 ? 'venda' : 'vendas'}` }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                        <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                        <YAxis width={72} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                        <Tooltip content={<Dica formato={BRL} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
                        <Bar dataKey="faturamento" fill={PALETA_SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} cursor="pointer"
                          onClick={(x: { payload?: { mes: string } }) => x.payload && abrirLista(`Vendas de ${rotuloMes(x.payload.mes)}`, {}, { de: x.payload.mes, ate: ultimoDia(x.payload.mes) })} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Painel>
                <Painel titulo="Vendas por origem" subtitulo="Caixa × Orçamento · clique numa fatia" testid="grafico-origem">
                  {d.porOrigem.every(o => o.quantidade === 0) ? vazio('Nenhuma venda no período.') : (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={d.porOrigem.filter(o => o.quantidade > 0).map(o => ({ ...o, rotulo: ROTULO_ORIGEM[o.origem], valor: o.faturamento, extra: `${o.quantidade} ${o.quantidade === 1 ? 'venda' : 'vendas'}` }))}
                            dataKey="valor" nameKey="rotulo" innerRadius={50} outerRadius={90} cursor="pointer" label={(e: { rotulo?: string }) => e.rotulo}
                            onClick={(x: { origem?: OrigemVenda }) => x.origem && abrirLista(`Vendas de origem ${ROTULO_ORIGEM[x.origem]}`, { origem: x.origem })}>
                            {d.porOrigem.filter(o => o.quantidade > 0).map((o, i) => <Cell key={o.origem} fill={PALETA_SERIES[i % PALETA_SERIES.length]} />)}
                          </Pie>
                          <Tooltip content={<Dica formato={BRL} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Painel>
                <Painel titulo="Produtos mais vendidos" subtitulo="Por quantidade · clique para ver as vendas do produto" testid="grafico-produtos">
                  {d.produtosMaisVendidos.length === 0 ? vazio('Nenhum produto vendido no período.') : (
                    <Ranking testid="ranking-produtos" cor={PALETA_SERIES[1]} formato={v => String(v)}
                      dados={d.produtosMaisVendidos.map(p => ({ id: p.id ?? p.nome, rotulo: p.nome, valor: p.quantidade, extra: `${BRL(p.faturamento)} vendidos` }))}
                      onClique={(id, nome) => abrirLista(`Vendas de ${nome}`, { produtoId: id })} />
                  )}
                </Painel>
                <Painel titulo="Formas de pagamento" subtitulo="Valor por forma registrada · clique para ver as vendas" testid="grafico-formas-pagamento">
                  {d.formasPagamento.length === 0 ? vazio('Nenhuma venda no período.') : (
                    <Ranking testid="ranking-formas" cor={PALETA_SERIES[2]} formato={reaisCurto}
                      dados={d.formasPagamento.map(f => ({ id: f.forma, rotulo: f.forma, valor: f.valor, extra: `${f.quantidade} ${f.quantidade === 1 ? 'venda' : 'vendas'}` }))}
                      onClique={(id, nome) => abrirLista(`Vendas pagas em ${nome}`, { forma: id })} />
                  )}
                </Painel>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
