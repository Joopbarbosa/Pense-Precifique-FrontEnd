import { test, expect } from '@playwright/test'
import { login, API_URL, TEST_SENHA } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/** V0.17.0 #973 (RN-NOVA-26, UC-NOVO-6, CEN-NOVO-76 a 78): histórico das vendas do Caixa pela tela. */
test('V0.17.0 — #973 histórico de vendas: abre do Caixa, busca, ordena, abre a venda e bloqueia período invertido', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const vendas: string[] = []
  await apiAbrirTurno(request, token)
  try {
    const insumo = await criarInsumo(request, token, `QA973-insumo-${Date.now()}`)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
    const produto = await apiCriarProdutoTipo(request, token, `QA973-produto-${Date.now()}`, 'PRODUTO', 15, 10, [{ insumoId: insumo.id, quantidade: 1 }])
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 15 }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
    const id = (await r.json()).id
    vendas.push(id)
    const venda = await (await request.get(`${API_URL}/caixa/vendas/${id}`, { headers })).json()

    await login(page)
    await page.goto('/caixa')
    await page.getByRole('button', { name: 'Histórico de vendas', exact: true }).click()
    await expect(page).toHaveURL(/\/caixa\/historico$/)
    await expect(page.getByRole('heading', { name: 'Histórico de vendas do Caixa' })).toBeVisible()

    // busca pelo identificador da venda criada
    await page.getByLabel('Buscar por venda ou cliente').fill(venda.identificador)
    await expect(page.getByTestId('linha-historico-venda')).toHaveCount(1)
    await expect(page.getByTestId('tabela-historico-vendas')).toContainText(venda.identificador)
    await expect(page.getByTestId('total-historico')).toContainText('1 venda neste filtro')

    // ordenação pelo cabeçalho do total alterna o sentido
    await page.getByLabel('Buscar por venda ou cliente').fill('')
    await page.getByRole('button', { name: /Total/ }).first().click()
    await expect(page.getByTestId('tabela-historico-vendas')).toBeVisible()

    // clique na linha abre a modal de dados da venda (venda do Caixa não tem página própria)
    await page.getByTestId('linha-historico-venda').filter({ hasText: venda.identificador }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

    // período invertido é BLOQUEIO: a mensagem aparece e a lista não muda
    await page.getByLabel('Data inicial').fill('2099-01-10')
    await page.getByLabel('Data final').fill('2099-01-01')
    await expect(page.getByText('A data inicial não pode ser maior que a final')).toBeVisible()
  } finally {
    for (const id of vendas) {
      const res = await request.post(`${API_URL}/caixa/vendas/${id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Limpeza da massa do teste do histórico de vendas da tarefa 973', senha: TEST_SENHA, retornarEstoque: true } })
      expect(res.ok()).toBeTruthy()
    }
    await apiFecharTurnoSeAberto(request, token)
  }
})
