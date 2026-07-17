import { Page, expect } from '@playwright/test'

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
