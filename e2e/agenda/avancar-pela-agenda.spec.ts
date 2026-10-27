import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1037 (V0.18.0, RN-NOVA-15) — avançar o status do orçamento pelo detalhe do compromisso, com as mesmas regras e modais do Detalhe do
 * Orçamento (fluxo extraído na #1050). A Agenda só avança: cancelar o orçamento continua só no Detalhe. CEN-NOVO-35 a 38.
 */
test.describe('#1037 — Avançar status pela Agenda', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  async function novoOrcamento(request: import('@playwright/test').APIRequestContext, token: string, rotulo: string, overrides: Record<string, unknown> = {}) {
    const produto = await criarProdutoComEstoque(request, token, `${rotulo}-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${rotulo}-Cliente-${Date.now()}`)
    return criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], overrides)
  }

  async function abrirNaAgenda(page: import('@playwright/test').Page, texto: string, diasAFrente: number) {
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < diasAFrente; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('compromisso').filter({ hasText: texto }).click()
  }

  test('CT-1037-01 — aprovar pelo detalhe do compromisso de validade: o orçamento avança e a Agenda se atualiza', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1037A', { prazoProducaoDias: 5, dataValidade: `${hojeLocal(1)}T12:00:00` })
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await login(page)
    await abrirNaAgenda(page, `Validade — ORC-${orcamento.numero}`, 1)
    await expect(page.getByTestId('status-orcamento')).toHaveText('Enviado')
    await page.getByRole('button', { name: 'Marcar como aprovado' }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0)
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('APROVADO')
    // #1112 — a validade não some: fica na Agenda como concluída (verde e riscada)
    const chip = page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero}` })
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveAttribute('data-situacao', 'CONCLUIDO')
    await expect(chip.locator('span.line-through')).toBeVisible()
  })

  test('CT-1037-02 — confirmar o sinal pela Agenda: sai o "Sinal a receber" e entra a entrega estimada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1037B', { sinalAtivo: true, percentualSinal: 30, prazoProducaoDias: 4 })
    for (let i = 0; i < 3; i++) await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    await login(page)
    await abrirNaAgenda(page, `Sinal a receber — ORC-${orcamento.numero}`, 0)
    await page.getByRole('button', { name: 'Confirmar recebimento do sinal' }).click()
    await page.getByRole('button', { name: /Confirmar e gerar recibo/ }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0, { timeout: 15_000 })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('SINAL_PAGO')
    await expect(page.getByTestId('compromisso').filter({ hasText: `Sinal a receber — ORC-${orcamento.numero}` })).toHaveCount(0)
  })

  test('CT-1037-03 — fechar a modal de vínculo com produção (X, clique fora, "Fechar") não avança; "Avançar sem vincular" avança', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1037C', { prazoProducaoDias: 3 })
    for (let i = 0; i < 2; i++) await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO, APROVADO (sem sinal)
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('APROVADO')
    await login(page)
    await abrirNaAgenda(page, `Entrega estimada — ORC-${orcamento.numero}`, 3)
    const modalVinculo = page.getByRole('dialog').last()
    const aberta = async () => {
      await page.getByRole('button', { name: 'Vincular produção' }).click()
      await expect(page.getByRole('button', { name: /Avançar sem vincular/ })).toBeVisible()
    }
    // pelo X (o primeiro "Fechar" da modal de vínculo é o do cabeçalho)
    await aberta()
    await modalVinculo.getByRole('button', { name: 'Fechar' }).first().click()
    await expect(page.getByRole('button', { name: /Avançar sem vincular/ })).toHaveCount(0)
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('APROVADO')
    // clicando fora da modal
    await aberta()
    await page.mouse.click(5, 5)
    await expect(page.getByRole('button', { name: /Avançar sem vincular/ })).toHaveCount(0)
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('APROVADO')
    // "Avançar sem vincular" é a ação explícita que avança
    await aberta()
    await page.getByRole('button', { name: /Avançar sem vincular/ }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0, { timeout: 15_000 })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('EM_PRODUCAO')
  })

  test('CT-1037-04 (negativo) — cancelar o orçamento não existe na Agenda', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1037D', { prazoProducaoDias: 5, dataValidade: `${hojeLocal(1)}T12:00:00` })
    await avancarStatusViaApi(request, token, orcamento.id)
    await login(page)
    await abrirNaAgenda(page, `Validade — ORC-${orcamento.numero}`, 1)
    await expect(page.getByTestId('painel-orcamento')).toBeVisible()
    await expect(page.getByRole('button', { name: /Cancelar orçamento|Cancelar/ })).toHaveCount(0)
  })
})
