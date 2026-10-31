import api from './api'
import type { BaixaParcelaRequest, CategoriaFinanceira, ContaAvulsaRequest, FiltroParcelas, ListaParcelas, ParcelaFinanceira } from '../types/financeiro'

// V0.19.0 (PP-520) — contrato: modulos/FINANCEIRO/contrato-financeiro.md.
export const financeiroService = {
  criarContaAvulsa: async (pedido: ContaAvulsaRequest): Promise<void> => {
    await api.post('/financeiro/lancamentos-avulsos', pedido)
  },
  buscarParcela: async (id: string): Promise<ParcelaFinanceira> => (await api.get<ParcelaFinanceira>(`/financeiro/parcelas/${id}`)).data,
  editarOcorrencia: async (id: string, pedido: Record<string, unknown>, seguintes: boolean): Promise<ParcelaFinanceira> =>
    (await api.put<ParcelaFinanceira>(`/financeiro/parcelas/${id}/avulso`, pedido, { params: { seguintes } })).data,
  excluirOcorrencia: async (id: string, seguintes: boolean): Promise<void> => {
    await api.delete(`/financeiro/parcelas/${id}/avulso`, { params: { seguintes } })
  },
  preverExclusaoOcorrencia: async (id: string, seguintes: boolean): Promise<boolean> =>
    (await api.get<{ excluiContaInteira: boolean }>(`/financeiro/parcelas/${id}/avulso/impacto-exclusao`, { params: { seguintes } })).data.excluiContaInteira,
  marcarForaProjecao: async (id: string, foraProjecao: boolean): Promise<void> => {
    await api.put(`/financeiro/lancamentos/${id}/fora-projecao`, { foraProjecao })
  },
  listarParcelas: async (filtro: FiltroParcelas): Promise<ListaParcelas> => {
    const { tipo, de, ate, situacao, page = 0, size = 50 } = filtro
    const response = await api.get<ListaParcelas>('/financeiro/parcelas', { params: { tipo, de, ate, situacao, page, size } })
    return response.data
  },

  baixar: async (id: string, data: BaixaParcelaRequest): Promise<ParcelaFinanceira> => {
    const response = await api.post<ParcelaFinanceira>(`/financeiro/parcelas/${id}/baixa`, data)
    return response.data
  },

  desfazerBaixa: async (id: string): Promise<ParcelaFinanceira> => {
    const response = await api.post<ParcelaFinanceira>(`/financeiro/parcelas/${id}/desfazer-baixa`)
    return response.data
  },

  // PP-525 (F6) — categorias de despesa
  listarCategorias: async (incluirInativas = false): Promise<CategoriaFinanceira[]> => {
    const response = await api.get<CategoriaFinanceira[]>('/financeiro/categorias', { params: { incluirInativas } })
    return response.data
  },

  criarCategoria: async (nome: string): Promise<CategoriaFinanceira> => {
    const response = await api.post<CategoriaFinanceira>('/financeiro/categorias', { nome })
    return response.data
  },

  renomearCategoria: async (id: string, nome: string): Promise<CategoriaFinanceira> => {
    const response = await api.put<CategoriaFinanceira>(`/financeiro/categorias/${id}`, { nome })
    return response.data
  },

  inativarCategoria: async (id: string): Promise<CategoriaFinanceira> => {
    const response = await api.post<CategoriaFinanceira>(`/financeiro/categorias/${id}/inativar`)
    return response.data
  },

  reativarCategoria: async (id: string): Promise<CategoriaFinanceira> => {
    const response = await api.post<CategoriaFinanceira>(`/financeiro/categorias/${id}/reativar`)
    return response.data
  },
}
