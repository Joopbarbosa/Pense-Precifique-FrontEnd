import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, selecionarCliente } from '../helpers/orcamento'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

void E2E_API_URL

/**
 * OpenProject #1161 (RN-NOVA-34, CEN-NOVO-126 e 127; altera #1104 e #1154) — a calculadora de preço do orçamento não tem campo de
 * quantidade: o item entra sempre com 1 e os valores são por unidade. A janela cabe na tela sem rolagem e "Ver produto" fica no
 * rodapé, à esquerda de "Cancelar", abrindo o produto em outra aba.
 */
test.describe('#1161 — calculadora de preço sem quantidade', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })
  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  async function abrirCalculadora(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, prefixo: string) {
    const token = await apiLogin(request)
    const ts = Date.now()
    const insumo = await criarInsumoComEstoque(request, token, `${prefixo}-Insumo-${ts}`, 100)
    produtoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, `${prefixo}-Produto-${ts}`, [{ insumoId: insumo.id, quantidade: 1 }])
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${prefixo}-Cliente-${ts}`)
    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder(/Buscar (produto|item)/).fill(produto.nome)
    await page.getByText(produto.nome, { exact: true }).click()
    return produto
  }

  test('CT-1161-01 / CEN-NOVO-126 — a calculadora não tem campo de quantidade e o item entra com 1', async ({ page, request }) => {
    const produto = await abrirCalculadora(page, request, 'QA-1161a')
    await expect(page.getByText('Preço final de venda', { exact: true })).toBeVisible()
    await expect(page.getByTestId('calculadora-quantidade')).toHaveCount(0)
    await expect(page.getByTestId('calculadora-preco-unitario')).toHaveCount(0)

    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()
    await expect(page.getByText(produto.nome, { exact: true })).toBeVisible()
    await expect(page.locator('input[value="1"]').first()).toBeVisible()
  })

  test('CT-1161-02 / CEN-NOVO-127 — sem rolagem e "Ver produto" à esquerda de "Cancelar", em nova aba', async ({ page, request }) => {
    const produto = await abrirCalculadora(page, request, 'QA-1161b')
    const corpo = page.getByText('Preço final de venda', { exact: true }).locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]')
    const rolagem = await corpo.evaluate(el => el.scrollHeight - el.clientHeight)
    expect(rolagem).toBeLessThanOrEqual(0)

    const ver = page.getByTestId('calculadora-ver-produto')
    await expect(ver).toHaveAttribute('href', `/produtos/${produto.id}`)
    await expect(ver).toHaveAttribute('target', '_blank')
    const caixaVer = await ver.boundingBox()
    const caixaCancelar = await page.getByRole('button', { name: 'Cancelar', exact: true }).boundingBox()
    expect(caixaVer!.x).toBeLessThan(caixaCancelar!.x)
  })
})
