import api from './api'
import type { PageResponse } from '../types/shared'
import type { DestinoVinculoNota, FiltrosVinculoNota, IgnorarVinculoNota, VinculoNotaResponse } from '../types/vinculoNota'

const ROTA = '/compras/nota/vinculos'
export const vinculoNotaService = {
  listar: async (page = 0, size = 20, filtros: FiltrosVinculoNota = {}): Promise<PageResponse<VinculoNotaResponse>> =>
    (await api.get(ROTA, { params: { page, size, ...filtros } })).data,
  editar: async (id: string, destino: DestinoVinculoNota): Promise<VinculoNotaResponse> =>
    (await api.put(`${ROTA}/${id}`, destino)).data,
  ignorar: async (id: string, dados: IgnorarVinculoNota): Promise<VinculoNotaResponse> =>
    (await api.patch(`${ROTA}/${id}/ignorar`, dados)).data,
  desfazer: async (id: string): Promise<void> => { await api.delete(`${ROTA}/${id}`) },
}
