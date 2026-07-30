import { APIRequestContext, Page, expect } from '@playwright/test'
import { API_URL } from './auth'

export async function criarCliente(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar cliente de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function buscarOrcamento(request: APIRequestContext, token: string, id: string) {
  const res = await request.get(`${API_URL}/orcamentos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

/** Resposta crua (sem checar ok()) — quem chama decide se espera OrcamentoDetalheResponse ou ConfirmacaoEstoqueNegativoResponse (RN-052, #136). */
export async function avancarStatusViaApi(
  request: APIRequestContext,
  token: string,
  id: string,
  body?: Record<string, unknown>
) {
  return request.post(`${API_URL}/orcamentos/${id}/avancar-status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body ?? {},
  })
}

/** Seleciona o cliente pelo autocomplete de `ClienteSelect` (CriarOrcamentoPage.tsx:58-150). */
export async function selecionarCliente(page: Page, nomeCliente: string) {
  await page.getByPlaceholder('Selecionar cliente...').fill(nomeCliente)
  await page.getByText(nomeCliente, { exact: true }).click()
}

/**
 * Fluxo de UI para adicionar um produto avulso (modo "tudo") ao orçamento em criação e ajustar
 * a quantidade via Stepper (só +/-, sem input numérico direto — CriarOrcamentoPage.tsx:153-169).
 * Assume que a página já está em `/orcamentos/novo` e que `nomeProduto` é único o bastante para
 * não colidir com outro resultado de busca (nome com timestamp, como nos demais specs QA).
 */
export async function adicionarItemAvulso(page: Page, nomeProduto: string, quantidade: number) {
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
  await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
  await page.getByText(nomeProduto, { exact: true }).click()

  const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
  await expect(confirmar).toBeEnabled({ timeout: 5000 })
  await confirmar.click()

  // Stepper começa em 1 — clica em "+" (quantidade - 1) vezes. Único +/- na tela nesse ponto
  // (um só item na lista), então o botão "+" é inequívoco.
  for (let i = 1; i < quantidade; i++) {
    await page.getByRole('button', { name: '+', exact: true }).click()
  }
}

/**
 * Cria um orçamento via API com o corpo mínimo válido (OrcamentoRequest.java) — item avulso por
 * padrão (`produtoId` + `precoUnitario`/`margemAplicada`), mas aceita `itens` já no formato de
 * `OrcamentoItemRequest` (inclusive origem por `itemCatalogoId`). `overrides` sobrescreve/estende
 * qualquer campo do topo do payload (ex. `sinalAtivo`, `percentualSinal`).
 */
export async function criarOrcamentoViaApi(
  request: APIRequestContext,
  token: string,
  clienteId: string,
  itens: Array<Record<string, unknown>>,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post(`${API_URL}/orcamentos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      clienteId,
      itens,
      metodoPagamento: 'PIX',
      prazoProducaoDias: 5,
      sinalAtivo: false,
      ...overrides,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar orçamento de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/**
 * `numero` do Orçamento é `MAX(numero)+1` por usuário, sempre gerado no servidor
 * (`OrcamentoService.proximoNumero`) — não é possível "nascer" um orçamento já em #10+ via
 * request. Para testar RN-053 (ausência de zero-padding, só visível com 2+ dígitos) sem depender
 * da ordem de outros specs no mesmo run, cria orçamentos de 1 item descartáveis (sempre com o
 * mesmo `produtoId`, RASCUNHO, nunca avançados — não mexem em estoque) até o número virar >= 10.
 * Sequencial (`for` + `await`), nunca `Promise.all` — mesmo motivo do padrão já usado para
 * produção em massa (colisão no contador incremental sem lock de linha).
 */
export async function criarOrcamentoComNumeroDeDoisDigitos(
  request: APIRequestContext,
  token: string,
  clienteId: string,
  produtoId: string,
  overrides: Record<string, unknown> = {}
) {
  let ultimo: { id: string; numero: number; [k: string]: unknown } | null = null
  for (let i = 0; i < 15; i++) {
    ultimo = await criarOrcamentoViaApi(
      request,
      token,
      clienteId,
      [{ produtoId, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }],
      overrides
    )
    if (ultimo.numero >= 10) return ultimo
  }
  throw new Error(`Não foi possível alcançar número de 2 dígitos após 15 tentativas (último: ${ultimo?.numero})`)
}

export async function cancelarOrcamentoViaApi(
  request: APIRequestContext,
  token: string,
  id: string,
  body: Record<string, unknown> = {}
) {
  return request.post(`${API_URL}/orcamentos/${id}/cancelar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  })
}
