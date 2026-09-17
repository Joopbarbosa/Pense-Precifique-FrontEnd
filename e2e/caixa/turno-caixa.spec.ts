import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { apiFecharTurnoSeAberto } from '../helpers/caixa'

/**
 * OpenProject #488 (V0.12.0) — abertura, fechamento, sangria e suprimento de caixa
 * (RN-NOVA-6/8/9, CEN-NOVO-5/10/11, UC-NOVO-2).
 */

test.describe('#488 — Turno de Caixa', () => {
  test.beforeEach(async ({ request }) => {
    const token = await apiLogin(request)
    await apiFecharTurnoSeAberto(request, token)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await apiFecharTurnoSeAberto(request, token)
  })

  test('abre o caixa informando o fundo de troco', async ({ page }) => {
    await login(page)
    await page.goto('/caixa')

    await expect(page.getByRole('heading', { name: 'Abrir o Caixa' })).toBeVisible()
    await page.getByLabel('Fundo de troco').fill('100,00')
    await page.getByRole('button', { name: 'Abrir Caixa' }).click()

    await expect(page.getByText('Fundo R$ 100,00')).toBeVisible()
  })

  test('CEN-NOVO-10 — sangria com motivo curto é bloqueada', async ({ page }) => {
    await login(page)
    await page.goto('/caixa')
    await page.getByLabel('Fundo de troco').fill('100,00')
    await page.getByRole('button', { name: 'Abrir Caixa' }).click()

    await page.getByRole('button', { name: 'Sangria / Suprimento' }).click()
    await page.getByLabel('Valor').fill('30,00')
    await page.getByLabel('Motivo').fill('Motivo curto')
    await page.getByRole('button', { name: 'Registrar' }).click()

    await expect(page.getByText('O motivo deve ter no mínimo 30 caracteres.')).toBeVisible()
  })

  test('sangria e suprimento com motivo válido são registrados', async ({ page }) => {
    await login(page)
    await page.goto('/caixa')
    await page.getByLabel('Fundo de troco').fill('100,00')
    await page.getByRole('button', { name: 'Abrir Caixa' }).click()

    await page.getByRole('button', { name: 'Sangria / Suprimento' }).click()
    await page.getByLabel('Valor').fill('30,00')
    await page.getByLabel('Motivo').fill('Retirada para pagamento de fornecedor de embalagens')
    await page.getByRole('button', { name: 'Registrar' }).click()

    await expect(page.getByText('Movimento registrado com sucesso!')).toBeVisible()
  })

  test('CEN-NOVO-11 — fechamento com diferença não bloqueia', async ({ page }) => {
    await login(page)
    await page.goto('/caixa')
    await page.getByLabel('Fundo de troco').fill('100,00')
    await page.getByRole('button', { name: 'Abrir Caixa' }).click()

    await page.getByRole('button', { name: 'Fechar Caixa', exact: true }).click()
    await page.getByLabel('Valor contado na gaveta').fill('80,00')
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar caixa' }).click()

    await expect(page.getByText('R$ 100,00')).toBeVisible() // valor esperado
    await expect(page.getByText('R$ -20,00')).toBeVisible() // diferença
    await expect(page.getByText(/nunca bloqueia|é só informativa/)).toBeVisible()

    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('heading', { name: 'Abrir o Caixa' })).toBeVisible()
  })

  test('CEN-NOVO-5 (reflexo na UI) — com turno já aberto, a tela de venda aparece direto, nunca "Abrir Caixa"', async ({ page, request }) => {
    // RN-NOVA-6 bloqueia um 2º turno no Backend (ver ProdutoBuscaCodigoBarrasIT/CaixaTurnoServiceIT
    // no repositório de backend) — no Frontend não há caminho para tentar abrir um 2º, porque
    // AbrirCaixaView só renderiza quando GET /caixa/turnos/atual não encontra nenhum.
    const token = await apiLogin(request)
    await request.post('http://localhost:8080/caixa/turnos', {
      headers: { Authorization: `Bearer ${token}` },
      data: { valorAbertura: 50 },
    })

    await login(page)
    await page.goto('/caixa')
    await expect(page.getByText('Fundo R$ 50,00')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Abrir o Caixa' })).not.toBeVisible()
  })
})
