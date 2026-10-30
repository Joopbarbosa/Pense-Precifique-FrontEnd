import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/** #1159 (V0.18.0) — descrição opcional (até 500) no compromisso da usuária: criar, ver no detalhe, editar e limite. */
test.describe('#1159 — Descrição do evento', () => {
  async function abrirDoDia(page: import('@playwright/test').Page, titulo: string) {
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByTestId('compromisso').filter({ hasText: titulo }).first().click()
  }

  test('CT-1159-01 — Novo evento com descrição: aparece no detalhe', async ({ page }) => {
    const titulo = `Com descrição ${Date.now()}`
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Data').fill(hojeLocal(0))
    await page.getByLabel('Descrição').fill('Levar amostras de tecido')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    await abrirDoDia(page, titulo)
    await expect(page.getByTestId('descricao-compromisso')).toHaveText('Levar amostras de tecido')
  })

  test('CT-1159-02 — editar a descrição pelo detalhe', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Edita descrição ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(0), descricao: 'Primeira' } as never)
    await login(page)
    await abrirDoDia(page, titulo)
    await expect(page.getByTestId('descricao-compromisso')).toHaveText('Primeira')
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Descrição').fill('Segunda')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    await abrirDoDia(page, titulo)
    await expect(page.getByTestId('descricao-compromisso')).toHaveText('Segunda')
  })

  test('CT-1159-03 (negativo) — o campo trava em 500 caracteres e mostra o contador', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByLabel('Descrição').fill('a'.repeat(600))
    await expect(page.getByLabel('Descrição')).toHaveValue('a'.repeat(500))
    await expect(page.getByRole('dialog')).toContainText('500/500')
  })
})
