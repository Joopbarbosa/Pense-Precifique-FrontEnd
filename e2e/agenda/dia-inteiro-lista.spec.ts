import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/** #1158 (V0.18.0) — o rótulo "dia inteiro" da grade abre a lista dos compromissos de dia inteiro do período. */
test.describe('#1158 — Lista de dia inteiro', () => {
  test('CT-1158-01 — clicar em "dia inteiro" lista os itens sem horário do período', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Dia todo ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(0) })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByTestId('ver-dia-inteiro').click()
    await expect(page.getByTestId('lista-dia-inteiro').getByTestId('compromisso').filter({ hasText: titulo })).toHaveCount(1)
    await page.getByTestId('lista-dia-inteiro').getByTestId('compromisso').filter({ hasText: titulo }).click()
    await expect(page.getByRole('dialog').filter({ hasText: titulo }).first()).toBeVisible()
  })

  test('CT-1158-02 (negativo) — período sem item de dia inteiro mostra a mensagem vazia', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 40; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('ver-dia-inteiro').click()
    await expect(page.getByRole('dialog')).toContainText('Nenhum compromisso de dia inteiro neste período.')
  })
})
