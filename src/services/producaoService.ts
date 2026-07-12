import api from './api'
import type {
  LancarProducaoRequest,
  LancarProducaoLoteRequest,
  ProducaoResponse,
  ProducaoDetalheResponse,
  InsumoConsumidoResponse,
} from '../types/producao'
import type { PageResponse } from '../types/shared'

export const producaoService = {
  listar: async (page: number, size = 20): Promise<PageResponse<ProducaoResponse>> => {
    const response = await api.get('/producoes', { params: { page, size } })
    return response.data
  },

  buscarPorId: async (id: string): Promise<ProducaoDetalheResponse> => {
    const response = await api.get(`/producoes/${id}`)
    return response.data
  },

  lancar: async (data: LancarProducaoRequest): Promise<ProducaoDetalheResponse> => {
    const response = await api.post('/producoes', data)
    return response.data
  },

  lancarLote: async (data: LancarProducaoLoteRequest): Promise<ProducaoDetalheResponse[]> => {
    const response = await api.post('/producoes/lote', data)
    return response.data
  },

  preview: async (produtoId: string, quantidade: number): Promise<InsumoConsumidoResponse[]> => {
    const response = await api.get('/producoes/preview', { params: { produtoId, quantidade } })
    return response.data
  },

  cancelar: async (id: string, observacao: string): Promise<ProducaoDetalheResponse> => {
    const response = await api.post(`/producoes/${id}/cancelar`, { observacao })
    return response.data
  },
}
