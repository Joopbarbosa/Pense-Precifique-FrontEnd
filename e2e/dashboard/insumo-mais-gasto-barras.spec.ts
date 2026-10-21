import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { registrarCompraConfirmada } from '../helpers/compra'

/**
 * V0.17.0 #1005 (QA da #991, RN-NOVA-24, CEN-NOVO-94): compras de Fita de cetim R$ 300,00, Papel couchê R$ 120,00 e Cola quente
 * R$ 45,00. "Insumo em que mais gastamos" mostra três barras horizontais nessa ordem, com os valores ao fim de cada barra e sem mapa de
 * retângulos; o clique na barra do Papel abre só as compras do Papel no período.
 */
test('V0.17.0 — #1005 Insumo em que mais gastamos: três barras na ordem, com valores, e clique abre só as compras do insumo', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'gasto1005')
  const sufixo = Date.now()
  const nomes = { fita: `QA1005-Fita-${sufixo}`, papel: `QA1005-Papel-${sufixo}`, cola: `QA1005-Cola-${sufixo}` }
  const fita = await criarInsumo(request, token, nomes.fita)
  const papel = await criarInsumo(request, token, nomes.papel)
  const cola = await criarInsumo(request, token, nomes.cola)
  await registrarCompraConfirmada(request, token, [{ insumoId: fita.id, quantidade: 1, precoTotal: 300 }])
  await registrarCompraConfirmada(request, token, [{ insumoId: papel.id, quantidade: 1, precoTotal: 120 }])
  await registrarCompraConfirmada(request, token, [{ insumoId: cola.id, quantidade: 1, precoTotal: 45 }])

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')
  const gasto = page.getByTestId('ind-insumo-mais-gasto-grafico')
  await expect(gasto.locator('.recharts-bar-rectangle')).toHaveCount(3)
  await expect(gasto.locator('.recharts-treemap')).toHaveCount(0)
  await expect(gasto.locator('.recharts-label-list')).toContainText('45,00') // os rótulos de valor entram depois da animação das barras
  const grafico = ((await gasto.textContent()) ?? '').replace(/[\s\u00a0]+/g, '')
  expect(grafico).toMatch(/R\$300,00.*R\$120,00.*R\$45,00/)
  const eixo = grafico
  expect(eixo.indexOf(nomes.fita)).toBeLessThan(eixo.indexOf(nomes.papel))
  expect(eixo.indexOf(nomes.papel)).toBeLessThan(eixo.indexOf(nomes.cola))

  await gasto.locator('.recharts-bar-rectangle').nth(1).click() // a barra do Papel couchê
  const modal = page.getByTestId('modal-listagem')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText(nomes.papel)
  await expect(modal).not.toContainText(nomes.fita)
  await expect(modal).not.toContainText(nomes.cola)
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})
