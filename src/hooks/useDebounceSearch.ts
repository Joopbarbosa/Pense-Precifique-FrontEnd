import { useState, useEffect, useRef, useCallback } from 'react'
import { usePaginatedList } from './usePaginatedList'

interface PageResponse<T> {
  content: T[]
  last: boolean
  totalElements?: number
}

interface UseDebounceSearchOptions<T> {
  fetcher: (page: number, size: number, query?: string) => Promise<PageResponse<T>>
  delay?: number
  pageSize?: number
}

export function useDebounceSearch<T>({
  fetcher,
  delay = 300,
  pageSize = 20,
}: UseDebounceSearchOptions<T>) {
  const [query, setQuery] = useState('')
  const isFirstRender = useRef(true)

  const boundFetcher = useCallback(
    (page: number, size: number) => fetcher(page, size, query.trim() || undefined),
    [fetcher, query]
  )

  const pagination = usePaginatedList({ fetcher: boundFetcher, pageSize })
  const { reset } = pagination

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      reset()
      return
    }
    const t = setTimeout(() => reset(), query.trim() ? delay : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return { ...pagination, query, setQuery }
}
