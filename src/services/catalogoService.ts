import api from './api'
import type { CatalogoRequest, CatalogoResponse } from '../types/catalogo'

export const catalogoService = {
  cadastrar: async (data: CatalogoRequest): Promise<CatalogoResponse> => {
    const response = await api.post('/catalogos', data)
    return response.data
  },
}
