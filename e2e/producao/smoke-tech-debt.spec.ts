import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`
const PRODUTO_URL = `${API_URL}/produtos`

/**
 * Smoke test de tech debt — OpenProject #127 (uniformização do mínimo de observação de baixa
 * manual para 30 chars) e #148 (motivo real gravado em vez de hardcoded).
 *
 * Achados de leitura de código:
 * - Motivos reais aceitos por `POST /insumos/{id}/baixa-manual` e `POST /produtos/{id}/baixa-manual`
 *   (`constants/motivosBaixa.ts:1-15`, espelhando `types/insumo.ts:41` e `types/produto.ts:65`):
 *   `PERDA | AVARIA | USO_EXTRA | CORRECAO | OUTRO`. O prompt pede o motivo `CORRECAO_ESTOQUE`,
 *   que **não existe** — o valor real é `CORRECAO` ("Correção de estoque" é só o label de
 *   exibição). Testado abaixo com o valor real `CORRECAO`.
 * - `observacao` mínimo 30 chars em ambos os endpoints, uniformizado no #127 (backend
 *   `CLAUDE.md`: "Todos os campos de justificativa/observação... mínimo 30 caracteres —
 *   uniformizado no #127").
 * - #148: `InsumoServiceImpl.baixaManual()` grava `request.motivo()` (antes hardcoded para
 *   `BAIXA_MANUAL`) — o frontend já enviava o valor `api` do motivo selecionado desde antes
 *   (`DetalheInsumoPage.tsx:101-105`/`DetalheProdutoPage.tsx:123-127` enviam `motivo` do estado,
 *   nunca `motivoLabel`), então a verificação de rede abaixo confirma que o contrato do frontend
 *   sempre esteve correto — o bug do #148 era exclusivamente do backend ignorando o campo.
 */

const pad = (base: string, tamanho: number) =>
  base.length >= tamanho ? base.slice(0, tamanho) : base + '9'.repeat(tamanho - base.length)

const OBS_30 = pad('Observacao de teste smoke QA-005 tech debt #127', 30)
const OBS_29 = pad('Observacao de teste smoke QA-005 tech debt #127', 29)

const MOTIVOS_REAIS = ['PERDA', 'AVARIA', 'USO_EXTRA', 'CORRECAO', 'OUTRO'] as const

test.describe('Smoke tech debt — #127 (obs 30 chars) e #148 (motivo real)', () => {
  let criadosInsumoIds: string[] = []
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosInsumoIds = []
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('baixa-manual de insumo aceita obs=30 e rejeita obs=29 para cada motivo real', async ({ request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA-SMOKE-Insumo-${Date.now()}`, 1000, false)
    criadosInsumoIds.push(insumo.id)

    for (const motivo of MOTIVOS_REAIS) {
      const ok = await request.post(`${INSUMO_URL}/${insumo.id}/baixa-manual`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantidade: 1, motivo, observacao: OBS_30 },
      })
      expect(ok.status(), `insumo/${motivo}/obs30`).toBe(201)

      const rejeitado = await request.post(`${INSUMO_URL}/${insumo.id}/baixa-manual`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantidade: 1, motivo, observacao: OBS_29 },
      })
      expect(rejeitado.status(), `insumo/${motivo}/obs29`).toBe(400)
    }
  })

  test('baixa-manual de produto aceita obs=30 e rejeita obs=29 para cada motivo real', async ({ request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA-SMOKE-Produto-${Date.now()}`, 1000)
    criadosProdutoIds.push(produto.id)

    for (const motivo of MOTIVOS_REAIS) {
      const ok = await request.post(`${PRODUTO_URL}/${produto.id}/baixa-manual`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantidade: 1, motivo, observacao: OBS_30 },
      })
      expect(ok.status(), `produto/${motivo}/obs30`).toBe(201)

      const rejeitado = await request.post(`${PRODUTO_URL}/${produto.id}/baixa-manual`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantidade: 1, motivo, observacao: OBS_29 },
      })
      expect(rejeitado.status(), `produto/${motivo}/obs29`).toBe(400)
    }
  })

  test('UI de insumo envia o valor de API do motivo (CORRECAO), não o label de exibição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA-SMOKE-UI-Insumo-${Date.now()}`, 100, false)
    criadosInsumoIds.push(insumo.id)

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/baixa-manual') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto(`/insumos/${insumo.id}`)
    await page.getByRole('button', { name: 'Baixa manual', exact: true }).click()
    // getByPlaceholder('3') sem exact colide com a textarea de observação (placeholder de exemplo
    // contém "3 folhas...") — exact:true escopa só o input de quantidade.
    await page.getByPlaceholder('3', { exact: true }).fill('1')
    // Trigger e opções do dropdown de motivo vivem dentro do mesmo <label> (DetalheInsumoPage.tsx:139-168)
    // — .first() pega o botão-gatilho (rótulo atual), nunca uma das opções da lista aberta.
    await page.locator('label', { hasText: /^Motivo/ }).locator('button').first().click()
    await page.getByRole('button', { name: 'Correção de estoque', exact: true }).click()
    await page.getByPlaceholder(/Descreva o motivo da baixa/).fill(OBS_30)
    await page.getByRole('button', { name: 'Registrar baixa', exact: true }).click()

    await expect.poll(() => payloads.length, { timeout: 5000 }).toBeGreaterThan(0)
    console.log('PAYLOAD baixa-manual insumo (motivo Correção de estoque):', payloads[0])
    expect(JSON.parse(payloads[0]).motivo).toBe('CORRECAO')
  })

  test('UI de produto envia o valor de API do motivo (USO_EXTRA), não o label de exibição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA-SMOKE-UI-Produto-${Date.now()}`, 100)
    criadosProdutoIds.push(produto.id)

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/baixa-manual') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto(`/produtos/${produto.id}`)
    await page.getByRole('button', { name: 'Baixa manual', exact: true }).click()
    await page.getByPlaceholder('1', { exact: true }).fill('1')
    // Trigger e opções do dropdown de motivo vivem dentro do mesmo <label> (DetalheProdutoPage.tsx:172-204)
    // — .first() pega o botão-gatilho (rótulo atual), nunca uma das opções da lista aberta.
    await page.locator('label', { hasText: /^Motivo/ }).locator('button').first().click()
    await page.getByRole('button', { name: 'Uso extra', exact: true }).click()
    await page.getByPlaceholder(/Descreva o motivo da baixa/).fill(OBS_30)
    await page.getByRole('button', { name: 'Registrar baixa', exact: true }).click()

    await expect.poll(() => payloads.length, { timeout: 5000 }).toBeGreaterThan(0)
    console.log('PAYLOAD baixa-manual produto (motivo Uso extra):', payloads[0])
    expect(JSON.parse(payloads[0]).motivo).toBe('USO_EXTRA')
  })
})
