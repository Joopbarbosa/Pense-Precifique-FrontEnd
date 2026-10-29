import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

/**
 * V0.18.0 (#1179, RN-NOVA-47) — CEN-NOVO-161: na descrição do produto, o nome de um insumo cadastrado vira link que abre o
 * cadastro em nova aba; a tela do produto continua aberta. Nome sem cadastro continua texto simples.
 */
test.describe('CEN-NOVO-161 — links na descrição', () => {
  test('nome de insumo cadastrado abre o cadastro em nova aba e nome sem cadastro não vira link', async ({ page, request, context }) => {
    const token = await apiLogin(request)
    const headers = { Authorization: `Bearer ${token}` }
    const ts = Date.now()
    const insumo = await criarInsumo(request, token, `Chocolate Meio Amargo ${ts}`)
    const descricao = `Barra com ${insumo.nome} e Canela Mística ${ts}`
    const res = await request.post(`${E2E_API_URL}/produtos`, {
      headers,
      data: { nome: `QA1179-Barra-${ts}`, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, descricao, fichaTecnica: [] },
    })
    expect(res.ok()).toBeTruthy()
    const produto = await res.json()

    try {
      await login(page)
      await page.goto(`/produtos/${produto.id}`)
      const bloco = page.getByTestId('descricao-com-links')
      await expect(bloco).toBeVisible()
      const links = bloco.getByTestId('link-descricao')
      await expect(links).toHaveCount(1)
      await expect(links.first()).toHaveText(insumo.nome)
      await expect(links.first()).toHaveAttribute('target', '_blank')
      await expect(bloco).toContainText(`Canela Mística ${ts}`)

      const [nova] = await Promise.all([context.waitForEvent('page'), links.first().click()])
      await nova.waitForLoadState()
      await expect(nova).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
      await expect(page).toHaveURL(new RegExp(`/produtos/${produto.id}$`))
    } finally {
      await request.delete(`${E2E_API_URL}/produtos/${produto.id}`, { headers }).catch(() => {})
      await request.delete(`${E2E_API_URL}/insumos/${insumo.id}`, { headers }).catch(() => {})
    }
  })
})
