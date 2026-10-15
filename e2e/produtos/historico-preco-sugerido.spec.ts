import { test, expect } from '@playwright/test'
import { API_URL, login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { criarProdutoComFicha } from '../helpers/producao'
import { hojeLocal } from '../helpers/data'

/** V0.17.0 — #672 (RN-NOVA-10 e 11): CEN-NOVO-26 e 30 — preço sugerido nos históricos do Produto e do Insumo. */
test('V0.17.0 — entrada de compra registra o preço sugerido no Produto e agrega no Insumo', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const sufixo = Date.now()
  const insumo = await criarInsumo(request, token, `QA-Fita-${sufixo}`)
  const produto = await criarProdutoComFicha(request, token, `QA-Laco-${sufixo}`, [{ insumoId: insumo.id, quantidade: 1 }])
  const antes = await (await request.get(`${API_URL}/produtos/${produto.id}`, { headers })).json()

  // 10 un por R$ 100,00 com estoque inicial → o custo médio sobe e o preço sugerido do produto muda
  const compra = await (await request.post(`${API_URL}/compras/confirmar`, {
    headers, data: { dataCompra: hojeLocal(), multiplosFornecedores: false, pago: false,
      itens: [{ insumoId: insumo.id, quantidade: 10, precoCheio: 100 }] },
  })).json()
  const depois = await (await request.get(`${API_URL}/produtos/${produto.id}`, { headers })).json()
  expect(depois.precoSugerido).not.toBe(antes.precoSugerido)
  expect(depois.precoVenda).toBe(antes.precoVenda) // o preço de venda nunca muda sozinho

  await login(page)
  await page.goto(`/produtos/${produto.id}`)
  const linha = page.getByTestId('linha-preco-sugerido').first()
  await expect(linha).toBeVisible()
  await expect(linha).toContainText('Preço sugerido')
  await expect(linha).toContainText(`Entrada da compra ${compra.compra.identificador}`)

  await page.goto(`/insumos/${insumo.id}`)
  const agregada = page.getByTestId('linha-preco-sugerido').first()
  await expect(agregada).toContainText(`Preço sugerido de 1 produto mudou, ${compra.compra.identificador}`)
  await agregada.getByRole('button').click()
  await expect(agregada.getByTestId('produto-preco-sugerido')).toContainText(`QA-Laco-${sufixo}`)
})
