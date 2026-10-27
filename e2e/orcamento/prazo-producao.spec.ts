import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { apiLogin } from '../helpers/api'
import { login } from '../helpers/auth'
import { adicionarItemAvulso, criarCliente, criarOrcamentoViaApi, selecionarCliente } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

test.describe('#386 — Prazo de produção', () => {
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

  test('CEN-NOVO-21 (revisado #1111) — prazo novo inicia em Não e edição mostra o prazo salvo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA386-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA386-Cliente-${Date.now()}`)
    clienteIds.push(cliente.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    const prazo = page.locator('input[type="number"][placeholder="10"]')
    // #1111 — "Vai ter prazo de produção?" nasce em Não (sem campo de prazo); Sim abre o campo com 1 dia.
    await expect(prazo).toHaveCount(0)
    await page.getByRole('button', { name: 'Sim', exact: true }).first().click()
    await expect(prazo).toHaveValue('1')
    await prazo.fill('3')
    await expect(prazo).toHaveAttribute('min', '1')

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 50, margemAplicada: 0, quantidade: 1 },
    ], { temPrazoProducao: true, prazoProducaoDias: 7 })
    await page.goto(`/orcamentos/${orcamento.id}/editar`)
    await expect(page.getByRole('heading', { name: 'Editar Orçamento' })).toBeVisible()
    await expect(prazo).toHaveValue('7')
  })

  test('CEN-NOVO-22 — prazo apagado impede salvar com a mensagem definida', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA386-Negativo-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA386-Negativo-${Date.now()}`)
    clienteIds.push(cliente.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await adicionarItemAvulso(page, produto.nome, 1)
    await page.getByRole('button', { name: 'Sim', exact: true }).first().click()
    await page.locator('input[type="number"][placeholder="10"]').fill('')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await expect(page.getByText('Prazo obrigatório, mínimo 1 dia', { exact: true })).toBeVisible()
  })
})
