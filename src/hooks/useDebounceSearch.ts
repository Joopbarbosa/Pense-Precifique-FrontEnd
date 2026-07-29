import { useState, useEffect, useRef, useCallback } from 'react'
import { usePaginatedList } from './usePaginatedList'
import type { PageResponse } from '../types/shared'

interface UseDebounceSearchOptions<T> {
  fetcher: (page: number, size: number, query?: string) => Promise<PageResponse<T>>
  delay?: number
  pageSize?: number
  errorMessage?: string
}

export function useDebounceSearch<T>({
  fetcher,
  delay = 300,
  pageSize = 20,
  errorMessage,
}: UseDebounceSearchOptions<T>) {
  const [query, setQuery] = useState('')
  const isFirstRender = useRef(true)

  const boundFetcher = useCallback(
    (page: number, size: number) => fetcher(page, size, query.trim() || undefined),
    [fetcher, query]
  )

  const pagination = usePaginatedList({ fetcher: boundFetcher, pageSize, errorMessage })
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
