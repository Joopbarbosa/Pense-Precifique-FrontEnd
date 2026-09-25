import api from './api'
import type { UnidadeMedidaRequest, UnidadeMedidaResponse } from '../types/unidadeMedida'

export const unidadeMedidaService = {
  listar: async (): Promise<UnidadeMedidaResponse[]> => {
    const response = await api.get('/unidades-medida')
    return response.data
  },

  cadastrar: async (data: UnidadeMedidaRequest): Promise<UnidadeMedidaResponse> => {
    const response = await api.post('/unidades-medida', data)
    return response.data
  },

  editar: async (id: string, data: UnidadeMedidaRequest): Promise<UnidadeMedidaResponse> => {
    const response = await api.put(`/unidades-medida/${id}`, data)
    return response.data
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/unidades-medida/${id}`)
  },
}
