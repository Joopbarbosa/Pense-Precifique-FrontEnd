import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, selecionarCliente } from '../helpers/orcamento'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

void E2E_API_URL

/**
 * OpenProject #1104 — a calculadora de preço do orçamento ganha o campo Quantidade (primeiro campo, nasce em 1);
 * custo dos insumos, mão de obra, margem e sugerido acompanham a quantidade, e o item entra com a quantidade informada.
 */
test.describe('#1104 — calculadora de preço com Quantidade', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })
  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  const moeda = (t: string) => parseFloat(t.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'))

  async function lerLinha(page: import('@playwright/test').Page, rotulo: string) {
    const texto = await page.getByText(rotulo, { exact: false }).first().locator('xpath=ancestor::div[contains(@class,"justify-between")][1]').innerText()
    return moeda(texto.split('\n').filter(l => l.includes('R$')).pop() as string)
  }

  test('CT-1104-01 — Quantidade nasce em 1 e escala custo, mão de obra, margem e sugerido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const insumo = await criarInsumoComEstoque(request, token, `QA-1104-Insumo-${ts}`, 100)
    produtoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, `QA-1104-Produto-${ts}`, [{ insumoId: insumo.id, quantidade: 1 }])
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-1104-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder(/Buscar (produto|item)/).fill(produto.nome)
    await page.getByText(produto.nome, { exact: true }).click()

    const qtd = page.getByTestId('calculadora-quantidade')
    await expect(qtd).toHaveValue('1')
    const insumos1 = await lerLinha(page, 'Custo dos insumos')
    const sugerido1 = moeda(await page.getByText('PREÇO SUGERIDO').locator('xpath=following-sibling::div[1]').innerText())
    const final1 = moeda(await page.getByText('Preço final de venda', { exact: true }).locator('xpath=following-sibling::div[1]//input').inputValue())
    expect(insumos1).toBeGreaterThan(0)

    await qtd.fill('3')
    expect(await lerLinha(page, 'Custo dos insumos')).toBeCloseTo(insumos1 * 3, 1)
    const sugerido3 = moeda(await page.getByText('PREÇO SUGERIDO').locator('xpath=following-sibling::div[1]').innerText())
    expect(sugerido3).toBeCloseTo(sugerido1 * 3, 1)
    const final3 = moeda(await page.getByText('Preço final de venda', { exact: true }).locator('xpath=following-sibling::div[1]//input').inputValue())
    expect(final3).toBeCloseTo(final1 * 3, 1)

    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()
    await expect(page.getByText(produto.nome, { exact: true })).toBeVisible()
    await expect(page.locator('input[value="3"]').first()).toBeVisible()
  })

  test('CT-1104-02 — quantidade vazia ou zero bloqueia a confirmação', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const insumo = await criarInsumoComEstoque(request, token, `QA-1104b-Insumo-${ts}`, 100)
    produtoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, `QA-1104b-Produto-${ts}`, [{ insumoId: insumo.id, quantidade: 1 }])
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-1104b-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder(/Buscar (produto|item)/).fill(produto.nome)
    await page.getByText(produto.nome, { exact: true }).click()

    const qtd = page.getByTestId('calculadora-quantidade')
    await qtd.fill('')
    await expect(page.getByRole('button', { name: 'Adicionar ao orçamento' })).toBeDisabled()
    await qtd.fill('0')
    await expect(page.getByRole('button', { name: 'Adicionar ao orçamento' })).toBeDisabled()
    await qtd.fill('abc')
    await expect(qtd).toHaveValue('')
  })

  test('CT-1154-01 — preço unitário sempre visível e botão "Ver produto" em nova aba', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const insumo = await criarInsumoComEstoque(request, token, `QA-1154-Insumo-${ts}`, 100)
    produtoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, `QA-1154-Produto-${ts}`, [{ insumoId: insumo.id, quantidade: 1 }])
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-1154-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder(/Buscar (produto|item)/).fill(produto.nome)
    await page.getByText(produto.nome, { exact: true }).click()

    const unitario = page.getByTestId('calculadora-preco-unitario')
    await expect(unitario).toBeVisible()
    const final1 = moeda(await page.getByText('Preço final de venda', { exact: true }).locator('xpath=following-sibling::div[1]//input').inputValue())
    expect(moeda((await unitario.innerText()).replace('Preço unitário', ''))).toBeCloseTo(final1, 2)

    await page.getByTestId('calculadora-quantidade').fill('4')
    expect(moeda((await unitario.innerText()).replace('Preço unitário', ''))).toBeCloseTo(final1, 2)

    const ver = page.getByTestId('calculadora-ver-produto')
    await expect(ver).toHaveAttribute('href', `/produtos/${produto.id}`)
    await expect(ver).toHaveAttribute('target', '_blank')
  })
})
