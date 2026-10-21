import api from './api'
import type { AgendaResumo, Compromisso, PaginaCompromissos } from '../types/agenda'

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
}
