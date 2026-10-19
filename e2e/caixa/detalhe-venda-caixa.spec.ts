import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { criarCliente } from '../helpers/orcamento'
import { apiAbrirTurno, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #993 (RN-NOVA-30, CEN-NOVO-96): a modal de dados da venda do Caixa mostra identificador, status, data e hora, cliente
 * (ou "Consumidor final"), itens, desconto, pagamentos pelo nome, troco e, se cancelada, o motivo. Conta efêmera.
 */
test('V0.17.0 — #993 detalhe completo da venda do Caixa: cliente, data e hora, pagamentos, troco e motivo', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'detalhe993')
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  await apiAbrirTurno(request, token)
  const insumo = await criarInsumo(request, token, `QA993-insumo-${sufixo}`)
  const ficha = [{ insumoId: insumo.id, quantidade: 1 }]
  const laco = await apiCriarProdutoTipo(request, token, `QA993-Laco-${sufixo}`, 'PRODUTO', 15, 30, ficha)
  const caderno = await apiCriarProdutoTipo(request, token, `QA993-Caderno-${sufixo}`, 'PRODUTO', 45, 30, ficha)
  const maria = await criarCliente(request, token, `Maria Silva ${sufixo}`)
  const dinheiro = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  const pix = await apiMetodoPagamentoPorTipo(request, token, 'PIX')
  const vender = async (data: Record<string, unknown>) => {
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data })
    expect(r.ok(), await r.text()).toBeTruthy()
    return r.json() as Promise<{ id: string; identificador: string }>
  }

  // CX com cliente: 2 × laço (R$ 15,00) + 1 × caderno (R$ 45,00) = R$ 75,00, desconto de 10% (R$ 7,50), total R$ 67,50, Dinheiro + Pix
  const comCliente = await vender({
    clienteId: maria.id, descontoTipo: 'PERCENTUAL', descontoValor: 10,
    itens: [{ produtoId: laco.id, quantidade: 2 }, { produtoId: caderno.id, quantidade: 1 }],
    pagamentos: [{ metodoPagamentoId: dinheiro.id, valor: 50 }, { metodoPagamentoId: pix.id, valor: 17.5 }],
  })
  // CX sem cliente, R$ 45,00 em Dinheiro de R$ 50,00 (troco R$ 5,00)
  const comTroco = await vender({ itens: [{ produtoId: caderno.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: dinheiro.id, valor: 50 }] })
  // CX sem cliente em Pix, cancelada com motivo
  const cancelada = await vender({ itens: [{ produtoId: caderno.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: pix.id, valor: 45 }] })
  const motivo = 'Cliente desistiu da compra antes da entrega'
  const cancelou = await request.post(`${API_URL}/caixa/vendas/${cancelada.id}/cancelar`, { headers, data: { cancelamentoMotivo: motivo, senha: TEST_SENHA, retornarEstoque: true } })
  expect(cancelou.ok(), await cancelou.text()).toBeTruthy()

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/caixa/historico')
  const abrir = async (identificador: string) => {
    await page.getByTestId('linha-historico-venda').filter({ hasText: identificador }).click()
    return page.getByTestId('modal-registro')
  }

  // com cliente: data e hora (dd/mm/aaaa hh:mm), cliente, itens, desconto em reais com o percentual, pagamentos pelo nome
  let modal = await abrir(comCliente.identificador)
  await expect(page.getByRole('dialog')).toContainText(comCliente.identificador)
  await expect(page.getByRole('dialog')).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
  await expect(page.getByRole('dialog')).toContainText('Concluída')
  await expect(page.getByRole('dialog')).toContainText(`Maria Silva ${sufixo}`)
  await expect(modal).toContainText(`QA993-Laco-${sufixo}`)
  await expect(modal).toContainText(`QA993-Caderno-${sufixo}`)
  await expect(modal).toContainText('R$ 75,00')
  await expect(modal).toContainText('R$ 7,50 (10%)')
  await expect(modal).toContainText('R$ 67,50')
  await expect(modal).toContainText('Dinheiro: R$ 50,00')
  await expect(modal).toContainText('Pix: R$ 17,50')
  await expect(modal.getByRole('button', { name: /Abrir/ })).toHaveCount(0) // venda do Caixa não tem página
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  // sem cliente e com troco
  modal = await abrir(comTroco.identificador)
  await expect(page.getByRole('dialog')).toContainText('Consumidor final')
  await expect(modal).toContainText('Dinheiro: R$ 50,00')
  await expect(modal).toContainText('Troco')
  await expect(modal).toContainText('R$ 5,00')
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  // cancelada: status e motivo, sem botão de cancelar
  modal = await abrir(cancelada.identificador)
  await expect(page.getByRole('dialog')).toContainText('Cancelada')
  await expect(modal).toContainText(motivo)
  await expect(page.getByRole('dialog').getByRole('button', { name: /Cancelar venda/ })).toHaveCount(0)
})
