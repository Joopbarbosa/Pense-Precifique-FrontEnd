import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-2 (#184/#192): backend implementa filtro opcional por
 * intervalo de dataInicio em GET /producoes (`dataInicioDe`/`dataInicioAte`, usado tanto pela
 * Listagem quanto pelo Kanban, já que os dois consomem o mesmo endpoint — ver backend CLAUDE.md).
 *
 * Atualizado em P-FE-CORRIGE-022: o gap de UI relatado originalmente (nenhum campo de data na
 * Listagem/Kanban) foi corrigido em P-FE-CORRIGE-004 — `ListaProducaoPage.tsx` já tem os campos
 * "Data de início — de/até" (aria-label) em ambas as visões. Os 3 primeiros testes seguem
 * validando o contrato via API diretamente; o último agora valida o filtro end-to-end pela UI
 * (existência dos campos + resultado filtrado corretamente), em vez de confirmar a ausência.
 */

test.describe('RN-NOVA-2 (#184/#192) — Filtro de intervalo de dataInicio em GET /producoes', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadasProducaoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadasProducaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, criadasProducaoIds)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('filtro por intervalo de dataInicio retorna só as produções dentro do período (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA2-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA2-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const dentro1 = await criarProducaoComData(request, token, produto.id, '2026-08-01')
    const dentro2 = await criarProducaoComData(request, token, produto.id, '2026-08-10')
    const fora = await criarProducaoComData(request, token, produto.id, '2026-09-01')
    criadasProducaoIds.push(dentro1.id, dentro2.id, fora.id)

    const res = await request.get(
      `${API_URL}/producoes?busca=${encodeURIComponent(nomeProduto)}&dataInicioDe=2026-08-01&dataInicioAte=2026-08-31`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const ids = body.content.map((p: { id: string }) => p.id)
    expect(ids.sort()).toEqual([dentro1.id, dentro2.id].sort())
  })

  test('sem filtro (parâmetros ausentes) mantém comportamento atual — sem corte de período (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA2b-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA2b-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const p1 = await criarProducaoComData(request, token, produto.id, '2026-01-01')
    const p2 = await criarProducaoComData(request, token, produto.id, '2026-12-31')
    criadasProducaoIds.push(p1.id, p2.id)

    const res = await request.get(`${API_URL}/producoes?busca=${encodeURIComponent(nomeProduto)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const ids = body.content.map((p: { id: string }) => p.id)
    expect(ids.sort()).toEqual([p1.id, p2.id].sort())
  })

  test('intervalo sem correspondência retorna página vazia, sem erro (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA2c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA2c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const p1 = await criarProducaoComData(request, token, produto.id, '2026-08-01')
    criadasProducaoIds.push(p1.id)

    const res = await request.get(
      `${API_URL}/producoes?busca=${encodeURIComponent(nomeProduto)}&dataInicioDe=2027-01-01&dataInicioAte=2027-01-31`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.content).toEqual([])
    expect(body.totalElements).toBe(0)
  })

  test('filtro de intervalo de data funciona pela UI, na Listagem e no Kanban', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA2d-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA2d-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const dentro = await criarProducaoComData(request, token, produto.id, '2026-08-05')
    const fora = await criarProducaoComData(request, token, produto.id, '2026-09-05')
    criadasProducaoIds.push(dentro.id, fora.id)

    await login(page)
    await page.goto('/producao')
    await page.locator('input[placeholder*="Buscar por produto"]').fill(nomeProduto)
    await page.waitForTimeout(600)

    // Antes do filtro de data: as duas produções aparecem na Listagem.
    await expect(page.getByText(dentro.identificador, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(fora.identificador, { exact: true }).first()).toBeVisible()

    const campoDe = page.locator('[aria-label="Data de início — de"]').first()
    const campoAte = page.locator('[aria-label="Data de início — até"]').first()
    await expect(campoDe).toHaveCount(1)
    await expect(campoAte).toHaveCount(1)
    await campoDe.fill('2026-08-01')
    await campoAte.fill('2026-08-31')
    await page.waitForTimeout(600)

    await expect(page.getByText(dentro.identificador, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(fora.identificador, { exact: true })).toHaveCount(0)

    // Kanban consome o mesmo filtro de data, sem precisar reconfigurar.
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(700)
    await expect(page.locator('[aria-label="Data de início — de"]').first()).toHaveValue('2026-08-01')
    await expect(page.getByText(dentro.identificador, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(fora.identificador, { exact: true })).toHaveCount(0)
  })
})

async function criarProducaoComData(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  produtoId: string,
  dataInicio: string
) {
  const d = new Date(`${dataInicio}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const dataTerminoPrevista = d.toISOString().slice(0, 10)
  const res = await request.post(`${API_URL}/producoes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataInicio, dataTerminoPrevista, produtos: [{ produtoId, quantidade: 1 }] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produção com dataInicio: ${res.status()} ${await res.text()}`)
  return res.json()
}
