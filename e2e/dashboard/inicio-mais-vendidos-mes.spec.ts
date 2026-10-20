import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiAbrirTurno, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #999 (RN-NOVA-35, CEN-NOVO-110, 111, 114): o "Mais vendidos" da Início vale para o mês atual, só com vendas, e dois cadastros
 * com o mesmo nome aparecem em linhas separadas. Conta efêmera: o ranking começa vazio e tem só o que o teste vende.
 */

test('V0.17.0 — #999 Início: mês sem venda mostra o vazio e o subtítulo do mês', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'mv-vazio')
  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/dashboard')
  await expect(page.getByText('Top produtos do mês')).toBeVisible()
  await expect(page.getByText('Nenhum produto vendido neste mês.')).toBeVisible()
  await expect(page.getByText('Top produtos do período')).toHaveCount(0)
})

test('V0.17.0 — #999 Início: dois produtos com o mesmo nome aparecem em linhas separadas e o "?" explica o mês', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'mv-nomes')
  const token = conta.token
  const headers = { Authorization: `Bearer ${token}` }
  await apiAbrirTurno(request, token)
  const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  // #1017: nome + marca são únicos; dois cadastros "Caderno" só coexistem com marcas diferentes e nunca se somam no ranking.
  const criar = async (marca: string) => {
    const r = await request.post(`${API_URL}/produtos`, {
      headers, data: { nome: 'Caderno', marca, tipo: 'PRODUTO', tempoProducao: 1, rendimento: 1, precoVenda: 10, estoqueAtual: 20, permitirEstoqueNegativo: true, fichaTecnica: [] },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    return r.json()
  }
  const cad12 = await criar('Pense')
  const cad31 = await criar('Escolar')
  for (const [produto, qtd] of [[cad12, 3], [cad31, 2]] as const) {
    const r = await request.post(`${API_URL}/caixa/vendas`, {
      headers, data: { itens: [{ produtoId: produto.id, quantidade: qtd }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 10 * qtd }] },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
  }

  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/dashboard')
  await expect(page.getByText('Top produtos do mês')).toBeVisible()
  await expect(page.getByText('Caderno — Pense')).toHaveCount(1)
  await expect(page.getByText('Caderno — Escolar')).toHaveCount(1)
  await expect(page.getByText('3 vendidos')).toBeVisible()
  await expect(page.getByText('2 vendidos')).toBeVisible()

  // CEN-NOVO-111 — o balão explica o mês atual e a conta
  await page.getByRole('button', { name: /Como funciona: Mais vendidos/ }).click()
  await expect(page.getByText(/5 produtos mais vendidos no mês atual/)).toBeVisible()
  await expect(page.getByText(/3 \+ 2 = 5 unidades/)).toBeVisible()
  await expect(page.getByText(/todos os orçamentos da conta/)).toHaveCount(0)
})
