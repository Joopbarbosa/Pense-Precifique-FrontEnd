import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  buscarProducao,
  teardownProducoes,
  criarProducaoViaApi,
  criarProducaoEmAndamentoComConsumo,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-003 / OpenProject #121 — Cancelar Produção (Fluxo D), cenários 170-176.
 * Mesma regra dos prompts anteriores: cenários que falham documentam o delta Gherkin-vs-real
 * com file:line, não são adaptados ao comportamento observado.
 *
 * Achados de leitura de código (registrados aqui conforme pedido no prompt):
 * - Payload real de POST /producoes/{id}/cancelar: { justificativa: string, consumoReal?:
 *   [{ insumoId?, produtoBaseId?, quantidadeConsumida }] } (types/producao.ts:77-86). O array
 *   só contém os itens DIVERGENTES do original (CancelarProducaoPage.tsx:46-58, filtro
 *   `valor !== item.quantidade`) — itens ausentes são tratados pelo backend como "consumo total,
 *   sem estorno" (ProducaoService.java:256-258).
 * - NÃO existe campo de justificativa separado para divergência de consumo — é a mesma
 *   `justificativa` geral (mín. 30 chars, validada em frontend E backend:
 *   CancelarProducaoPage.tsx:39, CancelarProducaoRequest.java `@Size(min=30)`), usada tanto para
 *   AGUARDANDO_INICIO quanto para EM_ANDAMENTO/TRAVADA com ou sem divergência.
 * - Componente de cancelamento por estado: `CancelarProducaoModal.tsx` (modal simples, só
 *   justificativa) para AGUARDANDO_INICIO; `CancelarProducaoPage.tsx` (página cheia, com
 *   `ConsumoRealSection`) para EM_ANDAMENTO/TRAVADA — roteado por `DetalheProducaoPage.tsx`
 *   (`handleCancelar`, linhas 83-90).
 * - `ConsumoRealSection.tsx` não tem nenhum `data-testid`. O input de consumo real é
 *   `<input type="number" min={0} max={item.quantidade} .../>` (linha 35-47) — sem rótulo
 *   associado (nenhum `<label>`/`aria-label`), então é localizado por proximidade ao nome do
 *   insumo no DOM, não por role/label.
 */

function linhaConsumo(page: import('@playwright/test').Page, nomeInsumo: string) {
  return page.locator('div.border-line', { hasText: nomeInsumo })
}

