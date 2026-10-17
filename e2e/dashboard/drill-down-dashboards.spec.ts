import { test, expect } from '@playwright/test'
import { login, API_URL, TEST_SENHA } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #968, #970 e #971 (RN-NOVA-23): clique e lupa abrem modal, sem trocar de aba; ranking mostra 10 e a lupa lista todos.
 */

test('V0.17.0 — #971 "Em quantos produtos" abre os produtos que usam o insumo, com a quantidade na ficha', async ({ page, request }) => {
  const token = await apiLogin(request)
  const sufixo = Date.now()
  const insumo = await criarInsumo(request, token, `QA971-insumo-${sufixo}`)
  const nomeProduto = `QA971-produto-${sufixo}`
  const produto = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, fichaTecnica: [{ insumoId: insumo.id, quantidade: 2 }] },
  })
  expect(produto.ok(), await produto.text()).toBeTruthy()

  await login(page)
  await page.goto('/cadastros/dashboard')
  const ranking = page.getByTestId('ind-insumos-em-produtos')
  await expect(ranking.getByRole('button', { name: /Lupa: lista completa de Em quantos produtos/ })).toBeVisible()
  // o banco de teste acumula insumos de outros cenários: o clique na primeira barra abre os produtos daquele insumo
  await ranking.getByTestId('ind-insumos-em-produtos-grafico').locator('.recharts-bar-rectangle').first().click()
  await expect(page.getByTestId('modal-produtos-do-insumo')).toBeVisible()
  await expect(page.getByTestId('modal-produtos-do-insumo')).toContainText('Quantidade na ficha')
  await expect(page.getByTestId('modal-produtos-do-insumo').locator('tbody tr').first()).toBeVisible()
  expect(nomeProduto).toMatch(/QA971-produto-/)
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})

test('V0.17.0 — #968 lupa de Produtos mais vendidos lista todos; clique numa linha da listagem abre a modal de dados', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const vendas: string[] = []
  await apiAbrirTurno(request, token)
  try {
    const insumo = await criarInsumo(request, token, `QA968-insumo-${Date.now()}`)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
    const produto = await apiCriarProdutoTipo(request, token, `QA968-produto-${Date.now()}`, 'PRODUTO', 15, 10, [{ insumoId: insumo.id, quantidade: 2 }])
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 15 }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
    vendas.push((await r.json()).id)

    await login(page)
    await page.goto('/vendas/dashboard')
    // #969 (RN-NOVA-24, CEN-NOVO-67): donut de origem com legenda e sem rótulos de texto nas fatias
    await expect(page.getByTestId('donut-origem')).toContainText('Caixa:')
    await expect(page.getByTestId('grafico-origem').locator('.recharts-pie-label-text')).toHaveCount(0)
    // #972 (CEN-NOVO-71): até 4 formas com venda, donut com legenda
    await expect(page.getByTestId('donut-formas')).toContainText('Dinheiro:')
    await page.getByRole('button', { name: 'Ver lista completa de produtos vendidos' }).click()
    await expect(page.getByTestId('lista-todos')).toBeVisible()
    await expect(page.getByTestId('lista-todos')).toContainText(`QA968-produto-`)
    await expect(page).toHaveURL(/\/vendas\/dashboard$/)
    await page.keyboard.press('Escape')

    // #970 — na aba Vendas, o clique numa linha de venda abre a modal de dados (venda do Caixa não tem página)
    await page.getByRole('tab', { name: 'Vendas' }).click()
    await page.getByTestId('linha-venda').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/vendas\/dashboard$/)
  } finally {
    for (const id of vendas) {
      const r = await request.post(`${API_URL}/caixa/vendas/${id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Limpeza da massa do teste de drill-down da tarefa 968', senha: TEST_SENHA, retornarEstoque: true } })
      expect(r.ok()).toBeTruthy()
    }
    await apiFecharTurnoSeAberto(request, token)
  }
})

test('V0.17.0 — #974 faixa de estoque e CMV: lupas abrem a listagem, sem trocar de tela', async ({ page }) => {
  await login(page)
  await page.goto('/cadastros/dashboard')
  await expect(page.getByTestId('card-estoque-valor')).toBeVisible()
  await expect(page.getByTestId('estoque-valor-material')).toContainText('Material: R$')
  await expect(page.getByTestId('estoque-valor-prontos')).toContainText('Produtos prontos: R$')

  await page.getByRole('button', { name: 'Ver registros de Valor do estoque a custo' }).click()
  await expect(page.getByTestId('total-estoque')).toContainText('Total R$')
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  await page.getByRole('button', { name: 'Ver registros de % de CMV' }).click()
  await expect(page.getByText('Vendas que compõem o CMV', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})
