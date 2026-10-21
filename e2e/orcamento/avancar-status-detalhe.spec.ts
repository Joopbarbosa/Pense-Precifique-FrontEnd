import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1050 — Fluxo de avançar status do Detalhe do Orçamento, extraído para o hook
 * `useAvancarStatusOrcamento` e para `ModaisAvancarStatus` (reaproveitados pela Agenda, #1037).
 * Rede de segurança do refactor: o comportamento (ORC-005, RN-NOVA-2) não pode mudar.
 */
test.describe('#1050 — Avançar status pelo Detalhe do Orçamento (fluxo extraído)', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  async function criarOrcamentoComSinal(request: import('@playwright/test').APIRequestContext, token: string, prefixo: string) {
    const produto = await criarProdutoComEstoque(request, token, `${prefixo}-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${prefixo}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(
      request,
      token,
      cliente.id,
      [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 2 }],
      { sinalAtivo: true, percentualSinal: 30 }
    )
    return orcamento
  }

  test('CT-1050-01 (positivo) — enviar e aprovar pelo botão principal; o status muda a cada passo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await criarOrcamentoComSinal(request, token, 'QA1050A')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByRole('button', { name: 'Enviar orçamento' }).click()
    await expect(page.getByRole('button', { name: 'Marcar como aprovado' })).toBeVisible()
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('ENVIADO')

    await page.getByRole('button', { name: 'Marcar como aprovado' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar início' }).or(page.getByRole('button', { name: 'Confirmar recebimento do sinal' }))).toBeVisible()
    expect(['APROVADO', 'AGUARDANDO_SINAL']).toContain((await buscarOrcamento(request, token, orcamento.id)).status)
  })

  test('CT-1050-02 (positivo) — sinal: fechar a modal não avança; confirmar recebimento avança para SINAL_PAGO', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await criarOrcamentoComSinal(request, token, 'QA1050B')
    for (let i = 0; i < 3; i++) {
      const s = (await buscarOrcamento(request, token, orcamento.id)).status
      if (s === 'AGUARDANDO_SINAL') break
      await avancarStatusViaApi(request, token, orcamento.id)
    }
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('AGUARDANDO_SINAL')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByRole('button', { name: 'Confirmar recebimento do sinal' }).click()
    await expect(page.getByText('Confirmar recebimento do sinal').first()).toBeVisible()
    await page.getByRole('button', { name: 'Fechar' }).first().click()
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('AGUARDANDO_SINAL')

    await page.getByRole('button', { name: 'Confirmar recebimento do sinal' }).click()
    await page.getByRole('button', { name: /Confirmar e gerar recibo/ }).click()
    await expect(page.getByRole('button', { name: 'Iniciar produção' })).toBeVisible({ timeout: 15_000 })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('SINAL_PAGO')
  })

  test('CT-1050-03 (negativo) — erro do backend ao avançar aparece na tela e o status não muda', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await criarOrcamentoComSinal(request, token, 'QA1050C')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.route('**/orcamentos/*/avancar-status', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Falha simulada ao avançar.' }) })
    )

    await page.getByRole('button', { name: 'Enviar orçamento' }).click()
    await expect(page.getByText(/Falha simulada ao avançar/)).toBeVisible()
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('RASCUNHO')
  })
})
