import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

interface FichaItem {
  insumoId: string
  quantidade: number
}

/** Produto válido: ficha técnica preenchida + rendimento > 0. */
export async function criarProdutoComFicha(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: FichaItem[],
  rendimento = 1
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento,
      fichaTecnica,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto (com ficha) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Produto sem ficha técnica (fichaTecnica: []) — precondição do Cenário 152. */
export async function criarProdutoSemFicha(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      fichaTecnica: [],
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto (sem ficha) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Tenta criar um produto com ficha técnica preenchida e rendimento zerado/nulo — precondição
 * literal do Cenário 153. `ProdutoService.validarRendimento` (POST e PUT, mesma regra) rejeita
 * essa combinação com 400 sempre que fichaTecnica não está vazia, então esse estado é
 * inalcançável via API. A função devolve a resposta crua (sem checar ok()) para o spec decidir.
 */
export async function tentarCriarProdutoSemRendimento(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: FichaItem[]
) {
  return request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento: 0,
      fichaTecnica,
    },
  })
}

export async function inativarProduto(request: APIRequestContext, token: string, id: string) {
  await request
    .delete(`${API_URL}/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {})
}

export async function buscarProducao(request: APIRequestContext, token: string, id: string) {
  const res = await request.get(`${API_URL}/producoes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

/** Não existe hard-delete de produção — teardown cancela para não poluir listagens/relatórios. */
export async function teardownProducoes(request: APIRequestContext, token: string, ids: string[]) {
  for (const id of ids) {
    await request
      .post(`${API_URL}/producoes/${id}/cancelar`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { justificativa: 'Cancelamento automático — limpeza de massa de teste QA-115' },
      })
      .catch(() => {})
  }
}
