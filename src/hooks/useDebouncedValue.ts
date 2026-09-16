import { useEffect, useState } from 'react'

// #357 (V0.11.0) — debounce puro (sem paginação acoplada), pra autocompletes inline que hoje
// reimplementam setTimeout/clearTimeout manualmente (ClienteSelect/ItemSearch/InsumoSearch/
// ProdutoSearch). `useDebounceSearch` (mesma pasta) não serve aqui porque já vem casado com
// `usePaginatedList`.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
