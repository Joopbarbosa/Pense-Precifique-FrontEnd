import { APIRequestContext, Page, expect } from '@playwright/test'
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

// ---------------------------------------------------------------------------
// P-QA-002 (#116-#119) — editar / iniciar / travar / retomar
// ---------------------------------------------------------------------------

function amanha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function criarProducaoViaApi(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[],
  dataTerminoPrevista = amanha()
) {
  const res = await request.post(`${API_URL}/producoes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataTerminoPrevista, produtos },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Resposta crua (sem checar ok()) — quem chama decide se espera EM_ANDAMENTO, TRAVADA ou DivisaoResponse. */
export async function iniciarProducaoViaApi(
  request: APIRequestContext,
  token: string,
  id: string,
  dividir?: boolean
) {
  return request.post(`${API_URL}/producoes/${id}/iniciar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: dividir === undefined ? {} : { dividir },
  })
}

/** Composto de setup: cria produção + inicia via API. Assume que não há insumo bloqueante (senão cai em TRAVADA). */
export async function criarProducaoEmAndamento(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[],
  dataTerminoPrevista = amanha()
) {
  const producao = await criarProducaoViaApi(request, token, produtos, dataTerminoPrevista)
  const res = await iniciarProducaoViaApi(request, token, producao.id)
  if (!res.ok()) {
    throw new Error(`Falha ao iniciar produção via API: ${res.status()} ${await res.text()}`)
  }
  const iniciada = await res.json()
  if (iniciada.estado !== 'EM_ANDAMENTO') {
    throw new Error(`criarProducaoEmAndamento esperava EM_ANDAMENTO, obteve ${iniciada.estado} — setup incompatível (insumo bloqueante?)`)
  }
  return iniciada
}

/** Trava manual via API (setup rápido para cenários que não testam o ato de travar em si). */
export async function travarProducaoViaApi(request: APIRequestContext, token: string, id: string, justificativa: string) {
  const res = await request.post(`${API_URL}/producoes/${id}/travar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { justificativa },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao travar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

// --- wrappers de UI (assumem que a página já está em /producao/{id} com os modais disponíveis) ---

export async function iniciarProducao(page: Page, opcoes?: { escolha?: 'dividir' | 'travar' }) {
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar início' }).click()
  if (opcoes?.escolha === 'dividir') {
    // .click() já espera o elemento ficar acionável — não usar isVisible() aqui, que checa o
    // estado no instante da chamada (sem polling) e corre risco de rodar antes do modal trocar
    // de etapa (round-trip do POST /iniciar), pulando o clique silenciosamente.
    await page.getByRole('button', { name: 'Dividir produção' }).click({ timeout: 8000 })
  } else if (opcoes?.escolha === 'travar') {
    await page.getByRole('button', { name: 'Fechar' }).click({ timeout: 8000 })
  }
}

export async function travarProducao(page: Page, justificativa: string) {
  await page.getByRole('button', { name: 'Travar', exact: true }).click()
  await page.getByPlaceholder('Descreva o motivo da trava...').fill(justificativa)
  await page.getByRole('button', { name: 'Confirmar trava' }).click()
}

export async function retomarProducao(page: Page, opcoes?: { dividirMesmoAssim?: boolean }) {
  await page.getByRole('button', { name: 'Retomar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar retomada' }).click()
  if (opcoes?.dividirMesmoAssim) {
    const dividirBtn = page.getByRole('button', { name: 'Dividir mesmo assim' })
    await expect(dividirBtn).toBeVisible({ timeout: 5000 })
    await dividirBtn.click()
  }
}

// ---------------------------------------------------------------------------
// P-QA-003 (#120-#121) — finalizar / cancelar com consumo real
// ---------------------------------------------------------------------------

export async function finalizarProducaoViaApi(request: APIRequestContext, token: string, id: string) {
  const res = await request.post(`${API_URL}/producoes/${id}/finalizar`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao finalizar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function finalizarProducao(page: Page) {
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar finalização' }).click()
}

/**
 * Composto de setup: cria produção + inicia via API (deduz estoque), devolve o id e o
 * insumosConsumidos original (quantidade baixada por insumo/produtoBase) — usado nos cenários
 * 172-176 (P-QA-003) para comparar consumo declarado vs. original.
 */
export async function criarProducaoEmAndamentoComConsumo(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[]
) {
  const iniciada = await criarProducaoEmAndamento(request, token, produtos)
  return {
    producaoId: iniciada.id as string,
    insumosConsumidos: (iniciada.insumosConsumidos as { insumoId: string | null; produtoBaseId?: string | null; quantidade: number }[])
      .map(ic => ({ insumoId: ic.insumoId, produtoBaseId: ic.produtoBaseId ?? null, quantidadeOriginal: ic.quantidade })),
  }
}
