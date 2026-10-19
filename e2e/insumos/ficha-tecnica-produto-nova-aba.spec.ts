import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { criarProdutoComFicha } from '../helpers/producao'

/**
 * V0.17.0 #986 (RN-NOVA-22, alteração, CEN-NOVO-88): na aba "Fichas técnicas que usam este insumo" do detalhe do
 * insumo, clicar no registro abre o cadastro do produto em aba nova; o detalhe do insumo continua aberto.
 */
test('V0.17.0 — #986 ficha técnica que usa o insumo abre o produto em aba nova e o insumo segue aberto', async ({ page, request }) => {
  const token = await apiLogin(request)
  const sufixo = Date.now()
  const insumo = await criarInsumo(request, token, `QA986-Insumo-${sufixo}`)
  const produto = await criarProdutoComFicha(request, token, `QA986-Laco-${sufixo}`, [{ insumoId: insumo.id, quantidade: 2 }])

  await login(page)
  await page.goto(`/insumos/${insumo.id}`)
  await page.getByRole('button', { name: /Fichas técnicas que usam este insumo/ }).click()

  const registro = page.getByRole('link', { name: new RegExp(`QA986-Laco-${sufixo}`) })
  await expect(registro).toHaveAttribute('target', '_blank')
  await expect(registro).toHaveAttribute('href', `/produtos/${produto.id}`)
  const [nova] = await Promise.all([page.waitForEvent('popup'), registro.click()])
  await expect(nova).toHaveURL(new RegExp(`/produtos/${produto.id}$`))
  await expect(page).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
})
