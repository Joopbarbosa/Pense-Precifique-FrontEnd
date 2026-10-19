import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #992 (RN-NOVA-26, alteração, RN-NOVA-31, CEN-NOVO-95): o botão "Histórico de vendas" do Caixa abre a modal das vendas de
 * hoje (concluídas e canceladas), da mais recente para a mais antiga e paginada; a linha abre os dados da venda e "Ver histórico
 * completo" abre a tela em aba nova. Conta efêmera.
 */
test('V0.17.0 — #992 modal de vendas de hoje: ordem, cancelada incluída, venda aberta, tela completa em aba nova e paginação', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'dia992')
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  await apiAbrirTurno(request, token)
  const insumo = await criarInsumo(request, token, `QA992-insumo-${sufixo}`)
  const produto = await apiCriarProdutoTipo(request, token, `QA992-produto-${sufixo}`, 'PRODUTO', 10, 40, [{ insumoId: insumo.id, quantidade: 1 }])
  const pix = await apiMetodoPagamentoPorTipo(request, token, 'PIX')

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/caixa')
  // dia sem venda: o estado vazio e o botão da tela completa continuam disponíveis
  await page.getByRole('button', { name: 'Histórico de vendas', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Nenhuma venda hoje')
  await expect(page.getByRole('button', { name: 'Ver histórico completo' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  const vender = async () => {
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: pix.id, valor: 10 }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as { id: string; identificador: string }
  }
  const vendas = []
  for (let i = 0; i < 21; i++) vendas.push(await vender())
  const cancelada = vendas[3]
  const c = await request.post(`${API_URL}/caixa/vendas/${cancelada.id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Cliente desistiu da compra antes da entrega', senha: TEST_SENHA, retornarEstoque: true } })
  expect(c.ok(), await c.text()).toBeTruthy()

  await page.reload()
  await page.getByRole('button', { name: 'Histórico de vendas', exact: true }).click()
  const dialogo = page.getByRole('dialog')
  // 21 vendas de hoje: 20 na primeira página, a mais recente primeiro; a cancelada também entra na lista
  await expect(page.getByTestId('total-vendas-do-dia')).toHaveText('21 vendas hoje')
  await expect(dialogo).toContainText('Página 1 de 2')
  await expect(page.getByTestId('linha-venda-do-dia')).toHaveCount(20)
  const primeiraColuna = await page.getByTestId('linha-venda-do-dia').locator('td:first-child').allInnerTexts()
  expect(primeiraColuna[0]).toBe(vendas[20].identificador) // a mais recente primeiro
  expect(primeiraColuna).not.toContain(vendas[0].identificador) // a mais antiga fica na página 2

  // página 2: só a mais antiga
  await dialogo.getByRole('button', { name: 'Próxima' }).click()
  await expect(dialogo).toContainText('Página 2 de 2')
  await expect(page.getByTestId('linha-venda-do-dia')).toHaveCount(1)
  await expect(page.getByTestId('linha-venda-do-dia').first()).toContainText(vendas[0].identificador)
  await dialogo.getByRole('button', { name: 'Anterior' }).click()
  await expect(dialogo).toContainText('Página 1 de 2')
  await expect(page.getByTestId('linha-venda-do-dia').filter({ hasText: cancelada.identificador })).toContainText('Cancelada')

  // a linha abre a modal de dados da venda
  await page.getByTestId('linha-venda-do-dia').first().click() // a mais recente
  await expect(page.getByTestId('modal-registro')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  // a tela completa abre em aba nova e a modal continua aberta
  const [aba] = await Promise.all([page.waitForEvent('popup'), dialogo.getByRole('button', { name: 'Ver histórico completo' }).click()])
  await expect(aba).toHaveURL(/\/caixa\/historico$/)
  await expect(dialogo).toContainText('Vendas de hoje')
  await expect(page).toHaveURL(/\/caixa$/)
})
