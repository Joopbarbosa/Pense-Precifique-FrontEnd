import api from './api'
import type {
  EmpresaRequest, EmpresaResponse, ConfiguracaoRequest, ConfiguracaoResponse,
  MetodoPagamentoConfiguravelRequest, MetodoPagamentoConfiguravelResponse, MetodoPagamentoConfiguravelUpdateRequest,
} from '../types/empresa'

export const empresaService = {
  getEmpresa: async (): Promise<EmpresaResponse | null> => {
    try {
      const response = await api.get<EmpresaResponse>('/empresa')
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  upsertEmpresa: async (data: EmpresaRequest): Promise<EmpresaResponse> => {
    const response = await api.put<EmpresaResponse>('/empresa', data)
    return response.data
  },

  // #532 (V0.14.0) — mesmo padrão de foto do Item de Catálogo/Produto (R2StorageClient).
  uploadLogo: async (arquivo: File): Promise<EmpresaResponse> => {
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    const response = await api.post<EmpresaResponse>('/empresa/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  removerLogo: async (): Promise<EmpresaResponse> => {
    const response = await api.delete<EmpresaResponse>('/empresa/logo')
    return response.data
  },

  getConfiguracao: async (): Promise<ConfiguracaoResponse> => {
    const response = await api.get<ConfiguracaoResponse>('/configuracoes/precificacao')
    return response.data
  },

  upsertConfiguracao: async (data: ConfiguracaoRequest): Promise<ConfiguracaoResponse> => {
    const response = await api.put<ConfiguracaoResponse>('/configuracoes/precificacao', data)
    return response.data
  },

  // #491 (V0.12.0) — métodos de pagamento configuráveis do Caixa/PDV.
  listarMetodosPagamento: async (): Promise<MetodoPagamentoConfiguravelResponse[]> => {
    const response = await api.get<MetodoPagamentoConfiguravelResponse[]>('/configuracoes/metodos-pagamento')
    return response.data
  },

  criarMetodoPagamento: async (data: MetodoPagamentoConfiguravelRequest): Promise<MetodoPagamentoConfiguravelResponse> => {
    const response = await api.post<MetodoPagamentoConfiguravelResponse>('/configuracoes/metodos-pagamento', data)
    return response.data
  },

  atualizarMetodoPagamento: async (id: string, data: MetodoPagamentoConfiguravelUpdateRequest): Promise<MetodoPagamentoConfiguravelResponse> => {
    const response = await api.put<MetodoPagamentoConfiguravelResponse>(`/configuracoes/metodos-pagamento/${id}`, data)
    return response.data
  },
}
