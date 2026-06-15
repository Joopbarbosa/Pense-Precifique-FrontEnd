import api from './api'
import type { EmpresaRequest, EmpresaResponse, ConfiguracaoRequest, ConfiguracaoResponse } from '../types/empresa'

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

  getConfiguracao: async (): Promise<ConfiguracaoResponse> => {
    const response = await api.get<ConfiguracaoResponse>('/configuracoes/precificacao')
    return response.data
  },

  upsertConfiguracao: async (data: ConfiguracaoRequest): Promise<ConfiguracaoResponse> => {
    const response = await api.put<ConfiguracaoResponse>('/configuracoes/precificacao', data)
    return response.data
  },
}
