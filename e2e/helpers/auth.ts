import { APIRequestContext, Page, expect } from '@playwright/test'

export const TEST_EMAIL = 'penseprecifique@admin.com'
export const TEST_SENHA = 'senha12345'
export const API_URL = 'http://localhost:8080'

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('seuemail@email.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('Sua senha').fill(TEST_SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

/**
 * Registra uma empresa/usuário efêmero via `POST /auth/register` (`CadastroRequestDTO`:
 * email/senha/confirmarSenha) — usado por specs de segurança (IDOR) que precisam de uma
 * 2ª empresa isolada, nunca reaproveitando a única conta fixa (`TEST_EMAIL`) para os dois
 * papéis de uma matriz "atacante x vítima".
 */
export async function registrarEmpresaEfemera(request: APIRequestContext, prefixo: string) {
  const email = `${prefixo}-${Date.now()}@example.com`
  const senha = 'senha12345'
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, senha, confirmarSenha: senha },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao registrar empresa efêmera de teste: ${res.status()} ${await res.text()}`)
  }
  const body = await res.json()
  return { token: body.token as string, email, usuarioId: body.usuarioId as string }
}

export async function loginComoEmail(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.getByPlaceholder('seuemail@email.com').fill(email)
  await page.getByPlaceholder('Sua senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/onboarding|\/dashboard/, { timeout: 15_000 })

  // ProtectedRoute decide onboarding vs dashboard de forma assíncrona (GET /configuracoes/precificacao);
  // aguarda essa checagem resolver antes de decidir se precisa completar o onboarding.
  await page.waitForTimeout(1500)

  if (page.url().includes('/onboarding')) {
    await page.getByPlaceholder('25,00').fill('25')
    await page.getByPlaceholder('40').fill('40')
    await page.getByRole('button', { name: /Começar a usar o sistema/ }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  }
}
