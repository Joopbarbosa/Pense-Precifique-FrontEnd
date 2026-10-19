import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { BarChart3, Monitor, Receipt, Search, ShoppingBag, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { BigNumber, BigNumberGroup, Button } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import Comparacao from '../../components/dashboard/Comparacao'
import FiltroPeriodo from '../../components/dashboard/FiltroPeriodo'
import ListaVendas from '../../components/dashboard/ListaVendas'
import Painel from '../../components/dashboard/Painel'
import ModalListaCompleta, { type ItemListaCompleta } from '../../components/dashboard/ModalListaCompleta'
import ModalListagemRegistros, { type FiltroInicial } from '../../components/shared/ModalListagemRegistros'
import { Dica, Ranking, eixo, reaisCurto, vazio } from '../../components/dashboard/graficos'
import { BarrasVerticais, DonutComLegenda } from '../../components/dashboard/GraficosVariados'
import { intervalo, rotuloMes, rotuloPeriodoAnterior, ultimoDia, type Periodo } from '../../components/dashboard/periodo'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { dashboardVendasService } from '../../services/dashboardVendasService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { DashboardVendasResponse, NumeroDash, OrigemVenda } from '../../types/dashboardVendas'

// V0.17.0 — #719 (RN-NOVA-17) e #968 (RN-NOVA-23): Dashboard de Vendas, com duas abas. Gráficos: números com lupa e gráficos
// clicáveis; Vendas: todas as vendas e orçamentos, de qualquer status. O clique num número ou gráfico abre a modal de listagem das
// vendas que o formam (sem trocar de aba); o clique numa linha abre a modal de dados do registro.

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
  const [lista, setLista] = useState<{ titulo: string; filtro: FiltroInicial } | null>(null)
  const [todosProdutos, setTodosProdutos] = useState(false)

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
  // Clique em número, barra, fatia ou ranking: modal com as vendas que formam o dado (RN-NOVA-12); não troca de aba
  const abrirLista = (titulo: string, vendas: NonNullable<FiltroInicial['vendas']> = {}, intervaloLista = doPeriodo) => {
    setLista({ titulo, filtro: { de: intervaloLista.de, ate: intervaloLista.ate, vendas: { somenteQueContam: true, ...vendas } } })
  }
  const filtroAba = useMemo(() => ({ de: doPeriodo.de, ate: doPeriodo.ate }), [doPeriodo.de, doPeriodo.ate])
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
          <button key={id} role="tab" aria-selected={aba === id} type="button" onClick={() => setAba(id)}
            className={clsx('relative flex items-center gap-2 border-none bg-transparent px-4 py-3 font-[inherit] text-sm transition-colors',
              aba === id ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body')}>
            <Icone size={16} /> {rotulo}
            {aba === id && <span className="absolute bottom-[-1px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <FiltroPeriodo periodo={periodo} onPeriodo={setPeriodo} deLivre={deLivre} ateLivre={ateLivre}
          onDeLivre={setDeLivre} onAteLivre={setAteLivre}
          rotuloDireita={d && <>{formatarData(d.de)} a {formatarData(d.ate)} · comparado a {formatarData(d.deAnterior)} a {formatarData(d.ateAnterior)}</>} />

        {aba === 'vendas' ? (
          <ListaVendas filtroInicial={filtroAba} />
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
                <Painel titulo="Vendas por origem" subtitulo="Caixa × Orçamento · clique numa fatia ou na legenda" testid="grafico-origem">
                  <DonutComLegenda testid="donut-origem" formato={BRL} onClique={(id) => abrirLista(`Vendas de origem ${ROTULO_ORIGEM[id as OrigemVenda]}`, { origem: id as OrigemVenda })}
                    dados={d.porOrigem.filter(o => o.quantidade > 0).map(o => ({ id: o.origem, rotulo: ROTULO_ORIGEM[o.origem], valor: o.faturamento, extra: `${o.quantidade} ${o.quantidade === 1 ? 'venda' : 'vendas'}` }))} />
                </Painel>
                <Painel titulo="Produtos mais vendidos" subtitulo="Unidades vendidas · clique para ver as vendas do produto" testid="grafico-produtos"
                  acoes={d.todosProdutosVendidos.length > 0 ? (
                    <button type="button" aria-label="Ver lista completa de produtos vendidos" title="Lista completa" onClick={() => setTodosProdutos(true)}
                      className="grid h-8 w-8 place-items-center rounded-input border border-line bg-white text-muted hover:text-teal"><Search size={15} /></button>
                  ) : undefined}>
                  {d.produtosMaisVendidos.length === 0 ? vazio('Nenhum produto vendido no período.') : (
                    <Ranking testid="ranking-produtos" cor={PALETA_SERIES[1]} formato={v => `${v} un`}
                      dados={d.produtosMaisVendidos.map(p => ({ id: p.id ?? p.nome, rotulo: p.nome, valor: p.quantidade, extra: `${BRL(p.faturamento)} vendidos` }))}
                      onClique={(id, nome) => abrirLista(`Vendas de ${nome}`, { produtoId: id })} />
                  )}
                </Painel>
                <Painel titulo="Formas de pagamento" subtitulo="Valor por forma registrada · clique para ver as vendas" testid="grafico-formas-pagamento">
                  {d.formasPagamento.length <= 4 ? (
                    <DonutComLegenda testid="donut-formas" formato={BRL} onClique={(id, nome) => abrirLista(`Vendas pagas em ${nome}`, { forma: id })}
                      dados={d.formasPagamento.map(f => ({ id: f.forma, rotulo: f.forma, valor: f.valor, extra: `${f.quantidade} ${f.quantidade === 1 ? 'venda' : 'vendas'}` }))} />
                  ) : (
                    <BarrasVerticais testid="barras-formas" cor={PALETA_SERIES[2]} formato={BRL} onClique={(id, nome) => abrirLista(`Vendas pagas em ${nome}`, { forma: id })}
                      dados={d.formasPagamento.map(f => ({ id: f.forma, rotulo: f.forma, valor: f.valor, extra: `${f.quantidade} ${f.quantidade === 1 ? 'venda' : 'vendas'}` }))} />
                  )}
                </Painel>
              </div>
            )}
          </div>
        )}
      </div>

      {lista && (
        <ModalListagemRegistros titulo={lista.titulo} subtitulo="Vendas do Caixa e orçamentos que formam este número"
          fonte={{ tipo: 'vendas' }} filtro={lista.filtro} onClose={() => setLista(null)} />
      )}
      {todosProdutos && d && (
        <ModalListaCompleta titulo="Produtos mais vendidos" onClose={() => setTodosProdutos(false)}
          itens={d.todosProdutosVendidos.map((p, i): ItemListaCompleta => ({ chave: `${p.id ?? p.nome}-${i}`, rotulo: p.nome,
            detalhe: `${BRL(p.faturamento)}`, valor: `${p.quantidade} un` }))} />
      )}
    </AppLayout>
  )
}
