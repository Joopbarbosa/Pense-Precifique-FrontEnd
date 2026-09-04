import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, criarProdutoComFichaEEstoque, inativarProduto } from '../helpers/producao'
import { criarInsumoFracionavel } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, criarProducaoVinculadaViaApi } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-5 (#194): backend implementa o endpoint somente leitura
 * `GET /orcamentos/{id}/itens-sem-estoque` (CONTRATO_API.md), que alimenta a condição de exibir o
 * card "Estoque insuficiente" no Detalhe do Orçamento quando algum item tem estoque insuficiente.
 * Os 3 primeiros testes seguem validando o contrato de backend via API.
 *
 * RN-NOVA-25/26 (#319+387, V0.8.3, P-F001f) — comportamento de UI substituído nesta versão: o
 * botão individual "Criar produção" por item (ORC-028, navegação direta pra `/producao/nova`, sem
 * vínculo formal) virou checkbox + ação agregada "Criar produção (N)" que cria vínculo formal via
 * `criarProducaoVinculada` (RN-NOVA-25); quando o item já tem produção não-terminal cobrindo o
 * produto, o card mostra "Visualizar produção" no lugar do checkbox, apontando pra produção certa
 * (RN-NOVA-26) — nunca uma produção qualquer vinculada ao orçamento. Os testes de UI abaixo foram
 * reescritos para esse comportamento; a navegação antiga por query string (`?produtoId=&quantidade=`)
 * não existe mais a partir deste card (segue existindo só como mecanismo interno do backend/RN-054,
 * não mais acionada por clique daqui).
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

  test('checkbox + "Criar produção" (agregado, desabilitado até selecionar) aparecem na linha do item sem estoque suficiente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA25a-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 3)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA25a-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByText(/faltam 7 un/i)).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toBeVisible()
    const botaoAgregado = page.getByRole('button', { name: 'Criar produção', exact: true })
    await expect(botaoAgregado).toBeVisible()
    await expect(botaoAgregado).toBeDisabled()
  })

  test('orçamento sem itens com problema de estoque não exibe nenhum checkbox nem botão de produção', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA25b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA25b-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByText(nomeProduto)).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Criar produção', exact: true })).toHaveCount(0)
  })

  test('marcar checkbox e confirmar "Criar produção (N)" cria vínculo formal — card vira "Visualizar produção" apontando pra produção certa', async ({ page, request }) => {
    const token = await apiLogin(request)
    // Ficha técnica válida (não só estoqueAtual) — criarProducaoVinculada/POST produções recusa
    // produto sem ficha técnica completa + rendimento (mesma trava de qualquer criação de produção).
    const insumo = await criarInsumoFracionavel(request, token, `QA-RNNOVA25c-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeProduto = `QA-RNNOVA25c-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 3)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA25c-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.locator('input[type="checkbox"]').click()
    const botaoAgregado = page.getByRole('button', { name: 'Criar produção (1)', exact: true })
    await expect(botaoAgregado).toBeEnabled()
    await botaoAgregado.click()

    await expect(page.getByText('Cobre só o item selecionado', { exact: true })).toBeVisible()
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').last().fill(amanha)
    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()

    await expect(page.getByText('Produção criada e vinculada a este orçamento.')).toBeVisible({ timeout: 5000 })
    // Banner de topo (agregado por orçamento) confirma o vínculo.
    await expect(page.getByText(/Vinculado a produção:/)).toBeVisible()

    // Card do item: checkbox some, vira "Visualizar produção" — clicar navega pra produção CERTA
    // (a que a própria ação acabou de criar), não uma navegação genérica.
    const botaoVisualizar = page.getByRole('button', { name: 'Visualizar produção', exact: true })
    await expect(botaoVisualizar).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0)
    await botaoVisualizar.click()
    await expect(page).toHaveURL(/\/producao\/[0-9a-f-]{36}$/)
  })

  test('RN-NOVA-26 — item já com produção não-terminal vinculada mostra "Visualizar produção" direto, sem checkbox', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoFracionavel(request, token, `QA-RNNOVA26-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeProduto = `QA-RNNOVA26-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 3)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA26-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await criarProducaoVinculadaViaApi(request, token, orcamento.id, { dataTerminoPrevista: amanha })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await expect(page.getByRole('button', { name: 'Visualizar produção', exact: true })).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0)
    // Sem itens pendentes de vínculo — a ação agregada não aparece (nada mais pra criar).
    await expect(page.getByRole('button', { name: /Criar produção/ })).toHaveCount(0)
  })

  test('Seleção parcial (RN-NOVA-13/25) — item A já vinculado mostra "Visualizar produção", item B sem vínculo mostra checkbox, ambos na mesma tela', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoFracionavel(request, token, `QA-RNNOVA25d-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeA = `QA-RNNOVA25d-ItemA-${Date.now()}`
    const produtoA = await criarProdutoComFichaEEstoque(request, token, nomeA, [{ insumoId: insumo.id, quantidade: 1 }], 3)
    const nomeB = `QA-RNNOVA25d-ItemB-${Date.now()}`
    const produtoB = await criarProdutoComFichaEEstoque(request, token, nomeB, [{ insumoId: insumo.id, quantidade: 1 }], 2)
    criadosProdutoIds.push(produtoA.id, produtoB.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA25d-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produtoA.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
      { produtoId: produtoB.id, margemAplicada: 50, precoUnitario: 20, quantidade: 8 },
    ])
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    // Só o item A entra numa produção — item B fica deliberadamente sem vínculo.
    await criarProducaoVinculadaViaApi(request, token, orcamento.id, {
      dataTerminoPrevista: amanha,
      produtoIds: [produtoA.id],
    })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await expect(page.getByRole('button', { name: 'Visualizar produção', exact: true })).toHaveCount(1)
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(1)
    await expect(page.getByText(nomeB, { exact: true })).toBeVisible()

    // Ainda dá pra criar uma 2ª produção só com o item pendente (B), a partir do botão principal.
    await page.locator('input[type="checkbox"]').click()
    await page.getByRole('button', { name: 'Criar produção (1)', exact: true }).click()
    await page.locator('input[type="date"]').last().fill(amanha)
    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()

    await expect(page.getByRole('button', { name: 'Visualizar produção', exact: true })).toHaveCount(2, { timeout: 5000 })
    await expect(page.getByRole('button', { name: /Criar produção/ })).toHaveCount(0)
  })
})
