import api from './api'
import type { CatalogoRequest, CatalogoResponse } from '../types/catalogo'

export const catalogoService = {
  listar: async (): Promise<CatalogoResponse[]> => {
    const response = await api.get('/catalogos')
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
}
