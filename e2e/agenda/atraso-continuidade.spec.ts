import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/**
 * Correções de layout da Agenda (V0.18.0): #1057 (RN-NOVA-4 v2) o atrasado fica no dia original e continua até hoje,
 * #1056 atraso por horário, #1052 rolagem dentro da grade com a hora atual marcada. CEN-NOVO-77, 80, 81, 82.
 */
test.describe('Agenda — atraso, continuidade e hora atual', () => {
  test('CT-1057-01 — atrasado aparece no dia original e em cada dia até hoje, ligado ao trecho anterior', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1057-Atrasado-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(-3) })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: titulo })
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveAttribute('data-atrasado', 'sim')
    await expect(chip).toHaveAttribute('data-continuacao', 'sim') // hoje é o último dia da barra, ligado ao anterior
    await expect(chip).toContainText('Atrasado há 3 dias')
    // o dia original (3 dias atrás) mostra o atrasado sem ligação anterior; os dois dias seguintes são continuação
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(chip).toHaveAttribute('data-continuacao', 'nao')
    await expect(chip).toHaveAttribute('data-atrasado', 'sim')
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Próximo' }).click()
      await expect(chip).toHaveAttribute('data-continuacao', 'sim')
    }
  })

  test('CT-1057-02 — o atrasado de dias passados não aparece depois de hoje', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1057-Fim-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(-1) })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: titulo })).toHaveCount(0)
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
