import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import clsx from 'clsx'
import { Layers, Box, Filter } from 'lucide-react'
import { EstoqueTags } from '../ui/Badge'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { PageResponse } from '../../types/shared'
import type { ProdutoResponse } from '../../types/produto'
import type { ItemCatalogoBuscaResponse } from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import { BRL } from './formato'

/**
 * Painel de busca de item de venda — Produto avulso e/ou item de Catálogo, com paginação real do
 * branch de catálogo (RN-NOVA-18, V0.8.3).
 *
 * Os dois consumidores batem em endpoints diferentes (`orcamentoService.buscarItensCatalogo` com
 * filtro de catálogo; `caixaService.buscarItensCatalogo` sem), então as buscas entram por prop.
 *
 * ATENÇÃO: `buscarItensCatalogo` e `buscarProdutos` PRECISAM ser estáveis (`useCallback` em quem
 * chama). Elas entram na dependência do fetcher paginado e do efeito de busca — uma função nova a
 * cada render dispara busca em laço infinito.
 */
export default function ItemSearch({
  open, onClose, modo = 'tudo', buscarItensCatalogo, buscarProdutos,
  catalogos = [], catalogoFiltro = '', onSelectCatalogoFiltro,
  onSelectCatalogoItem, onSelectProdutoAvulso,
}: {
  open: boolean
  onClose: () => void
  modo?: 'tudo' | 'catalogo' | 'produto'
  buscarItensCatalogo: (busca: string | undefined, page: number, size: number) => Promise<PageResponse<ItemCatalogoBuscaResponse>>
  buscarProdutos: (busca: string | undefined) => Promise<ProdutoResponse[]>
  catalogos?: CatalogoResponse[]
  catalogoFiltro?: string
  onSelectCatalogoFiltro?: (id: string) => void
  onSelectCatalogoItem: (item: ItemCatalogoBuscaResponse) => void
  onSelectProdutoAvulso: (produto: ProdutoResponse) => void
}) {
  const [q, setQ] = useState('')
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [maxHeight, setMaxHeight] = useState<number>()
  const wrapRef = useRef<HTMLDivElement>(null)

  // RN-NOVA-18 (V0.8.3) — paginação real do branch de item de catálogo, via usePaginatedList
  // (mesmo hook/padrão de ListaProducaoPage.tsx). fetcher memoizado por [busca] para não recriar a
  // cada render do componente (produtos/loading/maxHeight mudando não pode disparar o efeito de
  // busca abaixo de novo — só mudança real de filtro/query).
  const debouncedQ = useDebouncedValue(q, 300)
  const fetchItensCatalogo = useCallback(
    (page: number, size: number) => buscarItensCatalogo(debouncedQ || undefined, page, size),
    [buscarItensCatalogo, debouncedQ]
  )
  const {
    items: itensCatalogo,
    setItems: setItensCatalogo,
    hasMore: hasMoreCatalogo,
    loadingMore: loadingMoreCatalogo,
    loadMore: handleCarregarMaisCatalogo,
    reset: carregarCatalogo,
  } = usePaginatedList<ItemCatalogoBuscaResponse>({
    fetcher: fetchItensCatalogo,
    pageSize: 8,
    errorMessage: 'Não foi possível carregar os itens de catálogo.',
  })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // ORC-030 — até 8 itens visíveis por vez, resto acessível via rolagem. Altura calculada a partir
  // da posição real da 8ª linha (medida via ref, não um px fixo assumido): cobre de uma vez tanto
  // o caso de 2 rótulos de categoria coexistindo (modo "Tudo" com catálogo + avulso) quanto o caso
  // de badges de estoque quebrando para 2 linhas (nomes longos) — os dois fazem a linha crescer de
  // forma que um valor fixo em px não acompanha. Sem isso: bug original de #242, o painel só
  // orçava espaço para 1 rótulo de categoria, cortando o 8º item quando os dois apareciam juntos.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.scrollTop = 0
    const linhas = el.querySelectorAll<HTMLElement>('[data-search-row]')
    if (linhas.length <= 8) {
      setMaxHeight(undefined)
      return
    }
    // offsetTop/offsetHeight (não getBoundingClientRect) — o painel entra com animate-pop
    // (scale(0.92)→1); medir via clientRect durante o useLayoutEffect (síncrono, antes do
    // primeiro paint) captura o box ainda na escala inicial da animação, subestimando a altura
    // necessária. offsetTop/offsetHeight refletem o layout box "real", imune a transform.
    const oitava = linhas[7]
    setMaxHeight(Math.ceil(oitava.offsetTop + oitava.offsetHeight + 6))
  }, [itensCatalogo, produtos])

  useEffect(() => {
    if (!open) {
      setQ('')
      setItensCatalogo([])
      setProdutos([])
      return
    }
    // #357 (correção) — guard contra fetch prematuro: ver nota completa em NovaProducaoPage.tsx.
    if (debouncedQ !== q) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const tarefas: Promise<void>[] = []
        if (modo !== 'produto') {
          tarefas.push(carregarCatalogo())
        } else if (!cancelled) {
          setItensCatalogo([])
        }
        if (modo === 'tudo' || modo === 'produto') {
          tarefas.push(
            buscarProdutos(debouncedQ || undefined).then(lista => {
              if (!cancelled) setProdutos(lista)
            }).catch(() => { if (!cancelled) setProdutos([]) })
          )
        } else {
          if (!cancelled) setProdutos([])
        }
        await Promise.all(tarefas)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [debouncedQ, open, q, modo, carregarCatalogo, buscarProdutos, setItensCatalogo])

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
          className="h-[38px] min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-cream px-3 font-[inherit] text-sm text-dark outline-none"
        />
        {modo === 'catalogo' && onSelectCatalogoFiltro && catalogos.length > 0 && (
          <div className="relative flex-shrink-0">
            <select
              value={catalogoFiltro}
              onChange={e => onSelectCatalogoFiltro(e.target.value)}
              className="h-[38px] max-w-[150px] cursor-pointer rounded-[9px] border-[1.5px] border-line bg-cream py-0 pl-8 pr-[30px] font-[inherit] text-[13px] text-dark outline-none"
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
            {itensCatalogo.map(item => (
              <button
                key={item.id}
                data-search-row
                onClick={() => { onSelectCatalogoItem(item); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                  <Layers size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{item.nomeProduto}</div>
                  <div className="text-xs text-muted">{BRL(item.precoVenda)} · {item.catalogoNome}</div>
                  <EstoqueTags
                    className="mt-1"
                    fracionavel={item.fracionavel ?? true}
                    showFracionavel={item.fracionavel != null}
                    permitirEstoqueNegativo={item.permitirEstoqueNegativo}
                    estoqueAtual={item.estoqueAtual}
                    variant="busca"
                  />
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
            {produtos.map(p => (
              <button
                key={p.id}
                data-search-row
                onClick={() => { onSelectProdutoAvulso(p); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-line-soft text-dim">
                  <Box size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{p.nome}</div>
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
      {itensCatalogo.length > 0 && hasMoreCatalogo && (
        // RN-NOVA-18 — rodapé fixo, simétrico ao "sticky top-0" da barra de busca acima (mesmo
        // container rolável `wrapRef`): fica sempre visível no rodapé do painel calibrado para 8
        // linhas, sem exigir rolagem extra dentro do popover para achar o botão (decisão do
        // usuário, Passo 0 item 4 — ver DECISOES_V0.8.3.md). Sem `data-search-row`: não entra no
        // cálculo de `maxHeight` (useLayoutEffect acima), que só mede linhas de item real.
        <div className="sticky bottom-0 z-10 border-t border-line bg-white px-1.5 py-1.5">
          <button
            onClick={handleCarregarMaisCatalogo}
            disabled={loadingMoreCatalogo}
            className={clsx(
              'h-9 w-full rounded-lg border-[1.5px] border-line bg-white font-[inherit] text-[13.5px] font-semibold text-body',
              loadingMoreCatalogo ? 'cursor-default opacity-60' : 'cursor-pointer'
            )}
          >
            {loadingMoreCatalogo ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}
