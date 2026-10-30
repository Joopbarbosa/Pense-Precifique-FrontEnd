import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

/**
 * V0.18.0 (#1188, RN-NOVA-47 revisada) — na ficha técnica, o insumo abre o detalhe em OUTRA aba (detalhe do produto: clique na linha;
 * edição do produto: botão em cada linha). A tela do produto continua aberta.
 */
test.describe('#1188 — Ficha técnica abre o insumo em outra aba', () => {
  test('detalhe: clicar no insumo abre em nova aba; edição: botão abre o detalhe em nova aba', async ({ page, request, context }) => {
    const token = await apiLogin(request)
    const headers = { Authorization: `Bearer ${token}` }
    const ts = Date.now()
    const insumo = await criarInsumo(request, token, `Insumo Ficha ${ts}`)
    const res = await request.post(`${E2E_API_URL}/produtos`, {
      headers,
      data: { nome: `QA1188-${ts}`, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, fichaTecnica: [{ insumoId: insumo.id, quantidade: 1 }] },
    })
    expect(res.ok()).toBeTruthy()
    const produto = await res.json()
    try {
      await login(page)
      await page.goto(`/produtos/${produto.id}`)
      await page.getByRole('button', { name: /Ficha técnica/i }).click()
      const [aba1] = await Promise.all([context.waitForEvent('page'), page.getByTestId('item-ficha').first().click()])
      await aba1.waitForLoadState()
      await expect(aba1).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
      await expect(page).toHaveURL(new RegExp(`/produtos/${produto.id}$`))
      await aba1.close()

      await page.goto(`/produtos/${produto.id}/editar`)
      await page.getByRole('button', { name: /Ficha Técnica/i }).first().click().catch(() => {})
      const botao = page.getByTestId('abrir-componente').first()
      await expect(botao).toBeVisible()
      await expect(botao).toHaveAttribute('target', '_blank')
      const [aba2] = await Promise.all([context.waitForEvent('page'), botao.click()])
      await aba2.waitForLoadState()
      await expect(aba2).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
      await expect(page).toHaveURL(new RegExp(`/produtos/${produto.id}/editar$`))
    } finally {
      await request.delete(`${E2E_API_URL}/produtos/${produto.id}`, { headers }).catch(() => {})
      await request.delete(`${E2E_API_URL}/insumos/${insumo.id}`, { headers }).catch(() => {})
    }
  })
})
