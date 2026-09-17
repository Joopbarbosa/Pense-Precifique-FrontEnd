import api from './api'
import type {
  AbrirCaixaTurnoRequest, CaixaTurnoResponse, FecharCaixaTurnoRequest,
  CaixaMovimentoRequest, CaixaMovimentoResponse,
  VendaCaixaRequest, VendaCaixaResponse, CancelarVendaCaixaRequest, RegistrarVendaResultado,
} from '../types/caixa'

export const caixaService = {
  // #488 (V0.12.0)
  buscarTurnoAberto: async (): Promise<CaixaTurnoResponse | null> => {
    try {
      const response = await api.get<CaixaTurnoResponse>('/caixa/turnos/atual')
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  abrirTurno: async (data: AbrirCaixaTurnoRequest): Promise<CaixaTurnoResponse> => {
    const response = await api.post<CaixaTurnoResponse>('/caixa/turnos', data)
    return response.data
  },

  fecharTurno: async (id: string, data: FecharCaixaTurnoRequest): Promise<CaixaTurnoResponse> => {
    const response = await api.post<CaixaTurnoResponse>(`/caixa/turnos/${id}/fechar`, data)
    return response.data
  },

  registrarMovimento: async (data: CaixaMovimentoRequest): Promise<CaixaMovimentoResponse> => {
    const response = await api.post<CaixaMovimentoResponse>('/caixa/movimentos', data)
    return response.data
  },

  listarMovimentos: async (turnoId: string): Promise<CaixaMovimentoResponse[]> => {
    const response = await api.get<CaixaMovimentoResponse[]>(`/caixa/turnos/${turnoId}/movimentos`)
    return response.data
  },

  listarVendasDoTurno: async (turnoId: string): Promise<VendaCaixaResponse[]> => {
    const response = await api.get<VendaCaixaResponse[]>(`/caixa/turnos/${turnoId}/vendas`)
    return response.data
  },

  // #487 (V0.12.0)
  registrarVenda: async (data: VendaCaixaRequest): Promise<RegistrarVendaResultado> => {
    const response = await api.post<RegistrarVendaResultado>('/caixa/vendas', data)
    return response.data
  },

  buscarVendaPorId: async (id: string): Promise<VendaCaixaResponse> => {
    const response = await api.get<VendaCaixaResponse>(`/caixa/vendas/${id}`)
    return response.data
  },

  cancelarVenda: async (id: string, data: CancelarVendaCaixaRequest): Promise<VendaCaixaResponse> => {
    const response = await api.post<VendaCaixaResponse>(`/caixa/vendas/${id}/cancelar`, data)
    return response.data
  },
}
