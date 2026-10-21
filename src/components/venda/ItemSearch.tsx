import { useState, useEffect, useRef, useCallback } from 'react'
import OpcaoInativa from '../shared/OpcaoInativa'
import { Layers, Box, Filter } from 'lucide-react'
import { EstoqueTags, FracionavelBadge, EstoqueInsuficienteBadge } from '../ui/Badge'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { PageResponse } from '../../types/shared'
import type { ProdutoResponse } from '../../types/produto'
import type { ItemCatalogoBuscaResponse } from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import Paginacao from '../shared/Paginacao'
import { BRL } from './formato'
import { rotuloProduto } from '../../utils/rotuloProduto'
import { useAlturaListaBusca } from '../../hooks/useAlturaListaBusca'

/**
 * Painel de busca de item de venda — Produto avulso e/ou item de Catálogo, com paginação real (RN-NOVA-18, V0.8.3;
 * paginação numerada de 10 por página desde a #994, RN-NOVA-31 — a mesma página vale para as duas fontes).
 *
 * Os dois consumidores batem em endpoints diferentes (`orcamentoService.buscarItensCatalogo` com
 * filtro de catálogo; `caixaService.buscarItensCatalogo` sem), então as buscas entram por prop.
 *
 * ATENÇÃO: `buscarItensCatalogo` e `buscarProdutos` PRECISAM ser estáveis (`useCallback` em quem
 * chama). Elas entram na dependência do fetcher paginado e do efeito de busca — uma função nova a
 * cada render dispara busca em laço infinito.
 */
// #994 (RN-NOVA-31 item 2): 10 por página nas buscas em lista suspensa
const POR_PAGINA = 10
const SEM_ITENS: never[] = []

