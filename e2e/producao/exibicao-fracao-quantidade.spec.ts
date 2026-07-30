import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducaoEmAndamento,
} from '../helpers/producao'
import { criarInsumoFracionavel } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação V0.6.2 — Extensão `tipoExibicaoQuantidade` (Cenário 226, atualiza Cenário 222/
 * RN-NOVA-1). `formatQuantidade` (`src/utils/quantidade.ts`) agora está de fato wired em
 * `ConsumoRealSection.tsx:39` e `DetalheProducaoPage.tsx:279` — o Cenário 222 (Pocket V0.6.1)
 * registrava "fora do escopo de automação E2E" porque na época o campo não tinha nenhum reflexo
 * visível no frontend; isso deixou de ser verdade nesta rodada.
 */
test.describe('Cenário 226 — Exibição em fração (FRACAO/DECIMAL) de quantidade consumida (#186 ext.)', () => {
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

  test('226a — insumo FRACAO com consumo de 0,5 exibe o glifo ½ no Detalhe e em Consumo real', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA226a-InsumoFracao-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 1000, 'FRACAO')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA226a-Produto-${Date.now()}`
    // ficha 0.5/unidade, rendimento 1, quantidade produzida 1 → consumo = 0.5
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 0.5 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Insumos consumidos')).toBeVisible()
    await expect(page.getByText(nomeInsumo)).toBeVisible()
    await expect(page.getByText('½', { exact: false })).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByText('Cancelar produção')).toBeVisible()
    await expect(page.getByTestId(`consumo-real-item-${insumo.id}`)).toBeVisible()
    await expect(page.getByTestId(`consumo-real-item-${insumo.id}`)).toContainText('½')
  })

  test('226b — insumo DECIMAL com o mesmo consumo (0,5) exibe formato decimal normal, sem glifo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA226b-InsumoDecimal-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 1000, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA226b-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 0.5 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Insumos consumidos')).toBeVisible()
    await expect(page.getByText(nomeInsumo)).toBeVisible()
    await expect(page.getByText('0,5', { exact: false })).toBeVisible()
    await expect(page.getByText('½')).toHaveCount(0)
  })

  test('226c — FRACAO sem denominador conhecido cai para decimal (fallback)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA226c-InsumoFracaoSemGlifo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 1000, 'FRACAO')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA226c-Produto-${Date.now()}`
    // 0.11 não corresponde a nenhuma fração comum (denominadores 2,3,4,5,6,8, tolerância 0.01).
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 0.11 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Insumos consumidos')).toBeVisible()
    await expect(page.getByText(nomeInsumo)).toBeVisible()
    await expect(page.getByText('0,11', { exact: false })).toBeVisible()
  })
})
