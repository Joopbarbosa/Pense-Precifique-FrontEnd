import { test, expect, type Page } from '@playwright/test'
import { login, API_URL, TEST_SENHA } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarProdutoTipo, apiMetodoPagamentoPorTipo } from '../helpers/caixa'

const meses = [
  { mes: '2026-05-01', gasto: 0, cmv: 18, faturamento: 45, cmvPercentual: 40 },
  { mes: '2026-06-01', gasto: 0, cmv: 30, faturamento: 75, cmvPercentual: 40 },
  { mes: '2026-07-01', gasto: 0, cmv: 0, faturamento: 0, cmvPercentual: 0 },
]
const cx = { id: '11111111-1111-4111-8111-111111111111', tipo: 'VENDA_CAIXA', identificador: 'CX-2', data: '2026-05-15', cliente: 'Ana', itens: '3 × Laço de fita', faturamento: 45, custoMaterial: 18, cmvPercentual: 40, estimado: true, semCusto: false }
const orc = { ...cx, id: '22222222-2222-4222-8222-222222222222', tipo: 'ORCAMENTO', identificador: 'ORC-14', data: '2026-06-15', custoMaterial: 30, faturamento: 75, estimado: false }
const sem = { ...cx, id: '33333333-3333-4333-8333-333333333333', identificador: 'CX-3', custoMaterial: 0, cmvPercentual: 0, estimado: false, semCusto: true }
const envelope = (content: typeof cx[], total = 48) => ({ vendas: { content, number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true }, totalCustoMaterial: total })
async function painelSimulado(page: Page) {
  const n = { valor: 0, anterior: 0, variacaoPercentual: 0 }
  await page.route('**/api/compras/dashboard?*', route => route.fulfill({ json: { de: '2026-05-01', ate: '2026-07-31', deAnterior: '2026-02-01', ateAnterior: '2026-04-30', gasto: n, quantidadeCompras: n, ticketMedio: n, economia: { ...n, totalCheio: 0, percentual: 0 }, cmv: { ...n, valor: 48, faturamento: 120, percentual: 40, estimado: 18, vendasSemCusto: 1 }, naoPagas: { quantidade: 0, valor: 0 }, maiorAumento: null, meses, insumosQueMaisSubiram: [], fornecedoresPorGasto: [], fornecedoresPorDescontoPercentual: [], fornecedoresPorDescontoValor: [] } }))
}

test('CEN30: API real, duas vendas do Caixa compõem exatamente R$48 e abrem dados do registro', async ({ page, request }) => {
  const token = await apiLogin(request); const headers = { Authorization: `Bearer ${token}` }; const vendas: string[] = []
  await apiAbrirTurno(request, token)
  try {
    const insumo = await criarInsumo(request, token, `QA615-insumo-${Date.now()}`)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')
    for (const [indice, custo, preco] of [[1, 6, 15], [2, 10, 25]]) {
      const produto = await apiCriarProdutoTipo(request, token, `QA615-produto-${indice}-${Date.now()}`, 'PRODUTO', preco, 10, [{ insumoId: insumo.id, quantidade: custo }])
      const r = await request.post(`${API_URL}/caixa/vendas`, { headers, data: { itens: [{ produtoId: produto.id, quantidade: 3 }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 3 * preco }] } })
      expect(r.ok(), await r.text()).toBeTruthy(); const venda = await r.json(); expect(venda.status).toBe('CONCLUIDA'); vendas.push(venda.id)
    }
    const r = await request.get(`${API_URL}/compras/dashboard/vendas-cmv`, { headers }); expect(r.ok()).toBeTruthy(); const dados = await r.json()
    const minhas = dados.vendas.content.filter((v: { id: string }) => vendas.includes(v.id))
    expect(minhas.map((v: { custoMaterial: number }) => v.custoMaterial).sort((a: number, b: number) => a - b)).toEqual([18, 30])
    await login(page); await page.goto('/compras/dashboard'); await page.getByRole('button', { name: 'Ver registros de CMV', exact: true }).click()
    const tabela = page.getByTestId('vendas-cmv'); await expect(tabela).toBeVisible(); await expect(page.getByTestId('total-custo-cmv')).toContainText(dados.totalCustoMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    await tabela.getByRole('button', { name: minhas[0].identificador, exact: true }).click(); await expect(page.getByText(`Venda no Caixa ${minhas[0].identificador}`, { exact: true })).toBeVisible()
  } finally {
    for (const id of vendas) { const r = await request.post(`${API_URL}/caixa/vendas/${id}/cancelar`, { headers, data: { cancelamentoMotivo: 'Limpeza da massa do cenário de CMV da tarefa 615', senha: TEST_SENHA, retornarEstoque: true } }); expect(r.ok()).toBeTruthy() }
    await apiFecharTurnoSeAberto(request, token)
  }
})

