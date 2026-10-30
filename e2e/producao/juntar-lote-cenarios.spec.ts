import { E2E_API_URL } from '../helpers/target'
import { test, expect, APIRequestContext } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, criarProducaoVinculadaViaApi } from '../helpers/orcamento'
import { criarProdutoComFichaEEstoque, inativarProduto, teardownProducoes, iniciarProducao } from '../helpers/producao'
import { hojeLocal } from '../helpers/data'

const INSUMO_URL = `${E2E_API_URL}/insumos`

/**
 * V0.18.0 (#1169) — RN-NOVA-42/43: cenários de lote (CEN-NOVO-146, 148 e 150) pela interface.
 * CEN-NOVO-149 (pedido aprovado passa de 5 para 8) não tem caminho de tela nem de API: a edição de
 * orçamento fora de RASCUNHO devolve 400. Fica coberto por ProducaoJuntarIT (backend), que altera o item direto.
 */
test.describe('V0.18.0/#1169 — lote: soma arredondada, cancelamento de pedido do lote e insumo faltando', () => {
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

  async function produto(request: APIRequestContext, token: string, nome: string, estoqueInsumo = 1000, qtdPorUnidade = 1, permitirNegativo = true) {
    const insumo = await criarInsumoComEstoque(request, token, `${nome}-Insumo-${Date.now()}`, estoqueInsumo, permitirNegativo)
    insumoIds.push(insumo.id)
    const p = await criarProdutoComFichaEEstoque(request, token, `${nome}-${Date.now()}`, [{ insumoId: insumo.id, quantidade: qtdPorUnidade }], 0, 12)
    produtoIds.push(p.id)
    return p
  }

  async function pedidoComProducao(request: APIRequestContext, token: string, p: { id: string }, quantidade: number, cliente: string) {
    const c = await criarCliente(request, token, `${cliente}-${Date.now()}`)
    const orc = await criarOrcamentoViaApi(request, token, c.id,
      [{ produtoId: p.id, precoUnitario: 20, margemAplicada: 50, quantidade }], { prazoProducaoDias: 1, dataInicioEstimada: hojeLocal() })
    await avancarStatusViaApi(request, token, orc.id) // ENVIADO
    await avancarStatusViaApi(request, token, orc.id) // APROVADO
    const [vinculo] = await criarProducaoVinculadaViaApi(request, token, orc.id, {
      dataTerminoPrevista: hojeLocal(),
      quantidadesProducao: [{ produtoId: p.id, quantidade: 12 }],
    })
    const producao = { id: vinculo.producaoId as string, identificador: vinculo.identificadorProducao as string }
    producaoIds.push(producao.id)
    return { orcamentoId: orc.id as string, producao }
  }

  /** Junta a produção `b` na `a` pela API e devolve o id do lote. */
  async function juntar(request: APIRequestContext, token: string, a: string, b: string) {
    const res = await request.post(`${E2E_API_URL}/producoes/${a}/juntar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { producaoOutraIds: [b], dataInicio: hojeLocal(), dataTerminoPrevista: hojeLocal(1) },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const lote = await res.json()
    const id = lote.producaoNova.id as string
    producaoIds.push(id)
    return id
  }

  test('CEN-NOVO-146 — 5 + 4 viram lote de 12 (soma 9 arredondada), sobra informativa e sem bloqueio', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169c-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1169c-Maria')
    await pedidoComProducao(request, token, p, 4, 'QA1169c-Ana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    await page.getByTestId('candidata-juntar').first().click({ timeout: 10_000 })
    await page.getByLabel('Término previsto do lote').fill(hojeLocal(1))
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    await expect(page.getByText(/Lote PRD-\d+ criado/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('avisos-juntar')).toHaveCount(0)
    await page.getByRole('button', { name: 'Entendi', exact: true }).click()

    const linha = page.getByTestId('linha-lote')
    await expect(linha).toContainText('5 de 12', { timeout: 10_000 })
    await expect(page.getByTestId('aviso-excedente-lote')).toHaveCount(0)
  })

  test('CEN-NOVO-148 — cancelar o pedido da Juliana: aviso do lote; "Não, manter a produção" mantém o lote só com a Maria', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169d-Brownie')
    const maria = await pedidoComProducao(request, token, p, 5, 'QA1169d-Maria')
    const juliana = await pedidoComProducao(request, token, p, 7, 'QA1169d-Juliana')
    const loteId = await juntar(request, token, maria.producao.id, juliana.producao.id)

    await login(page)
    await page.goto(`/orcamentos/${juliana.orcamentoId}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByTestId('aviso-cancelar-lote')).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Não, manter a produção' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect.poll(async () => {
      const res = await request.get(`${E2E_API_URL}/producoes/${loteId}`, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json()
      return `${body.estado}|${(body.pedidosAtendidos ?? []).length}`
    }, { timeout: 15_000 }).toBe('AGUARDANDO_INICIO|1')
  })

  test('CEN-NOVO-148 — cancelar o pedido da Juliana com "Sim, cancelar a produção": lote Cancelado e Maria sem produção vinculada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169e-Brownie')
    const maria = await pedidoComProducao(request, token, p, 5, 'QA1169e-Maria')
    const juliana = await pedidoComProducao(request, token, p, 7, 'QA1169e-Juliana')
    const loteId = await juntar(request, token, maria.producao.id, juliana.producao.id)

    await login(page)
    await page.goto(`/orcamentos/${juliana.orcamentoId}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByTestId('aviso-cancelar-lote')).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Sim, cancelar a produção' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect.poll(async () => {
      const res = await request.get(`${E2E_API_URL}/producoes/${loteId}`, { headers: { Authorization: `Bearer ${token}` } })
      return (await res.json()).estado
    }, { timeout: 15_000 }).toBe('CANCELADA')
    const orcMaria = await (await request.get(`${E2E_API_URL}/orcamentos/${maria.orcamentoId}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(orcMaria.status).toBe('APROVADO')
    // a produção original da Maria segue só como histórico (Não realizada); o vínculo com o lote sai
    expect((orcMaria.producoesVinculadas ?? []).filter((v: { producaoId: string }) => v.producaoId === loteId)).toHaveLength(0)
  })

  test('CEN-NOVO-150 — insumo faltando trava o lote inteiro e "Dividir produção" não é oferecido', async ({ page, request }) => {
    const token = await apiLogin(request)
    // estoque 2, cada unidade usa 3, sem estoque negativo: o lote de 12 não tem como começar
    const p = await produto(request, token, 'QA1169f-Brownie', 2, 3, false)
    const maria = await pedidoComProducao(request, token, p, 5, 'QA1169f-Maria')
    const juliana = await pedidoComProducao(request, token, p, 7, 'QA1169f-Juliana')
    const loteId = await juntar(request, token, maria.producao.id, juliana.producao.id)

    await login(page)
    await page.goto(`/producao/${loteId}`)
    await iniciarProducao(page)
    await expect(page.getByText('Produção travada automaticamente')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('lote-sem-dividir')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dividir produção' })).toHaveCount(0)
  })
})
