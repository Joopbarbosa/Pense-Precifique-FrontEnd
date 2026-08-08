import api from './api'
import type { BaixaManualInsumoRequest, InsumoRequest, InsumoResponse, MovimentacaoInsumoResponse, NovoInsumoRequest, ProdutoRelacionadoResponse, ResolverVinculosInsumoRequest } from '../types/insumo'
import type { PageResponse } from '../types/shared'

export const insumoService = {
  listar: async (page: number, size = 20, busca?: string): Promise<PageResponse<InsumoResponse>> => {
    const params: Record<string, unknown> = { page, size, sort: 'nome' }
    if (busca) params.busca = busca
    const response = await api.get('/insumos', { params })
    return response.data
  },

  buscarPorId: async (id: string): Promise<InsumoResponse> => {
    const response = await api.get(`/insumos/${id}`)
    return response.data
  },

  cadastrar: async (data: NovoInsumoRequest): Promise<InsumoResponse> => {
    const response = await api.post('/insumos', data)
    return response.data
  },

  editar: async (id: string, data: InsumoRequest): Promise<InsumoResponse> => {
    const response = await api.put(`/insumos/${id}`, data)
    return response.data
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/insumos/${id}`)
  },

  inativar: async (id: string): Promise<void> => {
    await api.post(`/insumos/${id}/inativar`)
  },

  reativar: async (id: string): Promise<void> => {
    await api.post(`/insumos/${id}/reativar`)
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

  listarProdutosRelacionados: async (id: string): Promise<ProdutoRelacionadoResponse[]> => {
    const response = await api.get(`/insumos/${id}/produtos-relacionados`)
    return response.data
  },

  resolverVinculos: async (id: string, data: ResolverVinculosInsumoRequest): Promise<void> => {
    await api.post(`/insumos/${id}/resolver-vinculos`, data)
  },
}
