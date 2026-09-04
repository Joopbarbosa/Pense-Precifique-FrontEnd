import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, criarProdutoComFichaEEstoque, inativarProduto } from '../helpers/producao'
import { criarInsumoFracionavel } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-5 (#194): backend implementa o endpoint somente leitura
 * `GET /orcamentos/{id}/itens-sem-estoque` (CONTRATO_API.md), que alimenta a condição de exibir o
 * botão "Criar produção" no Detalhe do Orçamento quando algum item tem estoque insuficiente.
 *
 * P-FE-CORRIGE-006 (V0.6.1) — `DetalheOrcamentoPage.tsx` passou a chamar esse endpoint no
 * carregamento e a exibir indicador + botão "Criar produção" por item; o clique navega para
 * `/producao/nova?produtoId=...&quantidade=...` (quantidade **faltante**, não a solicitada),
 * lido por `NovaProducaoPage.tsx` via `useSearchParams` (mesmo padrão de `NovoItemCatalogoPage`).
 * Os 3 primeiros testes seguem validando o contrato de backend via API; os 2 últimos cobrem a UI.
 */

test.describe('RN-NOVA-5 (#194) — GET /orcamentos/{id}/itens-sem-estoque', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('lista só os itens com estoque insuficiente, com os números corretos (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeSemEstoque = `QA-RNNOVA5-SemEstoque-${Date.now()}`
    const produtoSemEstoque = await criarProdutoComEstoque(request, token, nomeSemEstoque, 3)
    const nomeComEstoque = `QA-RNNOVA5-ComEstoque-${Date.now()}`
    const produtoComEstoque = await criarProdutoComEstoque(request, token, nomeComEstoque, 100)
    criadosProdutoIds.push(produtoSemEstoque.id, produtoComEstoque.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produtoSemEstoque.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
      { produtoId: produtoComEstoque.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 },
    ])

    const res = await request.get(`${API_URL}/orcamentos/${orcamento.id}/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      produtoId: produtoSemEstoque.id,
      nomeProduto: nomeSemEstoque,
      quantidadeSolicitada: 10,
      estoqueAtual: 3,
      quantidadeFaltante: 7,
    })
  })

  test('orçamento com todos os itens com estoque suficiente retorna array vazio (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA5b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5b-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 },
    ])

    const res = await request.get(`${API_URL}/orcamentos/${orcamento.id}/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    expect(await res.json()).toEqual([])
  })

  test('orçamento inexistente retorna 404 (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const res = await request.get(`${API_URL}/orcamentos/00000000-0000-0000-0000-000000000000/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(404)
  })

  test('botão "Criar produção" aparece na linha do item sem estoque suficiente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA5c-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 3)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5c-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('button', { name: 'Criar produção', exact: true })).toBeVisible()
    await expect(page.getByText(/faltam 7/i)).toBeVisible()
  })

  test('orçamento sem itens com problema de estoque não exibe nenhum indicador nem botão', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA5d-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5d-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByText(nomeProduto)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Criar produção', exact: true })).toHaveCount(0)
  })

  test('clicar em "Criar produção" navega pra Nova Produção com o produto e a quantidade FALTANTE pré-preenchidos', async ({ page, request }) => {
    const token = await apiLogin(request)
    // Precisa de ficha técnica válida (não só estoqueAtual) para POST /producoes/simular-alertas não
    // recusar o produto ao carregar a Nova Produção com o pré-preenchimento — e precisa ser
    // fracionável: `criarInsumoComEstoque` sempre cria `fracionavel: false`, o que dispara a trava de
    // quantidade (RN-051/#187, NovaProducaoPage.tsx:260-278) — quantidade trava em `rendimento` e
    // ignora `?quantidade=` da query, substituindo o `<input type="number">` por um valor fixo
    // somente-leitura. Esse cenário testa o pré-preenchimento vindo da query, não a trava — insumo
    // fracionável evita a trava e mantém o `<input type="number">` real.
    const insumo = await criarInsumoFracionavel(request, token, `QA-RNNOVA5e-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeProduto = `QA-RNNOVA5e-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 3)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5e-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/producao/nova\\?produtoId=${produto.id}&quantidade=7`))
    await expect(page.getByText(nomeProduto)).toBeVisible()
    // quantidade pré-preenchida é a faltante (7 = 10 solicitado - 3 em estoque), não a solicitada (10)
    await expect(page.locator('input[type="number"]')).toHaveValue('7')
  })
})
