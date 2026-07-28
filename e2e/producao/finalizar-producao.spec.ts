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
 *
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-4 (#188): backend implementa declaração de perda ao
 * finalizar por completo (FinalizarProducaoRequest.perdas, ProducaoService.finalizar), mas
 * FinalizarProducaoModal.tsx não tem nenhum campo de perda — producaoService.finalizar(id) sempre
 * chama POST sem body. Cobertura de UI é impossível hoje; os 2 testes abaixo validam o contrato
 * via API diretamente (sem `page`). Reportado no relatório final como gap de Frontend.
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

  test('RN-NOVA-4 (#188, achado — API only) — finalizar com perda declarada incrementa só a diferença (planejado − perda)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA4a-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA4a-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 10 }])
    criadasProducaoIds.push(producao.id)

    const produtoAntes = await (await request.get(`${PRODUTO_URL}/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    const res = await request.post(`http://localhost:8080/producoes/${producao.id}/finalizar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { perdas: [{ produtoId: produto.id, quantidadePerdida: 3 }] },
    })
    expect(res.ok()).toBe(true)
    const finalizada = await res.json()
    expect(finalizada.estado).toBe('FINALIZADA')

    const produtoDepois = await (await request.get(`${PRODUTO_URL}/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.estoqueAtual - produtoAntes.estoqueAtual).toBe(7) // 10 planejado - 3 perda
  })

  test('RN-NOVA-4 (#188, achado — API only) — perda maior que a quantidade planejada é bloqueada', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA4b-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA4b-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producao.id)

    const res = await request.post(`http://localhost:8080/producoes/${producao.id}/finalizar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { perdas: [{ produtoId: produto.id, quantidadePerdida: 11 }] },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('não pode ser maior que a quantidade planejada')

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('EM_ANDAMENTO') // finalização bloqueada, nada mudou
  })
})
