import api from './api'
import type { PageResponse } from '../types/shared'
import type {
  CompraConfirmacaoResponse, CompraFiltros, ContagensCompra, StatusListaCompra, CompraRequest, CompraResponse, CompraResumoResponse,
  DashboardComprasResponse, EvolucaoPrecoResponse, FiltrosPreviaLista, FornecedorInsumoResponse,
  GerarListaCompraRequest, ListaCompraResponse, ListaCompraResumoResponse, PreviaListaCompraResponse,
  SimulacaoCancelamentoResponse,
} from '../types/compra'

// V0.15.0 — módulo Compras (#541 e seguintes). Contrato: modulos/COMPRAS/contrato-compras.md.
// `insumoIds` repetido na query (`?insumoIds=a&insumoIds=b`), formato que o Spring aceita.
const paramsSerializer = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) v.forEach(x => sp.append(k, String(x)))
    else sp.append(k, String(v))
  })
  return sp.toString()
}

export const compraService = {
  listar: async (page: number, size = 20, filtros: CompraFiltros = {}): Promise<PageResponse<CompraResumoResponse>> => {
    const response = await api.get('/compras', { params: { page, size, ...filtros }, paramsSerializer })
    return response.data
  },

  /** #591 (RN-NOVA-44). */
  contagens: async (): Promise<ContagensCompra> => {
    const response = await api.get('/compras/contagens')
    return response.data
  },

  buscar: async (id: string): Promise<CompraResponse> => {
    const response = await api.get(`/compras/${id}`)
    return response.data
  },

  salvarRascunho: async (data: CompraRequest): Promise<CompraResponse> => {
    const response = await api.post('/compras', data)
    return response.data
  },

  atualizarRascunho: async (id: string, data: CompraRequest): Promise<CompraResponse> => {
    const response = await api.put(`/compras/${id}`, data)
    return response.data
  },

  excluirRascunho: async (id: string): Promise<void> => {
    await api.delete(`/compras/${id}`)
  },

  /** Compra nova confirmada direto (tudo ou nada). */
  confirmarNova: async (data: CompraRequest): Promise<CompraConfirmacaoResponse> => {
    const response = await api.post('/compras/confirmar', data)
    return response.data
  },

  /** Confirma um rascunho; com `data`, grava as alterações e confirma na mesma transação. */
  confirmar: async (id: string, data?: CompraRequest): Promise<CompraConfirmacaoResponse> => {
    const response = await api.post(`/compras/${id}/confirmar`, data ?? null)
    return response.data
  },

  atualizarPagamento: async (id: string, pago: boolean, metodoPagamentoId: string | null, parcelas: number | null = null): Promise<CompraResponse> => {
    const response = await api.patch(`/compras/${id}/pagamento`, { pago, metodoPagamentoId, parcelas })
    return response.data
  },

  simularCancelamento: async (id: string): Promise<SimulacaoCancelamentoResponse> => {
    const response = await api.post(`/compras/${id}/simular-cancelamento`)
    return response.data
  },

  cancelar: async (id: string, observacao: string, confirmarManterCusto: boolean): Promise<CompraConfirmacaoResponse> => {
    const response = await api.post(`/compras/${id}/cancelar`, { observacao, confirmarManterCusto })
    return response.data
  },

  /** #593 (RN-NOVA-43) — `manterDescontos=false` copia só preço cheio e quantidades. */
  duplicar: async (id: string, manterDescontos = true): Promise<CompraResponse> => {
    const response = await api.post(`/compras/${id}/duplicar`, null, { params: { manterDescontos } })
    return response.data
  },

  baixarPdf: async (id: string): Promise<Blob> => {
    const response = await api.get(`/compras/${id}/pdf`, { responseType: 'blob' })
    return response.data
  },

  previewHtml: async (id: string): Promise<string> => {
    const response = await api.get(`/compras/${id}/preview-html`, { responseType: 'text' })
    return response.data
  },

  // ---------- Dashboard (#548) ----------

  /** #577 (RN-NOVA-29) — sem de/ate: mês atual. */
  dashboard: async (de?: string, ate?: string): Promise<DashboardComprasResponse> => {
    const response = await api.get('/compras/dashboard', { params: { de, ate } })
    return response.data
  },

  evolucaoPreco: async (insumoIds: string[], de?: string, ate?: string): Promise<EvolucaoPrecoResponse> => {
    const response = await api.get('/compras/evolucao-preco', { params: { insumoIds, de, ate }, paramsSerializer })
    return response.data
  },
}

