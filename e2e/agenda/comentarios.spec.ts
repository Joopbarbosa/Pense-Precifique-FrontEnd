import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, cancelarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1038 (V0.18.0, RN-NOVA-22) — comentários por orçamento: a mesma conversa no detalhe do compromisso da Agenda e na aba "Comentários"
 * do Detalhe do Orçamento; 1 a 500 caracteres; sem edição nem exclusão; vale em qualquer status. CEN-NOVO-63 a 65.
 */
test.describe('#1038 — Comentários por orçamento', () => {
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

  test('CT-1038-01 — comentar pela Agenda: aparece no fim da conversa com data e hora, e é o mesmo comentário na aba do orçamento', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1038A', { prazoProducaoDias: 5, dataValidade: `${hojeLocal(1)}T12:00:00` })
    await avancarStatusViaApi(request, token, orcamento.id)
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero}` }).click()
    await expect(page.getByTestId('sem-comentarios')).toBeVisible()
    await page.getByLabel('Novo comentário').fill('Cliente pediu entrega no sábado')
    await page.getByRole('button', { name: 'Enviar' }).click()
    const itens = page.getByTestId('lista-comentarios').locator('li')
    await expect(itens).toHaveCount(1)
    await expect(itens.first()).toContainText('Cliente pediu entrega no sábado')
    await expect(itens.first()).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)

    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Comentários', exact: true }).click()
    await expect(page.getByTestId('lista-comentarios').locator('li')).toHaveCount(1)
    await expect(page.getByTestId('lista-comentarios')).toContainText('Cliente pediu entrega no sábado')
    await page.getByLabel('Novo comentário').fill('Combinei às 10h')
    await page.getByRole('button', { name: 'Enviar' }).click()
    const depois = page.getByTestId('lista-comentarios').locator('li')
    await expect(depois).toHaveCount(2)
    await expect(depois.nth(1)).toContainText('Combinei às 10h')
  })

  test('CT-1038-02 (negativo) — comentário vazio ou só com espaços não é enviado; o limite é de 500 caracteres', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1038B', { prazoProducaoDias: 5 })
    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Comentários', exact: true }).click()
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Escreva o comentário')).toBeVisible()
    await page.getByLabel('Novo comentário').fill('     ')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByTestId('lista-comentarios')).toHaveCount(0)
    await page.getByLabel('Novo comentário').fill('a'.repeat(501))
    await expect(page.getByLabel('Novo comentário')).toHaveValue('a'.repeat(500))
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByTestId('lista-comentarios').locator('li')).toHaveCount(1)
  })

  test('CT-1038-03 — comenta em orçamento cancelado e não há edição nem exclusão de comentário', async ({ page, request }) => {
    const token = await apiLogin(request)
    const orcamento = await novoOrcamento(request, token, 'QA1038C', { prazoProducaoDias: 5 })
    await cancelarOrcamentoViaApi(request, token, orcamento.id, { motivoCancelamento: 'x' })
    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Comentários', exact: true }).click()
    await page.getByLabel('Novo comentário').fill('Cliente desistiu')
    await page.getByRole('button', { name: 'Enviar' }).click()
    const item = page.getByTestId('lista-comentarios').locator('li')
    await expect(item).toHaveCount(1)
    await expect(item.getByRole('button')).toHaveCount(0)
  })
})
