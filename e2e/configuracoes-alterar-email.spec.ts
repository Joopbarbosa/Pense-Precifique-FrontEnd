import { test, expect, type Page } from '@playwright/test'
import { loginComoEmail, API_URL } from './helpers/auth'

/**
 * #334 (V0.17.0) — e-mail de acesso na aba Conta (RN-NOVA-1, RN-NOVA-2, CEN-NOVO-1 a 4).
 */
const SENHA = 'SenhaValida123'

async function criarConta(request: import('@playwright/test').APIRequestContext, prefixo: string) {
  const email = `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1000)}@teste.com`
  const reg = await request.post(`${API_URL}/auth/register`, { data: { email, senha: SENHA, confirmarSenha: SENHA } })
  if (!reg.ok()) throw new Error(`Falha ao criar conta: ${reg.status()} ${await reg.text()}`)
  return email
}

async function abrirConta(page: Page) {
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Conta' }).click()
}

async function trocar(page: Page, novo: string, senha: string) {
  await page.getByRole('button', { name: 'Alterar e-mail' }).click()
  await page.getByPlaceholder('novo@email.com').fill(novo)
  await page.getByPlaceholder('Confirme com sua senha').fill(senha)
  await page.getByRole('dialog').getByRole('button', { name: 'Alterar e-mail' }).click()
}

test.describe('#334 — e-mail de acesso', () => {
  test('CEN-NOVO-1 — aba Conta mostra o e-mail real, somente leitura', async ({ page, request }) => {
    const email = await criarConta(request, 'e2e-email-real')
    await loginComoEmail(page, email, SENHA)
    await abrirConta(page)
    const campo = page.locator('input[readonly]').first()
    await expect(campo).toHaveValue(email)
  })

  test('CEN-NOVO-2 — troca com sucesso mantém a sessão e o login passa a ser com o e-mail novo', async ({ page, request }) => {
    const email = await criarConta(request, 'e2e-email-troca')
    const novo = email.replace('@', '.nova@')
    await loginComoEmail(page, email, SENHA)
    await abrirConta(page)

    const resposta = page.waitForResponse(r => r.url().includes('/usuarios/me/email') && r.request().method() === 'PUT')
    await trocar(page, novo, SENHA)
    expect((await resposta).status()).toBe(200)

    await expect(page.getByText('E-mail de acesso alterado')).toBeVisible()
    await expect(page.locator('input[readonly]').first()).toHaveValue(novo)
    // continua logada: recarrega e segue em Configurações
    await page.reload()
    await expect(page).toHaveURL(/\/configuracoes/)

    // login com o e-mail antigo é recusado; com o novo funciona
    const antigo = await request.post(`${API_URL}/auth/login`, { data: { email, senha: SENHA } })
    expect(antigo.status()).toBe(400)
    const atual = await request.post(`${API_URL}/auth/login`, { data: { email: novo, senha: SENHA } })
    expect(atual.status()).toBe(200)
  })

  test('CEN-NOVO-3 — senha atual incorreta bloqueia e o e-mail não muda', async ({ page, request }) => {
    const email = await criarConta(request, 'e2e-email-senha')
    await loginComoEmail(page, email, SENHA)
    await abrirConta(page)
    await trocar(page, email.replace('@', '.x@'), '123')
    await expect(page.getByRole('alert')).toHaveText('Senha atual incorreta')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('input[readonly]').first()).toHaveValue(email)
  })

  test('CEN-NOVO-4 — e-mail de outra conta, igual ao atual ou inválido bloqueiam', async ({ page, request }) => {
    const outra = await criarConta(request, 'e2e-email-outra')
    const email = await criarConta(request, 'e2e-email-bloqueio')
    await loginComoEmail(page, email, SENHA)
    await abrirConta(page)

    await trocar(page, outra, SENHA)
    await expect(page.getByRole('alert')).toHaveText('E-mail já cadastrado')

    await page.getByPlaceholder('novo@email.com').fill(email)
    await page.getByRole('dialog').getByRole('button', { name: 'Alterar e-mail' }).click()
    await expect(page.getByRole('alert')).toHaveText('O novo e-mail precisa ser diferente do atual')

    await page.getByPlaceholder('novo@email.com').fill('ana.studio.com')
    await page.getByRole('dialog').getByRole('button', { name: 'Alterar e-mail' }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail inválido')

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('input[readonly]').first()).toHaveValue(email)
  })
})
