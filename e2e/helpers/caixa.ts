import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

/** #487/#488 (V0.12.0) — helpers de API para os specs de Caixa/PDV. */

export async function apiTurnoAberto(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/caixa/turnos/atual`, { headers: { Authorization: `Bearer ${token}` } })
  return res.ok() ? res.json() : null
}

export async function apiFecharTurnoSeAberto(request: APIRequestContext, token: string) {
  const turno = await apiTurnoAberto(request, token)
  if (turno) {
    await request.post(`${API_URL}/caixa/turnos/${turno.id}/fechar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { valorFechamentoInformado: 0 },
    })
  }
}

/** Sempre garante que não há turno aberto antes de criar o novo — RN-NOVA-6 bloqueia um 2º. */
export async function apiAbrirTurno(request: APIRequestContext, token: string, valorAbertura = 100) {
  await apiFecharTurnoSeAberto(request, token)
  const res = await request.post(`${API_URL}/caixa/turnos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { valorAbertura },
  })
  if (!res.ok()) throw new Error(`Falha ao abrir turno de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function apiMetodoPagamentoPorTipo(request: APIRequestContext, token: string, tipo: string) {
  const res = await request.get(`${API_URL}/configuracoes/metodos-pagamento`, { headers: { Authorization: `Bearer ${token}` } })
  const metodos = await res.json()
  const metodo = metodos.find((m: any) => m.tipo === tipo)
  if (!metodo) throw new Error(`Método de pagamento tipo ${tipo} não encontrado`)
  return metodo
}

/** Produto com estoque e permitirEstoqueNegativo explícitos — `criarProdutoComPreco` (producao.ts)
 * não define estoque (fica 0), insuficiente para os cenários de venda do Caixa. */
export async function apiCriarProdutoComEstoque(
  request: APIRequestContext, token: string, nome: string,
  precoVenda: number, estoqueAtual: number, permitirEstoqueNegativo = true
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo: 'PRODUTO', tempoProducao: 1, precoVenda, estoqueAtual, permitirEstoqueNegativo, fichaTecnica: [] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produto de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function apiBuscarProduto(request: APIRequestContext, token: string, id: string) {
  const res = await request.get(`${API_URL}/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}
