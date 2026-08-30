import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const AVISO_MINI_ESTORNO = 'O sinal pago é maior que a multa — a cliente vai receber a diferença de volta.'

/**
 * CEN-NOVO-A/B (P-T003, V0.8.2, RN-NOVA-1/ORC-036 revisada) — mini-estorno de multa quando
 * `sinalPago > multaBruta`. Formaliza `e2e/scripts-avulsos/validar-mini-estorno-multa.mjs`
 * (P-F006, 11/11 verde) como spec oficial, reaproveitando os helpers de `e2e/helpers/`.
 */
test.describe('CEN-NOVO-A/B — Mini-estorno de multa (sinal pago > multa bruta)', () => {
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

  async function criarAteEmProducaoComSinal(
    request: import('@playwright/test').APIRequestContext,
    token: string,
    clienteId: string,
    produtoId: string,
    percentualSinal: number
  ) {
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

  test('CEN-NOVO-A — cancelamento com mini-estorno: multa R$ 0,00, valorDevolvidoMulta calculado e persistido, tela final exibe a devolução', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAminiestorno-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAminiestorno-ClienteA-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    // sinal 60% > multa 30% do total — sinalPago > multaBruta, dispara o mini-estorno.
    const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(request, token, cliente.id, produto.id, 60)
    const percentualMulta = 30
    const multaBruta = (total * percentualMulta) / 100
    const devolvidoEsperado = valorSinal - multaBruta
    expect(valorSinal).toBeGreaterThan(multaBruta)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 1 -> 2
    await page.getByPlaceholder('50').fill(String(percentualMulta))
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 2 -> 3
    await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click()

    await expect
      .poll(async () => (await buscarOrcamento(request, token, orcamento.id)).valorDevolvidoMulta, { timeout: 10_000 })
      .toBeCloseTo(devolvidoEsperado, 2)
    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.valorMulta).toBe(0)

    await expect(page.getByText('Você recebeu de volta', { exact: false })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(brl(devolvidoEsperado), { exact: true })).toBeVisible()

    // reload real — confirma que o valor exibido vem do que foi persistido, não de estado local.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Você recebeu de volta', { exact: false })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(brl(devolvidoEsperado), { exact: true })).toBeVisible()
  })

  test('CEN-NOVO-B — preview do cancelamento mostra aviso qualitativo, nunca um valor de multa positivo incorreto', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAminiestorno-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAminiestorno-ClienteB-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(request, token, cliente.id, produto.id, 60)
    const percentualMulta = 30
    const multaBruta = (total * percentualMulta) / 100
    expect(valorSinal).toBeGreaterThan(multaBruta)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 1 -> 2
    await page.getByPlaceholder('50').fill(String(percentualMulta))

    // Preview (Passo 2): mostra o piso R$ 0,00 + aviso qualitativo — nunca o valor bruto positivo.
    await expect(page.getByText('R$ 0,00', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(AVISO_MINI_ESTORNO, { exact: false })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(brl(multaBruta), { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 2 -> 3 (resumo)
    await expect(page.getByText(AVISO_MINI_ESTORNO, { exact: false })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(brl(multaBruta), { exact: true })).toHaveCount(0)
  })

  test('Regressão — sinal == multa bruta: piso zero puro, sem aviso de mini-estorno', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAminiestorno-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAminiestorno-ClientePiso-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(request, token, cliente.id, produto.id, 30)
    const percentualMulta = 30
    const multaBruta = (total * percentualMulta) / 100
    expect(Math.abs(valorSinal - multaBruta)).toBeLessThan(0.01)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click() // Passo 1 -> 2
    await page.getByPlaceholder('50').fill(String(percentualMulta))

    await expect(page.getByText('O sinal pago é maior que a multa', { exact: false })).toHaveCount(0)
  })
})
