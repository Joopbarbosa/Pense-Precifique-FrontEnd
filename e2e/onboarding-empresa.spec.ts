import { test, expect, type Page } from '@playwright/test'
import { API_URL } from './helpers/auth'

/**
 * #339 (V0.17.0) — cadastro grava o nome da empresa e o onboarding tem dois passos
 * (RN-NOVA-3, CEN-NOVO-5 a 9). Contas descartáveis; o logo de teste é uma imagem mínima.
 */
const SENHA = 'SenhaValida123'
// PNG mínimo (1x1), montado em memória — sem arquivo externo
const LOGO = {
  name: 'logo.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
}

async function cadastrarPelaTela(page: Page, empresa: string) {
  const email = `e2e-onb-${Date.now()}-${Math.floor(Math.random() * 1000)}@teste.com`
  await page.goto('/cadastro')
  await page.getByPlaceholder('Seu nome').fill('Ana')
  await page.getByPlaceholder('Ex: Ateliê da Ana').fill(empresa)
  await page.getByPlaceholder('seuemail@email.com').fill(email)
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(SENHA)
  await page.getByPlaceholder('Repita a senha').fill(SENHA)
  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
  return email
}

async function entrar(page: Page, email: string) {
  await page.goto('/login')
  await page.getByPlaceholder('seuemail@email.com').fill(email)
  await page.getByPlaceholder('Sua senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('#339 — cadastro e onboarding da empresa', () => {
  test('CEN-NOVO-5 — o nome digitado no cadastro volta preenchido no onboarding', async ({ page }) => {
    const email = await cadastrarPelaTela(page, 'Ateliê da Ana')
    await expect(page.getByPlaceholder('Nome do seu ateliê')).toHaveValue('Ateliê da Ana')
    // sai antes de terminar e entra de novo
    await page.evaluate(() => localStorage.clear())
    await entrar(page, email)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    await expect(page.getByPlaceholder('Nome do seu ateliê')).toHaveValue('Ateliê da Ana')
    // o e-mail de acesso vem sugerido como contato
    await expect(page.getByPlaceholder('contato@seuatelie.com')).toHaveValue(email)
  })

  test('CEN-NOVO-6 — onboarding grava empresa, contato, telefone e logo e aparecem em Configurações', async ({ page }) => {
    await cadastrarPelaTela(page, 'Ateliê da Ana')
    await page.getByPlaceholder('contato@seuatelie.com').fill('contato@ateliedaana.com')
    await page.getByPlaceholder('(00) 00000-0000').fill('(11) 91234-5678')
    await page.getByLabel('Arquivo do logo').setInputFiles(LOGO)
    await page.getByRole('button', { name: 'Avançar' }).click()

    await page.getByPlaceholder('25,00').fill('25')
    await page.getByPlaceholder('40').fill('40')
    await page.getByRole('button', { name: /Começar a usar o sistema/ }).click()
    await expect(page).toHaveURL(/\/agenda/, { timeout: 15_000 })

    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await expect(page.getByPlaceholder('email@contato.com')).toHaveValue('contato@ateliedaana.com')
    await expect(page.getByPlaceholder('(00) 00000-0000')).toHaveValue('(11) 91234-5678')
    await expect(page.getByRole('img', { name: 'Logo' }).first()).toBeVisible()
  })

  test('CEN-NOVO-7 — só com o nome da empresa o passo é aceito', async ({ page }) => {
    await cadastrarPelaTela(page, 'Ateliê Só Nome')
    await page.getByPlaceholder('contato@seuatelie.com').fill('')
    await page.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.getByPlaceholder('25,00')).toBeVisible()
  })

  test('CEN-NOVO-8 — nome vazio ou e-mail de contato inválido bloqueiam o passo', async ({ page }) => {
    await cadastrarPelaTela(page, 'Ateliê da Ana')
    await page.getByPlaceholder('Nome do seu ateliê').fill('')
    await page.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.getByText('Informe o nome do seu ateliê')).toBeVisible()

    await page.getByPlaceholder('Nome do seu ateliê').fill('Ateliê da Ana')
    await page.getByPlaceholder('contato@seuatelie.com').fill('contato.ateliedaana.com')
    await page.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.getByText('E-mail inválido')).toBeVisible()
    await expect(page.getByPlaceholder('25,00')).toHaveCount(0)
  })

  test('CEN-NOVO-9 — sair no meio e voltar: passo 1 preenchido e demais telas bloqueadas', async ({ page }) => {
    const email = await cadastrarPelaTela(page, 'Ateliê da Ana')
    await page.getByPlaceholder('contato@seuatelie.com').fill('contato@ateliedaana.com')
    await page.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.getByPlaceholder('25,00')).toBeVisible()

    await page.evaluate(() => localStorage.clear())
    await entrar(page, email)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    await expect(page.getByPlaceholder('contato@seuatelie.com')).toHaveValue('contato@ateliedaana.com')
    await page.goto('/agenda')
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
  })

  test('conta antiga sem Empresa conclui o onboarding pelo passo 1', async ({ page, request }) => {
    const email = `e2e-onb-legado-${Date.now()}@teste.com`
    const reg = await request.post(`${API_URL}/auth/register`, { data: { email, senha: SENHA, confirmarSenha: SENHA } })
    expect(reg.ok()).toBeTruthy()
    await entrar(page, email)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    await expect(page.getByPlaceholder('Nome do seu ateliê')).toHaveValue('')
    await page.getByPlaceholder('Nome do seu ateliê').fill('Ateliê Legado')
    await page.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.getByPlaceholder('25,00')).toBeVisible()
  })
})
