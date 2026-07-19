import { useEffect, useState } from 'react'
import { insumoService } from '../services/insumoService'

export function useFracionaveisInsumos(insumoIds: string[]) {
  const key = [...new Set(insumoIds)].sort().join(',')
  const [map, setMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(insumoIds.length > 0)

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all(ids.map(id => insumoService.buscarPorId(id).then(i => [id, !!i.fracionavel] as const).catch(() => [id, true] as const)))
      .then(pairs => setMap(Object.fromEntries(pairs)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { fracionaveis: map, loading }
}
