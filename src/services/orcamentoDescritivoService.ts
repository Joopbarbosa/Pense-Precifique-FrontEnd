import api from './api'
import type { PageResponse } from '../types/shared'
import type { OrcamentoDetalheResponse } from '../types/orcamento'
import type {
  DescritivoRequest, DescritivoResponse, DescritivoResumoResponse, GerarVendaDescritivoRequest, StatusDescritivo,
} from '../types/orcamentoDescritivo'

/** V0.19.0 (#382) — orçamento Descritivo. PDF e prévia usam os endpoints do orçamento (`/orcamentos/{id}/pdf`), que escolhem o modelo pelo tipo. */
export const orcamentoDescritivoService = {
  listar: async (page: number, size = 20, status?: StatusDescritivo, busca?: string): Promise<PageResponse<DescritivoResumoResponse>> => {
    const params: Record<string, unknown> = { page, size }
    if (status) params.status = status
    if (busca) params.busca = busca
    return (await api.get('/orcamentos-descritivos', { params })).data
  },
  buscarPorId: async (id: string): Promise<DescritivoResponse> => (await api.get(`/orcamentos-descritivos/${id}`)).data,
  criar: async (dados: DescritivoRequest): Promise<DescritivoResponse> => (await api.post('/orcamentos-descritivos', dados)).data,
  editar: async (id: string, dados: DescritivoRequest): Promise<DescritivoResponse> => (await api.put(`/orcamentos-descritivos/${id}`, dados)).data,
  mudarStatus: async (id: string, status: StatusDescritivo): Promise<DescritivoResponse> =>
    (await api.patch(`/orcamentos-descritivos/${id}/status`, { status })).data,
  gerarVenda: async (id: string, dados: GerarVendaDescritivoRequest): Promise<OrcamentoDetalheResponse> =>
    (await api.post(`/orcamentos-descritivos/${id}/gerar-venda`, dados)).data,
}
