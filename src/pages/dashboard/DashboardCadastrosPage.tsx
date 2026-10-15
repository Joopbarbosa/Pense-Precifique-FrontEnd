import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Eye, Monitor } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { Button, ModalShell } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import FiltroPeriodo from '../../components/dashboard/FiltroPeriodo'
import Painel from '../../components/dashboard/Painel'
import { Dica, Ranking, eixo, reaisCurto } from '../../components/dashboard/graficos'
import { intervalo, pct, rotuloMes, ultimoDia, type Periodo } from '../../components/dashboard/periodo'
import ModalListagemRegistros, { type FiltroInicial } from '../../components/shared/ModalListagemRegistros'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { dashboardCadastrosService } from '../../services/dashboardCadastrosService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { DashboardCadastrosResponse, EvolucaoPreco, ItemRanking, RankingCadastros } from '../../types/dashboardCadastros'

// V0.17.0 — #607 (RN-NOVA-16, UC-NOVO-5): Dashboard de Cadastros. Dez indicadores calculados no backend (desempate dos rankings e curva ABC
// incluídos); aqui só período, exibição, a lupa ("ver todos") e os cliques. Sem dado no período, cada indicador mostra o estado vazio.

const SEM_DADOS = 'Sem dados no período'
const vazio = (texto = SEM_DADOS) => <div className="py-8 text-center text-sm text-muted">{texto}</div>
const nomeItem = (i: ItemRanking) => i.marca ? `${i.rotulo} (${i.marca})` : i.rotulo
const num = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function ModalTodos({ titulo, itens, formato, onClose }: { titulo: string; itens: ItemRanking[]; formato: (v: number) => string; onClose: () => void }) {
  return (
    <ModalShell open onClose={onClose} title={titulo} width={560} footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>} closeLabel="Fechar lista">
      <div data-testid="lista-todos" className="max-h-[60vh] overflow-auto">
        {itens.length === 0 ? vazio() : itens.map(i => (
          <div key={`${i.id}-${i.identificador}`} className="flex items-center justify-between gap-3 border-b border-line px-1 py-2.5 text-sm">
            <span><span className="mr-2 text-[12px] font-semibold text-muted">{i.identificador}</span>{nomeItem(i)}</span>
            <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{formato(i.valor)}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

function PainelRanking({ titulo, subtitulo, ranking, cor, formato, testid, onClique, aoVerTodos }: {
  titulo: string; subtitulo: string; ranking: RankingCadastros; cor: string; formato: (v: number) => string; testid: string
  onClique?: (item: ItemRanking) => void; aoVerTodos: () => void
}) {
  return (
    <Painel titulo={titulo} subtitulo={subtitulo} testid={testid}
      acoes={ranking.todos.length > 0 ? <button type="button" aria-label={`Ver todos: ${titulo}`} title="Ver todos" onClick={aoVerTodos}
        className="grid h-8 w-8 place-items-center rounded-input border border-line bg-white text-muted hover:text-teal"><Eye size={15} /></button> : undefined}>
      {ranking.top.length === 0 ? vazio() : (
        <Ranking testid={`${testid}-grafico`} cor={cor} formato={formato}
          dados={ranking.top.map(i => ({ id: i.id ?? i.rotulo, rotulo: nomeItem(i), valor: i.valor, extra: i.detalhe ?? undefined }))}
          onClique={id => { const item = ranking.top.find(i => (i.id ?? i.rotulo) === id); if (item && onClique) onClique(item) }} />
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
  const [todos, setTodos] = useState<{ titulo: string; itens: ItemRanking[]; formato: (v: number) => string } | null>(null)
  const [listagem, setListagem] = useState<{ titulo: string; filtro: FiltroInicial } | null>(null)
  const [insumoEscolhido, setInsumoEscolhido] = useState<string>('')
  const [evolucao, setEvolucao] = useState<EvolucaoPreco | null>(null)

  const faixa = useMemo(() => periodo === 'personalizado' ? { de: deLivre, ate: ateLivre } : intervalo(periodo), [periodo, deLivre, ateLivre])

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
  const abrirProduto = (item: ItemRanking) => { if (item.id) window.open(`/produtos/${item.id}`, '_blank', 'noopener,noreferrer') }

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
              ranking={d.insumosEmProdutos} cor={PALETA_SERIES[2]} formato={v => String(v)}
              aoVerTodos={() => setTodos({ titulo: 'Em quantos produtos cada insumo está', itens: d.insumosEmProdutos.todos, formato: v => `${v} produtos` })} />
            <PainelRanking titulo="Insumo mais comprado" subtitulo="Maior número de compras no período · clique para ver as compras" testid="ind-insumo-mais-comprado"
              ranking={d.insumoMaisComprado} cor={PALETA_SERIES[0]} formato={v => String(v)} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumo mais comprado', itens: d.insumoMaisComprado.todos, formato: v => `${v} compras` })} />
            <PainelRanking titulo="Insumo em que mais gastamos" subtitulo="Maior valor pago no período · clique para ver as compras" testid="ind-insumo-mais-gasto"
              ranking={d.insumoMaisGasto} cor={PALETA_SERIES[1]} formato={reaisCurto} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumo em que mais gastamos', itens: d.insumoMaisGasto.todos, formato: BRL })} />
            <PainelRanking titulo="Produto mais vendido" subtitulo="Maior quantidade vendida no período · clique para abrir o produto" testid="ind-produto-mais-vendido"
              ranking={d.produtoMaisVendido} cor={PALETA_SERIES[0]} formato={v => num(v)} onClique={abrirProduto}
              aoVerTodos={() => setTodos({ titulo: 'Produto mais vendido', itens: d.produtoMaisVendido.todos, formato: v => `${num(v)} un` })} />
            <PainelRanking titulo="Produto que dá mais lucro" subtitulo="Faturamento menos custo de material no período" testid="ind-produto-mais-lucro"
              ranking={d.produtoMaisLucro} cor={PALETA_SERIES[1]} formato={reaisCurto} onClique={abrirProduto}
              aoVerTodos={() => setTodos({ titulo: 'Produto que dá mais lucro', itens: d.produtoMaisLucro.todos, formato: BRL })} />
            <PainelRanking titulo="Insumos que mais variaram de preço" subtitulo="Primeiro × último preço pago no período · 2+ compras" testid="ind-insumos-variaram"
              ranking={d.insumosQueMaisVariaram} cor={PALETA_SERIES[2]} formato={v => pct(v)} onClique={i => comprasDoInsumo(i.id, nomeItem(i))}
              aoVerTodos={() => setTodos({ titulo: 'Insumos que mais variaram de preço', itens: d.insumosQueMaisVariaram.todos, formato: v => pct(v) })} />

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
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-muted">{['Classe', 'Produto', 'Lucro', '% do lucro', 'Acumulado'].map(c => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
                    <tbody>{d.curvaAbc.itens.map(i => (
                      <tr key={`${i.id}-${i.nome}`} data-testid="linha-abc" className="border-t border-line">
                        <td className="px-2 py-2"><span className={clsx('inline-grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold',
                          i.classe === 'A' ? 'bg-success-bg text-success' : i.classe === 'B' ? 'bg-warning-bg text-warning' : 'bg-line-soft text-subtle')}>{i.classe}</span></td>
                        <td className="px-2 py-2">{i.nome}</td><td className="px-2 py-2">{BRL(i.lucro)}</td>
                        <td className="px-2 py-2">{pct(i.percentual)}</td><td className="px-2 py-2">{pct(i.acumulado)}</td>
                      </tr>))}</tbody>
                  </table>
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

      {todos && <ModalTodos titulo={todos.titulo} itens={todos.itens} formato={todos.formato} onClose={() => setTodos(null)} />}
      {listagem && (
        <ModalListagemRegistros titulo={listagem.titulo} subtitulo="Compras confirmadas" fonte={{ tipo: 'compras' }}
          filtro={listagem.filtro} onClose={() => setListagem(null)} />
      )}
    </AppLayout>
  )
}
