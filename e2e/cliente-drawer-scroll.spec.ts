import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
/**
 * Cenário 160 — Scroll trava ao abrir drawer de clientes (#95)
 *
 * Dado que a artesã abre o drawer de clientes
 * Então o scroll da página fica travado (body.overflow = hidden)
 * Quando ela fecha o drawer
 * Então o scroll volta ao normal (overflow = visible)
 */
test.describe('Cenário 160 — Scroll trava ao abrir drawer de clientes (#95)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/clientes')
  })

  test('body.overflow trava ao abrir o drawer e libera ao fechar', async ({ page }) => {
    const overflow = () => page.evaluate(() => getComputedStyle(document.body).overflow)

    await expect(page.locator('body')).not.toHaveClass(/drawer-open/)
    await expect.poll(overflow).toBe('visible')

    await page.getByRole('button', { name: 'Nova Cliente' }).click()
    await expect(page.locator('body')).toHaveClass(/drawer-open/)
    await expect.poll(overflow).toBe('hidden')

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('body')).not.toHaveClass(/drawer-open/)
    await expect.poll(overflow).toBe('visible')
  })
})
