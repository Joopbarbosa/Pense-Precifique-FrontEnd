import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { apiLogin } from '../helpers/api'
import { login } from '../helpers/auth'
import { adicionarItemAvulso, criarCliente, selecionarCliente } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { hojeLocal } from '../helpers/data'

test.describe('#1106 #1107 #1111 — criação de orçamento', () => {
  let produtoIds: string[] = []
  let clienteIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
    clienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
    for (const id of clienteIds) {
      await request.delete(`${E2E_API_URL}/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CT-1106-01 — "Voltar para orçamentos" leva à lista sem criar nada', async ({ page }) => {
    await login(page)
    await page.goto('/orcamentos/novo')
    await page.getByRole('button', { name: /Voltar para orçamentos/ }).click()
    await expect(page).toHaveURL(/\/orcamentos$/)
  })

  test('CT-1111-01 — validade nasce em 7 dias e prazo de produção nasce em Não', async ({ page }) => {
    await login(page)
    await page.goto('/orcamentos/novo')
    await expect(page.locator(`input[type="date"][value="${hojeLocal(7)}"]`).first()).toBeVisible()
    await expect(page.locator('input[type="number"][placeholder="10"]')).toHaveCount(0)
  })

  test('CT-1107-01 — estoque que ficará negativo mostra o aviso; "Revisar itens" mantém o rascunho e "OK" cria', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA1107-Produto-${Date.now()}`, 2)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1107-Cliente-${Date.now()}`)
    clienteIds.push(cliente.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await adicionarItemAvulso(page, produto.nome, 5)
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Estoque ficará negativo')).toBeVisible()
    await expect(page.getByTestId('itens-estoque-negativo')).toContainText('Estoque 2 · precisa de 5 · fica em -3')

    await page.getByRole('button', { name: 'Revisar itens', exact: true }).click()
    await expect(page.getByText('Estoque ficará negativo')).toHaveCount(0)
    await expect(page).toHaveURL(/\/orcamentos\/novo$/)

    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]{36}$/, { timeout: 15_000 })
  })

  test('CT-1107-02 — estoque suficiente cria direto, sem aviso', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA1107-Ok-${Date.now()}`, 10)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1107-ClienteOk-${Date.now()}`)
    clienteIds.push(cliente.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await adicionarItemAvulso(page, produto.nome, 2)
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]{36}$/, { timeout: 15_000 })
  })
})
