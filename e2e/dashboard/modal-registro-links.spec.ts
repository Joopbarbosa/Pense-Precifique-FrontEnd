import { test, expect } from '@playwright/test'
import { login, API_URL, TEST_SENHA } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/** V0.17.0 — #720 (RN-NOVA-14): CEN-NOVO-47 (item abre o Produto em aba nova) e 50 (cadastro excluído aparece sem link). */
test('V0.17.0 — item da modal da venda abre o Produto em nova aba; produto excluído fica sem link', async ({ page, request, context }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  const vendas: string[] = []
  await apiAbrirTurno(request, token)
  try {
    const insumo = await criarInsumo(request, token, `QA720-insumo-${sufixo}`)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
    const vivo = await apiCriarProdutoTipo(request, token, `QA720-vivo-${sufixo}`, 'PRODUTO', 15, 10, [{ insumoId: insumo.id, quantidade: 1 }])
    const apagado = await apiCriarProdutoTipo(request, token, `QA720-apagado-${sufixo}`, 'PRODUTO', 25, 10, [{ insumoId: insumo.id, quantidade: 1 }])
    const identificadores: Record<string, string> = {}
    for (const produto of [vivo, apagado]) {
      const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: produto === vivo ? 15 : 25 }] } })
      expect(r.ok(), await r.text()).toBeTruthy()
      const venda = await r.json()
      vendas.push(venda.id)
      identificadores[produto.id] = venda.identificador
    }
    const exclusao = await request.delete(`${API_URL}/produtos/${apagado.id}`, { headers })
    expect(exclusao.status(), await exclusao.text()).toBeLessThan(300)

    await login(page)
    await page.goto('/vendas/dashboard')
    await page.getByRole('tab', { name: 'Vendas' }).click()

    // CEN-NOVO-47 — produto cadastrado: o item é link e abre o detalhe do Produto em aba nova; a modal continua aberta
    await page.getByTestId('linha-venda').filter({ hasText: identificadores[vivo.id] }).click()
    const link = page.getByTestId('modal-registro').getByTestId('item-link')
    await expect(link).toHaveText(`QA720-vivo-${sufixo}`)
    const [aba] = await Promise.all([context.waitForEvent('page'), link.click()])
    await expect(aba).toHaveURL(new RegExp(`/produtos/${vivo.id}$`))
    await aba.close()
    await expect(page.getByTestId('modal-registro')).toBeVisible()
    await page.getByRole('button', { name: 'Fechar', exact: true }).first().click()

    // CEN-NOVO-50 — produto excluído: aparece como texto, sem link
    await page.getByTestId('linha-venda').filter({ hasText: identificadores[apagado.id] }).click()
    await expect(page.getByTestId('modal-registro').getByTestId('item-texto')).toHaveText(`QA720-apagado-${sufixo}`)
    await expect(page.getByTestId('modal-registro').getByTestId('item-link')).toHaveCount(0)
  } finally {
    for (const id of vendas) {
      const r = await request.post(`${API_URL}/caixa/vendas/${id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Limpeza da massa do cenário da modal de registro da tarefa 720', senha: TEST_SENHA, retornarEstoque: true } })
      expect(r.ok()).toBeTruthy()
    }
    await apiFecharTurnoSeAberto(request, token)
  }
})
