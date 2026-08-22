import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, cancelarOrcamentoViaApi } from '../helpers/orcamento'

/**
 * CEN-NOVO-20 (P-T002, V0.8.1) — card "Documentos" (`DownloadsCard`, P-F013): os 4 botões
 * (recibo do sinal / pagamento / multa / estorno) só aparecem quando aplicável (por status/flag do
 * orçamento) e navegam para a rota de preview correta. Gap confirmado no Passo 0: nenhum spec
 * testava a lógica de gate (visibilidade condicional) dos 4 botões juntos — só a navegação
 * isolada de um por vez, em specs com outro propósito (`numero-sem-padding.spec.ts`).
 */
test.describe('CEN-NOVO-20 — Card Documentos: gate condicional + navegação para as 4 telas de preview', () => {
  let criadosProdutoIds: string[] = []
  let criadosClienteIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosClienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosClienteIds) {
      await request.delete(`http://localhost:8080/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-20a — RASCUNHO sem sinal: só "Baixar PDF do orçamento" aparece', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN20-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QACEN20-ClienteRascunho-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 },
    ])

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('heading', { name: 'Documentos', exact: true })).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recibo do sinal', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Recibo de pagamento', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'PDF de multa', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Recibo de estorno', exact: true })).toHaveCount(0)
  })

  test('CEN-NOVO-20b — PAGO com sinal: "Recibo do sinal" e "Recibo de pagamento" navegam certo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN20-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QACEN20-ClientePago-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 },
    ], { sinalAtivo: true, percentualSinal: 30 })

    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // AGUARDANDO_SINAL
    await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' }) // SINAL_PAGO
    await avancarStatusViaApi(request, token, orcamento.id) // EM_PRODUCAO
    await avancarStatusViaApi(request, token, orcamento.id) // FINALIZADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENTREGUE
    await avancarStatusViaApi(request, token, orcamento.id) // PAGO

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('heading', { name: 'Documentos', exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Recibo do sinal', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/orcamentos/${orcamento.id}/recibo-sinal$`))

    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('heading', { name: 'Documentos', exact: true })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Recibo de pagamento', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/orcamentos/${orcamento.id}/recibo-pagamento$`))
  })

  test('CEN-NOVO-20c — CANCELADO com multa: "Baixar PDF do orçamento" some, "PDF de multa" navega certo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN20-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QACEN20-ClienteMulta-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 },
    ])
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // EM_PRODUCAO
    await cancelarOrcamentoViaApi(request, token, orcamento.id, { percentualMulta: 50 })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('heading', { name: 'Documentos', exact: true })).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'PDF de multa', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/orcamentos/${orcamento.id}/multa$`))
  })
})
