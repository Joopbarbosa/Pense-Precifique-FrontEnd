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

/**
 * OpenProject #710 — a rolagem que já estava em curso ao abrir o menu não o fecha
 *
 * Dado que a listagem tem mais de uma página e a artesã rolou até "Carregar mais"
 * Quando ela abre o menu "Mais ações" de uma linha lá em cima (o navegador rola de volta até a linha)
 * Então o menu continua aberto e a ação pode ser clicada
 */
test.describe('#710 — ActionMenu e a rolagem logo ao abrir', () => {
  const ids: string[] = []
  let alvo: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    const base = Date.now()
    for (let i = 0; i < 21; i++) ids.push((await criarInsumo(request, token, `E2E Rolagem ${base} ${i}`)).id)
    alvo = `E2E Rolagem Alvo ${base}`
    ids.push((await criarInsumo(request, token, alvo)).id)
    await login(page)
    await page.goto('/insumos')
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of ids.splice(0)) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('menu de uma linha do topo abre e fica aberto depois de "Carregar mais"', async ({ page }) => {
    await page.getByRole('button', { name: /Carregar mais/ }).click()
    await page.waitForTimeout(400)
    const linha = page.getByText(alvo, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Excluir', { exact: true }).click({ timeout: 5_000 })
    await expect(page.getByText(`Excluir "${alvo}" permanentemente?`)).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
  })
})
