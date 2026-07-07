import api from './api';
import type { OrcamentoRequest, OrcamentoResponse, OrcamentoDetalheResponse, AvancaStatusRequest, PageResponse, ItemCatalogoBuscaResponse } from '../types/orcamento';

export const orcamentoService = {
  listar: async (page: number, size = 20, status?: string): Promise<PageResponse<OrcamentoResponse>> => {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;
    const response = await api.get('/orcamentos', { params });
    return response.data;
  },

  buscarPorId: async (id: string): Promise<OrcamentoDetalheResponse> => {
    const response = await api.get(`/orcamentos/${id}`);
    return response.data;
  },

  criar: async (data: OrcamentoRequest): Promise<OrcamentoDetalheResponse> => {
    const response = await api.post('/orcamentos', data);
    return response.data;
  },

  buscarItensCatalogo: async (catalogoId?: string): Promise<ItemCatalogoBuscaResponse[]> => {
    const params: Record<string, any> = {};
    if (catalogoId) params.catalogoId = catalogoId;
    const response = await api.get('/orcamentos/itens-catalogo', { params });
    return response.data;
  },

  avancarStatus: async (id: string, data?: AvancaStatusRequest): Promise<OrcamentoDetalheResponse> => {
    const response = await api.post(`/orcamentos/${id}/avancar-status`, data || {});
    return response.data;
  },

  cancelar: async (id: string, data?: AvancaStatusRequest): Promise<OrcamentoDetalheResponse> => {
    const response = await api.post(`/orcamentos/${id}/cancelar`, data || {});
    return response.data;
  },

  downloadPdf: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/pdf`,
  downloadReciboSinal: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-sinal`,
  downloadPdfMulta: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/pdf-multa`,
  downloadReciboEstorno: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-estorno`,
  downloadReciboPagamento: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-pagamento`,
};
