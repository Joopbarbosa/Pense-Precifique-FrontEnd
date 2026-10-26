import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/** #1105 — o detalhe do orçamento mostra "Sinal até" no cartão do sinal, só quando a data foi informada. */
test.describe('#1105 — Sinal até no detalhe do orçamento', () => {
  const produtoIds: string[] = []

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds.splice(0)) await inativarProduto(request, token, id)
  })

  async function criar(request: import('@playwright/test').APIRequestContext, sinalAte?: string) {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA1105-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1105-Cliente-${Date.now()}`)
    return criarOrcamentoViaApi(
      request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 2 }],
      { sinalAtivo: true, percentualSinal: 30, ...(sinalAte ? { sinalAte } : {}) }
    )
  }

  test('CT-1105-01 (positivo) — com a data informada, o detalhe mostra "Sinal até dd/mm/aaaa"', async ({ page, request }) => {
    const futuro = new Date()
    futuro.setDate(futuro.getDate() + 10)
    const iso = `${futuro.getFullYear()}-${String(futuro.getMonth() + 1).padStart(2, '0')}-${String(futuro.getDate()).padStart(2, '0')}`
    const br = `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    const orc = await criar(request, iso)

    await login(page)
    await page.goto(`/orcamentos/${orc.id}`)

    await expect(page.getByTestId('detalhe-sinal-ate')).toHaveText(`Sinal até ${br}`)
  })

  test('CT-1105-02 (negativo) — sem a data, a linha "Sinal até" não aparece', async ({ page, request }) => {
    const orc = await criar(request)

    await login(page)
    await page.goto(`/orcamentos/${orc.id}`)

    await expect(page.getByText('Aguardando Sinal')).toBeVisible()
    await expect(page.getByTestId('detalhe-sinal-ate')).toHaveCount(0)
  })
})
