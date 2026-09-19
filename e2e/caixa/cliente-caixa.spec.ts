import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente } from '../helpers/orcamento'
import { apiAbrirTurno, apiFecharTurnoSeAberto } from '../helpers/caixa'

/**
 * OpenProject #486 (V0.12.0) — seleção de cliente no Caixa por botão + modal de seleção única
 * (CEN-NOVO-42, correção de layout pós-fechamento do pocket — troca o campo de busca inline do
 * card "1 Cliente" por um botão que abre uma modal, diferente do `ClienteSelect` do Orçamento).
 */
test.describe('#486 — Seleção de cliente no Caixa (CEN-NOVO-42)', () => {
  test.beforeEach(async ({ request }) => {
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await apiFecharTurnoSeAberto(request, token)
  })

  test('seleciona cliente pela modal, troca por outro e depois remove', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome1 = `QA-486-Cliente-${Date.now()}`
    const nome2 = `QA-486-Cliente2-${Date.now()}`
    await criarCliente(request, token, nome1)
    await criarCliente(request, token, nome2)

    await login(page)
    await page.goto('/caixa')

    // Sem cliente: só o botão "Selecionar cliente", sem campo de busca na tela principal
    await expect(page.getByRole('button', { name: 'Selecionar cliente' })).toBeVisible()
    await page.getByRole('button', { name: 'Selecionar cliente' }).click()

    const modal = page.getByRole('dialog')
    await expect(modal.getByText('Selecionar cliente', { exact: true })).toBeVisible()
    await modal.getByRole('button', { name: new RegExp(nome1) }).click()

    // Seleção única — clicar numa linha já fecha a modal
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText(nome1, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trocar cliente' })).toBeVisible()

    // "Trocar cliente" reabre a modal e permite trocar por outro
    await page.getByRole('button', { name: 'Trocar cliente' }).click()
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(nome2) }).click()
    await expect(page.getByText(nome2, { exact: true })).toBeVisible()
    await expect(page.getByText(nome1, { exact: true })).toHaveCount(0)

    // "Remover" volta ao estado sem cliente
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('button', { name: 'Selecionar cliente' })).toBeVisible()
    await expect(page.getByText(nome2, { exact: true })).toHaveCount(0)
  })
})
