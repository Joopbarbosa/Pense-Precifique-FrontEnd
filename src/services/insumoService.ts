import api from './api'
import type { BaixaManualInsumoRequest, InsumoContagensResponse, InsumoRequest, InsumoResponse, MovimentacaoInsumoResponse, NovoInsumoRequest, ProdutoRelacionadoResponse, ResolverVinculosInsumoRequest } from '../types/insumo'
import type { PageResponse } from '../types/shared'

export const insumoService = {
  // #336 (V0.10.0) — `ativo` filtra server-side (era client-side sobre a janela paginada, causa
  // raiz do bug original de #336: insumo inativado fora da 1ª página não aparecia no filtro).
  // #295 (V0.14.0, RN-NOVA-2) — `sort` agora é parâmetro, default `numero,desc` (identificador
  // decrescente) quando o chamador não passa nada — antes era sempre `nome` fixo.
  listar: async (page: number, size = 20, busca?: string, ativo?: boolean, sort = 'numero,desc'): Promise<PageResponse<InsumoResponse>> => {
    const params: Record<string, unknown> = { page, size, sort }
    if (busca) params.busca = busca
    if (ativo != null) params.ativo = ativo
    const response = await api.get('/insumos', { params })
    return response.data
  },

  // RN-NOVA-4 (V0.10.0, #336) — contadores por filtro, agregados no backend.
  contagens: async (): Promise<InsumoContagensResponse> => {
    const response = await api.get('/insumos/contagens')
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
