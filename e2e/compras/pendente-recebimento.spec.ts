import { execFileSync } from 'child_process'
import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_URL, login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { hojeLocal } from '../helpers/data'

/** V0.17.0 — #958 (RN-NOVA-5 e 6): CEN-NOVO-13, 15, 20, 21, 25 e 51. */

async function registrarPendente(request: APIRequestContext, token: string, insumoId: string, previsao: string) {
  const r = await request.post(`${API_URL}/compras/confirmar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      dataCompra: hojeLocal(), multiplosFornecedores: false, pago: false, entregaImediata: false, previsaoEntrega: previsao,
      itens: [{ insumoId, quantidade: 10, precoCheio: 30 }],
    },
  })
  expect(r.status()).toBe(200 + 1) // 201
  return (await r.json()).compra as { id: string; identificador: string; status: string; previsaoEntrega: string }
}

/** Não há relógio no servidor: o atraso é simulado antecipando a previsão direto no banco de teste isolado, com a data local da aplicação (America/Sao_Paulo), nunca `current_date` do banco (UTC). */
function antecipar(id: string, dias: number) {
  const container = process.env.DB_CONTAINER!
  const banco = process.env.DB_NAME!
  execFileSync('docker', ['exec', container, 'psql', '-U', 'pense_user', '-d', banco, '-c',
    `UPDATE compras SET previsao_entrega = '${hojeLocal(-dias)}', data_compra = '${hojeLocal(0)}' WHERE id = '${id}'`])
}

function ddmm(iso: string) { const [, m, d] = iso.split('-'); return `${d}/${m}` }

test('V0.17.0 — compra pendente não mexe no estoque, mostra a tag, atrasa e entra nos filtros e contagens', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const insumo = await criarInsumo(request, token, `QA-Pendente-${Date.now()}`)
  const antes = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()

  const previsao = hojeLocal(6)
  const compra = await registrarPendente(request, token, insumo.id, previsao)
  expect(compra.status).toBe('PENDENTE_RECEBIMENTO')
  const depois = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(depois.estoqueAtual).toBe(antes.estoqueAtual)
  expect(depois.custoUnitario).toBe(antes.custoUnitario)

  await login(page)
  await page.goto('/compras')
  const linha = page.getByTestId('linha-compra').filter({ hasText: compra.identificador })
  await expect(linha.getByText('Pendente de recebimento')).toBeVisible()
  await expect(linha.getByTestId('tag-previsao')).toHaveText(`Previsão ${ddmm(previsao)}`)

  // Atrasada há 3 dias → tag vermelha e entra nos dois filtros
  antecipar(compra.id, 3)
  await page.reload()
  const atrasada = page.getByTestId('linha-compra').filter({ hasText: compra.identificador })
  await expect(atrasada.getByTestId('tag-previsao')).toHaveText('Atrasada há 3 dias')
  await page.getByRole('button', { name: /^Atrasadas/ }).click()
  await expect(page.getByTestId('linha-compra').filter({ hasText: compra.identificador })).toBeVisible()
  await page.getByRole('button', { name: /^Pendentes de recebimento/ }).click()
  await expect(page.getByTestId('linha-compra').filter({ hasText: compra.identificador })).toBeVisible()
  const contagens = await (await request.get(`${API_URL}/compras/contagens`, { headers })).json()
  expect(contagens.pendentes).toBeGreaterThanOrEqual(1)
  expect(contagens.atrasadas).toBeGreaterThanOrEqual(1)
})

test('V0.17.0 — cancelar pendente exige 30 caracteres e não estorna estoque; editar mantém pendente', async ({ page, request }) => {
  const token = await apiLogin(request)
  const headers = { Authorization: `Bearer ${token}` }
  const insumo = await criarInsumo(request, token, `QA-PendenteCancela-${Date.now()}`)
  const antes = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  const compra = await registrarPendente(request, token, insumo.id, hojeLocal(6))

  await login(page)
  await page.goto(`/compras/${compra.id}`)
  await expect(page.getByText('Pendente de recebimento: estoque e custo só mudam quando a entrada for registrada.')).toBeVisible()

  // CEN-NOVO-21 — editar mantém pendente e troca a previsão
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/\/editar$/)
  const nova = hojeLocal(11)
  await page.getByLabel('Previsão de entrega').fill(nova)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByTestId('tag-previsao')).toHaveText(`Previsão ${ddmm(nova)}`)

  // CEN-NOVO-51 — observação curta bloqueia; CEN-NOVO-20 — observação válida cancela sem estorno
  await page.getByRole('button', { name: 'Cancelar compra' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('textbox').fill('desisti')
  await dialogo.getByRole('button', { name: 'Cancelar compra' }).click()
  await expect(page.getByText(/pelo menos 30 caracteres/).first()).toBeVisible()
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialogo.getByRole('textbox')).toBeVisible()
  await dialogo.getByRole('textbox').fill('Fornecedor não tem mais o produto em estoque, pedido desfeito')
  await dialogo.getByRole('button', { name: 'Cancelar compra' }).click()
  await expect(page.getByText(`Compra ${compra.identificador} cancelada`)).toBeVisible()

  await expect.poll(async () => (await (await request.get(`${API_URL}/compras/${compra.id}`, { headers })).json()).status, { timeout: 10_000 }).toBe('CANCELADA')
  const depois = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })).json()
  expect(depois.estoqueAtual).toBe(antes.estoqueAtual)
})
