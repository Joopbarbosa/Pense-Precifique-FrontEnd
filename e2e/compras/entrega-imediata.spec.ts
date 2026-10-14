import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

/** V0.17.0 — #957 (RN-NOVA-4), CEN-NOVO-10: "Entrega imediata?" nasce em Sim e a previsão só aparece em Não. */
test('V0.17.0 — Entrega imediata abre em Sim; Não mostra a previsão vazia e obrigatória', async ({ page }) => {
  await login(page)
  await page.goto('/compras/nova')

  await expect(page.getByLabel('Previsão de entrega')).toHaveCount(0)
  // O primeiro "Sim" da tela é o de "Entrega imediata?" (vem antes de "Mais de um fornecedor?")
  await expect(page.getByRole('button', { name: 'Sim', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')

  await page.getByText('Entrega imediata?').locator('..').getByRole('button', { name: 'Não', exact: true }).click()
  const previsao = page.getByLabel('Previsão de entrega')
  await expect(previsao).toBeVisible()
  await expect(previsao).toHaveValue('')

  await page.getByText('Entrega imediata?').locator('..').getByRole('button', { name: 'Sim', exact: true }).click()
  await expect(page.getByLabel('Previsão de entrega')).toHaveCount(0)
})
