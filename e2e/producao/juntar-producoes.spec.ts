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
 * Cobre CEN-NOVO-145 (5+7 → 12) e 147 (aviso de data, que não bloqueia). V0.18.0/#1184 (RN-NOVA-48/49) substituiu o CEN-NOVO-151: a lista traz qualquer produto (162), Em andamento escolhível (164, R5) e a seção do período (165).
 * Entrada hostil e as demais regras de lote estão em ProducaoJuntarIT (backend).
 */
test.describe('V0.18.0/#1169 — RN-NOVA-42: juntar com outra produção (CEN-NOVO-145, 147, 162, 164 e 165)', () => {
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
    const candidatas = page.getByTestId('candidata-juntar').filter({ hasText: b.producao.identificador })
    await expect(candidatas).toHaveCount(1, { timeout: 10_000 })
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
    const b = await pedidoComProducao(request, token, p, 7, 'QA1169b-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    await page.getByTestId('candidata-juntar').filter({ hasText: b.producao.identificador }).click({ timeout: 10_000 })
    await page.getByLabel('Término previsto do lote').fill(hojeLocal(15))
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    const avisos = page.getByTestId('avisos-juntar')
    await expect(avisos).toBeVisible({ timeout: 15_000 })
    await expect(avisos).toContainText('posterior ao prazo de entrega de')
  })

  test('CEN-NOVO-162 — a lista traz produção de outro produto e juntar mantém uma linha por produto', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1184a-Brownie')
    const outro = await produto(request, token, 'QA1184a-Cookie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1184a-Maria')
    const b = await pedidoComProducao(request, token, outro, 7, 'QA1184a-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    // com RN-NOVA-48 a lista traz qualquer produto; sobras de outros testes podem aparecer, então filtra pelo PRD
    const candidata = page.getByTestId('candidata-juntar').filter({ hasText: b.producao.identificador })
    await expect(candidata).toHaveCount(1, { timeout: 10_000 })
    await candidata.click()
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    await expect(page.getByText(/Lote PRD-\d+ criado/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Entendi', exact: true }).click()
    const linha = page.getByTestId('linha-lote')
    await expect(linha).toContainText('QA1184a-Brownie', { timeout: 10_000 })
    await expect(linha).toContainText('QA1184a-Cookie')
  })

  test('CEN-NOVO-164 (R5) — produção Em andamento aparece com a situação e pode ser escolhida', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1191a-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1191a-Maria')
    const b = await pedidoComProducao(request, token, p, 7, 'QA1191a-Juliana')
    const iniciar = await request.post(`${E2E_API_URL}/producoes/${b.producao.id}/iniciar`, { headers: { Authorization: `Bearer ${token}` }, data: {} })
    expect(iniciar.ok()).toBeTruthy()

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    const candidata = page.getByTestId('candidata-juntar').filter({ hasText: b.producao.identificador })
    await expect(candidata).toHaveCount(1, { timeout: 10_000 })
    await expect(candidata.getByTestId('candidata-situacao')).toContainText('Em andamento')
    await expect(candidata.locator('input[type=checkbox]')).toBeEnabled()
    await candidata.click()
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    await expect(page.getByText(/Lote PRD-\d+ criado/)).toBeVisible({ timeout: 15_000 })
  })

  test('CEN-NOVO-171 (R5) — escolhe duas produções de uma vez e todas viram um lote só', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1191b-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1191b-Maria')
    const b = await pedidoComProducao(request, token, p, 4, 'QA1191b-Juliana')
    const c = await pedidoComProducao(request, token, p, 3, 'QA1191b-Ana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    const candB = page.getByTestId('candidata-juntar').filter({ hasText: b.producao.identificador })
    const candC = page.getByTestId('candidata-juntar').filter({ hasText: c.producao.identificador })
    await expect(candB).toHaveCount(1, { timeout: 10_000 })
    await candB.click()
    await candC.click()
    await expect(candB.locator('input[type=checkbox]')).toBeChecked()
    await expect(candC.locator('input[type=checkbox]')).toBeChecked()
    await page.getByRole('button', { name: 'Juntar produções', exact: true }).click()
    await expect(page.getByText(/Lote PRD-\d+ criado/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Entendi', exact: true }).click()
    await expect(page.getByTestId('linha-lote')).toContainText('QA1191b-Brownie', { timeout: 10_000 })
  })

  test('CEN-NOVO-172 (R5, negativo) — sem nenhuma escolha o botão Juntar fica desabilitado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1191c-Brownie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1191c-Maria')
    await pedidoComProducao(request, token, p, 7, 'QA1191c-Juliana')
    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    await page.getByRole('button', { name: 'Juntar com outra produção', exact: true }).click()
    await expect(page.getByTestId('candidata-juntar').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Juntar produções', exact: true })).toBeDisabled()
  })

  test('CEN-NOVO-165 — "Produções no período" lista as do intervalo e "Juntar com esta" cria o lote', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1184c-Brownie')
    const outro = await produto(request, token, 'QA1184c-Cookie')
    const a = await pedidoComProducao(request, token, p, 5, 'QA1184c-Maria')
    const b = await pedidoComProducao(request, token, outro, 7, 'QA1184c-Juliana')

    await login(page)
    await page.goto(`/orcamentos/${a.orcamentoId}`)
    const secao = page.getByTestId('producoes-periodo')
    await expect(secao).toContainText('Produções no período', { timeout: 10_000 })
    const linha = page.getByTestId('producao-periodo').filter({ hasText: b.producao.identificador })
    await expect(linha).toBeVisible({ timeout: 10_000 })
    await expect(linha).toContainText('Aguardando início')
    await linha.getByTestId('juntar-com-esta').click()
    await expect(page.getByTestId('linha-lote')).toContainText('QA1184c-Cookie', { timeout: 15_000 })
  })

  test('CEN-NOVO-165 — orçamento ainda não aprovado mostra a mensagem do período', async ({ page, request }) => {
    const token = await apiLogin(request)
    const p = await produto(request, token, 'QA1184d-Brownie')
    const c = await criarCliente(request, token, `QA1184d-Maria-${Date.now()}`)
    const orc = await criarOrcamentoViaApi(request, token, c.id,
      [{ produtoId: p.id, precoUnitario: 20, margemAplicada: 50, quantidade: 5 }], { prazoProducaoDias: 1, dataInicioEstimada: hojeLocal() })

    await login(page)
    await page.goto(`/orcamentos/${orc.id}`)
    await expect(page.getByTestId('periodo-indisponivel')).toContainText('depois que o orçamento for aprovado e tiver entrega estimada', { timeout: 10_000 })
  })
})
