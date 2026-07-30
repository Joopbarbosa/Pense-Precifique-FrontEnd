import api from './api';
import type { OrcamentoRequest, OrcamentoResponse, OrcamentoDetalheResponse, AvancaStatusRequest, ItemCatalogoBuscaResponse, ItemSemEstoque } from '../types/orcamento';
import type { ConfirmacaoEstoqueNegativoResponse } from '../types/producao';
import type { PageResponse } from '../types/shared';

export const orcamentoService = {
  listar: async (page: number, size = 20, status?: string, busca?: string, dataCriacaoDe?: string, dataCriacaoAte?: string): Promise<PageResponse<OrcamentoResponse>> => {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;
    if (busca) params.busca = busca;
    if (dataCriacaoDe) params.dataCriacaoDe = dataCriacaoDe;
    if (dataCriacaoAte) params.dataCriacaoAte = dataCriacaoAte;
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

  avancarStatus: async (id: string, data?: AvancaStatusRequest): Promise<OrcamentoDetalheResponse | ConfirmacaoEstoqueNegativoResponse> => {
    const response = await api.post(`/orcamentos/${id}/avancar-status`, data || {});
    return response.data;
  },

  cancelar: async (id: string, data?: AvancaStatusRequest): Promise<OrcamentoDetalheResponse> => {
    const response = await api.post(`/orcamentos/${id}/cancelar`, data || {});
    return response.data;
  },

  buscarItensSemEstoque: async (id: string): Promise<ItemSemEstoque[]> => {
    const response = await api.get(`/orcamentos/${id}/itens-sem-estoque`);
    return response.data;
  },

  downloadPdf: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/pdf`,
  downloadReciboSinal: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-sinal`,
  downloadPdfMulta: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/pdf-multa`,
  downloadReciboEstorno: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-estorno`,
  downloadReciboPagamento: (id: string) => `${api.defaults.baseURL}/orcamentos/${id}/recibo-pagamento`,
};
