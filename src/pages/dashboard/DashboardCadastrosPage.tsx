import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Monitor, Search } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { Button } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import FiltroPeriodo from '../../components/dashboard/FiltroPeriodo'
import Painel from '../../components/dashboard/Painel'
import ModalListaCompleta, { type ItemListaCompleta } from '../../components/dashboard/ModalListaCompleta'
import ModalProdutosDoInsumo from '../../components/dashboard/ModalProdutosDoInsumo'
import { BarrasDivergentes, BarrasVerticais, Mapa, ParetoAbc, type PontoGrafico } from '../../components/dashboard/GraficosVariados'
import Comparacao from '../../components/dashboard/Comparacao'
import ModalTabelaEstoque from '../../components/dashboard/ModalTabelaEstoque'
import ModalVendasCmv from '../../components/compra/ModalVendasCmv'
import { BigNumber, BigNumberGroup } from '../../components/ui'
import { Package, Percent, Warehouse, TrendingUp, AlertTriangle } from 'lucide-react'
import { Dica, Ranking, eixo, reaisCurto } from '../../components/dashboard/graficos'
import { intervalo, pct, rotuloMes, rotuloPeriodoAnterior, ultimoDia, type Periodo } from '../../components/dashboard/periodo'
import ModalListagemRegistros, { type FiltroInicial } from '../../components/shared/ModalListagemRegistros'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { dashboardCadastrosService } from '../../services/dashboardCadastrosService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { DashboardCadastrosResponse, EvolucaoPreco, ItemRanking, RankingCadastros } from '../../types/dashboardCadastros'

// V0.17.0 — #607 (RN-NOVA-16, UC-NOVO-5) e #971 (RN-NOVA-23): Dashboard de Cadastros. Dez indicadores calculados no backend (desempate
// dos rankings e curva ABC incluídos); aqui só período, exibição, a lupa (lista completa do ranking) e os cliques, que abrem a modal de
// listagem daquele dado, sem trocar de aba. Sem dado no período, cada indicador mostra o estado vazio.

const SEM_DADOS = 'Sem dados no período'
const vazio = (texto = SEM_DADOS) => <div className="py-8 text-center text-sm text-muted">{texto}</div>
const nomeItem = (i: ItemRanking) => i.marca ? `${i.rotulo} (${i.marca})` : i.rotulo
const num = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const itensDaLupa = (itens: ItemRanking[], formato: (v: number) => string): ItemListaCompleta[] =>
  itens.map((i, n) => ({ chave: `${i.id ?? i.rotulo}-${n}`, identificador: i.identificador, rotulo: nomeItem(i), valor: formato(i.valor) }))

/** Tipo de gráfico de cada ranking (RN-NOVA-24): horizontal (padrão), vertical, treemap ou divergente. */
type VisualRanking = 'horizontal' | 'vertical' | 'treemap' | 'divergente'

function PainelRanking({ titulo, subtitulo, ranking, cor, formato, testid, onClique, aoVerTodos, visual = 'horizontal' }: {
  titulo: string; subtitulo: string; ranking: RankingCadastros; cor: string; formato: (v: number) => string; testid: string
  onClique?: (item: ItemRanking) => void; aoVerTodos: () => void; visual?: VisualRanking
}) {
  const pontos: PontoGrafico[] = ranking.top.map(i => ({ id: i.id ?? i.rotulo, rotulo: nomeItem(i), valor: i.valor, extra: i.detalhe ?? undefined }))
  const clicar = (id: string) => { const item = ranking.top.find(i => (i.id ?? i.rotulo) === id); if (item && onClique) onClique(item) }

  // V0.17.0 #971: a lupa do ranking lista todos os itens (o olhinho sai); o ranking mostra 10
  return (
    <Painel titulo={titulo} subtitulo={subtitulo} testid={testid}
      acoes={ranking.todos.length > 0 ? <button type="button" aria-label={`Lupa: lista completa de ${titulo}`} title="Lista completa" onClick={aoVerTodos}
        className="grid h-8 w-8 place-items-center rounded-input border border-line bg-white text-muted hover:text-teal"><Search size={15} /></button> : undefined}>
      {ranking.top.length === 0 ? vazio() : visual === 'vertical' ? (
        <BarrasVerticais testid={`${testid}-grafico`} cor={cor} formato={formato} dados={pontos} onClique={clicar} />
      ) : visual === 'treemap' ? (
        <Mapa testid={`${testid}-grafico`} cor={cor} formato={formato} dados={pontos} onClique={clicar} />
      ) : visual === 'divergente' ? (
        <BarrasDivergentes testid={`${testid}-grafico`} dados={pontos} onClique={clicar} />
      ) : (
        <Ranking testid={`${testid}-grafico`} cor={cor} formato={formato} dados={pontos} onClique={clicar} />
      )}
    </Painel>
  )
}

