import api from './api'
import type { DashboardVendasResponse, FiltroListaVendas, ListaVendasResponse } from '../types/dashboardVendas'

// V0.17.0 — #719 (RN-NOVA-17). Contrato: modulos/DASHBOARD/contrato-dashboard.md.
const paramsSerializer = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) v.forEach(x => sp.append(k, String(x)))
    else sp.append(k, String(v))
  })
  return sp.toString()
}

export const dashboardVendasService = {
  dashboard: async (de: string, ate: string): Promise<DashboardVendasResponse> => {
    const response = await api.get('/dashboard/vendas', { params: { de, ate } })
    return response.data
  },

  lista: async (filtro: FiltroListaVendas): Promise<ListaVendasResponse> => {
    const response = await api.get('/dashboard/vendas/lista', { params: { size: 20, ...filtro }, paramsSerializer })
    return response.data
  },
}
