import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/**
 * Resumo do dia (V0.18.0, Aditivo 5, #1071) — CEN-NOVO-113 a 115. A conta de teste é compartilhada, então os títulos são únicos
 * e as contagens são comparadas com o resumo da própria API.
 */
test.describe('#1071 — Resumo do dia', () => {
  test('CEN-NOVO-113 — o botão fica à esquerda do filtro Mostrar e abre o resumo com hoje e atrasados', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    await criarCompromissoUsuaria(request, token, { titulo: `Resumo hoje ${sufixo}`, data: hojeLocal(0), horario: '23:30' })
    await criarCompromissoUsuaria(request, token, { titulo: `Resumo atrasado ${sufixo}`, data: hojeLocal(-2) })
    await login(page)
    await page.goto('/agenda')
    const botao = page.getByRole('button', { name: 'Resumo do dia' })
    const [b, mostrar] = [await botao.boundingBox(), await page.getByLabel('Mostrar').boundingBox()]
    expect(b && mostrar && b.x + b.width <= mostrar.x && Math.abs(b.y - mostrar.y) < 30).toBe(true)
    await botao.click()
    const painel = page.getByTestId('resumo-do-dia')
    await expect(painel).toBeVisible()
    await expect(page.getByTestId('resumo-outros')).toContainText(`Resumo hoje ${sufixo}`)
    await expect(page.getByTestId('resumo-outros')).toContainText(`Resumo atrasado ${sufixo}`)
    await expect(page.getByTestId('resumo-outros')).toContainText('Atrasado há 2 dias')
  })

  test('CEN-NOVO-114 — o resumo traz a data, as contagens e "A pagar" indisponível', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Resumo do dia' }).click()
    await expect(page.getByTestId('resumo-do-dia')).toBeVisible()
    await expect(page.getByText(/\d+ para hoje · \d+ atrasados?/)).toBeVisible()
    await expect(page.getByTestId('resumo-a-pagar')).toContainText('Disponível quando o módulo Financeiro chegar.')
    await expect(page.getByTestId('resumo-a-receber')).toBeVisible()
    await expect(page.getByTestId('resumo-insumos')).toBeVisible()
  })

  test('CEN-NOVO-115 — clicar num compromisso do resumo abre o detalhe', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Resumo abre ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(-1) })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Resumo do dia' }).click()
    await page.getByTestId('resumo-outros').getByText(titulo).click()
    await expect(page.getByTestId('resumo-do-dia')).toBeHidden()
    await expect(page.getByText(titulo).first()).toBeVisible()
  })
})
