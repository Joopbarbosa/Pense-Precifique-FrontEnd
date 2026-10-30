import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/**
 * Correções de layout da Agenda (V0.18.0): #1060 (RN-NOVA-4 v3) o atrasado fica só no dia original, #1056 atraso por horário,
 * #1052 rolagem dentro da grade com a hora atual marcada, #1061 grade de 24 horas no modelo do Google Agenda, #1062 semana
 * começando no domingo. CEN-NOVO-77, 88 a 91.
 */
test.describe('Agenda — atraso, grade de horas e semana', () => {
  test('CT-1060-01 — atrasado fica só no dia original, sem subir para hoje nem repetir nos dias seguintes', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1060-Atrasado-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(-2) })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: titulo })
    await expect(chip).toHaveCount(0) // hoje não recebe o atrasado
    await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(chip).toHaveCount(0) // ontem também não
    await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(chip).toHaveCount(1) // o dia original
    await expect(chip).toHaveAttribute('data-atrasado', 'sim')
    await expect(chip).toContainText('Atrasado há 2 dias')
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(chip).toHaveCount(0)
  })

  test('CT-1062-01 — a Semana e o Mês começam no domingo', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    const primeiro = await page.locator('[data-testid^="cabecalho-dia-"]').first().getAttribute('data-testid')
    const [a, m, d] = (primeiro ?? '').replace('cabecalho-dia-', '').split('-').map(Number)
    expect(new Date(Date.UTC(a, m - 1, d)).getUTCDay()).toBe(0)
    await expect(page.locator('[data-testid^="cabecalho-dia-"]').first()).toContainText(/dom/i)
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    const primeiraCelula = await page.getByTestId('grade-mes').locator('[data-testid^="dia-"]').first().getAttribute('data-testid')
    const [a2, m2, d2] = (primeiraCelula ?? '').replace('dia-', '').split('-').map(Number)
    expect(new Date(Date.UTC(a2, m2 - 1, d2)).getUTCDay()).toBe(0)
  })

  test('CT-1061-01 — a grade mostra as 24 horas e o compromisso fica posicionado na sua hora', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1061-Cedo-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), horario: '07:30' })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    const grade = page.getByTestId('grade-horas')
    await expect(grade.getByText('00:00', { exact: true })).toHaveCount(1)
    await expect(grade.getByText('23:00', { exact: true })).toHaveCount(1)
    const chip = page.getByTestId('compromisso').filter({ hasText: titulo })
    await expect(chip).toBeVisible()
    const coluna = page.locator('[data-testid^="coluna-"]').first()
    const c = (await chip.boundingBox())!
    const col = (await coluna.boundingBox())!
    // 7h30 = 7,5 horas de 56 px do topo da coluna
    expect(Math.abs(c.y - col.y - 7.5 * 56)).toBeLessThan(4)
    expect(Math.abs(c.height - 56)).toBeLessThan(4)
  })

  test('CT-1061-02 — compromissos no mesmo horário ficam lado a lado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    await criarCompromissoUsuaria(request, token, { titulo: `QA1061-A-${sufixo}`, data: hojeLocal(1), horario: '14:00' })
    await criarCompromissoUsuaria(request, token, { titulo: `QA1061-B-${sufixo}`, data: hojeLocal(1), horario: '14:00' })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    const a = (await page.getByTestId('compromisso').filter({ hasText: `QA1061-A-${sufixo}` }).boundingBox())!
    const b = (await page.getByTestId('compromisso').filter({ hasText: `QA1061-B-${sufixo}` }).boundingBox())!
    expect(Math.abs(a.y - b.y)).toBeLessThan(2)
    expect(Math.abs(a.width - b.width)).toBeLessThan(3)
    expect(Math.abs(a.x + a.width - b.x)).toBeLessThan(6)
    const coluna = (await page.locator('[data-testid^="coluna-"]').first().boundingBox())!
    expect(a.width).toBeLessThan(coluna.width * 0.6)
  })

  test('CT-1056-01 — compromisso de hoje com horário já passado fica atrasado, com o atraso em horas e minutos', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1056-Cedo-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(0), horario: '00:00' })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: titulo })
    await expect(chip).toHaveAttribute('data-atrasado', 'sim')
    await expect(chip).toContainText(/Atrasado há (\d+ h( \d+ min)?|\d+ min)/)
  })

  test('CT-1056-02 (negativo) — horário que ainda não chegou não é atraso', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1056-Tarde-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(0), horario: '23:59' })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: titulo })).toHaveAttribute('data-atrasado', 'nao')
  })

  test('CT-1052-01 — a grade rola por dentro, o cabeçalho fica fixo e o traço laranja marca a hora atual', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    const grade = page.getByTestId('grade-horas')
    await expect(grade).toBeVisible()
    const traco = page.getByTestId('traco-hora-atual')
    await expect(traco).toBeVisible()
    // ao abrir, a hora atual já está dentro da área visível da grade
    const g = (await grade.boundingBox())!
    const t = (await traco.boundingBox())!
    expect(t.y).toBeGreaterThanOrEqual(g.y)
    expect(t.y).toBeLessThanOrEqual(g.y + g.height)
    // rolar a grade não rola a página e mantém o cabeçalho no topo
    const topoDaPagina = await page.evaluate(() => window.scrollY)
    await grade.evaluate(el => { el.scrollTop = el.scrollHeight })
    expect(await page.evaluate(() => window.scrollY)).toBe(topoDaPagina)
    const fixo = (await page.getByTestId('cabecalho-fixo').boundingBox())!
    expect(Math.abs(fixo.y - g.y)).toBeLessThan(4)
  })
})
