import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

export async function criarInsumoComEstoque(
  request: APIRequestContext,
  token: string,
  nome: string,
  estoqueInicial: number,
  permitirEstoqueNegativo = false
) {
  const res = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      unidadeMedida: 'unidade',
      fracionavel: false,
      estoqueMinimo: 1,
      precoTotalCompraInicial: Math.max(estoqueInicial, 1) * 10,
      quantidadeCompradaInicial: Math.max(estoqueInicial, 0.01),
      permitirEstoqueNegativo,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar insumo de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** PUT exige o corpo completo (nome/unidadeMedida obrigatórios de novo) — busca o insumo atual antes de mesclar. */
export async function definirPermitirNegativo(
  request: APIRequestContext,
  token: string,
  id: string,
  permitirEstoqueNegativo: boolean
) {
  const atual = await request.get(`${API_URL}/insumos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const insumo = await atual.json()
  const res = await request.put(`${API_URL}/insumos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome: insumo.nome,
      marca: insumo.marca,
      unidadeMedida: insumo.unidadeMedida,
      fracionavel: insumo.fracionavel,
      estoqueAtual: insumo.estoqueAtual,
      estoqueMinimo: insumo.estoqueMinimo,
      permitirEstoqueNegativo,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao atualizar permitirEstoqueNegativo: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Repõe estoqueAtual até um alvo — usado no Cenário 165 (P-QA-002) para resolver um insumo
 * bloqueante entre trava e retomada. `PUT /insumos/{id}` inclui `estoqueAtual` no DTO mas
 * IGNORA silenciosamente esse campo na atualização (confirmado empiricamente: enviar
 * estoqueAtual=50 não muda o valor persistido) — estoque só se move por endpoint de movimentação.
 * `POST /lotes-compra` é o caminho real de entrada de estoque (mesmo usado por loteCompraService
 * no frontend), então aqui calculamos o delta necessário e registramos um lote de compra.
 */
export async function reporEstoque(
  request: APIRequestContext,
  token: string,
  id: string,
  novoEstoqueAtual: number
) {
  const atual = await request.get(`${API_URL}/insumos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const insumo = await atual.json()
  const delta = novoEstoqueAtual - insumo.estoqueAtual
  if (delta <= 0) return insumo // já está no alvo ou acima — nada a repor

  const res = await request.post(`${API_URL}/lotes-compra`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { itens: [{ insumoId: id, quantidadeComprada: delta, precoTotalPago: 1 }] },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao repor estoque via lote de compra: ${res.status()} ${await res.text()}`)
  }
  const atualizado = await request.get(`${API_URL}/insumos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return atualizado.json()
}
