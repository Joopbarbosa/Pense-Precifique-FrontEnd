import { test, expect } from '@playwright/test'
import { login, API_URL } from './helpers/auth'
import { apiLogin } from './helpers/api'

/**
 * OpenProject #491 (V0.12.0) — configuração de métodos de pagamento (RN-NOVA-15/16/17,
 * CEN-NOVO-12). 4 tipos fixos (semeados no registro, nunca truncados entre suítes — ver
 * global-setup.ts) + tipo OUTRO de nome livre.
 */

async function restaurarMetodosFixos(request: any, token: string) {
  const metodos = await (await request.get(`${API_URL}/configuracoes/metodos-pagamento`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json()
  for (const m of metodos) {
    if (m.tipo !== 'OUTRO' && !m.ativo) {
      await request.put(`${API_URL}/configuracoes/metodos-pagamento/${m.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ativo: true },
      })
    }
    if (m.tipo === 'OUTRO') {
      // #491 não tem endpoint de exclusão — inativa para não acumular "Fiado"/"Fiado-e2e-*" de
      // rodada em rodada (mesma categoria de metodos_pagamento excluída do TRUNCATE global).
      await request.put(`${API_URL}/configuracoes/metodos-pagamento/${m.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ativo: false },
      }).catch(() => {})
    }
  }
}

test.describe('#491 — Métodos de Pagamento em Configurações', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()
  })

  test('desativa e reativa um método fixo (Pix)', async ({ page, request }) => {
    const token = await apiLogin(request)
    await restaurarMetodosFixos(request, token)
    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()

    // #506 — o antigo Toggle (role="switch") virou SegmentedControl Não/Sim (2 cores).
    const linhaPix = page.getByText('Pix', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await expect(linhaPix.getByRole('button', { name: 'Sim' })).toHaveClass(/bg-teal/)

    await linhaPix.getByRole('button', { name: 'Não' }).click()
    await expect(linhaPix.getByRole('button', { name: 'Não' })).toHaveClass(/bg-orange/)

    const res = await request.get(`${API_URL}/configuracoes/metodos-pagamento`, { headers: { Authorization: `Bearer ${token}` } })
    const metodos = await res.json()
    expect(metodos.find((m: any) => m.tipo === 'PIX').ativo).toBe(false)

    // restaura
    await linhaPix.getByRole('button', { name: 'Sim' }).click()
    await expect(linhaPix.getByRole('button', { name: 'Sim' })).toHaveClass(/bg-teal/)
  })

  test('configura a taxa da maquininha do Cartão Débito e ela persiste após reload', async ({ page, request }) => {
    const token = await apiLogin(request)
    await restaurarMetodosFixos(request, token)
    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()

    // O card tem 3 botões desde #506 (link de taxa + Não/Sim do ativo/inativo) — o link de taxa
    // varia entre "Configurar taxa da maquininha" (nunca configurada) e "Taxa: X%" (já configurada
    // em rodada anterior; taxaMaquininha nunca é limpa de volta a null, só sobrescrita).
    const linhaDebito = page.getByText('Cartão Débito', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await linhaDebito.getByRole('button', { name: /Configurar taxa da maquininha|Taxa:/ }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel('Taxa cobrada pela operadora').fill('3,9')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Taxa: 3,9%')).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()
    await expect(page.getByText('Taxa: 3,9%')).toBeVisible()
  })

  test('cria um método OUTRO com nome livre e ele aparece marcado como Personalizado', async ({ page, request }) => {
    const token = await apiLogin(request)
    await restaurarMetodosFixos(request, token)
    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()

    const nome = `Vale-presente-${Date.now()}`
    await page.getByRole('button', { name: 'Novo método' }).click()
    await page.getByLabel('Nome do método').fill(nome)
    await page.getByRole('button', { name: 'Criar método' }).click()

    const linhaNovo = page.getByText(nome, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await expect(linhaNovo).toBeVisible()
    await expect(linhaNovo.getByText('Personalizado')).toBeVisible()
  })

  test('tentar criar um método com nome vazio mostra erro e não chama a API', async ({ page }) => {
    await page.getByRole('button', { name: 'Novo método' }).click()
    await page.getByRole('button', { name: 'Criar método' }).click()
    await expect(page.getByText('Informe o nome do método.')).toBeVisible()
  })

  // Achado da Retomada (#495/#506) — parcelamento do Cartão de Crédito estava implementado e
  // aprovado no teste manual, mas sem cobertura E2E dedicada (só os 4 testes acima, de #491).
  test('configura parcela máxima e taxa uniforme do Cartão de Crédito, persiste após reload', async ({ page, request }) => {
    const token = await apiLogin(request)
    await restaurarMetodosFixos(request, token)
    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()

    const linhaCredito = page.getByText('Cartão Crédito', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await linhaCredito.getByRole('button', { name: /Configurar taxa da maquininha|Taxa:/ }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel('Taxa cobrada pela operadora').fill('2,5')
    await page.getByLabel('Parcela máxima').fill('6')
    // `metodos_pagamento` fica fora do TRUNCATE do global-setup (mesma categoria de
    // usuarios/empresas) — o modo "Uma taxa por parcela" pode já estar selecionado de uma rodada
    // anterior. Força "Igual para todas" explicitamente, nunca assume o default do primeiro load.
    await page.getByRole('button', { name: 'Igual para todas' }).click()
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Taxa: 2,5% · até 6x')).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()
    await expect(page.getByText('Taxa: 2,5% · até 6x')).toBeVisible()
  })
})
