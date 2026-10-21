import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * OpenProject #501 (V0.12.0) — grupo "Vendas" recolhível na sidebar (CEN-NOVO-37, com a correção
 * visual de CEN-NOVO-44). V0.17.0 #963 (RN-NOVA-18, CEN-NOVO-55): os grupos abrem recolhidos ao
 * entrar e ao atualizar a página; dentro da sessão, o estado é mantido ao navegar (estado em
 * memória, não no navegador).
 */
test.describe('#501 / #963 — Grupo "Vendas" recolhível na sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
  })

  test('recolhido ao entrar, abre ao clicar, mantém na navegação e volta recolhido ao atualizar', async ({ page }) => {
    const grupo = page.getByRole('button', { name: 'Vendas', exact: true })

    // CEN-NOVO-55: recolhido ao entrar, sem os links do grupo
    await expect(grupo).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toHaveCount(0)

    await grupo.click()
    await expect(grupo).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Orçamentos', exact: true })).toBeVisible()

    // Navega para outra tela sem atualizar: o menu remonta, mas o estado da sessão é mantido
    await page.getByRole('link', { name: 'Clientes e Fornecedores', exact: true }).click()
    await expect(page).toHaveURL(/\/clientes/)
    await expect(page.getByRole('button', { name: 'Vendas', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toBeVisible()

    // Atualizar a página zera: volta recolhido
    await page.reload()
    await expect(page.getByRole('button', { name: 'Vendas', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: 'Caixa', exact: true })).toHaveCount(0)
  })
})
