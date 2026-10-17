import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'

/** V0.17.0 #967 (RN-NOVA-22, CEN-NOVO-63): a referência de compra no histórico do insumo abre em aba nova. */
test('V0.17.0 — #967 referência da entrada de compra abre a compra em aba nova e o histórico segue aberto', async ({ page, request }) => {
  const token = await apiLogin(request)
  const insumo = await criarInsumoComEstoque(request, token, `QA967-${Date.now()}`, 5)

  await login(page)
  await page.goto(`/insumos/${insumo.id}`)

  const referencia = page.getByRole('link', { name: /^COM-\d+$/ }).first()
  await expect(referencia).toHaveAttribute('target', '_blank')
  const [nova] = await Promise.all([page.waitForEvent('popup'), referencia.click()])
  await expect(nova).toHaveURL(/\/compras\//)
  await expect(page).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
})
