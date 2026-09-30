import { test, expect } from '@playwright/test'
import { API_URL, login } from '../helpers/auth'
import { apiLogin, criarFornecedor, criarInsumo } from '../helpers/api'

test('V0.15.0 — rascunho, confirmação, dashboard, PDF e cancelamento da mesma COM-N', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  const fornecedor = await criarFornecedor(request, token, `QA-Compra-Fornecedor-${sufixo}`)
  const insumo = await criarInsumo(request, token, `QA-Compra-Insumo-${sufixo}`)
  const dataCompra = new Date().toISOString().slice(0, 10)
  const corpo = {
    dataCompra,
    multiplosFornecedores: false,
    fornecedorId: fornecedor.id,
    pago: false,
    itens: [{ insumoId: insumo.id, quantidade: 2, precoTotal: 20 }],
  }

  const antes = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  const respostaRascunho = await request.post(`${API_URL}/compras`, { headers, data: corpo })
  expect(respostaRascunho.status()).toBe(201)
  const rascunho = await respostaRascunho.json() as { id: string; identificador: string; status: string }
  expect(rascunho.status).toBe('RASCUNHO')
  expect(rascunho.identificador).toMatch(/^COM-/)
  const duranteRascunho = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(duranteRascunho.estoqueAtual).toBe(antes.estoqueAtual)

  await login(page)
  await page.goto(`/compras/${rascunho.id}`)
  await expect(page.getByRole('heading', { name: `Compra ${rascunho.identificador}` })).toBeVisible()
  await expect(page.getByText('Rascunho: estoque e custo ainda não foram alterados.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByText(`Compra ${rascunho.identificador} confirmada`)).toBeVisible()

  const confirmada = await (await request.get(`${API_URL}/compras/${rascunho.id}`, { headers })).json()
  expect(confirmada.status).toBe('CONFIRMADA')
  const depois = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(Number(depois.estoqueAtual)).toBe(Number(antes.estoqueAtual) + 2)

  const respostaDashboard = await request.get(`${API_URL}/compras/dashboard`, { headers })
  expect(respostaDashboard.ok()).toBeTruthy()
  const dashboard = await respostaDashboard.json()
  expect(dashboard.quantidadeCompras.valor).toBeGreaterThanOrEqual(1)
  await page.goto('/compras/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard de compras' })).toBeVisible()
  await expect(page.getByText('Compras e ticket médio')).toBeVisible()

  await page.goto(`/compras/${rascunho.id}/pdf`)
  await expect(page.getByRole('heading', { name: `PDF da compra ${rascunho.identificador}` })).toBeVisible()
  await expect(page.getByTestId('preview-pdf')).toBeVisible()

  // Desfaz o impacto no estoque e cobre o estorno da compra confirmada.
  const respostaCancelamento = await request.post(`${API_URL}/compras/${rascunho.id}/cancelar`, {
    headers,
    data: { observacao: 'Cancelamento automatizado do cenário E2E isolado.', confirmarManterCusto: true },
  })
  expect(respostaCancelamento.ok()).toBeTruthy()
  const cancelada = await respostaCancelamento.json()
  expect(cancelada.compra.status).toBe('CANCELADA')
  const aposCancelamento = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(Number(aposCancelamento.estoqueAtual)).toBe(Number(antes.estoqueAtual))
})
