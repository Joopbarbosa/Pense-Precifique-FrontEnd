import api from './api'
import type { ProducaoDetalhe, ProducaoResumo, CriarProducaoRequest, DivisaoResponse } from '../types/producao'
import type { PageResponse } from '../types/shared'

export const producaoService = {
  listar: async (params: { busca?: string; estado?: string; page?: number; size?: number }): Promise<PageResponse<ProducaoResumo>> => {
    const response = await api.get('/producoes', { params })
    return response.data
  },

  buscarPorId: async (id: string): Promise<ProducaoDetalhe> => {
    const response = await api.get(`/producoes/${id}`)
    return response.data
  },

  criar: async (data: CriarProducaoRequest): Promise<ProducaoDetalhe> => {
    const response = await api.post('/producoes', data)
    return response.data
  },

  editar: async (id: string, data: CriarProducaoRequest): Promise<ProducaoDetalhe> => {
    const response = await api.put(`/producoes/${id}`, data)
    return response.data
  },

  iniciar: async (id: string, body?: { dividir?: boolean }): Promise<ProducaoDetalhe | DivisaoResponse> => {
    const response = await api.post(`/producoes/${id}/iniciar`, body ?? {})
    return response.data
  },

  travar: async (id: string, justificativa: string): Promise<ProducaoDetalhe> => {
    const response = await api.post(`/producoes/${id}/travar`, { justificativa })
    return response.data
  },

  retomar: async (id: string, body?: { dividir?: boolean }): Promise<ProducaoDetalhe | DivisaoResponse> => {
    const response = await api.post(`/producoes/${id}/retomar`, body ?? {})
    return response.data
  },

  finalizar: async (id: string): Promise<ProducaoDetalhe> => {
    const response = await api.post(`/producoes/${id}/finalizar`)
    return response.data
  },

  cancelar: async (id: string, data: { justificativa: string; consumoReal?: { insumoId?: string; produtoBaseId?: string; quantidadeConsumida: number }[] }): Promise<ProducaoDetalhe> => {
    const response = await api.post(`/producoes/${id}/cancelar`, data)
    return response.data
  },

  agrupar: async (data: {
    producaoIds: string[]
    estadoDestino: string
    dataInicio?: string
    dataTerminoPrevista?: string
    justificativa: string
    consumoRealPorProducao?: Record<string, { insumoId?: string; produtoBaseId?: string; quantidadeConsumida: number }[]>
  }): Promise<ProducaoDetalhe> => {
    const response = await api.post('/producoes/agrupar', data)
    return response.data
  },
}
