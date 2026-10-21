import type { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

/** V0.18.0 — cria um compromisso da usuária pela API (corpo igual ao do "Novo evento"). */
export async function criarCompromissoUsuaria(
  request: APIRequestContext,
  token: string,
  corpo: { titulo: string; data: string; horario?: string; orcamentoId?: string; insumoId?: string; recorrencia?: string; diasSemana?: string[]; quantidadeOcorrencias?: number },
) {
  const res = await request.post(`${API_URL}/agenda/compromissos-usuaria`, { headers: { Authorization: `Bearer ${token}` }, data: corpo })
  if (!res.ok()) throw new Error(`Falha ao criar compromisso de teste: ${res.status()} ${await res.text()}`)
  return res.json() as Promise<{ id: string; dataOriginal: string }>
}

export async function resumoAgenda(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/agenda/resumo`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json() as Promise<{ atrasados: number; hoje: number }>
}
