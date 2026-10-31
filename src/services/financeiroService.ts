import api from './api'
import type { BaixaParcelaRequest, FiltroParcelas, ListaParcelas, ParcelaFinanceira } from '../types/financeiro'

// V0.19.0 (PP-520) — contrato: modulos/FINANCEIRO/contrato-financeiro.md.
export const financeiroService = {
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
}
