import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'

/**
 * V0.17.0 #1017 (RN-NOVA-36, CEN-NOVO-117 a 121): marca opcional no produto, "Nome — Marca" na lista, nome + marca únicos
 * (mensagem no campo Marca ao editar) e marca de 101 caracteres recusada. Conta efêmera: só os produtos criados aqui.
 */

const corpo = (nome: string, marca?: string) => ({
  nome, marca, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, fichaTecnica: [],
})

test('V0.17.0 — #1017 produtos com o mesmo nome e marcas diferentes aparecem em linhas separadas, e a busca acha pela marca', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'marca-lista')
  const headers = { Authorization: `Bearer ${conta.token}` }
  const pense = await request.post(`${API_URL}/produtos`, { headers, data: corpo('Caderno', 'Pense') })
  const escolar = await request.post(`${API_URL}/produtos`, { headers, data: corpo('Caderno', 'Escolar') })
  expect(pense.status(), await pense.text()).toBe(201) // CEN-NOVO-117
  expect(escolar.status(), await escolar.text()).toBe(201) // CEN-NOVO-118

  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto('/produtos')
  await expect(page.getByText('Caderno — Pense')).toBeVisible()
  await expect(page.getByText('Caderno — Escolar')).toBeVisible()

  await page.getByPlaceholder('Buscar por nome...').fill('escolar')
  await expect(page.getByText('Caderno — Escolar')).toBeVisible()
  await expect(page.getByText('Caderno — Pense')).toHaveCount(0)
})

test('V0.17.0 — #1017 editar a marca para uma combinação que já existe bloqueia no campo Marca; marca de 101 caracteres é recusada', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'marca-dup')
  const headers = { Authorization: `Bearer ${conta.token}` }
  await request.post(`${API_URL}/produtos`, { headers, data: corpo('Caderno', 'Pense') })
  const escolar = await (await request.post(`${API_URL}/produtos`, { headers, data: corpo('Caderno', 'Escolar') })).json()

  // CEN-NOVO-119 pela API: mesmo nome e marca, sem diferenciar maiúsculas e espaços
  const igual = await request.post(`${API_URL}/produtos`, { headers, data: corpo(' caderno ', 'PENSE') })
  expect(igual.status()).toBe(400)
  expect((await igual.json()).fieldErrors.nome).toBe('Já existe um produto com este nome e esta marca')
  // CEN-NOVO-121: 101 caracteres → 400 com a mensagem no campo
  const longa = await request.post(`${API_URL}/produtos`, { headers, data: corpo('Outro', 'A'.repeat(101)) })
  expect(longa.status()).toBe(400)
  expect((await longa.json()).fieldErrors.marca).toBe('A marca deve ter no máximo 100 caracteres')

  // pela tela: editar a marca do "Escolar" para "pense" → bloqueio no campo Marca
  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto(`/produtos/${escolar.id}/editar`)
  const campo = page.getByPlaceholder('Ex: Pense')
  await expect(campo).toHaveValue('Escolar')
  await campo.fill('pense')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByTestId('erro-marca')).toHaveText('Já existe um produto com este nome e esta marca')
})
