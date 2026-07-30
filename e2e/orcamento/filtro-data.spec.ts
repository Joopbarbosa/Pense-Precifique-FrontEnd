import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * Homologação Onda 5 (Frente 3, Cenários 234-236) — filtro de intervalo de data de criação em
 * `ListaOrcamentosPage.tsx` (presets 7/30/90 dias + range customizado, `dataCriacaoDe`/
 * `dataCriacaoAte`), já implementado tanto no backend (`OrcamentoController.java:35-43`,
 * `OrcamentoRepository.buscar` — comparação inclusiva nos dois extremos) quanto na UI (dropdown
 * "Período"). Nota de doc: `CLAUDE.md` do frontend ainda listava esse filtro como "bloqueado por
 * backend, não implementado" — desatualizado, confirmado por leitura direta do código.
 *
 * Achado de leitura de código: diferente de `dataInicio` em Produção (client-supplied), o
 * `createdAt` do Orçamento é sempre gerado no servidor (`Orcamento.java`, `@PrePersist`) — não
 * existe campo no `OrcamentoRequest` para "nascer" um orçamento com data no passado. Por isso os
 * testes de fronteira usam "hoje" (dentro de qualquer preset) vs. um intervalo claramente no
 * passado (fora), em vez de dois buckets fixos como no spec equivalente de Produção
 * (`e2e/producao/filtro-data-intervalo.spec.ts`).
 *
 * Sem `data-testid` em `ListaOrcamentosPage.tsx` — seletores por `getByRole`/`getByPlaceholder`/
 * `getByLabel` (labels implícitos "De"/"Até").
 */
test.describe('Cenários 234-236 — Filtro de intervalo de data em Lista de Orçamentos', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('234a — dataCriacaoDe/dataCriacaoAte inclui orçamento criado hoje dentro do intervalo e exclui fora dele (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA234a-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA234a-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])

    const hoje = new Date().toISOString().slice(0, 10)
    const resDentro = await request.get(
      `${API_URL}/orcamentos?busca=${encodeURIComponent(nomeCliente)}&dataCriacaoDe=${hoje}&dataCriacaoAte=${hoje}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(resDentro.ok()).toBe(true)
    const bodyDentro = await resDentro.json()
    expect(bodyDentro.content.map((o: { id: string }) => o.id)).toContain(orcamento.id)

    const resFora = await request.get(
      `${API_URL}/orcamentos?busca=${encodeURIComponent(nomeCliente)}&dataCriacaoDe=2020-01-01&dataCriacaoAte=2020-01-02`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(resFora.ok()).toBe(true)
    const bodyFora = await resFora.json()
    expect(bodyFora.content).toEqual([])
  })

  test('234b — presets "Últimos 7/30/90 dias" preenchem De/Até corretamente e filtram a listagem via UI', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA234b-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA234b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)
    await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])

    await login(page)
    await page.goto('/orcamentos')
    await page.getByPlaceholder('Buscar por cliente ou número…').fill(nomeCliente)
    await page.waitForTimeout(600)
    await expect(page.getByText(nomeCliente, { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Período' }).click()
    for (const [label, dias] of [
      ['Últimos 7 dias', 7],
      ['Últimos 30 dias', 30],
      ['Últimos 90 dias', 90],
    ] as const) {
      await page.getByRole('button', { name: label, exact: true }).click()
      const hojeD = new Date()
      const passado = new Date(hojeD.getTime() - dias * 86_400_000)
      const iso = (d: Date) => d.toISOString().split('T')[0]
      await expect(page.getByLabel('De')).toHaveValue(iso(passado))
      await expect(page.getByLabel('Até')).toHaveValue(iso(hojeD))
    }

    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(nomeCliente, { exact: true }).first()).toBeVisible()
  })

  test('235 — filtro de data combina com busca e status sem sobrescrever nenhum dos dois', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA235-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)

    const nomeBase = `QA235-Cliente-${Date.now()}`
    const clienteA = await criarCliente(request, token, `${nomeBase}-A`)
    const clienteB = await criarCliente(request, token, `${nomeBase}-B`)
    const orcamentoA = await criarOrcamentoViaApi(request, token, clienteA.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])
    await avancarStatusViaApi(request, token, orcamentoA.id) // RASCUNHO -> ENVIADO
    await criarOrcamentoViaApi(request, token, clienteB.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ]) // fica RASCUNHO

    await login(page)
    await page.goto('/orcamentos')
    await page.getByPlaceholder('Buscar por cliente ou número…').fill(nomeBase)
    await page.waitForTimeout(600)
    // só busca: os dois orçamentos aparecem
    await expect(page.getByText(`${nomeBase}-A`, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(`${nomeBase}-B`, { exact: true }).first()).toBeVisible()

    // + status "Enviado": busca continua ativa, só o A (ENVIADO) aparece
    await page.getByRole('button', { name: 'Enviado', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('Buscar por cliente ou número…')).toHaveValue(nomeBase)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(`${nomeBase}-B`, { exact: true })).toHaveCount(0)

    // + data (hoje): busca e status continuam ativos, A continua visível
    await page.getByRole('button', { name: 'Período' }).click()
    await page.getByRole('button', { name: 'Últimos 7 dias', exact: true }).click()
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('Buscar por cliente ou número…')).toHaveValue(nomeBase)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true }).first()).toBeVisible()

    // intervalo de data que exclui hoje: A some mesmo com busca+status ainda batendo
    // (prova que a data está de fato combinada via AND, não apenas ignorada)
    await page.getByRole('button', { name: /–/ }).click()
    await page.getByLabel('De').fill('2020-01-01')
    await page.getByLabel('Até').fill('2020-01-02')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true })).toHaveCount(0)
  })

  test('236 — botão "Limpar" remove só o filtro de data, mantendo busca e status', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA236-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)

    const nomeBase = `QA236-Cliente-${Date.now()}`
    const clienteA = await criarCliente(request, token, `${nomeBase}-A`)
    const clienteB = await criarCliente(request, token, `${nomeBase}-B`)
    const orcamentoA = await criarOrcamentoViaApi(request, token, clienteA.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])
    await avancarStatusViaApi(request, token, orcamentoA.id) // RASCUNHO -> ENVIADO
    await criarOrcamentoViaApi(request, token, clienteB.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ]) // fica RASCUNHO

    await login(page)
    await page.goto('/orcamentos')
    await page.getByPlaceholder('Buscar por cliente ou número…').fill(nomeBase)
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Enviado', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(`${nomeBase}-B`, { exact: true })).toHaveCount(0)

    // Filtro de data excludente -> A some também
    await page.getByRole('button', { name: 'Período' }).click()
    await page.getByLabel('De').fill('2020-01-01')
    await page.getByLabel('Até').fill('2020-01-02')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true })).toHaveCount(0)

    // Limpar (dropdown continua aberto — handleLimparPeriodo não fecha, diferente de Aplicar) ->
    // só o filtro de data é removido, busca e status continuam intactos
    await page.getByRole('button', { name: /–/ }).click()
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    await expect(page.getByLabel('De')).toHaveValue('')
    await expect(page.getByLabel('Até')).toHaveValue('')
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('Buscar por cliente ou número…')).toHaveValue(nomeBase)
    await expect(page.getByText(`${nomeBase}-A`, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(`${nomeBase}-B`, { exact: true })).toHaveCount(0)
  })
})