export default function ItemSearch({
  open, onClose, modo = 'tudo', buscarItensCatalogo, buscarProdutos,
  catalogos = [], catalogoFiltro = '', onSelectCatalogoFiltro,
  onSelectCatalogoItem, onSelectProdutoAvulso,
}: {
  open: boolean
  onClose: () => void
  modo?: 'tudo' | 'catalogo' | 'produto'
  buscarItensCatalogo: (busca: string | undefined, page: number, size: number) => Promise<PageResponse<ItemCatalogoBuscaResponse>>
  buscarProdutos: (busca: string | undefined, page: number, size: number) => Promise<PageResponse<ProdutoResponse>>
  catalogos?: CatalogoResponse[]
  catalogoFiltro?: string
  onSelectCatalogoFiltro?: (id: string) => void
  onSelectCatalogoItem: (item: ItemCatalogoBuscaResponse) => void
  onSelectProdutoAvulso: (produto: ProdutoResponse) => void
}) {
  const [q, setQ] = useState('')
  const [catalogo, setCatalogo] = useState<PageResponse<ItemCatalogoBuscaResponse> | null>(null)
  const [produtosPg, setProdutosPg] = useState<PageResponse<ProdutoResponse> | null>(null)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // #994 (RN-NOVA-31) — uma página só (10 por fonte) vale para as duas fontes; mudar a busca, o modo ou o catálogo volta à
  // página 1, e escolher um item não muda de página. `buscarItensCatalogo` e `buscarProdutos` só mudam com o catálogo e
  // o modo, que entram na chave.
  const debouncedQ = useDebouncedValue(q, 300)
  const chave = `${modo}|${catalogoFiltro}|${debouncedQ}`
  const [pg, setPg] = useState({ chave: '', n: 0 })
  const pagina = pg.chave === chave ? pg.n : 0
  const irParaPagina = useCallback((n: number) => setPg({ chave, n }), [chave])
  const itensCatalogo = catalogo?.content ?? SEM_ITENS
  const produtos = produtosPg?.content ?? SEM_ITENS
  const totalPaginas = Math.max(catalogo?.totalPages ?? 0, produtosPg?.totalPages ?? 0)
  const ultima = (catalogo?.last ?? true) && (produtosPg?.last ?? true)
  const total = (catalogo?.totalElements ?? 0) + (produtosPg?.totalElements ?? 0)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const versaoLinhas = `${open}|${modo}|${itensCatalogo.map(item => item.id).join(',')}|${produtos.map(produto => produto.id).join(',')}`
  const maxHeight = useAlturaListaBusca(wrapRef, versaoLinhas)

  useEffect(() => {
    if (!open) {
      setQ('')
      setCatalogo(null)
      setProdutosPg(null)
      return
    }
    // #357 (correção) — guard contra fetch prematuro: ver nota completa em NovaProducaoPage.tsx.
    if (debouncedQ !== q) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const termo = debouncedQ || undefined
        const [c, p] = await Promise.all([
          modo !== 'produto' ? buscarItensCatalogo(termo, pagina, POR_PAGINA).catch(() => null) : Promise.resolve(null),
          modo !== 'catalogo' ? buscarProdutos(termo, pagina, POR_PAGINA).catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return
        // página que passou do limite (registros removidos): mostra a última que existe
        const vazio = (c?.content.length ?? 0) === 0 && (p?.content.length ?? 0) === 0
        const ultimaExistente = Math.max(c?.totalPages ?? 0, p?.totalPages ?? 0) - 1
        if (pagina > 0 && vazio && ultimaExistente >= 0) { irParaPagina(ultimaExistente); return }
        setCatalogo(c)
        setProdutosPg(p)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [debouncedQ, open, q, modo, pagina, buscarItensCatalogo, buscarProdutos, irParaPagina])

  if (!open) return null

  const semResultado = itensCatalogo.length === 0 && produtos.length === 0 && !loading

  return (
    <div
      ref={wrapRef}
      style={maxHeight != null ? { maxHeight } : undefined}
      className="absolute inset-x-5 top-[62px] z-30 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]"
    >
      <div className="sticky top-0 z-10 flex gap-1.5 bg-white px-1.5 pt-1.5">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={
            modo === 'catalogo' ? 'Buscar item de catálogo...' :
            modo === 'produto' ? 'Buscar produto...' :
            'Buscar produto ou item de catálogo...'
          }
          className="h-[38px] min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-cream px-3 font-[inherit] text-sm text-dark outline-hidden"
        />
        {modo === 'catalogo' && onSelectCatalogoFiltro && catalogos.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={catalogoFiltro}
              onChange={e => onSelectCatalogoFiltro(e.target.value)}
              className="h-[38px] max-w-[150px] cursor-pointer rounded-[9px] border-[1.5px] border-line bg-cream py-0 pl-8 pr-[30px] font-[inherit] text-[13px] text-dark outline-hidden"
            >
              <option value="">Todos catálogos</option>
              {catalogos.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
              <Filter size={14} />
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5">
        {itensCatalogo.length > 0 && (
          <div>
            {modo === 'tudo' && (
              <div className="px-[11px] pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                Itens de catálogo
              </div>
            )}
            {/* #641 (RN-NOVA-40) — item indisponível (catálogo ou componente inativo): riscado, com "Inativo", sem poder escolher. */}
            {itensCatalogo.map(item => item.ativo === false ? (
              <OpcaoInativa key={item.id} className="px-[11px] py-2.5">
                <div className="truncate text-sm font-medium">{rotuloProduto(item.nome, item.marca)}</div>
                <div className="text-xs">{item.catalogoNome}</div>
              </OpcaoInativa>
            ) : (
              <button
                key={item.id}
                data-search-row
                onClick={() => { onSelectCatalogoItem(item); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                  <Layers size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{rotuloProduto(item.nome, item.marca)}</div>
                  <div className="text-xs text-muted">{BRL(item.precoVenda)} · {item.catalogoNome}</div>
                  {/* V0.13.0 — item de catálogo passou a ter N componentes, cada um com seu próprio
                      estoque; não há badge de quantidade exata única pra mostrar na busca. Os dois
                      agregados abaixo (fracionamento e bloqueio duro de estoque, #527) continuam
                      bem definidos mesmo com N componentes. */}
                  {(item.algumComponenteNaoFracionavel || item.algumComponenteSemEstoque) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {item.algumComponenteNaoFracionavel && <FracionavelBadge fracionavel={false} variant="busca" />}
                      {item.algumComponenteSemEstoque && <EstoqueInsuficienteBadge variant="busca" />}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {produtos.length > 0 && (
          <div>
            {modo === 'tudo' && (
              <div className="px-[11px] pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                Produtos
              </div>
            )}
            {/* #616 (RN-NOVA-40) — produto inativo: riscado, com "Inativo", sem poder escolher. */}
            {produtos.map(p => p.ativo === false ? (
              <OpcaoInativa key={p.id} className="px-[11px] py-2.5">
                <div className="truncate text-sm font-medium">{rotuloProduto(p.nome, p.marca)}</div>
              </OpcaoInativa>
            ) : (
              <button
                key={p.id}
                data-search-row
                onClick={() => { onSelectProdutoAvulso(p); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-line-soft text-dim">
                  <Box size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{rotuloProduto(p.nome, p.marca)}</div>
                  <div className="text-xs text-muted">{BRL(p.precoVenda ?? 0)} / unidade</div>
                  <EstoqueTags
                    className="mt-1"
                    fracionavel={p.fracionavel ?? true}
                    permitirEstoqueNegativo={p.permitirEstoqueNegativo}
                    estoqueAtual={p.estoqueAtual}
                    variant="busca"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
        {semResultado && (
          <div className="p-5 text-center text-sm text-muted">
            {modo === 'catalogo'
              ? 'Nenhum item de catálogo encontrado. Cadastre um item de catálogo primeiro.'
              : modo === 'produto'
                ? 'Nenhum produto fora de catálogo encontrado.'
                : 'Nenhum resultado encontrado.'}
          </div>
        )}
      </div>
      {total > 0 && (
        // RN-NOVA-18 / #994 — rodapé fixo, simétrico ao "sticky top-0" da barra de busca acima (mesmo container rolável
        // `wrapRef`): fica sempre visível no rodapé do painel calibrado para 8 linhas. Sem `data-search-row`: não entra
        // no cálculo de `maxHeight` (useLayoutEffect acima), que só mede linhas de item real.
        <div className="sticky bottom-0 z-10 border-t border-line bg-white px-1.5 pb-1.5">
          <Paginacao pagina={pagina} totalPaginas={totalPaginas} ultima={ultima} carregando={loading} onMudar={irParaPagina}
            esquerda={<span data-testid="total-registros">{total} {total === 1 ? 'resultado' : 'resultados'}</span>} />
        </div>
      )}
    </div>
  )
}
