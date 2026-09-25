import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

/**
 * #298 (V0.14.0) — Insumo.unidadeMedida virou UnidadeMedida (FK), POST/PUT /insumos agora exige
 * unidadeMedidaId (UUID) em vez do texto livre antigo. Resolve (ou cria, se ainda não existir para
 * esta conta de teste) a unidade pela sigla, para os helpers de criação de insumo continuarem
 * podendo montar o payload passando só a sigla como antes.
 */
export async function resolverUnidadeMedidaId(
  request: APIRequestContext,
  token: string,
  sigla: string
): Promise<string> {
  const headers = { Authorization: `Bearer ${token}` }
  const lista = await request.get(`${API_URL}/unidades-medida`, { headers })
  const unidades = await lista.json()
  const existente = (unidades as Array<{ id: string; sigla: string }>)
    .find(u => u.sigla.toLowerCase() === sigla.toLowerCase())
  if (existente) return existente.id

  const criada = await request.post(`${API_URL}/unidades-medida`, {
    headers,
    data: { nome: sigla, sigla },
  })
  if (!criada.ok()) {
    throw new Error(`Falha ao criar unidade de medida de teste (${sigla}): ${criada.status()} ${await criada.text()}`)
  }
  return (await criada.json()).id
}
