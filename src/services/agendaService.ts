import api from './api'
import type {
  AgendaResumo, Compromisso, CompromissoUsuariaDetalhe, CompromissoUsuariaRequest, EditarCompromissoRequest, EscopoEdicao, PaginaCompromissos,
} from '../types/agenda'

// V0.18.0 — #1034 (DT-NOVA-2). Contrato: modulos/AGENDA/contrato-agenda.md.
export const agendaService = {
  compromissos: async (de: string, ate: string): Promise<Compromisso[]> => {
    const response = await api.get('/agenda/compromissos', { params: { de, ate } })
    return response.data
  },

  resumo: async (): Promise<AgendaResumo> => {
    const response = await api.get('/agenda/resumo')
    return response.data
  },

  atrasados: async (page: number, size: number): Promise<PaginaCompromissos> => {
    const response = await api.get('/agenda/atrasados', { params: { page, size } })
    return response.data
  },

  // ---- compromisso da usuária (#1039, RN-NOVA-19 a RN-NOVA-21) ----
  criarCompromisso: async (data: CompromissoUsuariaRequest): Promise<CompromissoUsuariaDetalhe> => {
    const response = await api.post('/agenda/compromissos-usuaria', data)
    return response.data
  },

  detalheCompromisso: async (id: string, dataOriginal: string): Promise<CompromissoUsuariaDetalhe> => {
    const response = await api.get(`/agenda/compromissos-usuaria/${id}/ocorrencias/${dataOriginal}`)
    return response.data
  },

  concluirCompromisso: async (id: string, dataOriginal: string): Promise<CompromissoUsuariaDetalhe> => {
    const response = await api.post(`/agenda/compromissos-usuaria/${id}/ocorrencias/${dataOriginal}/concluir`)
    return response.data
  },

  cancelarCompromisso: async (id: string, dataOriginal: string, escopo: EscopoEdicao, observacao: string): Promise<CompromissoUsuariaDetalhe> => {
    const response = await api.post(`/agenda/compromissos-usuaria/${id}/ocorrencias/${dataOriginal}/cancelar`, { escopo, observacao })
    return response.data
  },

  editarCompromisso: async (id: string, dataOriginal: string, data: EditarCompromissoRequest): Promise<CompromissoUsuariaDetalhe> => {
    const response = await api.put(`/agenda/compromissos-usuaria/${id}/ocorrencias/${dataOriginal}`, data)
    return response.data
  },
}
