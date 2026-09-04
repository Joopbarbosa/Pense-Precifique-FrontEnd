import api from './api';
import type { OrcamentoRequest, OrcamentoResponse, OrcamentoDetalheResponse, AvancaStatusRequest, ItemCatalogoBuscaResponse, ItemSemEstoque, SimularAlertasOrcamentoItemRequest, SimulacaoEstoqueProdutoResponse, SimulacaoAvancoStatusResponse, OrcamentoProducaoResponse, CriarProducaoVinculadaRequest } from '../types/orcamento';
import type { ConfirmacaoEstoqueNegativoResponse, AlertaInsumo } from '../types/producao';
import type { PageResponse } from '../types/shared';
import { normalizarErroBlob } from '../utils/apiError';

export const orcamentoService = {
  listar: async (page: number, size = 20, status?: string, busca?: string, dataCriacaoDe?: string, dataCriacaoAte?: string, sort?: string): Promise<PageResponse<OrcamentoResponse>> => {
    const params: Record<string, any> = { page, size };
    if (status) params.status = status;
    if (busca) params.busca = busca;
    if (dataCriacaoDe) params.dataCriacaoDe = dataCriacaoDe;
    if (dataCriacaoAte) params.dataCriacaoAte = dataCriacaoAte;
    if (sort) params.sort = sort;
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

  // RN-NOVA-4/ORC-038 (V0.8.2, P-B003) — só aceita orçamento em RASCUNHO (400 BLOQUEIO fora
  // disso); payload completo (PUT, não PATCH), mesmo OrcamentoRequest de criar().
  editar: async (id: string, data: OrcamentoRequest): Promise<OrcamentoDetalheResponse> => {
    const response = await api.put(`/orcamentos/${id}`, data);
    return response.data;
  },

  // RN-NOVA-5/ORC-039 (V0.8.2, P-B004, sinal por valor direto corrigido em P-B021) — aceita o
  // orçamento original em qualquer status, sem body; sempre cria um RASCUNHO novo e independente.
  duplicar: async (id: string): Promise<OrcamentoDetalheResponse> => {
    const response = await api.post(`/orcamentos/${id}/duplicar`);
    return response.data;
  },

  // RN-NOVA-18 (V0.8.3, P-B008/P-F001d) — paginação real, mesmo formato Page<> dos demais
  // service.listar do sistema. Tamanho de página mantido em 8 (não 20) — painel de ItemSearch
  // calibrado para exibir exatamente 8 linhas (ORC-030). Único consumidor: ItemSearch
  // (CriarOrcamentoPage.tsx) — breaking change sem coexistência, confirmado por grep (Passo 0).
  buscarItensCatalogo: async (catalogoId?: string, busca?: string, page = 0, size = 8): Promise<PageResponse<ItemCatalogoBuscaResponse>> => {
    const params: Record<string, any> = { page, size };
    if (catalogoId) params.catalogoId = catalogoId;
    if (busca) params.busca = busca;
    const response = await api.get('/orcamentos/itens-catalogo', { params });
    return response.data;
  },

  // #218 (RN-NOVA-8/9) — corpo é um array cru (`@RequestBody List<...>` no controller), não
  // `{ itens: [...] }`.
  simularEstoque: async (itens: SimularAlertasOrcamentoItemRequest[]): Promise<SimulacaoEstoqueProdutoResponse[]> => {
    const response = await api.post('/orcamentos/simular-alertas', itens);
    return response.data;
  },

  avancarStatus: async (id: string, data?: AvancaStatusRequest): Promise<OrcamentoDetalheResponse | ConfirmacaoEstoqueNegativoResponse> => {
    const response = await api.post(`/orcamentos/${id}/avancar-status`, data || {});
    return response.data;
  },

  // RN-NOVA-2 (revisada, P-B012) — simula avancarStatus sem persistir, só aceita orçamento em
  // ENVIADO (único status onde o atalho de aprovação direta se aplica).
  simularAvancarStatus: async (id: string, data?: AvancaStatusRequest): Promise<SimulacaoAvancoStatusResponse> => {
    const response = await api.post(`/orcamentos/${id}/simular-avancar-status`, data || {});
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

  // RN-PROD-VINC-01/02 (revisão #320, P-B015) — efeito real: soma os produtos do orçamento aos já
  // lançados na produção (nunca duplica linha), só aceita produção AGUARDANDO_INICIO. Devolve a
  // lista completa de vínculos do orçamento após a operação.
  vincularProducao: async (id: string, producaoId: string): Promise<OrcamentoProducaoResponse[]> => {
    const response = await api.post(`/orcamentos/${id}/vincular-producao`, { producaoId });
    return response.data;
  },

  // RN-PROD-VINC-03 (P-B016) — alerta de insumo combinando os produtos já persistidos na produção
  // com os produtos vindos do orçamento, sem persistir nada. Consumido antes de vincularProducao,
  // nunca só a partir da mensagem de erro.
  simularVincularProducao: async (id: string, producaoId: string): Promise<AlertaInsumo[]> => {
    const response = await api.post(`/orcamentos/${id}/simular-vincular-producao`, { producaoId });
    return response.data;
  },

  // RN-ORC-VINC-03 (P-B017) — reverte as quantidades adicionadas por vincularProducao (histórico
  // ITEM_ADICIONADO daquele orçamento nessa produção). Primeiro consumidor de UI: RN-NOVA-17
  // (P-F003, modal sequencial de desfazer vínculo ao cancelar) — antes chamado só via API em E2E.
  // `manterProdutos=true` (RN-NOVA-17, contrato em contrato-orcamento.md) só tem efeito quando a
  // produção vinculada está EM_ANDAMENTO/TRAVADA: remove só a linha OrcamentoProducao, sem tocar
  // produto/histórico/estoque. Em AGUARDANDO_INICIO a flag é ignorada (reversão completa normal).
  desvincularProducao: async (id: string, producaoId: string, manterProdutos = false): Promise<void> => {
    await api.delete(`/orcamentos/${id}/vincular-producao/${producaoId}`, {
      params: manterProdutos ? { manterProdutos: true } : undefined,
    });
  },

  // RN-NOVA-17 (V0.8.3, P-B001, #375+308) — cobre "Não, remover" do cancelamento com vínculo
  // ativo: remove a contribuição de 1 produto específico numa produção EM_ANDAMENTO/TRAVADA.
  // AVISO, nunca bloqueio — material já consumido não é revertido. Não fecha o vínculo em si; o
  // chamador ainda precisa fechar com desvincularProducao(..., manterProdutos=true) ao final.
  removerProdutoDeProducaoAtiva: async (id: string, producaoId: string, produtoId: string): Promise<void> => {
    await api.delete(`/orcamentos/${id}/vincular-producao/${producaoId}/produtos/${produtoId}`);
  },

  // RN-ORC-VINC-05 (P-B020) — cria uma produção nova já vinculada, produtos vindos do próprio
  // orçamento. Não idempotente — cada chamada cria uma produção distinta, mesmo com o mesmo body
  // (confirmado via curl, Passo 0 de P-F005). Proteção contra double-submit é responsabilidade do
  // consumidor (desabilitar o botão de confirmação enquanto a Promise não resolve).
  criarProducaoVinculada: async (id: string, data: CriarProducaoVinculadaRequest): Promise<OrcamentoProducaoResponse[]> => {
    const response = await api.post(`/orcamentos/${id}/criar-producao-vinculada`, data);
    return response.data;
  },

  baixarPdf: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/orcamentos/${id}/pdf`, { responseType: 'blob' });
      return response.data;
    } catch (err) {
      throw await normalizarErroBlob(err);
    }
  },

  // Sem `responseType: 'text'` de propósito: com ele, o Axios também deixa de fazer o parse
  // automático do corpo de erro (JSON), que chega como string crua e quebra `extractApiError`
  // silenciosamente (mesma classe de bug do Blob em `baixarPdf`, achado ao validar o cenário de
  // erro real). Sem `responseType` explícito, o Axios tenta `JSON.parse` sempre — falha (e cai
  // no texto cru) para o HTML de sucesso, funciona normalmente para o JSON de erro.
  buscarPreviewHtml: async (id: string): Promise<string> => {
    const response = await api.get(`/orcamentos/${id}/preview-html`);
    return response.data;
  },

  // Mesmo padrão de baixarPdf — usados pelas 4 telas de preview migradas (épico #248, V0.8.1),
  // que baixam via Axios (gate de preview + retry/cooldown). P-F013 (V0.8.1) religou o card de
  // downloads de DetalheOrcamentoPage.tsx a essas mesmas telas via navegação, em vez do fetch cru
  // que usava as 4 funções irmãs (downloadReciboSinal/downloadPdfMulta/downloadReciboEstorno/
  // downloadReciboPagamento) — removidas por ficarem sem consumidor.
  baixarReciboSinal: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/orcamentos/${id}/recibo-sinal`, { responseType: 'blob' });
      return response.data;
    } catch (err) {
      throw await normalizarErroBlob(err);
    }
  },

  baixarPdfMulta: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/orcamentos/${id}/pdf-multa`, { responseType: 'blob' });
      return response.data;
    } catch (err) {
      throw await normalizarErroBlob(err);
    }
  },

  baixarReciboEstorno: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/orcamentos/${id}/recibo-estorno`, { responseType: 'blob' });
      return response.data;
    } catch (err) {
      throw await normalizarErroBlob(err);
    }
  },

  baixarReciboPagamento: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/orcamentos/${id}/recibo-pagamento`, { responseType: 'blob' });
      return response.data;
    } catch (err) {
      throw await normalizarErroBlob(err);
    }
  },

  // Mesmo motivo de buscarPreviewHtml acima (sem responseType, para o Axios conseguir fazer
  // JSON.parse do corpo de erro sem cair no bug de Blob/texto cru) — épico #248, V0.8.1.
  buscarPreviewHtmlReciboSinal: async (id: string): Promise<string> => {
    const response = await api.get(`/orcamentos/${id}/recibo-sinal/preview-html`);
    return response.data;
  },

  buscarPreviewHtmlPdfMulta: async (id: string): Promise<string> => {
    const response = await api.get(`/orcamentos/${id}/pdf-multa/preview-html`);
    return response.data;
  },

  buscarPreviewHtmlReciboEstorno: async (id: string): Promise<string> => {
    const response = await api.get(`/orcamentos/${id}/recibo-estorno/preview-html`);
    return response.data;
  },

  buscarPreviewHtmlReciboPagamento: async (id: string): Promise<string> => {
    const response = await api.get(`/orcamentos/${id}/recibo-pagamento/preview-html`);
    return response.data;
  },
};
