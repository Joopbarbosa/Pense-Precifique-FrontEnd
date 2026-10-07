import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { hojeLocal } from './helpers/data'

// #754 — datas no fuso de Brasília, não em UTC. 2026-10-07T01:30Z = 22:30 de 06/10 em Brasília (UTC-3): o dia
// UTC já é o seguinte, e `toISOString().slice(0, 10)` devolvia 2026-10-07.
const NOITE = new Date('2026-10-07T01:30:00Z')

test.describe('Datas locais (America/Sao_Paulo)', () => {
  test('helper: às 22h30 de Brasília "hoje" ainda é o dia 06 e os deslocamentos seguem o dia local', () => {
    expect(NOITE.toISOString().slice(0, 10)).toBe('2026-10-07')
    expect(hojeLocal(0, NOITE)).toBe('2026-10-06')
    expect(hojeLocal(1, NOITE)).toBe('2026-10-07')
    expect(hojeLocal(-1, NOITE)).toBe('2026-10-05')
    expect(hojeLocal(0, new Date('2026-10-07T03:30:00Z'))).toBe('2026-10-07')
  })

  test('nova produção: a data de início padrão é o dia local, mesmo depois das 21h em Brasília', async ({ page }) => {
    await login(page)
    await page.clock.setFixedTime(NOITE)
    await page.goto('/producao/nova')
    await expect(page.getByLabel(/Data de início/)).toHaveValue('2026-10-06')
  })
})
