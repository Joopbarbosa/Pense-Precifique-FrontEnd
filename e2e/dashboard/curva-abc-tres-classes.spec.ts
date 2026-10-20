import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

/**
 * V0.17.0 #1004 (QA da #990, RN-NOVA-24, CEN-NOVO-93): três produtos com lucro R$ 70,00 (classe A), R$ 20,00 (B) e R$ 10,00 (C). O
 * gráfico traz três barras do maior para o menor lucro, a legenda das três classes e nenhuma linha de acumulado; a tabela mostra os
 * acumulados 70%, 90% e 100%; o clique na barra do meio abre só as vendas daquele produto. (As duas fontes do Caderno, orçamento e
 * Caixa, estão em `DashboardCadastrosCurvaAbcIT`.) O custo de material de cada venda é R$ 1,00 (1 unidade de um insumo de R$ 1,00).
 */
test('V0.17.0 — #1004 Curva ABC com três classes, legenda, tabela de acumulado e clique na barra do meio', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'abc1004')
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  await apiAbrirTurno(request, token)
  const insumo = await criarInsumo(request, token, `QA1004-insumo-${sufixo}`)
  const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
  const ficha = [{ insumoId: insumo.id, quantidade: 1 }]
  const nomes = { grande: `QA1004-Grande-${sufixo}`, caderno: `QA1004-Caderno-${sufixo}`, pequeno: `QA1004-Pequeno-${sufixo}` }
  const grande = await apiCriarProdutoTipo(request, token, nomes.grande, 'PRODUTO', 71, 20, ficha)
  const caderno = await apiCriarProdutoTipo(request, token, nomes.caderno, 'PRODUTO', 21, 20, ficha)
  const pequeno = await apiCriarProdutoTipo(request, token, nomes.pequeno, 'PRODUTO', 11, 20, ficha)
  for (const [produto, valor] of [[grande, 71], [caderno, 21], [pequeno, 11]] as const) {
    const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 1 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor }] } })
    expect(r.ok(), await r.text()).toBeTruthy()
  }

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')
  const abc = page.getByTestId('grafico-curva-abc')
  await expect(abc.locator('.recharts-bar-rectangle')).toHaveCount(3)
  await expect(abc.locator('.recharts-line')).toHaveCount(0)
  const legenda = abc.getByRole('list', { name: 'Legenda das classes' })
  await expect(legenda).toContainText('A: os produtos que juntos dão até 80% do lucro')
  await expect(legenda).toContainText('B')
  await expect(legenda).toContainText('C')

  // tabela: do maior lucro para o menor, classe e acumulado de cada linha
  const linhas = page.getByTestId('linha-abc')
  await expect(linhas).toHaveCount(3)
  const texto = async (i: number) => (await linhas.nth(i).innerText()).replace(/\s+/g, ' ')
  expect(await texto(0)).toMatch(new RegExp(`A ${nomes.grande} R\\$ 70,00 70,00% 70,00%`))
  expect(await texto(1)).toMatch(new RegExp(`B ${nomes.caderno} R\\$ 20,00 20,00% 90,00%`))
  expect(await texto(2)).toMatch(new RegExp(`C ${nomes.pequeno} R\\$ 10,00 10,00% 100,00%`))

  // clique na barra do meio (classe B): só as vendas do produto dela
  await abc.locator('.recharts-bar-rectangle').nth(1).click()
  const modal = page.getByTestId('modal-listagem')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText(nomes.caderno)
  await expect(modal).not.toContainText(nomes.grande)
  await expect(modal).not.toContainText(nomes.pequeno)
  await expect(page).toHaveURL(/\/cadastros\/dashboard$/)
})
