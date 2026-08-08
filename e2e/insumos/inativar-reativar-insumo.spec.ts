import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { criarProdutoComFicha } from '../helpers/producao'
import { carregarAte } from '../helpers/list'

/**
 * OpenProject #228 — Inativação reversível de insumo, separada da exclusão permanente.
 *
 * Dado que a artesã clica em "Inativar" no menu ⋮ de um insumo sem vínculo em ficha técnica
 * Então o insumo passa a inativo e some da lista de Ativos
 * Quando ela clica em "Reativar" na lista de Inativos
 * Então o insumo volta para Ativos
 * Dado que o insumo está vinculado à ficha técnica de um produto
 * Quando ela tenta inativar
 * Então o sistema exibe um modal listando os produtos vinculados e não inativa
 * E o botão "Excluir" (exclusão permanente) continua funcionando, sem alteração
 */
test.describe('OpenProject #228 — Inativar/reativar insumo', () => {
  let insumoSemVinculoId: string
  let insumoSemVinculoNome: string
  let insumoComVinculoId: string
  let insumoComVinculoNome: string
  let produtoNome: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)

    insumoSemVinculoNome = `E2E228 SemVinculo ${Date.now()}`
    const semVinculo = await criarInsumo(request, token, insumoSemVinculoNome)
    insumoSemVinculoId = semVinculo.id

    insumoComVinculoNome = `E2E228 ComVinculo ${Date.now()}`
    const comVinculo = await criarInsumo(request, token, insumoComVinculoNome)
    insumoComVinculoId = comVinculo.id

    produtoNome = `E2E228 Produto ${Date.now()}`
    await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumoComVinculoId, quantidade: 1 }])

    await login(page)
    await page.goto('/insumos')
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoSemVinculoId)
    await inativarInsumo(request, token, insumoComVinculoId)
  })

  test('inativar sem vínculo, reativar, bloqueio com vínculo, excluir continua funcionando', async ({ page }) => {
    // --- inativar insumo sem vínculo: sucesso, some de Ativos, aparece em Inativos ---
    await carregarAte(page, insumoSemVinculoNome)
    let linha = page.getByText(insumoSemVinculoNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Inativar', { exact: true }).click()
    await expect(page.getByText(`Inativar "${insumoSemVinculoNome}"?`)).toBeVisible()
    await page.getByRole('button', { name: 'Inativar insumo' }).click()
    await expect(page.getByText('Insumo inativado.')).toBeVisible()

    await page.getByRole('button', { name: 'Ativos', exact: true }).click()
    await expect(page.getByText(insumoSemVinculoNome, { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Inativos' }).click()
    await expect(page.getByText(insumoSemVinculoNome, { exact: true }).first()).toBeVisible()

    // --- reativar: volta para Ativos ---
    linha = page.getByText(insumoSemVinculoNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Reativar', { exact: true }).click()
    await expect(page.getByText('Insumo reativado.')).toBeVisible()
    await page.getByRole('button', { name: 'Ativos', exact: true }).click()
    await expect(page.getByText(insumoSemVinculoNome, { exact: true }).first()).toBeVisible()

    // --- inativar insumo vinculado a ficha técnica: bloqueado, modal lista o produto ---
    await page.getByRole('button', { name: 'Todos' }).click()
    await carregarAte(page, insumoComVinculoNome)
    linha = page.getByText(insumoComVinculoNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Inativar', { exact: true }).click()
    await page.getByRole('button', { name: 'Inativar insumo' }).click()

    await expect(page.getByText('Não foi possível inativar')).toBeVisible()
    await expect(page.getByText(produtoNome)).toBeVisible()
    await page.getByRole('button', { name: 'Entendi' }).click()

    // insumo continua ativo (bloqueado, não inativou)
    await page.getByRole('button', { name: 'Ativos', exact: true }).click()
    await expect(page.getByText(insumoComVinculoNome, { exact: true }).first()).toBeVisible()

    // --- excluir (ação antiga, permanente) continua funcionando ---
    await page.getByRole('button', { name: 'Todos' }).click()
    await carregarAte(page, insumoSemVinculoNome)
    linha = page.getByText(insumoSemVinculoNome, { exact: true }).first().locator('xpath=../..')
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByText('Excluir', { exact: true }).click()
    await expect(page.getByText(`Excluir "${insumoSemVinculoNome}" permanentemente?`)).toBeVisible()
    await page.getByRole('button', { name: 'Excluir insumo' }).click()
    await expect(page.getByText('Insumo excluído.')).toBeVisible()
    await expect(page.getByText(insumoSemVinculoNome, { exact: true })).toHaveCount(0, { timeout: 10000 })
  })
})
