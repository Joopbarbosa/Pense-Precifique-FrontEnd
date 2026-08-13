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

/**
 * RN-NOVA-6/RN-NOVA-7 (#217) — cria um catálogo ativo com N itens (1 produto cada), todos
 * disponíveis para a busca de `ItemSearch` (`GET /orcamentos/itens-catalogo`). `nomesProdutos`
 * define a quantidade e o nome de cada item.
 */
export async function criarCatalogoComItens(
  request: APIRequestContext,
  token: string,
  nomeCatalogo: string,
  nomesProdutos: string[]
) {
  const resCatalogo = await request.post(`${API_URL}/catalogos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome: nomeCatalogo },
  })
  if (!resCatalogo.ok()) {
    throw new Error(`Falha ao criar catálogo de teste: ${resCatalogo.status()} ${await resCatalogo.text()}`)
  }
  const catalogo = await resCatalogo.json()

  const itens: Array<{ id: string; [k: string]: unknown }> = []
  const produtoIds: string[] = []
  for (const nomeProduto of nomesProdutos) {
    const resProduto = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, fichaTecnica: [] },
    })
    if (!resProduto.ok()) {
      throw new Error(`Falha ao criar produto de teste: ${resProduto.status()} ${await resProduto.text()}`)
    }
    const produto = await resProduto.json()
    produtoIds.push(produto.id)

    const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { produtoId: produto.id, quantidadePacote: 1, precoVenda: 10 },
    })
    if (!resItem.ok()) {
      throw new Error(`Falha ao criar item de catálogo de teste: ${resItem.status()} ${await resItem.text()}`)
    }
    itens.push(await resItem.json())
  }

  return { catalogo, itens, produtoIds }
}

/** RN-NOVA-7 (#217) — cria N produtos tipo CUSTOMIZACAO para a busca de `ModalCustomizacoes`. */
export async function criarCustomizacoes(request: APIRequestContext, token: string, nomes: string[]) {
  const criadas: Array<{ id: string; [k: string]: unknown }> = []
  for (const nome of nomes) {
    const res = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome, tipo: 'CUSTOMIZACAO', tempoProducao: 5, precoVenda: 5, margemLucro: 50, fichaTecnica: [] },
    })
    if (!res.ok()) {
      throw new Error(`Falha ao criar customização de teste: ${res.status()} ${await res.text()}`)
    }
    criadas.push(await res.json())
  }
  return criadas
}

export async function desativarCatalogo(request: APIRequestContext, token: string, id: string) {
  await request
    .post(`${API_URL}/catalogos/${id}/desativar`, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {})
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