test('CEN57/58/31: barra, ponto e linha consultam o mês correto, inclusive mês0%', async ({ page }) => {
  await painelSimulado(page); const consultados: string[] = []
  await page.route('**/api/compras/dashboard/vendas-cmv?*', async route => {
    const mes = new URL(route.request().url()).searchParams.get('mes') ?? ''; consultados.push(mes)
    await route.fulfill({ json: mes === '2026-05' ? envelope([cx], 18) : mes === '2026-06' ? envelope([orc], 30) : envelope([], 0) })
  })
  await login(page); await page.goto('/compras/dashboard')
  await page.getByTestId('grafico-cmv-mes').locator('.recharts-bar-rectangle').nth(1).click()
  await expect(page.getByTestId('vendas-cmv')).toContainText('ORC-14'); expect(consultados.at(-1)).toBe('2026-06'); await expect(page.getByTestId('total-custo-cmv')).toContainText('30,00')
  await page.getByRole('button', { name: 'Fechar listagem de vendas', exact: true }).click()
  const grafico = page.getByTestId('grafico-cmv-percentual'); const pontos = grafico.locator('.recharts-line-dot'); await pontos.first().click()
  await expect(page.getByTestId('vendas-cmv')).toContainText('CX-2'); expect(consultados.at(-1)).toBe('2026-05')
  await page.getByRole('button', { name: 'Fechar listagem de vendas', exact: true }).click()
  const a = await pontos.nth(0).boundingBox(); const b = await pontos.nth(1).boundingBox(); expect(a).not.toBeNull(); expect(b).not.toBeNull()
  await page.mouse.click(a!.x + a!.width / 2 + (b!.x - a!.x) * 0.25, a!.y + a!.height / 2)
  await expect(page.getByTestId('vendas-cmv')).toContainText('CX-2'); expect(consultados.at(-1)).toBe('2026-05')
  await page.getByRole('button', { name: 'Fechar listagem de vendas', exact: true }).click()
  await pontos.last().click(); await expect(page.getByText('Nenhuma venda neste período.', { exact: true })).toBeVisible(); expect(consultados.at(-1)).toBe('2026-07'); await expect(page.getByTestId('total-custo-cmv')).toContainText('0,00')
})

test('CEN32: marcas Estimado/Sem custo e orçamento abre aba nova', async ({ page }) => {
  await painelSimulado(page); await page.route('**/api/compras/dashboard/vendas-cmv?*', route => route.fulfill({ json: envelope([cx, orc, sem]) }))
  await login(page); await page.goto('/compras/dashboard'); await page.getByRole('button', { name: 'Ver registros de CMV', exact: true }).click()
  const tabela = page.getByTestId('vendas-cmv'); await expect(tabela.getByText('Estimado', { exact: true })).toBeVisible(); await expect(tabela.getByText('Sem custo', { exact: true })).toBeVisible()
  const popup = page.waitForEvent('popup'); await tabela.getByRole('button', { name: 'ORC-14', exact: true }).click(); const aba = await popup; await expect(aba).toHaveURL(new RegExp(`/orcamentos/${orc.id}`)); await aba.close(); await expect(tabela).toBeVisible()
})

test('paginação mantém total de todo período; falha pode ser repetida e lista vazia tem mensagem', async ({ page }) => {
  await painelSimulado(page); let falhar = true
  await page.route('**/api/compras/dashboard/vendas-cmv?*', async route => {
    if (falhar) { await route.fulfill({ status: 503, json: { message: 'Serviço temporariamente indisponível' } }); return }
    const pagina = Number(new URL(route.request().url()).searchParams.get('page')); const e = envelope(pagina ? [orc] : [cx]); e.vendas = { ...e.vendas, number: pagina, totalPages: 2, totalElements: 2, first: pagina === 0, last: pagina === 1 }; await route.fulfill({ json: e })
  })
  await login(page); await page.goto('/compras/dashboard'); await page.getByRole('button', { name: 'Ver registros de CMV', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible(); falhar = false; await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByTestId('vendas-cmv')).toContainText('CX-2')
  await page.getByRole('button', { name: 'Próxima', exact: true }).click(); await expect(page.getByTestId('vendas-cmv')).toContainText('ORC-14'); await expect(page.getByTestId('total-custo-cmv')).toContainText('48,00'); await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
})
