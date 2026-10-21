import { useState, useEffect, useRef, useCallback } from 'react'
import { usePaginatedList } from './usePaginatedList'
import type { PageResponse } from '../types/shared'

interface UseDebounceSearchOptions<T> {
  fetcher: (page: number, size: number, query?: string) => Promise<PageResponse<T>>
  delay?: number
  pageSize?: number
  errorMessage?: string
  /** V0.17.0 #994: busca e página em que a lista abre (vêm da URL ao voltar de um registro). */
  buscaInicial?: string
  paginaInicial?: number
}

export function useDebounceSearch<T>({
  fetcher,
  delay = 300,
  pageSize = 20,
  errorMessage,
  buscaInicial = '',
  paginaInicial = 0,
}: UseDebounceSearchOptions<T>) {
  const [query, setQuery] = useState(buscaInicial)
  const queryCarregada = useRef<string | null>(null)

  const boundFetcher = useCallback(
    (page: number, size: number) => fetcher(page, size, query.trim() || undefined),
    [fetcher, query]
  )

  const pagination = usePaginatedList({ fetcher: boundFetcher, pageSize, errorMessage, paginaInicial })
  const { reset, recarregar } = pagination

  useEffect(() => {
    // primeira carga (e a repetição do modo estrito do React): na página que a URL pediu; depois, toda nova busca volta à página 1
    if (queryCarregada.current === null || queryCarregada.current === query) {
      queryCarregada.current = query
      recarregar()
      return
    }
    queryCarregada.current = query
    const t = setTimeout(() => reset(), query.trim() ? delay : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return { ...pagination, query, setQuery }
}
