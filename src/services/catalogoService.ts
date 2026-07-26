import api from './api'
import type { CatalogoRequest, CatalogoResponse } from '../types/catalogo'
import type { PageResponse } from '../types/shared'

export interface CatalogoListarParams {
  busca?: string
  sort?: string
  page?: number
  size?: number
}

export const catalogoService = {
  listar: async (params?: CatalogoListarParams): Promise<PageResponse<CatalogoResponse>> => {
    const response = await api.get('/catalogos', { params })
    return response.data
  },

  buscarPorId: async (id: string): Promise<CatalogoResponse> => {
    const response = await api.get(`/catalogos/${id}`)
    return response.data
  },

  cadastrar: async (data: CatalogoRequest): Promise<CatalogoResponse> => {
    const response = await api.post('/catalogos', data)
    return response.data
  },

  editar: async (id: string, data: CatalogoRequest): Promise<CatalogoResponse> => {
    const response = await api.put(`/catalogos/${id}`, data)
    return response.data
  },

  duplicar: async (id: string): Promise<CatalogoResponse> => {
    const response = await api.post(`/catalogos/${id}/duplicar`)
    return response.data
  },

  desativar: async (id: string): Promise<CatalogoResponse> => {
    const response = await api.post(`/catalogos/${id}/desativar`)
    return response.data
  },

  reativar: async (id: string): Promise<CatalogoResponse> => {
    const response = await api.post(`/catalogos/${id}/reativar`)
    return response.data
  },
}
