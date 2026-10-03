import { APIRequestContext, Page } from '@playwright/test'
import { API_URL } from './auth'
import { resolverUnidadeMedidaId } from './unidadeMedida'

export async function criarCliente(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
    // V0.15.0 (#536): papel obrigatório — sem ele o POST /clientes responde 400.
    data: { nome, ehCliente: true, ehFornecedor: false },
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
 *
 * ORC-020 (REVISÃO)/RN-NOVA-22-23 (V0.8.4/#399) — reverte P-F005/#251 (RN-054 revisada):
 * clicar no produto agora abre a calculadora de preço (`ModalCalculadoraItem`) antes de
 * confirmar a adição. Este helper aceita o preço sugerido por padrão (não mexe no campo de
 * preço final) — specs que precisam testar a própria calculadora usam os cenários dedicados
 * em `calculadora-preco.spec.ts`, não este helper.
 */
export async function adicionarItemAvulso(page: Page, nomeProduto: string, quantidade: number) {
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
  await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
  await page.getByText(nomeProduto, { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()

  // Stepper começa em 1 — clica em "+" (quantidade - 1) vezes. Único +/- na tela nesse ponto
  // (um só item na lista), então o botão "+" é inequívoco.
  for (let i = 1; i < quantidade; i++) {
    await page.getByRole('button', { name: '+', exact: true }).click()
  }
}

/**
 * Mesma mecânica de `adicionarItemAvulso`, para um item de catálogo (`nomeProduto` é o
 * `nomeProduto` do item, como retornado por `ItemCatalogoBuscaResponse`). ORC-020
 * (REVISÃO)/RN-NOVA-22-23 (V0.8.4/#399) — também abre a calculadora antes de confirmar.
 */
export async function adicionarItemCatalogo(page: Page, nomeProduto: string) {
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
  await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
  await page.getByText(nomeProduto, { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()
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
      temPrazoProducao: true,
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
 * RN-NOVA-6/RN-NOVA-7 (#217) — cria um catálogo ativo com N itens (1 componente Produto cada),
 * todos disponíveis para a busca de `ItemSearch` (`GET /orcamentos/itens-catalogo`).
 * `nomesProdutos` define a quantidade e o nome de cada item — o nome do item de catálogo é o
 * mesmo nome (V0.13.0/#516: `nome` é campo próprio do item, não mais herdado do produto).
 *
 * V0.13.0 (#516) — Item de Catálogo deixou de ser `{ produtoId, quantidadePacote }` e passou a
 * ser composição livre (`componentes: [{ produtoBaseId, quantidade }]`); Produto-base como
 * componente exige custo calculado (RN-044), por isso cada produto ganha ficha técnica com 1
 * insumo (não mais `fichaTecnica: []`), diferente do padrão antigo que não precisava de custo.
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

  const unidadeMedidaId = await resolverUnidadeMedidaId(request, token, 'unidade')
  const resInsumo = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome: `QA-insumo-base-${nomeCatalogo}`,
      unidadeMedidaId,
      fracionavel: false,
      precoTotalCompraInicial: 10,
      quantidadeCompradaInicial: 10,
    },
  })
  if (!resInsumo.ok()) {
    throw new Error(`Falha ao criar insumo de teste: ${resInsumo.status()} ${await resInsumo.text()}`)
  }
  const insumo = await resInsumo.json()

  const itens: Array<{ id: string; [k: string]: unknown }> = []
  const produtoIds: string[] = []
  for (const nomeProduto of nomesProdutos) {
    const resProduto = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, fichaTecnica: [{ insumoId: insumo.id, quantidade: 1 }] },
    })
    if (!resProduto.ok()) {
      throw new Error(`Falha ao criar produto de teste: ${resProduto.status()} ${await resProduto.text()}`)
    }
    const produto = await resProduto.json()
    produtoIds.push(produto.id)

    const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nome: nomeProduto,
        tempoProducao: 10,
        componentes: [{ produtoBaseId: produto.id, quantidade: 1 }],
        precoVenda: 10,
      },
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

/**
 * RN-NOVA-16 (V0.10.0, #476) — Customização produzível (ficha técnica + rendimento + estoqueAtual
 * explícito), para os cenários de estoque/produção que agora também consideram customização
 * anexada, não só o produto principal. Mesmo padrão de `criarProdutoComFichaEEstoque`
 * (helpers/producao.ts), tipo CUSTOMIZACAO em vez de PRODUTO.
 */
export async function criarCustomizacaoComFichaEEstoque(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: Array<{ insumoId: string; quantidade: number }>,
  estoqueAtual: number,
  rendimento = 1
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo: 'CUSTOMIZACAO', tempoProducao: 10, precoVenda: 15, rendimento, fichaTecnica, estoqueAtual },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar customização (com ficha e estoque) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function desativarCatalogo(request: APIRequestContext, token: string, id: string) {
  await request
    .post(`${API_URL}/catalogos/${id}/desativar`, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {})
}

/** Resposta crua (sem checar ok()) — quem chama decide (ex. CEN-NOVO-E: bloqueio de edição fora de RASCUNHO espera 400). */
export async function editarOrcamentoViaApi(
  request: APIRequestContext,
  token: string,
  id: string,
  body: Record<string, unknown>
) {
  return request.put(`${API_URL}/orcamentos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  })
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

/** P-T004/#320 — vincula o orçamento a uma produção AGUARDANDO_INICIO já existente (merge por soma no backend). */
export async function vincularProducaoViaApi(
  request: APIRequestContext,
  token: string,
  orcamentoId: string,
  producaoId: string
) {
  const res = await request.post(`${API_URL}/orcamentos/${orcamentoId}/vincular-producao`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { producaoId },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao vincular produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Resposta crua (sem checar ok()) — quem chama decide (CEN-NOVO-L espera 400 fora de AGUARDANDO_INICIO). */
export async function desvincularProducaoViaApi(
  request: APIRequestContext,
  token: string,
  orcamentoId: string,
  producaoId: string
) {
  return request.delete(`${API_URL}/orcamentos/${orcamentoId}/vincular-producao/${producaoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * P-T004/#320 — cria uma produção nova (AGUARDANDO_INICIO) já vinculada ao orçamento, com os
 * produtos dele. `produtoIds` (RN-NOVA-13/25, P-F001f) restringe a produtos específicos do
 * orçamento — null/ausente preserva o padrão (todos os itens).
 */
export async function criarProducaoVinculadaViaApi(
  request: APIRequestContext,
  token: string,
  orcamentoId: string,
  data: { dataInicio?: string; dataTerminoPrevista: string; observacoes?: string; produtoIds?: string[] }
) {
  const res = await request.post(`${API_URL}/orcamentos/${orcamentoId}/criar-producao-vinculada`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produção vinculada via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}
