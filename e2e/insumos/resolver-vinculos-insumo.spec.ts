import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { criarProdutoComFicha } from '../helpers/producao'
import { API_URL } from '../helpers/auth'

/**
 * OpenProject #228, #237 — Resolução de vínculos ao inativar/excluir insumo vinculado a ficha
 * técnica: modal evoluído com 2 opções ("Inativar produtos vinculados" / "Substituir insumo"),
 * acionado tanto por "Inativar" quanto por "Excluir" (POST /insumos/{id}/resolver-vinculos).
 *
 * Dado um insumo vinculado à ficha técnica de um produto
 * Quando a artesã tenta inativá-lo e escolhe "Inativar produtos vinculados"
 * Então o insumo e o produto vinculado ficam inativos
 * Quando a artesã tenta excluir outro insumo vinculado e escolhe "Substituir insumo"
 * Então a ficha técnica do produto passa a referenciar o insumo substituto e o insumo original é excluído
 */
test.describe('OpenProject #228,#237 — Resolver vínculos ao inativar/excluir insumo', () => {
  let insumoInativarId: string
  let insumoInativarNome: string
  let produtoInativarNome: string

  let insumoExcluirId: string
  let insumoExcluirNome: string
  let produtoExcluirId: string
  let produtoExcluirNome: string

  let insumoSubstitutoId: string
  let insumoSubstitutoNome: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    insumoInativarNome = `E2E237 InsInativar ${ts}`
    const insInativar = await criarInsumo(request, token, insumoInativarNome)
    insumoInativarId = insInativar.id
    produtoInativarNome = `E2E237 ProdInativar ${ts}`
    await criarProdutoComFicha(request, token, produtoInativarNome, [{ insumoId: insumoInativarId, quantidade: 1 }])

    insumoExcluirNome = `E2E237 InsExcluir ${ts}`
    const insExcluir = await criarInsumo(request, token, insumoExcluirNome)
    insumoExcluirId = insExcluir.id
    produtoExcluirNome = `E2E237 ProdExcluir ${ts}`
    const produtoExcluir = await criarProdutoComFicha(request, token, produtoExcluirNome, [{ insumoId: insumoExcluirId, quantidade: 1 }])
    produtoExcluirId = produtoExcluir.id

    insumoSubstitutoNome = `E2E237 InsSubstituto ${ts}`
    const insSubstituto = await criarInsumo(request, token, insumoSubstitutoNome)
    insumoSubstitutoId = insSubstituto.id

    await login(page)
    await page.goto('/insumos')
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoInativarId).catch(() => {})
    await inativarInsumo(request, token, insumoSubstitutoId).catch(() => {})
  })

  test('inativar insumo vinculado — escolher "Inativar produtos vinculados"', async ({ page }) => {
    await page.getByPlaceholder('Buscar por nome ou marca…').fill(insumoInativarNome)
    await expect(page.getByText(insumoInativarNome, { exact: true }).first()).toBeVisible()

    const linha = page.getByText(insumoInativarNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Inativar', { exact: true }).click()
    await page.getByRole('button', { name: 'Inativar insumo' }).click()

    await expect(page.getByText('Não foi possível inativar')).toBeVisible()
    await expect(page.getByText(produtoInativarNome)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Substituir insumo' })).toBeVisible()

    await page.getByRole('button', { name: 'Inativar produtos vinculados' }).click()
    await expect(page.getByText('Insumo inativado.')).toBeVisible()

    await page.getByRole('button', { name: 'Ativos', exact: true }).click()
    await expect(page.getByText(insumoInativarNome, { exact: true })).toHaveCount(0)
  })

  test('excluir insumo vinculado — modal aparece igual, escolher "Substituir insumo" atualiza ficha técnica', async ({ page, request }) => {
    await page.getByPlaceholder('Buscar por nome ou marca…').fill(insumoExcluirNome)
    await expect(page.getByText(insumoExcluirNome, { exact: true }).first()).toBeVisible()

    const linha = page.getByText(insumoExcluirNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Excluir', { exact: true }).click()
    await page.getByRole('button', { name: 'Excluir insumo' }).click()

    await expect(page.getByText('Não foi possível excluir')).toBeVisible()
    await expect(page.getByText(produtoExcluirNome)).toBeVisible()

    await page.getByRole('button', { name: 'Substituir insumo' }).click()
    await page.getByPlaceholder('Buscar insumo substituto…').fill(insumoSubstitutoNome)
    await page.getByText(insumoSubstitutoNome, { exact: true }).click()

    const confirmar = page.getByRole('button', { name: 'Confirmar substituição' })
    await expect(confirmar).toBeEnabled()
    await confirmar.click()
    await expect(page.getByText('Insumo excluído.')).toBeVisible()

    const token = await apiLogin(request)
    const produtoRes = await request.get(`${API_URL}/produtos/${produtoExcluirId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const produtoAtualizado = await produtoRes.json()
    expect(produtoAtualizado.fichaTecnica.map((f: { insumoId: string }) => f.insumoId)).toContain(insumoSubstitutoId)
    expect(produtoAtualizado.fichaTecnica.map((f: { insumoId: string }) => f.insumoId)).not.toContain(insumoExcluirId)
  })
})
