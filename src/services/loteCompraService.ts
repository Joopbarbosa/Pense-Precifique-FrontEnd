import api from './api'
import type { ImpactoAgregadoResponse, RegistrarLoteCompraRequest } from '../types/loteCompra'

export const loteCompraService = {
  registrar: async (data: RegistrarLoteCompraRequest): Promise<ImpactoAgregadoResponse> => {
    const response = await api.post('/lotes-compra', data)
    return response.data
  },
}
