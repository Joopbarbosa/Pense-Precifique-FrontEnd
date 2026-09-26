import api from './api'
import type { ClienteContagensResponse, ClienteFiltros, ClienteRequest, ClienteResponse } from '../types/cliente'
import type { PageResponse } from '../types/shared'

export const clienteService = {
  listar: async (page: number, size = 20, busca?: string, filtros: ClienteFiltros = {}): Promise<PageResponse<ClienteResponse>> => {
    const params: Record<string, any> = { page, size, sort: 'nome' }
    if (busca) params.busca = busca
    if (filtros.papel) params.papel = filtros.papel
    if (filtros.ativo !== undefined) params.ativo = filtros.ativo
    const response = await api.get('/clientes', { params })
    return response.data
  },

  contagens: async (): Promise<ClienteContagensResponse> => {
    const response = await api.get('/clientes/contagens')
    return response.data
  },

  buscarPorId: async (id: string): Promise<ClienteResponse> => {
    const response = await api.get(`/clientes/${id}`)
    return response.data
  },

  cadastrar: async (data: ClienteRequest): Promise<ClienteResponse> => {
    const response = await api.post('/clientes', data)
    return response.data
  },

  editar: async (id: string, data: ClienteRequest): Promise<ClienteResponse> => {
    const response = await api.put(`/clientes/${id}`, data)
    return response.data
  },

  // V0.15.0 (#538) — reversível; `DELETE /clientes/{id}` não existe mais.
  inativar: async (id: string): Promise<void> => {
    await api.post(`/clientes/${id}/inativar`)
  },

  reativar: async (id: string): Promise<void> => {
    await api.post(`/clientes/${id}/reativar`)
  },
}
