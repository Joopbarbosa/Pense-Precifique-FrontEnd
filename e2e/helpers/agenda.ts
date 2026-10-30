import type { APIRequestContext, Page } from '@playwright/test'
import { API_URL } from './auth'

/** V0.18.0 — cria um compromisso da usuária pela API (corpo igual ao do "Novo evento"). */
export async function criarCompromissoUsuaria(
  request: APIRequestContext,
  token: string,
  corpo: { titulo: string; data: string; horario?: string; horarioFim?: string; orcamentoId?: string; insumoId?: string; recorrencia?: string; diasSemana?: string[]; quantidadeOcorrencias?: number },
) {
  const res = await request.post(`${API_URL}/agenda/compromissos-usuaria`, { headers: { Authorization: `Bearer ${token}` }, data: corpo })
  if (!res.ok()) throw new Error(`Falha ao criar compromisso de teste: ${res.status()} ${await res.text()}`)
  return res.json() as Promise<{ id: string; dataOriginal: string }>
}

export async function resumoAgenda(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/agenda/resumo`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json() as Promise<{ atrasados: number; hoje: number }>
}

/**
 * V0.18.0 (#1204) — isola na grade só o que o teste criou. Os dias perto de hoje acumulam entrega estimada, validade e compras de outros
 * specs da mesma execução; passando de 2 compromissos de dia inteiro, o limite da grade (#1183) esconde o card atrás do "+N".
 * A busca da Agenda (#1165) filtra a visão atual antes desse limite, então o card do teste volta a aparecer sozinho no dia.
 */
export async function filtrarAgenda(page: Page, texto: string) {
  await page.getByLabel('Buscar na agenda').fill(texto)
}
