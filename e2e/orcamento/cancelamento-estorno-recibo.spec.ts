import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'

/**
 * CEN-NOVO-18 (P-T002, V0.8.1) — fluxo ponta-a-ponta SINAL_PAGO -> cancelamento com Estorno (wizard
 * completo, 2 passos, data retroativa escolhida pela usuária) -> Recibo de Estorno no padrão de 9
 * seções (P-F014), validado via `frameLocator` (o documento vive em `<iframe srcDoc>` desde o
 * Épico #248 — nunca `page.getByText` direto, mesmo achado corrigido em `numero-sem-padding.spec.ts`
 * na Tarefa 0 desta sessão). Gap de cobertura confirmado no Passo 0: nenhum spec existente
 * exercia o wizard de estorno até a geração real do documento.
 */
test.describe('CEN-NOVO-18 — SINAL_PAGO → cancelamento com Estorno → Recibo de Estorno (9 seções, iframe)', () => {
  let criadosProdutoIds: string[] = []
  let criadosClienteIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosClienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    // Teardown real (P-T002 — nunca deixar para o fim da sessão): clientes de teste têm endpoint
    // de exclusão de verdade, diferente de orçamento (limitação conhecida, sem endpoint).
    for (const id of criadosClienteIds) {
      await request.delete(`http://localhost:8080/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-18 — wizard de estorno gera Recibo de Estorno com dado real, data escolhida (não a de hoje)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN18-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QACEN18-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 },
    ], { sinalAtivo: true, percentualSinal: 30 })

    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // AGUARDANDO_SINAL
    const resSinal = await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    const orcamentoSinalPago = await resSinal.json()
    expect(orcamentoSinalPago.status).toBe('SINAL_PAGO')
    const valorSinal = orcamentoSinalPago.valorSinal as number

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await expect(page.getByText(`Estornar sinal para ${nomeCliente}?`)).toBeVisible({ timeout: 5000 })

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').fill(ontem)
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click()

    await expect(page.getByText('Confirmar estorno do sinal', { exact: true })).toBeVisible({ timeout: 5000 })
    const [ano, mes, dia] = ontem.split('-')
    const dataFormatada = `${dia}/${mes}/${ano}`
    await expect(page.getByText(dataFormatada)).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar e gerar recibo de estorno', exact: true }).click()

    // Persistência real — status e flag de estorno.
    await expect
      .poll(async () => (await buscarOrcamento(request, token, orcamento.id)).status, { timeout: 10_000 })
      .toBe('CANCELADO')
    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.estornoSinal).toBe(true)

    // Card Documentos navega para o Recibo de Estorno.
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Recibo de estorno', exact: true }).click()
    await page.waitForURL(/\/recibo-estorno$/)

    const reciboFrame = page.frameLocator('iframe[title="Preview do recibo de estorno"]')
    await expect(reciboFrame.getByText('Sinal estornado', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reciboFrame.getByText(nomeCliente, { exact: true }).first()).toBeVisible()
    await expect(reciboFrame.getByText('Valor devolvido', { exact: true })).toBeVisible()
    await expect(reciboFrame.getByText(`#${orcamento.numero}`, { exact: true }).first()).toBeVisible()
    await expect(reciboFrame.getByText(String(valorSinal).replace('.', ','))).toBeVisible()
    await expect(reciboFrame.getByText(dataFormatada).first()).toBeVisible()
    // Achado antigo (RECONCILIA-002/P-F008a) reconfirmado, não implementado — segue ausente.
    await expect(reciboFrame.getByText('Método de devolução')).toHaveCount(0)
  })
})
