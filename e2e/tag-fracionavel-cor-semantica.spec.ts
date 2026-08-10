import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, inativarInsumo } from './helpers/api'
import { criarInsumoComEstoque } from './helpers/insumo'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #238 — Tag global fracionável/estoque negativo/estoque atual, cor semântica
 * verde (fracionável) / laranja (não fracionável), por componente individual.
 * CEN-NOVO-17/CEN-NOVO-18/CEN-NOVO-19 (DECISOES_V0.7.md, RN-NOVA-10). Componente `EstoqueTags`
 * (`components/ui/Badge.tsx`), classes `bg-success/10 text-success` (verde) e
 * `bg-orange/10 text-orange` (laranja). Cobertura representativa via Lista de Insumos — o mesmo
 * componente é reusado em ~9 telas (ver auditoria em DECISOES_V0.7.md), não testado em cada uma.
 */
test.describe('OpenProject #238 — Tag EstoqueTags: cor semântica + estoque negativo + estoque atual', () => {
  let insumoFracId: string
  let insumoNaoFracId: string

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoFracId)
    await inativarInsumo(request, token, insumoNaoFracId)
  })

  test('CEN-NOVO-17/18/19 — insumo fracionável mostra tag verde; não-fracionável mostra laranja; ambos mostram estoque negativo e estoque atual', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const nomeFrac = `QA-CEN17-InsumoFrac-${ts}`
    const fracRes = await request.post(`${API_URL}/insumos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nome: nomeFrac, unidadeMedida: 'unidade', fracionavel: true, tipoExibicaoQuantidade: 'DECIMAL',
        estoqueMinimo: 0.1, precoTotalCompraInicial: 100, quantidadeCompradaInicial: 10, permitirEstoqueNegativo: true,
      },
    })
    if (!fracRes.ok()) throw new Error(`Falha ao criar insumo fracionável: ${fracRes.status()} ${await fracRes.text()}`)
    insumoFracId = (await fracRes.json()).id

    const nomeNaoFrac = `QA-CEN17-InsumoNaoFrac-${ts}`
    const naoFrac = await criarInsumoComEstoque(request, token, nomeNaoFrac, 10, false)
    insumoNaoFracId = naoFrac.id

    await login(page)
    await page.goto('/insumos')

    const busca = page.getByPlaceholder('Buscar por nome ou marca…')

    await busca.fill(nomeFrac)
    const linhaFrac = page.locator('div', { hasText: nomeFrac }).filter({ hasText: 'em estoque' }).first()
    const tagFrac = linhaFrac.getByText('Fracionável', { exact: true }).first()
    await expect(tagFrac).toBeVisible({ timeout: 5000 })
    await expect(tagFrac).toHaveClass(/text-success/)
    await expect(linhaFrac.getByText('Permite estoque negativo', { exact: true }).first()).toBeVisible()
    await expect(linhaFrac.getByText(/em estoque/).first()).toBeVisible()

    await busca.fill('')
    await busca.fill(nomeNaoFrac)
    const linhaNaoFrac = page.locator('div', { hasText: nomeNaoFrac }).filter({ hasText: 'em estoque' }).first()
    const tagNaoFrac = linhaNaoFrac.getByText('Não fracionável', { exact: true }).first()
    await expect(tagNaoFrac).toBeVisible({ timeout: 5000 })
    await expect(tagNaoFrac).toHaveClass(/text-orange/)
    await expect(linhaNaoFrac.getByText('Bloqueia estoque negativo', { exact: true }).first()).toBeVisible()
    await expect(linhaNaoFrac.getByText(/em estoque/).first()).toBeVisible()
  })
})
