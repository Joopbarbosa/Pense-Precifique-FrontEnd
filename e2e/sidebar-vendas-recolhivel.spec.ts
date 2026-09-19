import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * OpenProject #501 (V0.12.0) — grupo "Vendas" recolhível na sidebar (CEN-NOVO-37, com a correção
 * visual de CEN-NOVO-44: o cabeçalho segue o mesmo padrão dos demais itens de navegação — ícone,
 * mesma fonte, sem caixa alta — só ganha a seta de expandir/recolher). Expandido por padrão;
 * recolhido, some do DOM (não só `hidden`); a preferência sobrevive à navegação porque o
 * `AppLayout` remonta a cada rota (persistida em localStorage).
 */
test.describe('#501 — Grupo "Vendas" recolhível na sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
  })

  test('expandido por padrão, recolhe ao clicar, e a preferência sobrevive à navegação', async ({ page }) => {
    const grupo = page.getByRole('button', { name: 'Vendas', exact: true })

    await expect(grupo).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Orçamentos', exact: true })).toBeVisible()

    await grupo.click()
    await expect(grupo).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Orçamentos', exact: true })).toHaveCount(0)

    // Navega para outra tela — o AppLayout remonta, a preferência precisa vir do localStorage
    await page.getByRole('link', { name: 'Produtos', exact: true }).click()
    await expect(page).toHaveURL(/\/produtos/)
    await expect(page.getByRole('button', { name: 'Vendas', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toHaveCount(0)

    // Expande de novo — some da tela seguinte também não reseta pra expandido
    await page.getByRole('button', { name: 'Vendas', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toBeVisible()
  })
})
