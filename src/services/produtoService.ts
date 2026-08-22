import api from './api'
import type { ProdutoResponse, ProdutoDetalheResponse, ProdutoRequest, BaixaManualProdutoRequest, MovimentacaoProdutoResponse, PrecoSugeridoResponse, CatalogoVinculadoResponse, ComponenteVinculadoResponse, ResolverVinculosProdutoRequest } from '../types/produto'
import type { InsumoResponse } from '../types/insumo'
import type { PageResponse } from '../types/shared'

export const produtoService = {
  listar: async (page: number, size = 20, tipo?: string, busca?: string, semCatalogo?: boolean): Promise<PageResponse<ProdutoResponse>> => {
    const params: Record<string, unknown> = { page, size, sort: 'nome' }
    if (tipo) params.tipo = tipo
    if (busca) params.busca = busca
    if (semCatalogo) params.semCatalogo = true
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
    await api.post(`/produtos/${id}/inativar`)
  },

  reativar: async (id: string): Promise<void> => {
    await api.post(`/produtos/${id}/reativar`)
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/produtos/${id}`)
  },

  catalogosVinculados: async (id: string): Promise<CatalogoVinculadoResponse[]> => {
    const response = await api.get(`/produtos/${id}/catalogos-vinculados`)
    return response.data
  },

  componentesVinculados: async (id: string): Promise<ComponenteVinculadoResponse[]> => {
    const response = await api.get(`/produtos/${id}/componentes-vinculados`)
    return response.data
  },

  resolverVinculos: async (id: string, data: ResolverVinculosProdutoRequest): Promise<void> => {
    await api.post(`/produtos/${id}/resolver-vinculos`, data)
  },

  buscarInsumos: async (busca: string): Promise<InsumoResponse[]> => {
    const response = await api.get('/insumos', { params: { page: 0, size: 20, busca, sort: 'nome' } })
    return response.data.content
  },

  buscarProdutosComponente: async (busca: string): Promise<ProdutoResponse[]> => {
    const response = await api.get('/produtos', { params: { page: 0, size: 20, tipo: 'PRODUTO', busca, sort: 'nome' } })
    return response.data.content
  },

  baixaManual: async (id: string, data: BaixaManualProdutoRequest): Promise<MovimentacaoProdutoResponse> => {
    const response = await api.post(`/produtos/${id}/baixa-manual`, data)
    return response.data
  },

  listarMovimentacoes: async (id: string, page: number, size = 20): Promise<PageResponse<MovimentacaoProdutoResponse>> => {
    const response = await api.get(`/produtos/${id}/movimentacoes`, { params: { page, size } })
    return response.data
  },

  buscarPrecoSugerido: async (id: string, margem: number): Promise<PrecoSugeridoResponse> => {
    const response = await api.get(`/produtos/${id}/preco-sugerido`, { params: { margem } })
    return response.data
  },
}
