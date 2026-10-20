import { test, expect, type Page } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { apiAbrirTurno, apiCriarProdutoComEstoque, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #1001 (QA da #974, RN-NOVA-25, CEN-NOVO-73 a 75): o que cada lupa do estoque e do CMV lista, na ordem e com o
 * total do rodapé. Os números exatos (R$ 100,67, 25%/40%, 75%/60%) estão afirmados em `DashboardCadastrosEstoqueIT`;
 * aqui a tela é conferida contra as linhas que ela mesma mostra.
 */

const numero = (texto: string) => Number(texto.replace(/[^\d,-]/g, '').replace(',', '.'))

async function linhasDaModal(page: Page): Promise<string[][]> {
  return page.locator('[role="dialog"] tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent ?? '')))
}

test('V0.17.0 — #1001 lupas do estoque: linhas, ordem, totais e insumo abaixo do mínimo', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'est1001')
  const sufixo = Date.now()
  await criarInsumoComEstoque(request, token, `QA1001-Fita-${sufixo}`, 10)
  await criarInsumo(request, token, `QA1001-Falta-${sufixo}`) // estoque 0 e mínimo 1: abaixo do mínimo, falta 1
  await apiCriarProdutoComEstoque(request, token, `QA1001-Laco-${sufixo}`, 15, 4)

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')

  // potencial de venda: só o produto pronto, 4 × R$ 15,00 = R$ 60,00
  await expect(page.getByTestId('card-estoque-potencial')).toContainText('R$ 60,00')
  await page.getByRole('button', { name: 'Ver registros de Potencial de venda do estoque' }).click()
  const potencial = await linhasDaModal(page)
  expect(potencial).toHaveLength(1)
  expect(potencial[0].join(' ')).toContain(`QA1001-Laco-${sufixo}`)
  expect(potencial[0].join(' ')).toContain('R$ 15,00')
  expect(potencial[0].join(' ')).toContain('R$ 60,00')
  await expect(page.getByTestId('total-estoque')).toHaveText('Total R$ 60,00')
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  // valor do estoque a custo: maior valor primeiro e o rodapé igual à soma das linhas
  await page.getByRole('button', { name: 'Ver registros de Valor do estoque a custo' }).click()
  const valor = await linhasDaModal(page)
  expect(valor.length).toBeGreaterThanOrEqual(1)
  const valores = valor.map(l => numero(l[l.length - 1]))
  expect(valores).toEqual([...valores].sort((a, b) => b - a))
  expect(valor.map(l => l[0]).join(' ')).toContain(`QA1001-Fita-${sufixo}`)
  const soma = valores.reduce((a, b) => a + b, 0)
  expect(Math.abs(numero((await page.getByTestId('total-estoque').textContent()) ?? '') - soma)).toBeLessThan(0.011)
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  // insumos abaixo do mínimo: só o de estoque 0 (mínimo 1, falta 1); o da fita (estoque 10) não entra
  await expect(page.getByTestId('card-abaixo-minimo')).toContainText('1')
  await page.getByRole('button', { name: 'Ver registros de Insumos abaixo do mínimo' }).click()
  const minimo = await linhasDaModal(page)
  expect(minimo).toHaveLength(1)
  expect(minimo[0][0]).toContain(`QA1001-Falta-${sufixo}`)
  expect(numero(minimo[0][3])).toBe(1)
})

test('V0.17.0 — #1001 conta sem estoque mostra R$ 0,00 e CMV e margem em 0%, sem erro', async ({ page, request }) => {
  const { email } = await registrarEmpresaEfemera(request, 'vazio1001')
  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')
  await expect(page.getByTestId('card-estoque-valor')).toContainText('R$ 0,00')
  await expect(page.getByTestId('card-estoque-potencial')).toContainText('R$ 0,00')
  await expect(page.getByTestId('card-cmv')).toContainText('0')
  await expect(page.getByTestId('card-margem-material')).toContainText('0')
  await expect(page.getByTestId('card-margem-material')).not.toContainText('100')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('V0.17.0 — #1001 lupa da margem abre as vendas do CMV com o custo total igual à soma das linhas', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'cmv1001')
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  await apiAbrirTurno(request, token)
  const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  const insumo = await criarInsumo(request, token, `QA1001-Ins-${sufixo}`)
  const a = await apiCriarProdutoTipo(request, token, `QA1001-A-${sufixo}`, 'PRODUTO', 80, 20, [{ insumoId: insumo.id, quantidade: 2 }])
  const b = await apiCriarProdutoTipo(request, token, `QA1001-B-${sufixo}`, 'PRODUTO', 120, 20, [{ insumoId: insumo.id, quantidade: 3 }])
  for (const [produto, valor] of [[a, 80], [b, 120]] as const) {
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
  }

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')
  await page.getByRole('button', { name: 'Ver registros de Margem após custo de material' }).click()
  await expect(page.getByText('Vendas que compõem o CMV', { exact: true })).toBeVisible()
  const linhas = await linhasDaModal(page)
  expect(linhas).toHaveLength(2)
  expect(linhas.map(l => l[0]).sort().join(' ')).toMatch(/CX-\d+ CX-\d+/)
  const faturamento = linhas.reduce((s, l) => s + numero(l[4]), 0)
  const custo = linhas.reduce((s, l) => s + numero(l[5]), 0)
  expect(faturamento).toBeCloseTo(200, 2)
  expect(numero((await page.getByTestId('total-custo-cmv').textContent()) ?? '')).toBeCloseTo(custo, 2)
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})