test.describe('Cenários 170-176 — Cancelar Produção (Fluxo D) (#121)', () => {
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

  test('170 — cancelar AGUARDANDO_INICIO muda para CANCELADA sem movimentação de estoque', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA170-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA170-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Cliente desistiu do pedido antes do início da produção.')
    await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()

    await expect(page.getByText('Cancelada').first()).toBeVisible({ timeout: 10_000 })
    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('CANCELADA')

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual)
  })

  test('171 — cancelar AGUARDANDO_INICIO sem justificativa mínima mantém botão desabilitado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA171-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA171-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Muito curto') // 11 chars < 30

    await expect(page.getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled()
  })

  test('172 — cancelar EM_ANDAMENTO com consumo igual ao original não estorna', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA172-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA172-Produto-${Date.now()}`
    // ficha 10/unidade, rendimento 1, quantidade 5 → baixa 50 (bate com o "baixou 50" do Gherkin)
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    const { producaoId } = await criarProducaoEmAndamentoComConsumo(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoId)

    const insumoAposInicio = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoAposInicio.estoqueAtual).toBe(50) // 100 - 50

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/cancelar') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto(`/producao/${producaoId}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producaoId}/cancelar$`))

    // Input já vem pré-preenchido com o valor original (default = item.quantidade) — não altera.
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Cancelamento com consumo declarado igual ao original baixado.')
    await page.getByRole('button', { name: 'Cancelar produção' }).click()

    await expect(page).toHaveURL(/\/producao$/, { timeout: 10_000 })

    console.log('PAYLOAD consumoReal (172 — consumo igual):', payloads[0])
    expect(payloads.length).toBe(1)

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAposInicio.estoqueAtual)

    const producaoApi = await buscarProducao(request, token, producaoId)
    expect(producaoApi.estado).toBe('CANCELADA')
  })

  test('173 — cancelar EM_ANDAMENTO com consumo parcial estorna a diferença', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA173-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA173-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    const { producaoId } = await criarProducaoEmAndamentoComConsumo(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoId)

    const insumoAposInicio = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoAposInicio.estoqueAtual).toBe(50)

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/cancelar') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto(`/producao/${producaoId}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producaoId}/cancelar$`))

    await linhaConsumo(page, nomeInsumo).locator('input[type="number"]').fill('30')
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Cancelamento com consumo real parcial, divergente do original.')
    await page.getByRole('button', { name: 'Cancelar produção' }).click()

    await expect(page).toHaveURL(/\/producao$/, { timeout: 10_000 })

    console.log('PAYLOAD consumoReal (173 — consumo parcial 30):', payloads[0])
    expect(payloads.length).toBe(1)
    expect(JSON.parse(payloads[0]).consumoReal).toEqual([{ insumoId: insumo.id, quantidadeConsumida: 30 }])

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAposInicio.estoqueAtual + 20)
  })

  test('174 — cancelar com consumo declarado zero estorna integralmente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA174-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const estoqueAntesDaProducao = insumo.estoqueAtual // 100
    const nomeProduto = `QA174-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    const { producaoId } = await criarProducaoEmAndamentoComConsumo(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoId)

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/cancelar') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto(`/producao/${producaoId}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producaoId}/cancelar$`))

    await linhaConsumo(page, nomeInsumo).locator('input[type="number"]').fill('0')
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Cancelamento sem nenhum consumo real do insumo baixado.')
    await page.getByRole('button', { name: 'Cancelar produção' }).click()

    await expect(page).toHaveURL(/\/producao$/, { timeout: 10_000 })

    console.log('PAYLOAD consumoReal (174 — consumo zero):', payloads[0])
    expect(payloads.length).toBe(1)
    expect(JSON.parse(payloads[0]).consumoReal).toEqual([{ insumoId: insumo.id, quantidadeConsumida: 0 }])

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(estoqueAntesDaProducao)
  })

  test('175 — consumo divergente sem justificativa preenchida bloqueia confirmação', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA175-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA175-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    const { producaoId } = await criarProducaoEmAndamentoComConsumo(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoId)

    await login(page)
    await page.goto(`/producao/${producaoId}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producaoId}/cancelar$`))

    // Declara consumo divergente (30 de 50) mas deixa a justificativa vazia.
    await linhaConsumo(page, nomeInsumo).locator('input[type="number"]').fill('30')

    // Não existe campo de justificativa "de divergência" separado (ver nota no topo do arquivo) —
    // é o mesmo campo geral, então o bloqueio aqui vem da mesma regra dos Cenários 171/164/156.
    await expect(page.getByRole('button', { name: 'Cancelar produção' })).toBeDisabled()
  })

  test('176 — declarar consumo maior que o original bloqueia com mensagem de valor inválido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA176-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA176-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    // baixa original = 50 (ficha 10 × quantidade 5 / rendimento 1)
    const { producaoId } = await criarProducaoEmAndamentoComConsumo(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoId)

    await login(page)
    await page.goto(`/producao/${producaoId}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producaoId}/cancelar$`))

    const input = linhaConsumo(page, nomeInsumo).locator('input[type="number"]')
    await input.fill('60') // > 50 (original baixado)

    // Achado de homologação: o onChange de ConsumoRealSection.tsx:41-45 faz clamp silencioso
    // (`Math.min(Math.max(raw, 0), item.quantidade)`) a cada tecla — o valor digitado "60" nunca
    // fica no DOM; ele é imediatamente reescrito para "50" (o máximo permitido), sem nenhuma
    // mensagem de erro. O backend rejeitaria quantidadeConsumida > original com BusinessException
    // (ProducaoService.java:260-263, "não pode ser maior que a quantidade baixada originalmente"),
    // mas esse caminho é estruturalmente inalcançável pela UI, já que o clamp acontece antes do
    // envio. Asserção abaixo replica o Gherkin literalmente (mensagem de valor inválido) e deve
    // falhar por esse motivo.
    await expect(page.getByText(/valor inválido|não pode ser maior/i)).toBeVisible({ timeout: 3000 })
  })
})
