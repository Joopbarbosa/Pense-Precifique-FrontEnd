import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'
import {
  apiAbrirTurno, apiFecharTurnoSeAberto, apiMetodoPagamentoPorTipo,
  apiCriarProdutoComEstoque, apiBuscarProduto,
} from '../helpers/caixa'

/**
 * OpenProject #487 (V0.12.0) — venda de balcão no Caixa/PDV (RN-NOVA-1/2/3/7/10/11,
 * CEN-NOVO-1/2/3/6/7/8/9, UC-NOVO-1).
 */

test.describe('#487 — Venda rápida no Caixa', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(async ({ request }) => {
    criadosProdutoIds = []
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    await apiFecharTurnoSeAberto(request, token)
  })

  test('CEN-NOVO-1 — venda concluída com sucesso, baixa estoque e calcula troco', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-487-Venda-${Date.now()}`
    const produto = await apiCriarProdutoComEstoque(request, token, nome, 20.00, 10, true)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/caixa')

    await page.getByPlaceholder('Buscar produto por nome ou código de barras...').fill(nome)
    await page.getByRole('button', { name: new RegExp(nome) }).click()

    const dinheiro = page.locator('text=Dinheiro').locator('xpath=following-sibling::div[1]//input')
    await dinheiro.fill('50,00')

    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()
    await expect(page.getByText('R$ 30,00', { exact: true })).toBeVisible() // troco: 50 - 20

    const produtoAtualizado = await apiBuscarProduto(request, token, produto.id)
    expect(produtoAtualizado.estoqueAtual).toBe(9)
  })

  test('CEN-NOVO-2 — estoque insuficiente com permitirEstoqueNegativo=false bloqueia a venda', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-487-Bloqueio-${Date.now()}`
    const produto = await apiCriarProdutoComEstoque(request, token, nome, 5.00, 1, false)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/caixa')

    await page.getByPlaceholder('Buscar produto por nome ou código de barras...').fill(nome)
    await page.getByRole('button', { name: new RegExp(nome) }).click()
    await page.getByRole('button', { name: `Aumentar quantidade de ${nome}` }).click() // quantidade 2

    const dinheiro = page.locator('text=Dinheiro').locator('xpath=following-sibling::div[1]//input')
    await dinheiro.fill('20,00')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText(/Estoque insuficiente/)).toBeVisible()
    const produtoInalterado = await apiBuscarProduto(request, token, produto.id)
    expect(produtoInalterado.estoqueAtual).toBe(1)
  })

  test('CEN-NOVO-3 — estoque insuficiente com aviso permite confirmar e concluir', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-487-Aviso-${Date.now()}`
    const produto = await apiCriarProdutoComEstoque(request, token, nome, 5.00, 1, true)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/caixa')

    await page.getByPlaceholder('Buscar produto por nome ou código de barras...').fill(nome)
    await page.getByRole('button', { name: new RegExp(nome) }).click()
    await page.getByRole('button', { name: `Aumentar quantidade de ${nome}` }).click() // quantidade 2

    const dinheiro = page.locator('text=Dinheiro').locator('xpath=following-sibling::div[1]//input')
    await dinheiro.fill('20,00')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText('Estoque ficará negativo')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar e concluir venda' }).click()

    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()
    const produtoAtualizado = await apiBuscarProduto(request, token, produto.id)
    expect(produtoAtualizado.estoqueAtual).toBe(-1)
  })

  test('CEN-NOVO-9 — pagamento excedente sem linha em dinheiro é bloqueado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-487-TrocoSemDinheiro-${Date.now()}`
    const produto = await apiCriarProdutoComEstoque(request, token, nome, 10.00, 10, true)
    criadosProdutoIds.push(produto.id)
    const pix = await apiMetodoPagamentoPorTipo(request, token, 'PIX')

    await login(page)
    await page.goto('/caixa')
    await page.getByPlaceholder('Buscar produto por nome ou código de barras...').fill(nome)
    await page.getByRole('button', { name: new RegExp(nome) }).click()

    const pixInput = page.locator('text=Pix', { exact: true }).locator('xpath=following-sibling::div[1]//input')
    await pixInput.fill('15,00')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText('Não é possível dar troco fora de dinheiro.')).toBeVisible()
    void pix
  })

  test('CEN-NOVO-6/7 — cancelamento reverte estoque; some some após turno fechado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-487-Cancelar-${Date.now()}`
    const produto = await apiCriarProdutoComEstoque(request, token, nome, 8.00, 10, true)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/caixa')
    await page.getByPlaceholder('Buscar produto por nome ou código de barras...').fill(nome)
    await page.getByRole('button', { name: new RegExp(nome) }).click()
    const dinheiro = page.locator('text=Dinheiro').locator('xpath=following-sibling::div[1]//input')
    await dinheiro.fill('8,00')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()
    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()

    const produtoPosVenda = await apiBuscarProduto(request, token, produto.id)
    expect(produtoPosVenda.estoqueAtual).toBe(9)

    await page.getByRole('button', { name: 'Nova venda' }).click()
    await page.getByRole('button', { name: 'Vendas do turno' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByLabel('Motivo do cancelamento').fill('Cliente desistiu da compra no balcão')
    await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()

    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible()

    const produtoPosCancelamento = await apiBuscarProduto(request, token, produto.id)
    expect(produtoPosCancelamento.estoqueAtual).toBe(10)
  })
})
