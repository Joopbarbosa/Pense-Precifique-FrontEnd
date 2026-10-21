import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { apiAbrirTurno, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #990 e #991 (RN-NOVA-24, alteração, CEN-NOVO-93 e 94): a Curva ABC é de barras horizontais por classe, com legenda e sem a
 * linha de acumulado (a tabela mantém o acumulado), e o clique na barra abre a modal das vendas do produto; "Insumo em que mais
 * gastamos" é de barras horizontais com o valor ao fim, sem o mapa de retângulos, e o clique abre as compras do insumo.
 */
test('V0.17.0 — #990 e #991 Curva ABC em barras com legenda e clique; insumo que mais gastamos em barras com valor e clique', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'abc990')
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  await apiAbrirTurno(request, token)
  const insumo = await criarInsumoComEstoque(request, token, `QA990-insumo-${sufixo}`, 50)
  const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  const ficha = [{ insumoId: insumo.id, quantidade: 1 }]
  const grande = await apiCriarProdutoTipo(request, token, `QA990-Grande-${sufixo}`, 'PRODUTO', 70, 20, ficha)
  const pequeno = await apiCriarProdutoTipo(request, token, `QA990-Pequeno-${sufixo}`, 'PRODUTO', 20, 20, ficha)
  for (const [produto, valor] of [[grande, 70], [pequeno, 20]] as const) {
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
  }

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')

  // #990: barras por classe, legenda das classes, sem linha de acumulado; a tabela mantém o acumulado
  const abc = page.getByTestId('grafico-curva-abc')
  await expect(abc.getByRole('list', { name: 'Legenda das classes' })).toContainText('A: os produtos que juntos dão até 80% do lucro')
  await expect(abc.locator('.recharts-bar-rectangle')).toHaveCount(2)
  await expect(abc.locator('.recharts-line')).toHaveCount(0)
  await expect(page.getByTestId('linha-abc')).toHaveCount(2)
  // o clique na barra abre a modal só com as vendas do produto, sem trocar de tela (era o defeito do gráfico antigo)
  await abc.locator('.recharts-bar-rectangle').first().click() // maior lucro: o produto grande
  await expect(page.getByTestId('modal-listagem')).toBeVisible()
  await expect(page.getByTestId('modal-listagem')).toContainText(`QA990-Grande-${sufixo}`)
  await expect(page.getByTestId('modal-listagem')).not.toContainText(`QA990-Pequeno-${sufixo}`)
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
  await page.keyboard.press('Escape')

  // #991: barras horizontais com o valor em reais ao fim; sem o mapa de retângulos
  const gasto = page.getByTestId('ind-insumo-mais-gasto-grafico')
  await expect(gasto.locator('.recharts-bar-rectangle').first()).toBeVisible()
  await expect(gasto.locator('.recharts-treemap-depth-1, .recharts-treemap')).toHaveCount(0)
  await expect(gasto.locator('.recharts-label-list')).toContainText('R$')
  await gasto.locator('.recharts-bar-rectangle').first().click()
  await expect(page.getByTestId('modal-listagem')).toBeVisible()
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})
