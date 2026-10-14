import { test, expect } from '@playwright/test'
import { API_URL, login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { hojeLocal } from '../helpers/data'

/** V0.17.0 — #959 (RN-NOVA-7 e 8): CEN-NOVO-16, 17, 18, 19 e o histórico do insumo com a data do recebimento. */

async function pendente(request: import('@playwright/test').APIRequestContext, token: string, insumoId: string, dataCompra: string) {
  const r = await request.post(`${API_URL}/compras/confirmar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      dataCompra, multiplosFornecedores: false, pago: false, entregaImediata: false, previsaoEntrega: hojeLocal(5),
      itens: [{ insumoId, quantidade: 10, precoCheio: 30 }],
    },
  })
  expect(r.status()).toBe(201)
  return (await r.json()).compra as { id: string; identificador: string }
}

test('V0.17.0 — entrada com quantidade menor, data passada: valida, atualiza estoque, custo e histórico', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const insumo = await criarInsumo(request, token, `QA-Entrada-${Date.now()}`)
  const antes = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  const compra = await pendente(request, token, insumo.id, hojeLocal(-6))

  await login(page)
  await page.goto('/compras')
  await page.getByRole('button', { name: 'Entrada de compras' }).click()
  await expect(page).toHaveURL(/\/compras\/entrada$/)
  const cartao = page.getByTestId('compra-pendente').filter({ hasText: compra.identificador })
  await expect(cartao).toBeVisible()
  await cartao.getByRole('button', { name: 'Dar entrada' }).click()

  // CEN-NOVO-18 — quantidade zero bloqueia na modal de erro padrão e nada entra
  await page.getByLabel('Quantidade recebida da linha 1').fill('0')
  await page.getByRole('button', { name: 'Confirmar entrada' }).click()
  await expect(page.getByText(/informe uma quantidade maior que zero; para tirar o item, edite a compra pendente/)).toBeVisible()
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  let atual = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(atual.estoqueAtual).toBe(antes.estoqueAtual)

  // CEN-NOVO-17/19 — 8 recebidos, recebimento há 2 dias
  const recebimento = hojeLocal(-2)
  await page.getByLabel('Quantidade recebida da linha 1').fill('8')
  await page.getByLabel('Data do recebimento').fill(recebimento)
  await page.getByRole('button', { name: 'Confirmar entrada' }).click()
  await expect(page.getByText(`Entrada da compra ${compra.identificador} registrada`)).toBeVisible()
  await page.getByRole('button', { name: /fechar|ok|entendi/i }).first().click()

  const confirmada = await (await request.get(`${API_URL}/compras/${compra.id}`, { headers })).json()
  expect(confirmada.status).toBe('CONFIRMADA')
  expect(confirmada.dataEntrada).toBe(recebimento)
  expect(confirmada.total).toBe(24)
  expect(confirmada.itens[0].precoUnitarioPago).toBe(3)
  atual = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(Number(atual.estoqueAtual)).toBe(Number(antes.estoqueAtual) + 8)

  // Histórico do insumo mostra a data do recebimento
  await page.goto(`/insumos/${insumo.id}`)
  const [a, m, d] = recebimento.split('-')
  await expect(page.getByText(`${d}/${m}/${a}`).first()).toBeVisible()
})