// ---------- Vínculo Fornecedor↔Insumo (#540) ----------

export const fornecedorInsumoService = {
  listarPorFornecedor: async (fornecedorId: string): Promise<FornecedorInsumoResponse[]> => {
    const response = await api.get('/fornecedor-insumos', { params: { fornecedorId } })
    return response.data
  },

  listarPorInsumo: async (insumoId: string): Promise<FornecedorInsumoResponse[]> => {
    const response = await api.get('/fornecedor-insumos', { params: { insumoId } })
    return response.data
  },

  criar: async (fornecedorId: string, insumoId: string, precoReferencia: number | null): Promise<FornecedorInsumoResponse> => {
    const response = await api.post('/fornecedor-insumos', { fornecedorId, insumoId, precoReferencia })
    return response.data
  },

  atualizarPreco: async (id: string, precoReferencia: number | null): Promise<FornecedorInsumoResponse> => {
    const response = await api.put(`/fornecedor-insumos/${id}`, { precoReferencia })
    return response.data
  },

  remover: async (id: string): Promise<void> => {
    await api.delete(`/fornecedor-insumos/${id}`)
  },
}

// ---------- Lista de compras (#546, #547) ----------

export const listaCompraService = {
  previa: async (f: FiltrosPreviaLista): Promise<PreviaListaCompraResponse> => {
    const response = await api.get('/listas-compra/previa', {
      params: { abaixoMinimo: f.abaixoMinimo, estoqueNegativo: f.estoqueNegativo, fornecedorId: f.fornecedorId, insumoIds: f.insumoIds },
      paramsSerializer,
    })
    return response.data
  },

  gerar: async (data: GerarListaCompraRequest): Promise<ListaCompraResponse> => {
    const response = await api.post('/listas-compra', data)
    return response.data
  },

  /** #595 — `sort` por allowlist: numero, geradaEm, status, quantidadeItens. */
  historico: async (page: number, size = 20, sort = 'numero,desc'): Promise<PageResponse<ListaCompraResumoResponse>> => {
    const response = await api.get('/listas-compra', { params: { page, size, sort } })
    return response.data
  },

  /** #596 (RN-NOVA-41) — rascunho: quantidade pode ficar vazia. */
  salvarRascunho: async (data: GerarListaCompraRequest): Promise<ListaCompraResponse> => {
    const response = await api.post('/listas-compra/rascunho', data)
    return response.data
  },

  atualizarRascunho: async (id: string, data: GerarListaCompraRequest): Promise<ListaCompraResponse> => {
    const response = await api.put(`/listas-compra/${id}`, data)
    return response.data
  },

  gerarRascunho: async (id: string): Promise<ListaCompraResponse> => {
    const response = await api.post(`/listas-compra/${id}/gerar`)
    return response.data
  },

  alterarStatus: async (id: string, status: StatusListaCompra): Promise<ListaCompraResponse> => {
    const response = await api.patch(`/listas-compra/${id}/status`, { status })
    return response.data
  },

  buscar: async (id: string): Promise<ListaCompraResponse> => {
    const response = await api.get(`/listas-compra/${id}`)
    return response.data
  },

  criarCompra: async (id: string): Promise<CompraResponse> => {
    const response = await api.post(`/listas-compra/${id}/criar-compra`)
    return response.data
  },

  baixarPdf: async (id: string): Promise<Blob> => {
    const response = await api.get(`/listas-compra/${id}/pdf`, { responseType: 'blob' })
    return response.data
  },

  previewHtml: async (id: string): Promise<string> => {
    const response = await api.get(`/listas-compra/${id}/preview-html`, { responseType: 'text' })
    return response.data
  },
}
