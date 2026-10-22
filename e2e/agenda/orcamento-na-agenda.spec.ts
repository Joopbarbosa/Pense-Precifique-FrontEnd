import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1035 (V0.18.0, RN-NOVA-9, 11 a 14) — o orçamento na Agenda: entrega estimada, validade só no dia, "Sinal até" e sinal a receber,
 * saldo a receber e as datas dos passos no detalhe. CEN-NOVO-20, 23, 24, 27, 29 a 34.
 */
test.describe('#1035 — Orçamento na Agenda', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  async function novoOrcamento(request: import('@playwright/test').APIRequestContext, token: string, rotulo: string, overrides: Record<string, unknown> = {}) {
    const produto = await criarProdutoComEstoque(request, token, `${rotulo}-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const nomeCliente = `${rotulo}-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], overrides)
    return { orcamento, nomeCliente }
  }

  test('CT-1035-01 — "Sinal a receber" no dia de "Sinal até", com o valor, e o painel do orçamento no detalhe', async ({ page, request }) => {
    const token = await apiLogin(request)
    const dia = hojeLocal(2)
    const { orcamento, nomeCliente } = await novoOrcamento(request, token, 'QA1035A', { sinalAtivo: true, percentualSinal: 30, sinalAte: dia })
    for (let i = 0; i < 3; i++) await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('AGUARDANDO_SINAL')

    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: `Sinal a receber — ORC-${orcamento.numero} (${nomeCliente}) — R$ 30,00` })
    await expect(chip).toBeVisible()
    await expect(chip).toHaveClass(/bg-rose-bg/)
    await expect(chip).not.toHaveClass(/bg-teal/)
    await chip.click()
    const painel = page.getByTestId('painel-orcamento')
    await expect(painel).toContainText(nomeCliente)
    await expect(painel).toContainText('Sinal até')
    await expect(painel).toContainText('R$ 100,00')
  })

  test('CT-1035-02 — a validade aparece só no dia e some ao aprovar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const dia = hojeLocal(3)
    const { orcamento } = await novoOrcamento(request, token, 'QA1035B', { dataValidade: `${dia}T12:00:00` })
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero} vence hoje` })).toBeVisible()
    await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero}` })).toHaveCount(0)
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await page.reload()
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero}` })).toHaveCount(0)
  })

  test('CT-1035-03 — saldo a receber (total menos o sinal pago) no dia da entrega estimada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento, nomeCliente } = await novoOrcamento(request, token, 'QA1035C', { sinalAtivo: true, percentualSinal: 30, prazoProducaoDias: 1 })
    for (let i = 0; i < 6; i++) await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('FINALIZADO')
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: `Saldo a receber — ORC-${orcamento.numero} (${nomeCliente}) — R$ 70,00` })).toBeVisible()
  })

  test('CT-1035-04 (negativo) — "Sinal até" no passado bloqueia o salvamento; uma data futura salva', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento } = await novoOrcamento(request, token, 'QA1035D', { sinalAtivo: true, percentualSinal: 30 })
    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}/editar`)
    const campo = page.getByLabel('Sinal até')
    await expect(campo).toBeVisible()
    await campo.fill(hojeLocal(-1))
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('A data do sinal não pode ser anterior a hoje')).toBeVisible()
    expect((await buscarOrcamento(request, token, orcamento.id)).sinalAte ?? null).toBeNull()
    await campo.fill(hojeLocal(4))
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page).toHaveURL(new RegExp(`/orcamentos/${orcamento.id}$`))
    expect((await buscarOrcamento(request, token, orcamento.id)).sinalAte).toBe(hojeLocal(4))
  })

  test('CT-1035-05 — o detalhe do orçamento mostra a data e a hora de cada passo já ocorrido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento } = await novoOrcamento(request, token, 'QA1035E', { prazoProducaoDias: 2 })
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO
    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    for (const passo of ['RASCUNHO', 'ENVIADO']) {
      await expect(page.getByTestId(`data-passo-${passo}`)).toHaveText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    }
    await expect(page.getByTestId('data-passo-ENTREGUE')).toHaveCount(0)
  })
})
