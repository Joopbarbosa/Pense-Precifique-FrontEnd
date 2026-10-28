import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1108 e #1109 (V0.18.0, correções do teste manual) — o painel do orçamento na Agenda lista os produtos e traz, na linha do botão
 * de avançar, "Novo evento deste orçamento" e "Abrir orçamento".
 */
test.describe('#1108/#1109 — Painel do orçamento na Agenda', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  async function abrirEntrega(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, rotulo: string) {
    const token = await apiLogin(request)
    const nomeProduto = `${rotulo}-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${rotulo}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 2 }], { prazoProducaoDias: 3 })
    for (let i = 0; i < 2; i++) await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO, APROVADO
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('compromisso').filter({ hasText: `Entrega estimada — ORC-${orcamento.numero}` }).click()
    return { orcamento, nomeProduto }
  }

  test('CT-1108-01 — o painel da entrega estimada lista os produtos com a quantidade', async ({ page, request }) => {
    const { nomeProduto } = await abrirEntrega(page, request, 'QA1108')
    await expect(page.getByTestId('painel-orcamento')).toBeVisible()
    await expect(page.getByTestId('produtos-orcamento')).toContainText(`2× ${nomeProduto}`)
  })

  test('CT-1109-01 / CEN-NOVO-131 — "Abrir orçamento" abre o detalhe em nova aba e mantém a Agenda', async ({ page, request }) => {
    const { orcamento } = await abrirEntrega(page, request, 'QA1109A')
    const urlAgenda = page.url()
    const [nova] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', { name: 'Abrir orçamento', exact: true }).click(),
    ])
    await expect(nova).toHaveURL(new RegExp(`/orcamentos/${orcamento.id}$`))
    expect(page.url()).toBe(urlAgenda)
    await expect(page.getByTestId('painel-orcamento')).toBeVisible()
  })

  test('CT-1109-02 — "Novo evento deste orçamento" abre a modal de novo evento', async ({ page, request }) => {
    await abrirEntrega(page, request, 'QA1109B')
    await page.getByRole('button', { name: 'Novo evento deste orçamento' }).click()
    await expect(page.getByTestId('modal-evento')).toBeVisible()
  })
})
