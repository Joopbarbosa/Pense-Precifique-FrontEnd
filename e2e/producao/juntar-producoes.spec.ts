import { E2E_API_URL } from '../helpers/target'
import { test, expect, APIRequestContext } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, criarProducaoVinculadaViaApi } from '../helpers/orcamento'
import { criarProdutoComFichaEEstoque, inativarProduto, teardownProducoes } from '../helpers/producao'
import { hojeLocal } from '../helpers/data'

const INSUMO_URL = `${E2E_API_URL}/insumos`

/**
 * V0.18.0 (#1169) — RN-NOVA-42: juntar produções de pedidos diferentes em um lote.
 * Cobre CEN-NOVO-145 (5+7 → 12), 147 (aviso de data, que não bloqueia) e 151 (a lista não traz produto diferente).
 * Entrada hostil e as demais regras de lote estão em ProducaoJuntarIT (backend).
 */
test.describe('V0.18.0/#1169 — RN-NOVA-42: juntar com outra produção (CEN-NOVO-145, 147 e 151)', () => {
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

  async function produto(request: APIRequestContext, token: string, nome: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${nome}-Insumo-${Date.now()}`, 1000, true)
    insumoIds.push(insumo.id)
    const p = await criarProdutoComFichaEEstoque(request, token, `${nome}-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 0, 12)
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

  test('CEN-NOVO-145 — 5 + 7 viram um lote de 12 e o pedido mostra "Lote PRD-nn: 5 de 12 ..."', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169a-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1169a-Maria')
    const b = await pedidoComProducao(request, token, p, 7, 'QA1169a-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    const candidatas = page.getByTestId('candidata-juntar')
    await expect(candidatas).toHaveCount(1, { timeout: 10_000 })
    await expect(candidatas.first()).toContainText(b.producao.identificador)
    await candidatas.first().click()
    await page.getByLabel('Término previsto do lote').fill(hojeLocal(1))
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    await expect(page.getByText(/Lote PRD-\d+ criado/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Entendi', exact: true }).click()

    const linha = page.getByTestId('linha-lote')
    await expect(linha).toContainText('5 de 12', { timeout: 10_000 })
    await expect(linha).toContainText('junto com')
    await expect(page.getByTestId('producao-vinculada').filter({ hasText: 'Não realizada' })).toHaveCount(1)

    const lote = page.getByTestId('producao-vinculada').filter({ has: page.getByTestId('linha-lote') })
    const href = await lote.getByRole('link', { name: 'Abrir produção', exact: true }).getAttribute('href')
    const loteId = href!.split('/').pop()!
    producaoIds.push(loteId)
    await page.goto(`/producao/${loteId}`)
    const atendidos = page.getByTestId('pedidos-atendidos')
    await expect(atendidos).toBeVisible({ timeout: 10_000 })
    await expect(atendidos).toContainText('5 ×')
    await expect(atendidos).toContainText('7 ×')
  })

  test('CEN-NOVO-147 — data do lote depois do prazo só avisa e o lote é criado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169b-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1169b-Maria')
    await pedidoComProducao(request, token, p, 7, 'QA1169b-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    await page.getByTestId('candidata-juntar').first().click({ timeout: 10_000 })
    await page.getByLabel('Término previsto do lote').fill(hojeLocal(15))
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    const avisos = page.getByTestId('avisos-juntar')
    await expect(avisos).toBeVisible({ timeout: 15_000 })
    await expect(avisos).toContainText('posterior ao prazo de entrega de')
  })

  test('CEN-NOVO-151 — a lista não traz produção de outro produto nem do mesmo pedido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1169c-Brownie')
    const outro = await produto(request, token, 'QA1169c-Cookie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1169c-Maria')
    await pedidoComProducao(request, token, outro, 7, 'QA1169c-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    await expect(page.getByTestId('sem-candidatas')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('candidata-juntar')).toHaveCount(0)
  })
})
