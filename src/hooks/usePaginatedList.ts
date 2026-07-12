import { useState, useCallback } from 'react'

interface PageResponse<T> {
  content: T[]
  last: boolean
  totalElements?: number
}

interface UsePaginatedListOptions<T> {
  fetcher: (page: number, size: number) => Promise<PageResponse<T>>
  pageSize?: number
}

export function usePaginatedList<T>({ fetcher, pageSize = 20 }: UsePaginatedListOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (pg: number, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const data = await fetcher(pg, pageSize)
      setItems(prev => reset ? data.content : [...prev, ...data.content])
      setHasMore(!data.last)
      setPage(pg)
      setError(null)
    } catch {
      setError('Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [fetcher, pageSize])

  const loadMore = useCallback(() => load(page + 1, false), [load, page])
  const reset = useCallback(() => load(0, true), [load])

  return { items, page, hasMore, loading, loadingMore, error, loadMore, reset }
}
