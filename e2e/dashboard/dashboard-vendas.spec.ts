import { test, expect } from '@playwright/test'
import { login, API_URL, TEST_SENHA } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/** V0.17.0 — #719 (RN-NOVA-12 e 17): CEN-NOVO-38, 39, 40 e 54 pela tela, com vendas reais do Caixa. */
test('V0.17.0 — Dashboard de Vendas: números batem com a lista aberta pela lupa e a lista mostra todos os status', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const vendas: string[] = []
  await apiAbrirTurno(request, token)
  try {
    const insumo = await criarInsumo(request, token, `QA719-insumo-${Date.now()}`)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
    for (const [indice, preco] of [[1, 15], [2, 25]]) {
      const produto = await apiCriarProdutoTipo(request, token, `QA719-produto-${indice}-${Date.now()}`, 'PRODUTO', preco, 10, [{ insumoId: insumo.id, quantidade: 2 }])
      const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 3 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 3 * preco }] } })
      expect(r.ok(), await r.text()).toBeTruthy()
      vendas.push((await r.json()).id)
    }
    const painel = await (await request.get(`${API_URL}/dashboard/vendas`, { headers })).json()
    expect(painel.faturamento.valor).toBeGreaterThanOrEqual(120)

    await login(page)
    await page.goto('/dashboard')
    // V0.17.0 #963: grupos recolhidos ao entrar — abre Vendas e clica no link pelo destino
    await page.getByRole('button', { name: 'Vendas', exact: true }).click()
    await page.locator('a[href="/vendas/dashboard"]').click()
    await expect(page).toHaveURL(/\/vendas\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard de vendas' })).toBeVisible()
    await expect(page.getByTestId('grafico-faturamento-mes')).toBeVisible()
    await expect(page.getByTestId('grafico-formas-pagamento')).toBeVisible()

    // CEN-NOVO-54 — lupa do Faturamento abre a lista só com as vendas que formam o número; total e quantidade conferem
    await page.getByRole('button', { name: 'Ver registros de Faturamento' }).click()
    await expect(page.getByTestId('filtro-aplicado')).toBeVisible()
    const lista = await (await request.get(`${API_URL}/dashboard/vendas/lista?somenteQueContam=true`, { headers })).json()
    expect(lista.totalFiltrado).toBe(painel.faturamento.valor)
    expect(lista.quantidadeFiltrada).toBe(painel.quantidadeVendas.valor)
    await expect(page.getByTestId('totais-lista')).toContainText(`${lista.quantidadeFiltrada} vendas`)
    for (const id of vendas) {
      const venda = (await (await request.get(`${API_URL}/caixa/vendas/${id}`, { headers })).json())
      await expect(page.getByTestId('tabela-vendas')).toContainText(venda.identificador)
    }

    // CEN-NOVO-39/40 — ampliar o filtro volta a mostrar os outros status
    await page.getByRole('button', { name: 'Mostrar todos os status' }).click()
    await expect(page.getByTestId('filtro-aplicado')).toHaveCount(0)
    await expect(page.getByTestId('tabela-vendas')).toBeVisible()
  } finally {
    for (const id of vendas) {
      const r = await request.post(`${API_URL}/caixa/vendas/${id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Limpeza da massa do cenário do Dashboard de Vendas da tarefa 719', senha: TEST_SENHA, retornarEstoque: true } })
      expect(r.ok()).toBeTruthy()
    }
    await apiFecharTurnoSeAberto(request, token)
  }
})
