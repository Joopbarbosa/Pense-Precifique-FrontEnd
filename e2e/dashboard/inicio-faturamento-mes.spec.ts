import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiAbrirTurno, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #1022 (RN-NOVA-37, CEN-NOVO-124 e 127): o "Faturamento do mês" da Início soma as vendas do mês (Caixa concluída e orçamento
 * entregue) e explica a conta no "?". Conta efêmera: o cartão começa em R$ 0,00 e só tem o que o teste vende. O orçamento entregue e a
 * virada do mês são afirmados na integração (DashboardFaturamentoMesIT); aqui vale a tela.
 */

test('V0.17.0 — #1022 Início: mês sem venda mostra R$ 0,00, a frase de mês vazio e o "?" explica a conta', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'fat-vazio')
  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/dashboard')
  await expect(page.getByText('Faturamento do mês').first()).toBeVisible()
  await expect(page.getByText('Sem receita este mês')).toBeVisible()
  await page.getByRole('button', { name: /Como funciona: Faturamento do mês/ }).click()
  await expect(page.getByText(/orçamentos entregues \(pela data da entrega\) e vendas do Caixa concluídas/)).toBeVisible()
  await expect(page.getByText(/Valor da venda 1 \+ valor da venda 2/)).toBeVisible()
  await expect(page.getByText(/Um orçamento entregue de R\$\s*300,00 e uma venda do Caixa de R\$\s*150,00 dão R\$\s*450,00/)).toBeVisible()
})

test('V0.17.0 — #1022 Início: vendas do Caixa do mês entram no Faturamento do mês', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'fat-caixa')
  const headers = { Authorization: `Bearer ${conta.token}` }
  await apiAbrirTurno(request, conta.token)
  const metodo = await apiMetodoPagamentoPorTipo(request, conta.token, 'DINHEIRO')
  const produto = await apiCriarProdutoTipo(request, conta.token, 'Caderno', 'PRODUTO', 40, 20)
  const r = await request.post(`${API_URL}/caixa/vendas`, {
    headers, data: { itens: [{ produtoId: produto.id, quantidade: 3 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 120 }] },
  })
  expect(r.ok(), await r.text()).toBeTruthy()

  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/dashboard')
  await expect(page.getByText(/R\$\s*120,00/).first()).toBeVisible()
  await expect(page.getByText('Sem receita este mês')).toHaveCount(0)
})
