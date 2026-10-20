import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiAbrirTurno, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #1017 (RN-NOVA-36, CEN-NOVO-123): o "Mais vendidos" da Início mostra "Nome — Marca" e mantém as duas linhas separadas.
 */
test('V0.17.0 — #1017 Início: dois produtos de mesmo nome com marcas diferentes aparecem como Nome — Marca', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'marca-inicio')
  const headers = { Authorization: `Bearer ${conta.token}` }
  await apiAbrirTurno(request, conta.token)
  const metodo = await apiMetodoPagamentoPorTipo(request, conta.token, 'DINHEIRO')
  for (const [marca, qtd] of [['Pense', 3], ['Escolar', 2]] as const) {
    const p = await (await request.post(`${API_URL}/produtos`, {
      headers, data: { nome: 'Caderno', marca, tipo: 'PRODUTO', tempoProducao: 1, rendimento: 1, precoVenda: 10, estoqueAtual: 20, permitirEstoqueNegativo: true, fichaTecnica: [] },
    })).json()
    const v = await request.post(`${API_URL}/caixa/vendas`, {
      headers, data: { itens: [{ produtoId: p.id, quantidade: qtd }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 10 * qtd }] },
    })
    expect(v.ok(), await v.text()).toBeTruthy()
  }

  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/dashboard')
  await expect(page.getByText('Caderno — Pense')).toBeVisible()
  await expect(page.getByText('Caderno — Escolar')).toBeVisible()
  await expect(page.getByText('3 vendidos')).toBeVisible()
  await expect(page.getByText('2 vendidos')).toBeVisible()
})
