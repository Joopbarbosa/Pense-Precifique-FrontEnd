import api from './api'
import type { ProdutoResponse, ProdutoDetalheResponse, ProdutoRequest, PageResponse } from '../types/produto'
import type { InsumoResponse } from '../types/insumo'

export const produtoService = {
  listar: async (page: number, size = 20, tipo?: string): Promise<PageResponse<ProdutoResponse>> => {
    const params: Record<string, unknown> = { page, size, sort: 'nome' }
    if (tipo) params.tipo = tipo
    const response = await api.get('/produtos', { params })
    return response.data
  },

  buscarPorId: async (id: string): Promise<ProdutoDetalheResponse> => {
    const response = await api.get(`/produtos/${id}`)
    return response.data
  },

  cadastrar: async (data: ProdutoRequest): Promise<ProdutoDetalheResponse> => {
    const response = await api.post('/produtos', data)
    return response.data
  },

  editar: async (id: string, data: ProdutoRequest): Promise<ProdutoDetalheResponse> => {
    const response = await api.put(`/produtos/${id}`, data)
    return response.data
  },

  inativar: async (id: string): Promise<void> => {
    await api.delete(`/produtos/${id}`)
  },

  buscarInsumos: async (busca: string): Promise<InsumoResponse[]> => {
    const response = await api.get('/insumos', { params: { page: 0, size: 20, busca, sort: 'nome' } })
    return response.data.content
  },

  buscarProdutosBase: async (busca: string): Promise<ProdutoResponse[]> => {
    const response = await api.get('/produtos', { params: { page: 0, size: 20, tipo: 'PRODUTO_BASE', busca, sort: 'nome' } })
    return response.data.content
  },
}
