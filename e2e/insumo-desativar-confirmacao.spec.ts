import { test, expect } from '@playwright/test'
import { login, API_URL } from './helpers/auth'
import { apiLogin, criarInsumo } from './helpers/api'
import { carregarAte } from './helpers/list'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
/**
 * Cenário 159 — Desativar insumo exige confirmação (#94)
 *
 * Dado que a artesã clica em "Desativar" no menu ⋮ de um insumo
 * Então o sistema exibe o modal de confirmação
 * E a API não é chamada ainda
 * Quando ela confirma
 * Então a API é chamada e o insumo é desativado
 */
test.describe('Cenário 159 — Desativar insumo exige confirmação (#94)', () => {
  let insumoId: string
  let insumoNome: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    insumoNome = `E2E Desativar ${Date.now()}`
    const insumo = await criarInsumo(request, token, insumoNome)
    insumoId = insumo.id

    await login(page)
    await page.goto('/insumos')
  })

  test.afterEach(async ({ request }) => {
    // API só expõe soft-delete (inativar) via DELETE /insumos/{id} — não existe hard-delete.
    // O próprio teste já deixa o insumo inativo ao confirmar; isto é um best-effort caso o
    // teste falhe antes de chegar lá, garantindo que nenhum insumo de teste fique ativo.
    const token = await apiLogin(request)
    await request
      .delete(`${API_URL}/insumos/${insumoId}`, { headers: { Authorization: `Bearer ${token}` } })
      .catch(() => {})
  })

  test('modal intercepta a desativação; cancelar não chama API; confirmar chama e desativa', async ({ page }) => {
    const deleteCalls: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes(`/insumos/${insumoId}`)) {
        deleteCalls.push(req.url())
      }
    })

    await carregarAte(page, insumoNome)
    // InsumoRow (desktop) é renderizado antes de InsumoCard (mobile, oculto neste viewport)
    // no mesmo map — .first() pega a ocorrência visível.
    const nomeVisivel = page.getByText(insumoNome, { exact: true }).first()
    await expect(nomeVisivel).toBeVisible()
    const linha = nomeVisivel.locator('xpath=../..')
    const menuBtn = linha.getByRole('button', { name: 'Mais ações' })

    // abre o menu ⋮ e clica em Desativar
    await menuBtn.click()
    await page.getByText('Desativar', { exact: true }).click()

    // modal de confirmação aparece, API ainda não foi chamada
    await expect(page.getByText(`Desativar "${insumoNome}"?`)).toBeVisible()
    expect(deleteCalls).toHaveLength(0)

    // cancelar fecha o modal sem chamar a API
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText(`Desativar "${insumoNome}"?`)).not.toBeVisible()
    expect(deleteCalls).toHaveLength(0)

    // reabre e confirma
    await menuBtn.click()
    await page.getByText('Desativar', { exact: true }).click()
    await page.getByRole('button', { name: 'Desativar insumo' }).click()

    await expect(page.getByText('Insumo desativado.')).toBeVisible()
    await expect.poll(() => deleteCalls.length).toBe(1)
    expect(deleteCalls[0]).toContain(`/insumos/${insumoId}`)

    // insumo removido da lista após desativar
    await expect(page.getByText(insumoNome, { exact: true })).toHaveCount(0)
  })
})
