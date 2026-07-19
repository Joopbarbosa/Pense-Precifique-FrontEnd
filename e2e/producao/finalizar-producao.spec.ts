import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  buscarProducao,
  teardownProducoes,
  criarProducaoEmAndamento,
  finalizarProducao,
  finalizarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const PRODUTO_URL = 'http://localhost:8080/produtos'
const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-003 / OpenProject #120 — Finalizar Produção (Fluxo C), cenários 168-169.
 * Mesma regra dos prompts anteriores: cenários que falham documentam o delta Gherkin-vs-real
 * com file:line, não são adaptados ao comportamento observado.
 */

test.describe('Cenários 168-169 — Finalizar Produção (Fluxo C) (#120)', () => {
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

  test('168 — finalizar adiciona quantidade ao estoque do produto e registra dataTerminoReal', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA168-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA168-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producao.id)

    const produtoAntes = await (await request.get(`${PRODUTO_URL}/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await finalizarProducao(page)

    await expect(page.getByText('Finalizada').first()).toBeVisible({ timeout: 10_000 })

    const produtoDepois = await (await request.get(`${PRODUTO_URL}/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.estoqueAtual - produtoAntes.estoqueAtual).toBe(5)

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('FINALIZADA')
    expect(producaoApi.dataTerminoReal).not.toBeNull()
    const hojeISO = new Date().toISOString().slice(0, 10)
    expect(String(producaoApi.dataTerminoReal).slice(0, 10)).toBe(hojeISO)
  })

  test('169 — produção FINALIZADA não exibe nenhuma ação disponível', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA169-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA169-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const finalizada = await finalizarProducaoViaApi(request, token, producao.id)
    expect(finalizada.estado).toBe('FINALIZADA')

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Finalizada').first()).toBeVisible()
    for (const acao of ['Finalizar', 'Travar', 'Cancelar', 'Iniciar', 'Editar', 'Retomar']) {
      await expect(page.getByRole('button', { name: acao, exact: true })).toHaveCount(0)
    }
  })
})
