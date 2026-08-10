import { test, expect } from '@playwright/test'
import { login, API_URL } from './helpers/auth'
import { apiLogin, criarInsumo } from './helpers/api'
import { carregarAte } from './helpers/list'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
// Atualizado na OpenProject #228: o botão "Desativar" (que sempre chamou DELETE, exclusão
// permanente) foi renomeado para "Excluir" para não ser confundido com a nova ação reversível
// "Inativar" (POST /insumos/{id}/inativar). O comportamento coberto aqui (modal de confirmação
// intercepta a chamada à API) não mudou, só o rótulo.
/**
 * Cenário 159 — Excluir insumo exige confirmação (#94, #228)
 *
 * Dado que a artesã clica em "Excluir" no menu ⋮ de um insumo
 * Então o sistema exibe o modal de confirmação
 * E a API não é chamada ainda
 * Quando ela confirma
 * Então a API é chamada e o insumo é excluído permanentemente
 */
test.describe('Cenário 159 — Excluir insumo exige confirmação (#94, #228)', () => {
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
    // O próprio teste já exclui o insumo ao confirmar; isto é um best-effort caso o
    // teste falhe antes de chegar lá, garantindo que nenhum insumo de teste sobre.
    const token = await apiLogin(request)
    await request
      .delete(`${API_URL}/insumos/${insumoId}`, { headers: { Authorization: `Bearer ${token}` } })
      .catch(() => {})
  })

  test('modal intercepta a exclusão; cancelar não chama API; confirmar chama e exclui', async ({ page }) => {
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

    // abre o menu ⋮ e clica em Excluir
    await menuBtn.click()
    await page.getByText('Excluir', { exact: true }).click()

    // modal de confirmação aparece, API ainda não foi chamada
    await expect(page.getByText(`Excluir "${insumoNome}" permanentemente?`)).toBeVisible()
    expect(deleteCalls).toHaveLength(0)

    // cancelar fecha o modal sem chamar a API
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText(`Excluir "${insumoNome}" permanentemente?`)).not.toBeVisible()
    expect(deleteCalls).toHaveLength(0)

    // reabre e confirma
    await menuBtn.click()
    await page.getByText('Excluir', { exact: true }).click()
    await page.getByRole('button', { name: 'Excluir insumo' }).click()

    await expect(page.getByText('Insumo excluído.')).toBeVisible()
    await expect.poll(() => deleteCalls.length).toBe(1)
    expect(deleteCalls[0]).toContain(`/insumos/${insumoId}`)

    // insumo removido da lista após excluir
    await expect(page.getByText(insumoNome, { exact: true })).toHaveCount(0)
  })
})
