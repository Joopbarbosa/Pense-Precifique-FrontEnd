import { test, expect } from '@playwright/test'
import { login, loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
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
    // #992: o botão do Caixa abre a modal de hoje; "Ver histórico completo" abre a tela em aba nova e a modal continua aberta
    await page.getByRole('button', { name: 'Histórico de vendas', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('Vendas de hoje')
    const [aba] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Ver histórico completo' }).click()])
    await expect(aba).toHaveURL(/\/caixa\/historico$/)
    await expect(page.getByRole('dialog')).toContainText('Vendas de hoje')
    await aba.close()
    await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()
    await page.goto('/caixa/historico')
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

/**
 * V0.17.0 #1002 (QA da #973, CEN-NOVO-77): as vendas do cenário — CX-1 R$ 15,00 em Dinheiro, CX-2 R$ 45,00 e CX-3 R$ 25,00 em Pix,
 * CX-4 R$ 25,00 em Pix, cancelada. Conta efêmera, para os números começarem em CX-1.
 */
test('V0.17.0 — #1002 histórico: ordenar por Total com empate, filtrar por status e forma, buscar e busca sem resultado', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'hist1002')
  const headers = { Authorization: `Bearer ${token}` }
  await apiAbrirTurno(request, token)
  const insumo = await criarInsumo(request, token, `QA1002-insumo-${Date.now()}`)
  const dinheiro = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  const pix = await apiMetodoPagamentoPorTipo(request, token, 'PIX')
  const ficha = [{ insumoId: insumo.id, quantidade: 1 }]
  const vender = async (valor: number, metodoId: string) => {
    const produto = await apiCriarProdutoTipo(request, token, `QA1002-P${valor}-${Date.now()}`, 'PRODUTO', valor, 10, ficha)
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodoId, valor }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()).id as string
  }
  await vender(15, dinheiro.id) // CX-1
  await vender(45, pix.id) // CX-2
  await vender(25, pix.id) // CX-3
  const cx4 = await vender(25, pix.id) // CX-4
  const cancelada = await request.post(`${API_URL}/caixa/vendas/${cx4}/cancelar`, { headers, data: { cancelamentoMotivo: 'Cancelamento do cenário de ordenação do histórico (tarefa 1002)', senha: TEST_SENHA, retornarEstoque: true } })
  expect(cancelada.ok(), await cancelada.text()).toBeTruthy()

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/caixa/historico')
  const ordem = async () => (await page.getByTestId('linha-historico-venda').evaluateAll(trs => trs.map(tr => (tr.querySelector('td')?.textContent ?? '').trim().match(/CX-\d+/)?.[0] ?? '')))
  await expect(page.getByTestId('total-historico')).toContainText('4 vendas neste filtro')

  // Total crescente e decrescente; o empate de R$ 25,00 desempata pelo número, do maior para o menor
  await page.getByRole('button', { name: /Total/ }).first().click()
  await expect.poll(ordem).toEqual(['CX-1', 'CX-4', 'CX-3', 'CX-2'])
  await page.getByRole('button', { name: /Total/ }).first().click()
  await expect.poll(ordem).toEqual(['CX-2', 'CX-4', 'CX-3', 'CX-1'])

  // status Cancelada: só CX-4
  await page.getByLabel('Status', { exact: true }).selectOption('CANCELADA')
  await expect.poll(ordem).toEqual(['CX-4'])
  await page.getByLabel('Status', { exact: true }).selectOption('')

  // forma Pix e busca "CX-2": só CX-2
  await page.getByLabel('Forma de pagamento').selectOption('Pix')
  await expect.poll(ordem).toEqual(['CX-2', 'CX-4', 'CX-3'])
  await page.getByLabel('Buscar por venda ou cliente').fill('CX-2')
  await expect.poll(ordem).toEqual(['CX-2'])

  // busca sem resultado
  await page.getByLabel('Forma de pagamento').selectOption('')
  await page.getByLabel('Buscar por venda ou cliente').fill('7')
  await expect(page.getByText('Nenhuma venda encontrada')).toBeVisible()
})
