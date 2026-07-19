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
