import { test, expect } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'

/**
 * V0.17.0 #1018 (RN-NOVA-36, CEN-NOVO-123): onde a tela lista os produtos que usam um insumo, o produto com marca aparece como
 * "Nome — Marca"; o produto sem marca continua só com o nome.
 */
test('V0.17.0 — #1018 fichas que usam o insumo mostram "Nome — Marca" e o produto sem marca só o nome', async ({ page, request }) => {
  const token = await apiLogin(request)
  const ts = Date.now()
  const insumo = await criarInsumoComEstoque(request, token, `QA1018-insumo-${ts}`, 5)
  const base = { tipo: 'PRODUTO', tempoProducao: 1, rendimento: 1, precoVenda: 10, fichaTecnica: [{ insumoId: insumo.id, quantidade: 1 }] }
  const comMarca = await request.post(`${API_URL}/produtos`, { headers: { Authorization: `Bearer ${token}` }, data: { ...base, nome: `QA1018-caderno-${ts}`, marca: 'Pense' } })
  expect(comMarca.ok(), await comMarca.text()).toBeTruthy()
  const semMarca = await request.post(`${API_URL}/produtos`, { headers: { Authorization: `Bearer ${token}` }, data: { ...base, nome: `QA1018-fita-${ts}` } })
  expect(semMarca.ok(), await semMarca.text()).toBeTruthy()

  await login(page)
  await page.goto(`/insumos/${insumo.id}`)
  await page.getByRole('button', { name: /Fichas técnicas que usam este insumo/ }).click()
  await expect(page.getByText(`QA1018-caderno-${ts} — Pense`)).toBeVisible()
  await expect(page.getByText(`QA1018-fita-${ts}`, { exact: true })).toBeVisible()
})
