import api from './api'
import type { DashboardCadastrosResponse, EvolucaoPreco, EvolucaoPrecoInsumos } from '../types/dashboardCadastros'

// V0.17.0 — #607 (RN-NOVA-16).
export const dashboardCadastrosService = {
  dashboard: async (de: string, ate: string, insumoId?: string): Promise<DashboardCadastrosResponse> => {
    const response = await api.get('/dashboard/cadastros', { params: { de, ate, insumoId } })
    return response.data
  },

  evolucaoPreco: async (insumoId: string, de: string, ate: string): Promise<EvolucaoPreco> => {
    const response = await api.get('/dashboard/cadastros/evolucao-preco', { params: { insumoId, de, ate } })
    return response.data
  },

  /** #989 (RN-NOVA-29): 1 a 5 insumos de uma vez, uma série por insumo. */
  evolucaoPrecoInsumos: async (insumoIds: string[], de: string, ate: string): Promise<EvolucaoPrecoInsumos> => {
    const response = await api.get('/dashboard/cadastros/evolucao-preco-insumos', { params: { insumoIds, de, ate }, paramsSerializer: { indexes: null } })
    return response.data
  },
}
