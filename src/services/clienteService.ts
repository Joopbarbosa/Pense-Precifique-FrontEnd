import api from './api'
import type { ClienteRequest, ClienteResponse } from '../types/cliente'
import type { PageResponse } from '../types/shared'

export const clienteService = {
  listar: async (page: number, size = 20, busca?: string): Promise<PageResponse<ClienteResponse>> => {
    const params: Record<string, any> = { page, size, sort: 'nome' }
    if (busca) params.busca = busca
    const response = await api.get('/clientes', { params })
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

  inativar: async (id: string): Promise<void> => {
    await api.delete(`/clientes/${id}`)
  },
}
