import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, cancelarOrcamentoViaApi, buscarOrcamento } from '../helpers/orcamento'

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * CEN-NOVO-19 (P-T002, V0.8.1) — EM_PRODUCAO → cancelamento com Multa, cobrindo o desconto do
 * sinal já pago com piso zero (P-B002/ORC-036), ponta-a-ponta: preview no wizard
 * (`ModalCancelMulta`, Passos 2-3) → valor persistido (`Orcamento.valorMulta`) → PDF de Multa
 * (validado via `frameLocator`, mesmo achado da Tarefa 0). Gap confirmado no Passo 0: ORC-036 tem
 * regra e teste de integração de backend, mas nenhum cenário BDD nem cobertura E2E de
 * frontend/PDF.
 */
test.describe('CEN-NOVO-19 — EM_PRODUCAO → cancelamento com Multa (desconto de sinal, piso zero) → PDF de Multa', () => {
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

  async function criarAteEmProducaoComSinal(request: import('@playwright/test').APIRequestContext, token: string, clienteId: string, produtoId: string, percentualSinal: number) {
    const orcamento = await criarOrcamentoViaApi(request, token, clienteId, [
      { produtoId, precoUnitario: 100, margemAplicada: 50, quantidade: 1 },
    ], { sinalAtivo: true, percentualSinal })
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // AGUARDANDO_SINAL
    const resSinal = await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    const orcamentoSinalPago = await resSinal.json()
    await avancarStatusViaApi(request, token, orcamento.id) // EM_PRODUCAO
    return { orcamento, valorSinal: orcamentoSinalPago.valorSinal as number, total: orcamentoSinalPago.total as number }
  }

  test('CEN-NOVO-19a — multa bruta > sinal: desconta parcial, wizard e PDF batem com a fórmula', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN19-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QACEN19-ClienteParcial-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(request, token, cliente.id, produto.id, 30)
    const percentualMulta = 50
    const multaBruta = (total * percentualMulta) / 100
    const multaEsperada = Math.max(multaBruta - valorSinal, 0)
    expect(multaBruta).toBeGreaterThan(valorSinal)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 1 -> 2

    await expect(page.getByText(`Já descontado o sinal de ${brl(valorSinal)} pago pela cliente.`)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(brl(multaEsperada), { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 2 -> 3
    await expect(page.getByText(brl(multaEsperada), { exact: true }).first()).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click()

    await expect
      .poll(async () => (await buscarOrcamento(request, token, orcamento.id)).valorMulta, { timeout: 10_000 })
      .toBeCloseTo(multaEsperada, 2)

    await page.goto(`/orcamentos/${orcamento.id}/multa`)
    const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]')
    await expect(multaFrame.getByText(brl(multaEsperada), { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(multaFrame.getByText(brl(multaBruta), { exact: true })).toHaveCount(0)
  })

  test('CEN-NOVO-19b — sinal >= multa bruta: piso zero, nunca cobra negativo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QACEN19-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QACEN19-ClientePiso-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(request, token, cliente.id, produto.id, 80)
    const percentualMulta = 10
    const multaBruta = (total * percentualMulta) / 100
    expect(valorSinal).toBeGreaterThanOrEqual(multaBruta)

    const resCancel = await cancelarOrcamentoViaApi(request, token, orcamento.id, { percentualMulta })
    expect(resCancel.ok()).toBe(true)
    const orcamentoCancelado = await resCancel.json()
    expect(orcamentoCancelado.valorMulta).toBe(0)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}/multa`)
    const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]')
    await expect(multaFrame.getByText('R$ 0,00', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
  })
})
