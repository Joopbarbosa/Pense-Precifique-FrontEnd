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
 * Achado de homologação: NENHUM dos dois parâmetros é construído ou enviado pelo frontend hoje —
 * `producaoService.listar` (`src/services/producaoService.ts`) só aceita
 * `{ busca?, estado?, sort?, page?, size? }`, sem `dataInicioDe`/`dataInicioAte`; não há nenhum
 * campo de input de data na UI de filtro da Listagem nem do Kanban (`ListaProducaoPage.tsx`,
 * confirmado por grep sem ocorrências de `dataInicioDe`/`dataInicioAte`/`DataInicioDe` em todo
 * `src/`). Cobertura de UI é impossível hoje — os testes abaixo validam o contrato via API
 * diretamente (sem `page`), e o último confirma explicitamente a ausência do controle na tela.
 * Reportado no relatório final como gap de Frontend a ser aberto no OpenProject.
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

  test('achado: nenhum campo de data de filtro existe na tela de Listagem/Kanban', async ({ page }) => {
    await login(page)
    await page.goto('/producao')
    await expect(page.locator('input[type="date"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('input[type="date"]')).toHaveCount(0)
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
