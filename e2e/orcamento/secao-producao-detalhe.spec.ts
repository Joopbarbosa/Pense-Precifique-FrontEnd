import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, vincularProducaoViaApi, cancelarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComFichaEEstoque, inativarProduto, criarProducaoViaApi, teardownProducoes } from '../helpers/producao'

const INSUMO_URL = `${E2E_API_URL}/insumos`

/**
 * V0.18.0 (#1168) — RN-NOVA-41: a seção "Produção" do Detalhe do orçamento lista as produções vinculadas
 * (número, situação, início, término previsto, produtos) e substitui o card "Próximo passo".
 * Cobre CEN-NOVO-143 e 144.
 */
test.describe('V0.18.0/#1168 — RN-NOVA-41: seção Produção no Detalhe (CEN-NOVO-143 e 144)', () => {
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

  async function aprovadoComProduto(request: import('@playwright/test').APIRequestContext, token: string, tag: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${tag}-Insumo-${Date.now()}`, 1000, true)
    insumoIds.push(insumo.id)
    const produto = await criarProdutoComFichaEEstoque(request, token, `${tag}-Necessaire-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 10)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${tag}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 2 }], { sinalAtivo: false })
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    return { produto, orcamentoId: orcamento.id as string }
  }

  test('CEN-NOVO-143 — lista a produção vinculada com número, situação, término e produtos; "Abrir produção" abre nova aba', async ({ page, request, context }) => {
    const token = await apiLogin(request)
    const { produto, orcamentoId } = await aprovadoComProduto(request, token, 'QA1168a')
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    producaoIds.push(producao.id)
    await vincularProducaoViaApi(request, token, orcamentoId, producao.id)

    await login(page)
    await page.goto(`/orcamentos/${orcamentoId}`)
    const secao = page.getByTestId('secao-producao')
    await expect(secao.getByText('Produção', { exact: true })).toBeVisible({ timeout: 10_000 })
    const linha = secao.getByTestId('producao-vinculada')
    await expect(linha).toHaveCount(1)
    await expect(linha).toContainText(producao.identificador)
    await expect(linha).toContainText('Aguardando início')
    await expect(linha).toContainText('Término previsto')
    await expect(linha).toContainText('Necessaire')
    await expect(secao.getByRole('button', { name: 'Vincular outra', exact: true })).toBeVisible()

    const [nova] = await Promise.all([
      context.waitForEvent('page'),
      linha.getByRole('link', { name: 'Abrir produção', exact: true }).click(),
    ])
    await expect(nova).toHaveURL(new RegExp(`/producao/${producao.id}`))
  })

  test('CEN-NOVO-144 — sem produção vinculada mostra "Nenhuma produção vinculada" e o botão de vincular', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamentoId } = await aprovadoComProduto(request, token, 'QA1168b')

    await login(page)
    await page.goto(`/orcamentos/${orcamentoId}`)
    const secao = page.getByTestId('secao-producao')
    await expect(secao.getByText('Nenhuma produção vinculada')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Vincular produção', exact: true })).toBeVisible()
  })

  test('CEN-NOVO-144 — finalizado: a seção segue visível, sem botões de alterar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { produto, orcamentoId } = await aprovadoComProduto(request, token, 'QA1168c')
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    producaoIds.push(producao.id)
    await vincularProducaoViaApi(request, token, orcamentoId, producao.id)
    const cancelado = await cancelarOrcamentoViaApi(request, token, orcamentoId, { justificativa: 'Cliente desistiu do pedido antes da produção começar' })
    expect(cancelado.ok(), await cancelado.text()).toBeTruthy()

    await login(page)
    await page.goto(`/orcamentos/${orcamentoId}`)
    const secao = page.getByTestId('secao-producao')
    await expect(secao).toBeVisible({ timeout: 10_000 })
    await expect(secao.getByRole('button', { name: 'Vincular outra' })).toHaveCount(0)
    await expect(secao.getByRole('button', { name: /Desvincular/ })).toHaveCount(0)
  })
})
