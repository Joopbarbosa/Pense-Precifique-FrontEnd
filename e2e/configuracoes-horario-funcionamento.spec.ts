import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin } from './helpers/api'
import { apiFecharTurnoSeAberto } from './helpers/caixa'

/**
 * OpenProject #494/#506 (V0.12.0) — horário de funcionamento por dia da semana, em Configurações
 * → Perfil da empresa. Achado da Retomada: implementado e aprovado no teste manual do usuário,
 * mas sem cobertura E2E dedicada até este ponto (só verificação manual via chrome-devtools) —
 * fechando o gap antes do fechamento formal da versão.
 *
 * `diaSemana` é ISO-8601 (1=segunda...7=domingo) — igual ao Backend, diferente de `Date#getDay()`
 * (0=domingo). Os specs abaixo calculam o dia de hoje nesse formato para testar contra o dia real.
 */
const DIAS_SEMANA_LABEL: Record<number, string> = {
  1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira',
  5: 'Sexta-feira', 6: 'Sábado', 7: 'Domingo',
}

function diaIsoHoje(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

test.describe('#494/#506 — Horário de funcionamento em Configurações', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
  })

  test('marca um dia como Fechado, salva, e o estado persiste após reload', async ({ page }) => {
    const diaLabel = DIAS_SEMANA_LABEL[diaIsoHoje()]
    const linhaDia = page.getByText(diaLabel, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')

    await linhaDia.getByRole('button', { name: 'Fechado' }).click()
    await expect(linhaDia.getByRole('button', { name: 'Fechado' })).toHaveClass(/bg-orange/)

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    const linhaDiaPosReload = page.getByText(diaLabel, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await expect(linhaDiaPosReload.getByRole('button', { name: 'Fechado' })).toHaveClass(/bg-orange/)

    // restaura pra Aberto — não deixar o dia real da semana marcado como fechado pra outros specs
    await linhaDiaPosReload.getByRole('button', { name: 'Aberto' }).click()
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()
  })

  test('horário de fechamento antes do de abertura é bloqueado com toast nomeando o dia', async ({ page }) => {
    const diaLabel = DIAS_SEMANA_LABEL[diaIsoHoje()]
    const linhaDia = page.getByText(diaLabel, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')

    await expect(linhaDia.getByRole('button', { name: 'Aberto' })).toHaveClass(/bg-teal/)
    const inputs = linhaDia.locator('input[type="time"]')
    await inputs.nth(0).fill('18:00')
    await inputs.nth(1).fill('08:00')

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText(`${diaLabel}: o horário de fechamento precisa ser depois do de abertura.`)).toBeVisible()

    // restaura pra um intervalo válido antes de sair, pra não deixar o dia real quebrado pra outros specs
    await inputs.nth(0).fill('08:00')
    await inputs.nth(1).fill('18:00')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()
  })

  test('abrir o caixa num dia configurado como fechado avisa, mas não bloqueia (#506)', async ({ page, request }) => {
    const token = await apiLogin(request)
    await apiFecharTurnoSeAberto(request, token)

    const diaLabel = DIAS_SEMANA_LABEL[diaIsoHoje()]
    const linhaDia = page.getByText(diaLabel, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await linhaDia.getByRole('button', { name: 'Fechado' }).click()
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()

    await page.goto('/caixa')
    await expect(page.getByText('Hoje é um dia configurado como fechado no horário de funcionamento.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abrir Caixa' })).toBeEnabled()

    // restaura pra Aberto
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    const linhaDiaRestaurar = page.getByText(diaLabel, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await linhaDiaRestaurar.getByRole('button', { name: 'Aberto' }).click()
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()

    await apiFecharTurnoSeAberto(request, token)
  })
})
