import { APIRequestContext } from '@playwright/test'
import { API_URL, TEST_EMAIL, TEST_SENHA } from './auth'

export async function apiLogin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: TEST_EMAIL, senha: TEST_SENHA },
  })
  const body = await res.json()
  return body.token as string
}

export async function criarInsumo(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      unidadeMedida: 'unidade',
      fracionavel: false,
      estoqueMinimo: 1,
      precoTotalCompraInicial: 10,
      quantidadeCompradaInicial: 10,
      permitirEstoqueNegativo: true,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar insumo de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function contarInsumos(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${API_URL}/insumos?page=0&size=1&sort=nome`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  return body.totalElements as number
}

export async function inativarInsumo(request: APIRequestContext, token: string, id: string) {
  await request
    .delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {})
}

export async function getConfiguracao(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/configuracoes/precificacao`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function putConfiguracao(
  request: APIRequestContext,
  token: string,
  data: { valorHora: number; margemPadrao: number }
) {
  await request.put(`${API_URL}/configuracoes/precificacao`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
}
