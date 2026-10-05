import { test, expect, Page, Locator } from '@playwright/test'
import { login, API_URL } from './helpers/auth'
import { apiLogin, criarInsumo } from './helpers/api'
import { carregarAte } from './helpers/list'

/**
 * OpenProject #699 — ActionMenu perto do rodapé
 *
 * Dado que a linha de um insumo está encostada no rodapé da janela
 * Quando a artesã abre o menu "Mais ações"
 * Então todas as ações ficam dentro da janela (o menu abre para cima) e podem ser clicadas
 * E, com espaço abaixo do botão, o menu continua abrindo para baixo
 */
test.describe('#699 — ActionMenu perto do rodapé', () => {
  let insumoId: string
  let insumoNome: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    insumoNome = `E2E Menu Rodape ${Date.now()}`
    insumoId = (await criarInsumo(request, token, insumoNome)).id
    await login(page)
    await page.goto('/insumos')
    await carregarAte(page, insumoNome)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await request
      .delete(`${API_URL}/insumos/${insumoId}`, { headers: { Authorization: `Bearer ${token}` } })
      .catch(() => {})
  })

  async function botaoMenu(page: Page): Promise<Locator> {
    // InsumoRow (desktop) vem antes de InsumoCard (mobile, oculto neste viewport) — .first().
    const nome = page.getByText(insumoNome, { exact: true }).first()
    await expect(nome).toBeVisible()
    return nome.locator('xpath=../..').getByRole('button', { name: 'Mais ações' })
  }

  test('linha no rodapé: menu abre para cima e Excluir fica clicável', async ({ page }) => {
    const menuBtn = await botaoMenu(page)
    await menuBtn.scrollIntoViewIfNeeded()
    const caixa = (await menuBtn.boundingBox())!
    const largura = page.viewportSize()!.width
    // Janela termina 4px abaixo do botão: não há espaço para o menu abaixo dele.
    await page.setViewportSize({ width: largura, height: Math.ceil(caixa.y + caixa.height + 4) })
    const botao = (await menuBtn.boundingBox())!

    await menuBtn.click()
    const excluir = page.getByText('Excluir', { exact: true })
    await expect(excluir).toBeVisible()
    const item = (await excluir.boundingBox())!
    const alturaJanela = page.viewportSize()!.height
    expect(item.y + item.height).toBeLessThanOrEqual(alturaJanela)
    expect(item.y + item.height).toBeLessThanOrEqual(botao.y)

    await excluir.click()
    await expect(page.getByText(`Excluir "${insumoNome}" permanentemente?`)).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('com espaço abaixo do botão, o menu continua abrindo para baixo', async ({ page }) => {
    const menuBtn = await botaoMenu(page)
    const botao = (await menuBtn.boundingBox())!
    expect(botao.y + botao.height + 260).toBeLessThan(page.viewportSize()!.height)

    await menuBtn.click()
    const excluir = page.getByText('Excluir', { exact: true })
    await expect(excluir).toBeVisible()
    const item = (await excluir.boundingBox())!
    expect(item.y).toBeGreaterThan(botao.y + botao.height)
  })
})
