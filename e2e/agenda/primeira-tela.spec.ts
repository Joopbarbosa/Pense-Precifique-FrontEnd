import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

/**
 * #1040 (V0.18.0, RN-NOVA-1) — a Agenda é a primeira tela e o Dashboard geral deixou de existir. CEN-NOVO-1 e 2.
 */
test.describe('#1040 — Agenda no lugar do Dashboard geral', () => {
  test('CT-1040-01 — depois do login a usuária chega na Agenda, que é o primeiro item do menu', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/agenda$/)
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
    const primeiro = page.locator('aside a, nav a').first()
    await expect(primeiro).toContainText('Agenda')
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)
  })

  test('CT-1040-02 — o endereço antigo /dashboard cai na Agenda', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/agenda$/)
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  })

  test('CT-1040-03 — os dashboards de Vendas, Cadastros e Compras seguem abrindo', async ({ page }) => {
    await login(page)
    for (const rota of ['/vendas/dashboard', '/cadastros/dashboard', '/compras/dashboard']) {
      await page.goto(rota)
      await expect(page).toHaveURL(new RegExp(`${rota}$`))
      await expect(page.getByTestId('botao-ajuda').first()).toBeVisible({ timeout: 15_000 })
    }
  })
})