export default function DashboardCadastrosPage() {
  const mobile = useIsMobile()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [deLivre, setDeLivre] = useState('')
  const [ateLivre, setAteLivre] = useState(hojeIso())
  const [d, setD] = useState<DashboardCadastrosResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [todos, setTodos] = useState<{ titulo: string; itens: ItemListaCompleta[] } | null>(null)
  const [listagem, setListagem] = useState<{ titulo: string; filtro: FiltroInicial } | null>(null)
  const [listagemVendas, setListagemVendas] = useState<{ titulo: string; filtro: FiltroInicial } | null>(null)
  const [produtosDoInsumo, setProdutosDoInsumo] = useState<{ id: string; nome: string } | null>(null)
  const [estoqueLupa, setEstoqueLupa] = useState<'valor' | 'potencial' | 'minimo' | null>(null)
  const [cmvLupa, setCmvLupa] = useState(false)
  const [insumoEscolhido, setInsumoEscolhido] = useState<string>('')
  const [evolucao, setEvolucao] = useState<EvolucaoPreco | null>(null)

  const faixa = useMemo(() => periodo === 'personalizado' ? { de: deLivre, ate: ateLivre } : intervalo(periodo), [periodo, deLivre, ateLivre])
  const anterior = d ? rotuloPeriodoAnterior(d.deAnterior, d.ateAnterior) : ''

  const carregar = () => {
    if (!faixa.de || !faixa.ate) return
    setCarregando(true); setErro(null)
    dashboardCadastrosService.dashboard(faixa.de, faixa.ate)
      .then(r => { setD(r); setEvolucao(r.evolucaoPrecoInsumo); setInsumoEscolhido(r.evolucaoPrecoInsumo?.insumoId ?? '') })
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o painel de cadastros.')))
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [faixa.de, faixa.ate])

  const escolherInsumo = (id: string) => {
    setInsumoEscolhido(id)
    if (!id || !d) return
    dashboardCadastrosService.evolucaoPreco(id, d.de, d.ate).then(setEvolucao).catch(() => setEvolucao(null))
  }
  const comprasDoInsumo = (id: string | null, nome: string) => id && setListagem({ titulo: `Compras de ${nome}`,
    filtro: { status: ['CONFIRMADA'], de: d?.de, ate: d?.ate, itemId: id, rotulos: [nome] } })
  // Produto (mais vendido e que dá mais lucro): as vendas que formam o ranking, na modal de listagem (sem trocar de aba)
  const vendasDoProdutoId = (id: string, nome: string) => d && setListagemVendas({ titulo: `Vendas de ${nome}`,
    filtro: { de: d.de, ate: d.ate, vendas: { somenteQueContam: true, produtoId: id } } })
  const vendasDoProduto = (item: ItemRanking) => vendasDoProdutoId(item.id ?? item.rotulo, nomeItem(item))

  return (
    <AppLayout active="cadastros-dashboard" compact>
      <div className="mb-[22px]">
        <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Dashboard de cadastros</h1>
        <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Custo, preço e lucro dos seus insumos e produtos num lugar só.</p>
      </div>
      <div className="flex flex-col gap-4">
        <FiltroPeriodo periodo={periodo} onPeriodo={setPeriodo} deLivre={deLivre} ateLivre={ateLivre} onDeLivre={setDeLivre} onAteLivre={setAteLivre}
          rotuloDireita={d && <>{formatarData(d.de)} a {formatarData(d.ate)} · comparado a {formatarData(d.deAnterior)} a {formatarData(d.ateAnterior)}</>} />

        {erro ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
            {erro} <Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button>
          </div>
        ) : !d ? (
          <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando painel…</div>
        ) : mobile ? (
          <div className="flex items-center gap-2.5 rounded-card border border-line bg-cream px-4 py-3.5 text-[13.5px] text-body">
            <Monitor size={18} className="shrink-0 text-teal" /> {MENSAGEM_GRAFICO_CELULAR}
          </div>
        ) : (
          <div className={clsx('grid grid-cols-1 gap-4 transition-opacity xl:grid-cols-2', carregando && 'opacity-60')}>
            {/* V0.17.0 #974 (RN-NOVA-25): números de estoque (fotos de hoje) e CMV do período; cada um tem lupa (RN-NOVA-23) */}
            <div className="xl:col-span-2">
              <BigNumberGroup tela="dashboard-cadastros" testid="numeros-dashboard-cadastros">
                <BigNumber testid="card-estoque-valor" icone={<Warehouse size={14} />} titulo="Valor do estoque a custo"
                  valor={BRL(d.estoque.valorTotal)} onLupa={() => setEstoqueLupa('valor')}>
                  <span data-testid="estoque-valor-material">Material: {BRL(d.estoque.valorMaterial)}</span>
                  <span data-testid="estoque-valor-prontos">Produtos prontos: {BRL(d.estoque.valorProdutosProntos)}</span>
                </BigNumber>
                <BigNumber testid="card-estoque-potencial" icone={<Package size={14} />} titulo="Potencial de venda do estoque"
                  valor={BRL(d.estoque.potencialVenda)} onLupa={() => setEstoqueLupa('potencial')}>
                  <span>Produtos prontos ao preço de venda</span>
                </BigNumber>
                <BigNumber testid="card-cmv" icone={<Percent size={14} />} titulo="% de CMV" valor={pct(d.estoque.percentualCmv.valor ?? 0)}
                  onLupa={() => setCmvLupa(true)}>
                  <Comparacao n={d.estoque.percentualCmv} formato={pct} periodo={anterior} />
                </BigNumber>
                <BigNumber testid="card-margem-material" icone={<TrendingUp size={14} />} titulo="Margem após custo de material"
                  valor={pct(d.estoque.margemMaterial.valor ?? 0)} onLupa={() => setCmvLupa(true)}>
                  <Comparacao n={d.estoque.margemMaterial} formato={pct} periodo={anterior} />
                </BigNumber>
                <BigNumber testid="card-abaixo-minimo" icone={<AlertTriangle size={14} />} titulo="Insumos abaixo do mínimo"
                  valor={d.estoque.insumosAbaixoMinimo} onLupa={() => setEstoqueLupa('minimo')}>
                  <span>Estoque menor que o mínimo cadastrado</span>
                </BigNumber>
              </BigNumberGroup>
            </div>
            <Painel titulo="Evolução de preço dos insumos" subtitulo="Preço médio pago por mês · clique no ponto para ver as compras" testid="ind-evolucao-preco"
              acoes={d.insumosEmProdutos.todos.length > 0 ? (
                <select aria-label="Insumo da evolução de preço" value={insumoEscolhido} onChange={e => escolherInsumo(e.target.value)}
                  className="h-8 max-w-[220px] rounded-input border-[1.5px] border-line bg-white px-2 text-[12.5px] outline-hidden focus:border-teal">
                  {d.insumosEmProdutos.todos.map(i => <option key={`${i.id}`} value={i.id ?? ''}>{nomeItem(i)}</option>)}
                </select>) : undefined}>
              {!evolucao || evolucao.pontos.length === 0 ? vazio() : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucao.pontos.map(p => ({ ...p, rotulo: rotuloMes(p.mes), extra: `${num(p.quantidade)} comprados` }))}
                      margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                      onClick={(x: { activePayload?: { payload?: { mes?: string } }[] }) => {
                        const mes = x.activePayload?.[0]?.payload?.mes
                        if (mes) setListagem({ titulo: `Compras de ${evolucao.insumo} em ${rotuloMes(mes)}`,
                          filtro: { status: ['CONFIRMADA'], de: mes, ate: ultimoDia(mes), itemId: evolucao.insumoId, rotulos: [evolucao.insumo] } })
                      }}>
                      <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                      <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={64} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip content={<Dica formato={BRL} />} />
                      <Line dataKey="precoMedio" stroke={PALETA_SERIES[0]} strokeWidth={2} connectNulls cursor="pointer" dot={{ r: 4, strokeWidth: 2, fill: '#fff', cursor: 'pointer' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Painel>

            <PainelRanking titulo="Em quantos produtos cada insumo está" subtitulo="Produtos ativos que usam o insumo na ficha técnica" testid="ind-insumos-em-produtos"
              ranking={d.insumosEmProdutos} cor={PALETA_SERIES[2]} formato={v => String(v)} onClique={i => i.id && setProdutosDoInsumo({ id: i.id, nome: nomeItem(i) })}
              aoVerTodos={() => setTodos({ titulo: 'Em quantos produtos cada insumo está', itens: itensDaLupa(d.insumosEmProdutos.todos, v => `${v} produtos`) })} />
            <PainelRanking titulo="Insumo mais comprado" subtitulo="Maior número de compras no período · clique para ver as compras" testid="ind-insumo-mais-comprado"
              ranking={d.insumoMaisComprado} visual="vertical" cor={PALETA_SERIES[0]} formato={v => String(v)} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumo mais comprado', itens: itensDaLupa(d.insumoMaisComprado.todos, v => `${v} compras`) })} />
            <PainelRanking titulo="Insumo em que mais gastamos" subtitulo="Maior valor pago no período · clique para ver as compras" testid="ind-insumo-mais-gasto"
              ranking={d.insumoMaisGasto} visual="treemap" cor={PALETA_SERIES[1]} formato={reaisCurto} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumo em que mais gastamos', itens: itensDaLupa(d.insumoMaisGasto.todos, BRL) })} />
            <PainelRanking titulo="Produto mais vendido" subtitulo="Maior quantidade vendida no período · clique para abrir o produto" testid="ind-produto-mais-vendido"
              ranking={d.produtoMaisVendido} visual="vertical" cor={PALETA_SERIES[0]} formato={v => num(v)} onClique={vendasDoProduto}
              aoVerTodos={() => setTodos({ titulo: 'Produto mais vendido', itens: itensDaLupa(d.produtoMaisVendido.todos, v => `${num(v)} un`) })} />
            <PainelRanking titulo="Produto que dá mais lucro" subtitulo="Faturamento menos custo de material no período" testid="ind-produto-mais-lucro"
              ranking={d.produtoMaisLucro} visual="vertical" cor={PALETA_SERIES[1]} formato={reaisCurto} onClique={vendasDoProduto}
              aoVerTodos={() => setTodos({ titulo: 'Produto que dá mais lucro', itens: itensDaLupa(d.produtoMaisLucro.todos, BRL) })} />
            <PainelRanking titulo="Insumos que mais variaram de preço" subtitulo="Primeiro × último preço pago no período · 2+ compras" testid="ind-insumos-variaram"
              ranking={d.insumosQueMaisVariaram} visual="divergente" cor={PALETA_SERIES[2]} formato={v => pct(v)} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumos que mais variaram de preço', itens: itensDaLupa(d.insumosQueMaisVariaram.todos, v => pct(v)) })} />

            <Painel titulo="Produtos com preço de venda menor que o sugerido" subtitulo="Foto de hoje, não depende do período · o preço de venda continua sendo decisão sua" testid="ind-preco-abaixo-sugerido">
              {d.produtosComPrecoAbaixoDoSugerido.length === 0 ? vazio('Nenhum produto com preço abaixo do sugerido.') : (
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-muted">{['Produto', 'Venda', 'Sugerido', 'Diferença'].map(c => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
                    <tbody>{d.produtosComPrecoAbaixoDoSugerido.map(p => (
                      <tr key={p.id} data-testid="linha-preco-abaixo" className="border-t border-line">
                        <td className="px-2 py-2">{p.nome}</td><td className="px-2 py-2">{BRL(p.precoVenda)}</td>
                        <td className="px-2 py-2">{BRL(p.precoSugerido)}</td><td className="px-2 py-2 font-semibold text-danger">{BRL(p.diferenca)}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
            </Painel>

            <Painel titulo="Margem por produto" subtitulo="(preço de venda − custo) ÷ preço de venda · menores primeiro" testid="ind-margem">
              {d.margemPorProduto.length === 0 ? vazio('Nenhum produto com preço de venda.') : (
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-muted">{['Produto', 'Venda', 'Custo', 'Margem'].map(c => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
                    <tbody>{d.margemPorProduto.map(p => (
                      <tr key={p.id} data-testid="linha-margem" className={clsx('border-t border-line', p.margemPercentual < 0 && 'bg-danger-bg')}>
                        <td className="px-2 py-2">{p.nome}</td><td className="px-2 py-2">{BRL(p.precoVenda)}</td><td className="px-2 py-2">{BRL(p.custo)}</td>
                        <td className={clsx('px-2 py-2 font-semibold', p.margemPercentual < 0 ? 'text-danger' : 'text-body')}>{pct(p.margemPercentual)}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
            </Painel>

            <div className="xl:col-span-2">
              <Painel titulo="Curva ABC de produtos por lucro" subtitulo="Só lucro maior que zero entra na curva · A até 80%, B até 95%, C acima" testid="ind-curva-abc">
                {d.curvaAbc.itens.length === 0 ? vazio('Sem lucro no período') : (
                  <>
                  <ParetoAbc testid="grafico-curva-abc" itens={d.curvaAbc.itens} formato={BRL}
                    onClique={(id, nome) => vendasDoProdutoId(id, nome)} />
                  <table className="mt-4 w-full text-left text-sm">
                    <thead><tr className="text-muted">{['Classe', 'Produto', 'Lucro', '% do lucro', 'Acumulado'].map(c => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
                    <tbody>{d.curvaAbc.itens.map(i => (
                      <tr key={`${i.id}-${i.nome}`} data-testid="linha-abc" className="border-t border-line">
                        <td className="px-2 py-2"><span className={clsx('inline-grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold',
                          i.classe === 'A' ? 'bg-success-bg text-success' : i.classe === 'B' ? 'bg-warning-bg text-warning' : 'bg-line-soft text-subtle')}>{i.classe}</span></td>
                        <td className="px-2 py-2">{i.nome}</td><td className="px-2 py-2">{BRL(i.lucro)}</td>
                        <td className="px-2 py-2">{pct(i.percentual)}</td><td className="px-2 py-2">{pct(i.acumulado)}</td>
                      </tr>))}</tbody>
                  </table>
                  </>
                )}
                {d.curvaAbc.semLucro.length > 0 && (
                  <div data-testid="sem-lucro" className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
                    <strong className="font-semibold text-body">Sem lucro no período:</strong> {d.curvaAbc.semLucro.map(i => `${i.nome} (${BRL(i.lucro)})`).join(', ')}
                  </div>
                )}
              </Painel>
            </div>
          </div>
        )}
      </div>

      {todos && <ModalListaCompleta titulo={todos.titulo} itens={todos.itens} onClose={() => setTodos(null)} />}
      {estoqueLupa === 'valor' && (
        <ModalTabelaEstoque titulo="Valor do estoque a custo" colunas={['Item', 'Tipo', 'Estoque', 'Custo unitário', 'Valor']}
          linhas={d!.estoque.valorItens.map(l => [`${l.identificador} ${l.nome}`, l.tipo === 'INSUMO' ? 'Insumo' : 'Produto', num(l.estoque), l.custoUnitario == null ? '—' : l.custoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }), BRL(l.valor)])}
          total={`Total ${BRL(d!.estoque.valorTotal)}`} onClose={() => setEstoqueLupa(null)} />
      )}
      {estoqueLupa === 'potencial' && (
        <ModalTabelaEstoque titulo="Potencial de venda do estoque" colunas={['Produto', 'Estoque', 'Preço de venda', 'Potencial']}
          linhas={d!.estoque.potencialItens.map(l => [`${l.identificador} ${l.nome}`, num(l.estoque), BRL(l.precoVenda ?? 0), BRL(l.valor)])}
          total={`Total ${BRL(d!.estoque.potencialVenda)}`} onClose={() => setEstoqueLupa(null)} />
      )}
      {estoqueLupa === 'minimo' && (
        <ModalTabelaEstoque titulo="Insumos abaixo do mínimo" colunas={['Insumo', 'Estoque', 'Mínimo', 'Falta']}
          linhas={d!.estoque.abaixoMinimoItens.map(l => [`${l.identificador} ${l.nome}`, num(l.estoque), num(l.minimo), num(l.falta)])}
          onClose={() => setEstoqueLupa(null)} />
      )}
      {cmvLupa && d && (
        <ModalVendasCmv filtro={{ de: d.de, ate: d.ate }} onClose={() => setCmvLupa(false)} />
      )}
      {produtosDoInsumo && <ModalProdutosDoInsumo insumoId={produtosDoInsumo.id} insumoNome={produtosDoInsumo.nome} onClose={() => setProdutosDoInsumo(null)} />}
      {listagemVendas && (
        <ModalListagemRegistros titulo={listagemVendas.titulo} subtitulo="Vendas do Caixa e orçamentos que formam este número"
          fonte={{ tipo: 'vendas' }} filtro={listagemVendas.filtro} onClose={() => setListagemVendas(null)} />
      )}
      {listagem && (
        <ModalListagemRegistros titulo={listagem.titulo} subtitulo="Compras confirmadas" fonte={{ tipo: 'compras' }}
          filtro={listagem.filtro} onClose={() => setListagem(null)} />
      )}
    </AppLayout>
  )
}
