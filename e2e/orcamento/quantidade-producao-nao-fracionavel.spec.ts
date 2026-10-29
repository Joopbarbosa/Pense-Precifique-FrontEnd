import { E2E_API_URL } from '../helpers/target'
import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFichaEEstoque, inativarProduto, teardownProducoes } from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'
import { hojeLocal } from '../helpers/data'

const INSUMO_URL = `${E2E_API_URL}/insumos`

test.describe.configure({ timeout: 90_000 })

/**
 * V0.18.0 (#1166) — RN-NOVA-39: produto com insumo não fracionável só produz em múltiplos do
 * rendimento. A janela "Criar produção (N)" do Detalhe pergunta, uma vez por produto, a quantidade
 * a produzir, preenchida com o menor múltiplo que cobre o pedido, e mostra a sobra.
 * Cobre CEN-NOVO-134 a 137. O corpo hostil por endpoint fica no backend (OrcamentoQuantidadeProducaoNaoFracionavelIT).
 */
test.describe('V0.18.0/#1166 — RN-NOVA-39: quantidade a produzir de produto não fracionável (CEN-NOVO-134 a 137)', () => {
  let produtoIds: string[] = []
  let insumoIds: string[] = []
  let producaoIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
    insumoIds = []
    producaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, producaoIds)
    for (const id of produtoIds) await inativarProduto(request, token, id)
    for (const id of insumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function produtoNaoFracionavel(request: import('@playwright/test').APIRequestContext, token: string, nome: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${nome}-Insumo-${Date.now()}`, 1000, false)
    insumoIds.push(insumo.id)
    const produto = await criarProdutoComFichaEEstoque(request, token, `${nome}-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 0, 12)
    produtoIds.push(produto.id)
    return produto
  }

  async function abrirJanela(page: Page, orcamentoId: string, quantas: number) {
    await login(page)
    await page.goto(`/orcamentos/${orcamentoId}`)
    const caixas = page.locator('input[type="checkbox"]')
    await expect(caixas.first()).toBeVisible({ timeout: 10_000 })
    for (let i = 0; i < quantas; i++) await caixas.nth(i).click()
    await page.getByRole('button', { name: `Criar produção (${quantas})`, exact: true }).click()
    await page.locator('input[type="date"]').last().fill(hojeLocal(1))
  }

  async function orcamentoCom(request: import('@playwright/test').APIRequestContext, token: string, itens: { id: string; quantidade: number }[]) {
    const cliente = await criarCliente(request, token, `QA-R39-Cliente-${Date.now()}`)
    return criarOrcamentoViaApi(
      request,
      token,
      cliente.id,
      itens.map((i) => ({ produtoId: i.id, margemAplicada: 50, precoUnitario: 20, quantidade: i.quantidade }))
    )
  }

  test('CEN-NOVO-134 — pedido de 5 com receita de 12 sugere 12 e mostra a sobra de 7', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await produtoNaoFracionavel(request, token, 'QA-R39a-Brownie')
    const orcamento = await orcamentoCom(request, token, [{ id: produto.id, quantidade: 5 }])
    await abrirJanela(page, orcamento.id, 1)

    const campo = page.getByLabel(`Quantidade a produzir de ${produto.nome}`)
    await expect(campo).toHaveValue('12')
    await expect(page.getByText(`Sobram 7 unidades no estoque de ${produto.nome}`)).toBeVisible()
    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()
    await expect(page.getByText('Produção criada e vinculada a este orçamento.')).toBeVisible({ timeout: 10_000 })
  })

  test('CEN-NOVO-135 — pedido de 13 sugere 24 (sobram 11); aceita 36; 24 é aceito sem sobra', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await produtoNaoFracionavel(request, token, 'QA-R39b-Brownie')
    const orcamento = await orcamentoCom(request, token, [{ id: produto.id, quantidade: 13 }])
    await abrirJanela(page, orcamento.id, 1)

    const campo = page.getByLabel(`Quantidade a produzir de ${produto.nome}`)
    await expect(campo).toHaveValue('24')
    await expect(page.getByText(`Sobram 11 unidades no estoque de ${produto.nome}`)).toBeVisible()
    await campo.fill('36')
    await expect(page.getByText(/múltiplos de 12/)).toHaveCount(0)
    await expect(page.getByText(`Sobram 23 unidades no estoque de ${produto.nome}`)).toBeVisible()
  })

  test('CEN-NOVO-136 — quantidade fora do múltiplo ou abaixo do mínimo bloqueia e não cria a produção', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await produtoNaoFracionavel(request, token, 'QA-R39c-Brownie')
    const orcamento = await orcamentoCom(request, token, [{ id: produto.id, quantidade: 13 }])
    await abrirJanela(page, orcamento.id, 1)

    const campo = page.getByLabel(`Quantidade a produzir de ${produto.nome}`)
    for (const invalido of ['20', '6']) {
      await campo.fill(invalido)
      await expect(page.getByText('Exige quantidade em múltiplos de 12 unidades (mínimo 24).')).toBeVisible()
      await page.getByRole('button', { name: 'Criar produção', exact: true }).click()
      await expect(page.getByText('Produção criada e vinculada a este orçamento.')).toHaveCount(0)
    }
    const res = await request.get(`${E2E_API_URL}/orcamentos/${orcamento.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await res.json()).producoesVinculadas ?? []).toHaveLength(0)
  })

  test('CEN-NOVO-137 — dois não fracionáveis perguntam uma vez cada; produto fracionável não pergunta', async ({ page, request }) => {
    const token = await apiLogin(request)
    const a = await produtoNaoFracionavel(request, token, 'QA-R39d-A')
    const b = await produtoNaoFracionavel(request, token, 'QA-R39d-B')
    const insumoFrac = await criarInsumoFracionavel(request, token, `QA-R39d-Frac-${Date.now()}`, 100, 'DECIMAL')
    insumoIds.push(insumoFrac.id)
    const c = await criarProdutoComFichaEEstoque(request, token, `QA-R39d-C-${Date.now()}`, [{ insumoId: insumoFrac.id, quantidade: 1 }], 0, 12)
    produtoIds.push(c.id)
    const orcamento = await orcamentoCom(request, token, [
      { id: a.id, quantidade: 5 },
      { id: b.id, quantidade: 13 },
      { id: c.id, quantidade: 5 },
    ])
    await abrirJanela(page, orcamento.id, 3)

    await expect(page.getByLabel(`Quantidade a produzir de ${a.nome}`)).toHaveValue('12')
    await expect(page.getByLabel(`Quantidade a produzir de ${b.nome}`)).toHaveValue('24')
    await expect(page.getByLabel(`Quantidade a produzir de ${c.nome}`)).toHaveCount(0)
    await expect(page.getByTestId('quantidades-producao').locator('label')).toHaveCount(2)
  })
})
