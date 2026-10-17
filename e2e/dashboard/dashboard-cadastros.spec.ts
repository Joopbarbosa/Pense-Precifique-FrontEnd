import { test, expect } from '@playwright/test'
import { login, loginComoEmail, API_URL } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

/** V0.17.0 — #607 (RN-NOVA-15 e 16): CEN-NOVO-32 (menu), 33 (preço abaixo do sugerido) e 36/37 (margem e estado vazio) pela tela. */
test('V0.17.0 — menu com os grupos Cadastros e Vendas; item e grupo destacados', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')

  // V0.17.0 #963 (CEN-NOVO-55): recolhido ao entrar; a verificação dos itens vem depois de abrir o grupo
  const cadastros = page.getByRole('button', { name: 'Cadastros', exact: true })
  await expect(cadastros).toHaveAttribute('aria-expanded', 'false')
  await cadastros.click()
  await expect(cadastros).toHaveAttribute('aria-expanded', 'true')
  const nav = page.getByRole('navigation')
  const nomes = await nav.getByRole('link').allInnerTexts()
  const iCadastros = nomes.indexOf('Insumos')
  expect(nomes.slice(iCadastros - 1, iCadastros + 3).map(n => n.trim())).toEqual(['Dashboard', 'Insumos', 'Produtos', 'Catálogos'])
  expect(nomes.map(n => n.trim()).filter(n => n === 'Catálogos')).toHaveLength(1)
  const vendas = page.getByRole('button', { name: 'Vendas', exact: true })
  await vendas.click()
  await expect(vendas).toHaveAttribute('aria-expanded', 'true')
  const nomesComVendas = (await nav.getByRole('link').allInnerTexts()).map(n => n.trim())
  const iVendas = nomesComVendas.indexOf('Caixa')
  expect(nomesComVendas.slice(iVendas - 1, iVendas + 2)).toEqual(['Dashboard', 'Caixa', 'Orçamentos'])

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
  // V0.17.0 #963: grupo Cadastros recolhido ao entrar — abre o grupo e clica no link pelo destino
  await page.getByRole('button', { name: 'Cadastros', exact: true }).click()
  await page.locator('a[href="/cadastros/dashboard"]').click()
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard de cadastros' })).toBeVisible()

  const abaixo = page.getByTestId('ind-preco-abaixo-sugerido')
  await expect(abaixo).toContainText(`QA607-produto-${sufixo}`)
  const margem = page.getByTestId('ind-margem')
  await expect(margem).toContainText(`QA607-produto-${sufixo}`)

  await expect(page.getByRole('alert')).toHaveCount(0)
})

// conta descartável: a conta principal acumula vendas de outros specs, então o estado vazio só é garantido numa conta nova
test('V0.17.0 — Dashboard de Cadastros: sem vendas nem compras no período mostra estados vazios sem erro', async ({ page, request }) => {
  const email = `e2e-cadastros-vazio-${Date.now()}@teste.com`
  const reg = await request.post(`${API_URL}/auth/register`, { data: { email, senha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' } })
  expect(reg.ok(), await reg.text()).toBeTruthy()
  await loginComoEmail(page, email, 'SenhaValida123')
  await page.goto('/cadastros/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard de cadastros' })).toBeVisible()
  await expect(page.getByTestId('ind-produto-mais-vendido')).toContainText('Sem dados no período')
  await expect(page.getByTestId('ind-curva-abc')).toContainText('Sem lucro no período')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
