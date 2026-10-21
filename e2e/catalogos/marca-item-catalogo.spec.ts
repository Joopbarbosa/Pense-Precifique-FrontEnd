import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiCriarCatalogoComItem } from '../helpers/caixa'

/**
 * V0.17.0 #1017 (RN-NOVA-36, CEN-NOVO-122): item de catálogo com marca, "Nome — Marca" no catálogo, mesma marca bloqueia no campo Nome
 * e marca diferente é aceita. Conta efêmera.
 */
test('V0.17.0 — #1017 item de catálogo: marca aparece com o nome, duplicata bloqueia e marca diferente passa', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'marca-cat')
  const headers = { Authorization: `Bearer ${conta.token}` }
  const { catalogo, item, produtoPrincipal } = await apiCriarCatalogoComItem(request, conta.token, 'Fita de cetim', 10, 5)

  // põe a marca "Pense" no item criado pelo helper (edição) e confere a regra pela API
  const componentes = [{ produtoBaseId: produtoPrincipal.id, quantidade: 1 }]
  const base = { nome: 'Fita de cetim', tempoProducao: 1, componentes, precoVenda: 10 }
  const comMarca = await request.put(`${API_URL}/catalogos/${catalogo.id}/itens/${item.id}`, { headers, data: { ...base, marca: 'Pense' } })
  expect(comMarca.status(), await comMarca.text()).toBe(200)

  const duplicado = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, { headers, data: { ...base, marca: ' pense ' } })
  expect(duplicado.status()).toBe(400)
  expect((await duplicado.json()).fieldErrors.nome).toBe('Já existe um item neste catálogo com este nome e esta marca')

  const outraMarca = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, { headers, data: { ...base, marca: 'Luxo' } })
  expect(outraMarca.status(), await outraMarca.text()).toBe(201)

  await loginComoEmail(page, conta.email, 'senha12345')
  await page.goto(`/catalogos/${catalogo.id}`)
  await expect(page.getByText('Fita de cetim — Pense')).toBeVisible()
  await expect(page.getByText('Fita de cetim — Luxo')).toBeVisible()
})
