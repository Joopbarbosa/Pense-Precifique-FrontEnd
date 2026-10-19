import { useState, useCallback, useRef } from 'react'
import type { PageResponse } from '../types/shared'

interface UsePaginatedListOptions<T> {
  fetcher: (page: number, size: number) => Promise<PageResponse<T>>
  pageSize?: number
  errorMessage?: string
  /** Página (de zero em diante) em que a lista abre — vem da URL quando a tela guarda a página nela. */
  paginaInicial?: number
}

/**
 * V0.17.0 #994 (RN-NOVA-31, DT-NOVA-27): lista paginada com paginação numerada. Cada chamada TROCA a página
 * (antes o "Carregar mais" acrescentava ao fim). `reset` volta à primeira página (nova busca, filtro ou ordenação);
 * `recarregar` busca de novo a página atual (depois de uma ação sobre um registro). Se a página pedida passar do
 * limite — por exemplo, o último registro dela foi excluído — mostra a última página que existe.
 */
export function usePaginatedList<T>({ fetcher, pageSize = 20, errorMessage = 'Não foi possível carregar os dados.', paginaInicial = 0 }: UsePaginatedListOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(paginaInicial)
  const [ultima, setUltima] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageRef = useRef(paginaInicial)
  const sequencia = useRef(0)

  const carregar = useCallback(async (pg: number) => {
    const minha = ++sequencia.current
    setLoading(true)
    try {
      let data = await fetcher(pg, pageSize)
      if (data.content.length === 0 && pg > 0 && data.totalPages > 0) {
        pg = data.totalPages - 1
        data = await fetcher(pg, pageSize)
      }
      if (minha !== sequencia.current) return
      setItems(data.content)
      setUltima(data.last)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
      pageRef.current = pg
      setPage(pg)
      setError(null)
    } catch {
      if (minha === sequencia.current) setError(errorMessage)
    } finally {
      if (minha === sequencia.current) setLoading(false)
    }
  }, [fetcher, pageSize, errorMessage])

  const irParaPagina = useCallback((pg: number) => carregar(Math.max(0, pg)), [carregar])
  const recarregar = useCallback(() => carregar(pageRef.current), [carregar])
  const reset = useCallback(() => carregar(0), [carregar])

  return { items, setItems, page, totalPages, ultima, totalElements, setTotalElements, loading, error, irParaPagina, recarregar, reset }
}
