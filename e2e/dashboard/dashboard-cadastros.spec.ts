import { test, expect } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

/** V0.17.0 — #607 (RN-NOVA-15 e 16): CEN-NOVO-32 (menu), 33 (preço abaixo do sugerido) e 36/37 (margem e estado vazio) pela tela. */
test('V0.17.0 — menu com os grupos Cadastros e Vendas; item e grupo destacados', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')

  const cadastros = page.getByRole('button', { name: 'Cadastros', exact: true })
  await expect(cadastros).toHaveAttribute('aria-expanded', 'true')
  const nav = page.getByRole('navigation')
  const nomes = await nav.getByRole('link').allInnerTexts()
  const iCadastros = nomes.indexOf('Insumos')
  expect(nomes.slice(iCadastros - 1, iCadastros + 3).map(n => n.trim())).toEqual(['Dashboard', 'Insumos', 'Produtos', 'Catálogos'])
  expect(nomes.map(n => n.trim()).filter(n => n === 'Catálogos')).toHaveLength(1)
  const iVendas = nomes.map(n => n.trim()).indexOf('Caixa')
  expect(nomes.slice(iVendas - 1, iVendas + 2).map(n => n.trim())).toEqual(['Dashboard', 'Caixa', 'Orçamentos'])

  await nav.getByRole('link', { name: 'Insumos', exact: true }).click()
  await expect(page).toHaveURL(/\/insumos/)
  await expect(page.getByRole('button', { name: 'Cadastros', exact: true })).toHaveAttribute('data-grupo-ativo', 'true')
})

test('V0.17.0 — Dashboard de Cadastros: preço abaixo do sugerido, margem e estados vazios sem erro', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  const insumo = await criarInsumo(request, token, `QA607-insumo-${sufixo}`)
  const produto = await request.post(`${API_URL}/produtos`, {
    headers, data: { nome: `QA607-produto-${sufixo}`, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 1,
      fichaTecnica: [{ insumoId: insumo.id, quantidade: 1 }] },
  })
  expect(produto.ok(), await produto.text()).toBeTruthy()

  await login(page)
  await page.goto('/dashboard')
  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).last().click()
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard de cadastros' })).toBeVisible()

  const abaixo = page.getByTestId('ind-preco-abaixo-sugerido')
  await expect(abaixo).toContainText(`QA607-produto-${sufixo}`)
  const margem = page.getByTestId('ind-margem')
  await expect(margem).toContainText(`QA607-produto-${sufixo}`)

  // sem vendas nem compras no período: estados vazios, nenhum erro
  await expect(page.getByTestId('ind-produto-mais-vendido')).toContainText('Sem dados no período')
  await expect(page.getByTestId('ind-curva-abc')).toContainText('Sem lucro no período')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
