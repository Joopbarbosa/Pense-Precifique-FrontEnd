import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'
import { resolverUnidadeMedidaId } from './unidadeMedida'

/** #487/#488 (V0.12.0) — helpers de API para os specs de Caixa/PDV. */

export async function apiTurnoAberto(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/caixa/turnos/atual`, { headers: { Authorization: `Bearer ${token}` } })
  return res.ok() ? res.json() : null
}

export async function apiFecharTurnoSeAberto(request: APIRequestContext, token: string) {
  const turno = await apiTurnoAberto(request, token)
  if (turno) {
    // #488 (V0.12.0, RN-NOVA-9 revisada) — fechar com 0 quase sempre diverge do esperado
    // (fundo/vendas/movimentos do teste anterior), e o backend agora exige justificativa nesse
    // caso. Manda sempre uma válida (30+ caracteres) — inofensiva quando não há diferença, e
    // evita o cleanup falhar silenciosamente e deixar o turno aberto pro próximo teste.
    await request.post(`${API_URL}/caixa/turnos/${turno.id}/fechar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { valorFechamentoInformado: 0, justificativa: 'Fechamento automático de limpeza entre testes E2E' },
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

/** Reabertura de RN-NOVA-1 (V0.12.0) — Produto de tipo livre (PRODUTO ou CUSTOMIZACAO), com
 *  estoque explícito, para os cenários de item de Catálogo/customização no Caixa. */
export async function apiCriarProdutoTipo(
  request: APIRequestContext, token: string, nome: string, tipo: 'PRODUTO' | 'CUSTOMIZACAO',
  precoVenda: number, estoqueAtual: number,
  // V0.13.0 — opcional, default `[]` (comportamento antigo inalterado para quem já chamava sem
  // este parâmetro). Só precisa de ficha técnica real (custo > 0) quem for usar o produto como
  // componente de Item de Catálogo (RN-044) — ver apiCriarCatalogoComItem.
  fichaTecnica: Array<{ insumoId: string; quantidade: number }> = []
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo, tempoProducao: 1, rendimento: 1, precoVenda, estoqueAtual, permitirEstoqueNegativo: true, fichaTecnica },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produto de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}

/**
 * Cria um Catálogo com 1 item, opcionalmente com um 2º componente (RN-048). Retorna também os
 * produtos criados, pra checagem de estoque no teste.
 *
 * V0.13.0 (#516/RN-NOVA-1/2/9) — Item de Catálogo deixou de ser `{ produtoId, quantidadePacote,
 * customizacoesAnexadas: [{produtoId, quantidade}] }` (cada componente com preço próprio, somado
 * ao total do item) e passou a ser composição livre (`componentes: [{ produtoBaseId, quantidade
 * }]`, sem preço por componente) — o item ganha `precoVenda` própria (aqui sempre override, via
 * `precoVendaItem`). Produto-base como componente exige custo calculado (RN-044), por isso os 2
 * produtos ganham ficha técnica com 1 insumo (não mais `fichaTecnica: []` de `apiCriarProdutoTipo`
 * — sobrescrita aqui via `PUT /produtos/{id}` depois de criados, pra não alterar a assinatura de
 * `apiCriarProdutoTipo`, usada também por produtos vendidos direto, sem ficha técnica).
 */
export async function apiCriarCatalogoComItem(
  request: APIRequestContext, token: string, nomeProdutoPrincipal: string, precoVendaItem: number,
  estoqueAtual: number, customizacao?: { nome: string; precoVenda: number; estoqueAtual: number }
) {
  const unidadeMedidaId = await resolverUnidadeMedidaId(request, token, 'unidade')
  const resInsumo = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome: `QA-insumo-base-${nomeProdutoPrincipal}`, unidadeMedidaId, fracionavel: false, precoTotalCompraInicial: 10, quantidadeCompradaInicial: 10 },
  })
  if (!resInsumo.ok()) throw new Error(`Falha ao criar insumo de teste: ${resInsumo.status()} ${await resInsumo.text()}`)
  const insumo = await resInsumo.json()

  const produtoPrincipal = await apiCriarProdutoTipo(request, token, nomeProdutoPrincipal, 'PRODUTO', precoVendaItem, estoqueAtual, [{ insumoId: insumo.id, quantidade: 1 }])

  const resCatalogo = await request.post(`${API_URL}/catalogos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome: `Catalogo-${nomeProdutoPrincipal}` },
  })
  if (!resCatalogo.ok()) throw new Error(`Falha ao criar catálogo de teste: ${resCatalogo.status()} ${await resCatalogo.text()}`)
  const catalogo = await resCatalogo.json()

  const componentes: Array<{ produtoBaseId: string; quantidade: number }> = [{ produtoBaseId: produtoPrincipal.id, quantidade: 1 }]
  let produtoCustomizacao: any = null
  if (customizacao) {
    produtoCustomizacao = await apiCriarProdutoTipo(request, token, customizacao.nome, 'CUSTOMIZACAO', customizacao.precoVenda, customizacao.estoqueAtual, [{ insumoId: insumo.id, quantidade: 1 }])
    componentes.push({ produtoBaseId: produtoCustomizacao.id, quantidade: 1 })
  }

  const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome: nomeProdutoPrincipal, tempoProducao: 1, componentes, precoVenda: precoVendaItem },
  })
  if (!resItem.ok()) throw new Error(`Falha ao criar item de catálogo de teste: ${resItem.status()} ${await resItem.text()}`)
  const item = await resItem.json()

  return { catalogo, item, produtoPrincipal, produtoCustomizacao }
}
