import api from './api'
import type { BaixaManualInsumoRequest, InsumoRequest, InsumoResponse, MovimentacaoInsumoResponse, PageResponse } from '../types/insumo'

export const insumoService = {
  listar: async (page: number, size = 20): Promise<PageResponse<InsumoResponse>> => {
    const response = await api.get('/insumos', { params: { page, size, sort: 'nome' } })
    return response.data
  },

  buscarPorId: async (id: string): Promise<InsumoResponse> => {
    const response = await api.get(`/insumos/${id}`)
    return response.data
  },

  cadastrar: async (data: InsumoRequest): Promise<InsumoResponse> => {
    const response = await api.post('/insumos', data)
    return response.data
  },

  editar: async (id: string, data: InsumoRequest): Promise<InsumoResponse> => {
    const response = await api.put(`/insumos/${id}`, data)
    return response.data
  },

  inativar: async (id: string): Promise<void> => {
    await api.delete(`/insumos/${id}`)
  },

  baixaManual: async (id: string, data: BaixaManualInsumoRequest): Promise<MovimentacaoInsumoResponse> => {
    const response = await api.post(`/insumos/${id}/baixa-manual`, data)
    return response.data
  },

  listarMovimentacoes: async (id: string, page: number, size = 20): Promise<PageResponse<MovimentacaoInsumoResponse>> => {
    const response = await api.get(`/insumos/${id}/movimentacoes`, { params: { page, size } })
    return response.data
  },

  buscarParaCarrinho: async (busca: string): Promise<InsumoResponse[]> => {
    const response = await api.get('/insumos', { params: { page: 0, size: 20, busca, sort: 'nome' } })
    return response.data.content
  },
}
