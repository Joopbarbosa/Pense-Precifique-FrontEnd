import { test, expect, type Locator } from '@playwright/test'
import { login } from '../helpers/auth'

/**
 * Topo compacto da Agenda (V0.18.0, Aditivo 4, #1070) — CEN-NOVO-104 a 106. A posição é conferida pelas caixas dos elementos na tela.
 */
async function caixa(l: Locator) {
  const c = await l.boundingBox()
  if (!c) throw new Error('elemento sem caixa na tela')
  return c
}
const mesmaLinha = (a: { y: number; height: number }, b: { y: number; height: number }) =>
  Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)) < 12

test.describe('#1070 — topo compacto da Agenda', () => {
  test.use({ viewport: { width: 1440, height: 800 } })

  test('CEN-NOVO-104 — sem texto de período; título, navegação e contagens na mesma linha, em ordem', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await expect(page.getByTestId('grade-horas')).toBeVisible()
    await expect(page.getByTestId('titulo-periodo')).toHaveClass(/sr-only/) // só para leitor de tela, sem ocupar espaço
    const [titulo, anterior, hoje, proximo, atrasados, paraHoje] = await Promise.all([
      caixa(page.getByRole('heading', { name: 'Agenda' })), caixa(page.getByRole('button', { name: 'Anterior' })),
      caixa(page.getByRole('button', { name: 'Hoje', exact: true })), caixa(page.getByRole('button', { name: 'Próximo' })),
      caixa(page.getByTestId('resumo-atrasados')), caixa(page.getByTestId('resumo-hoje')),
    ])
    for (const c of [anterior, hoje, proximo, atrasados, paraHoje]) expect(mesmaLinha(titulo, c)).toBe(true)
    expect(titulo.x).toBeLessThan(anterior.x)
    expect(anterior.x).toBeLessThan(hoje.x)
    expect(hoje.x).toBeLessThan(proximo.x)
    expect(proximo.x + proximo.width).toBeLessThanOrEqual(atrasados.x)
    expect(atrasados.x).toBeLessThan(paraHoje.x)
  })

  test('CEN-NOVO-105 — o seletor de visão fica na linha do filtro Mostrar, à direita', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    const mostrar = await caixa(page.getByLabel('Mostrar'))
    const semana = await caixa(page.getByRole('button', { name: 'Semana', exact: true }))
    expect(mesmaLinha(mostrar, semana)).toBe(true)
    expect(semana.x).toBeGreaterThan(mostrar.x + mostrar.width)
    const nav = await caixa(page.getByRole('button', { name: 'Próximo' }))
    expect(semana.y).toBeGreaterThan(nav.y + nav.height) // abaixo da linha da navegação: a visão não está lá
  })

  test('CEN-NOVO-106 — o mês e o ano aparecem só na visão Mês', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    await expect(page.getByTestId('titulo-periodo')).not.toHaveClass(/sr-only/)
    const titulo = await caixa(page.getByTestId('titulo-periodo'))
    expect(mesmaLinha(titulo, await caixa(page.getByRole('button', { name: 'Próximo' })))).toBe(true)
    await page.getByRole('button', { name: 'Semana', exact: true }).click()
    await expect(page.getByTestId('titulo-periodo')).toHaveClass(/sr-only/) // só para leitor de tela, sem ocupar espaço
  })
})
