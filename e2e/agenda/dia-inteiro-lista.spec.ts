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

  test('CT-1162-01 / CEN-NOVO-128 — 5 compromissos mostram 3 e "+2"; o "+2" abre os 5; sem rolagem', async ({ page, request }) => {
    const token = await apiLogin(request)
    const data = hojeLocal(20)
    const ts = Date.now()
    const titulos = [1, 2, 3, 4, 5].map(n => `Dia todo ${n} ${ts}`)
    for (const titulo of titulos) await criarCompromissoUsuaria(request, token, { titulo, data })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 20; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('ver-dia-inteiro').click()
    const lista = page.getByTestId('lista-dia-inteiro')
    await expect(lista.getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(3)
    const mais = page.getByTestId(`mais-dia-inteiro-${data}`)
    await expect(mais).toHaveText('+2')
    const rolagem = await lista.evaluate(el => {
      const corpo = el.closest('.overflow-y-auto') as HTMLElement
      return corpo.scrollHeight - corpo.clientHeight
    })
    expect(rolagem).toBeLessThanOrEqual(0)

    await mais.click()
    await expect(page.getByTestId('lista-do-dia').getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(5)
  })

  test('CT-1162-02 (negativo) — dia com exatamente 3 compromissos não mostra "+N"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const data = hojeLocal(25)
    const ts = Date.now()
    for (const n of [1, 2, 3]) await criarCompromissoUsuaria(request, token, { titulo: `Tres ${n} ${ts}`, data })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 25; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('ver-dia-inteiro').click()
    await expect(page.getByTestId('lista-dia-inteiro').getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(3)
    await expect(page.getByTestId(`mais-dia-inteiro-${data}`)).toHaveCount(0)
  })
  test('CT-1183-01 / CEN-NOVO-159 — na Semana, 5 de dia inteiro mostram 2 e "+3"; o "+3" abre a lista do dia', async ({ page, request }) => {
    const token = await apiLogin(request)
    const data = hojeLocal(140)
    const ts = Date.now()
    for (const n of [1, 2, 3, 4, 5]) await criarCompromissoUsuaria(request, token, { titulo: `Semana ${n} ${ts}`, data })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Semana', exact: true }).click()
    for (let i = 0; i < 20; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    const celula = page.getByTestId('linha-dia-inteiro').getByTestId(`dia-${data}`)
    await expect(celula.getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(2)
    await expect(celula.getByTestId(`mais-${data}`)).toHaveText('+3')
    await celula.getByTestId(`mais-${data}`).click()
    await expect(page.getByTestId('lista-dia-inteiro').getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(3)
    await expect(page.getByTestId(`mais-dia-inteiro-${data}`)).toHaveText('+2')
  })

  test('CT-1189-02 (negativo) — na Semana, 2 de dia inteiro não mostram "+N"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const data = hojeLocal(147)
    const ts = Date.now()
    for (const n of [1, 2]) await criarCompromissoUsuaria(request, token, { titulo: `Dois semana ${n} ${ts}`, data })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Semana', exact: true }).click()
    for (let i = 0; i < 21; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    const celula = page.getByTestId('linha-dia-inteiro').getByTestId(`dia-${data}`)
    await expect(celula.getByTestId('compromisso').filter({ hasText: String(ts) })).toHaveCount(2)
    await expect(celula.getByTestId(`mais-${data}`)).toHaveCount(0)
  })
})
