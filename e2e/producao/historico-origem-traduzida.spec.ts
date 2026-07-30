import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducaoViaApi,
  iniciarProducaoViaApi,
  buscarProducao,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação V0.6.2 — Tradução de origem no histórico de status (Cenário 225, OpenProject #193).
 * `ORIGEM_LABEL` em `DetalheProducaoPage.tsx:33-36` (`USUARIO → 'Artesã'`, `SISTEMA → 'Sistema'`).
 */
function secaoPorTitulo(page: import('@playwright/test').Page, titulo: string) {
  return page.locator('section', { has: page.getByRole('heading', { name: titulo }) })
}

test.describe('Cenário 225 — Tradução de origem no histórico de status (#193)', () => {
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

  test('225 — transição USUARIO exibe "Artesã", transição SISTEMA (auto-trava) exibe "Sistema"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA225-InsumoBloq-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // bloqueante
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA225-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    // Auto-trava por insumo bloqueante (sem `dividir: true`) — origem SISTEMA (ProducaoService.java:440).
    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect(resIniciar.ok()).toBe(true)
    const travada = await resIniciar.json()
    expect(travada.estado).toBe('TRAVADA')

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.historicoStatus).toHaveLength(2)
    expect(producaoApi.historicoStatus[0].origem).toBe('USUARIO') // criação
    expect(producaoApi.historicoStatus[1].origem).toBe('SISTEMA') // auto-trava

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    const historico = secaoPorTitulo(page, 'Histórico de status')
    await expect(historico).toBeVisible()

    const entradas = historico.locator('div.flex.items-start.gap-3')
    await expect(entradas).toHaveCount(2)
    await expect(entradas.nth(0)).toContainText('Artesã')
    await expect(entradas.nth(0)).toContainText('Aguardando início')
    await expect(entradas.nth(1)).toContainText('Sistema')
    await expect(entradas.nth(1)).toContainText('Travada')
  })
})
