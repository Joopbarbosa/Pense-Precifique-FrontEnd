import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiCriarCatalogoComItem } from '../helpers/caixa'
import type { Page } from '@playwright/test'

/** A linha do item: o ancestral do título (texto exato) que tem o botão "Mais ações". */
const linhaDoItem = (page: Page, nome: string) =>
  page.getByText(nome, { exact: true }).first().locator('xpath=ancestor::div[.//button[@aria-label="Mais ações"]][1]')

/**
 * V0.18.0 #961 (RN-NOVA-28, CEN-NOVO-72/73): janela "Histórico de preço" do item de Catálogo — linha com valor anterior, valor novo e causa
 * depois que a edição do item muda o preço sugerido; item sem mudança mostra "Nenhuma mudança registrada". Conta efêmera.
 */
test('V0.18.0 — #961 item de catálogo: histórico de preço mostra a mudança da edição e o estado vazio', async ({ page, request }) => {
  const conta = await registrarEmpresaEfemera(request, 'hist-preco')
  const headers = { Authorization: `Bearer ${conta.token}` }
  // o login primeiro: a abertura da conta fixa o valor da hora, que também entra no histórico dos itens já existentes
  await loginComoEmail(page, conta.email, 'senha12345')
  const { catalogo, item, produtoPrincipal } = await apiCriarCatalogoComItem(request, conta.token, 'Laço histórico', 10, 5)

  // dobra a quantidade do componente: o custo e o preço sugerido do primeiro item mudam (causa ITEM_EDICAO)
  const edicao = await request.put(`${API_URL}/catalogos/${catalogo.id}/itens/${item.id}`, {
    headers, data: { nome: item.nome, tempoProducao: 1, componentes: [{ produtoBaseId: produtoPrincipal.id, quantidade: 2 }], precoVenda: 10 },
  })
  expect(edicao.status(), await edicao.text()).toBe(200)

  // segundo item, criado depois da edição e sem nenhuma mudança (estado vazio)
  const criado = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
    headers, data: { nome: 'Laço sem mudança', tempoProducao: 1, componentes: [{ produtoBaseId: produtoPrincipal.id, quantidade: 1 }], precoVenda: 10 },
  })
  expect(criado.status(), await criado.text()).toBe(201)

  const api = await request.get(`${API_URL}/catalogos/${catalogo.id}/itens/${item.id}/historico-preco?page=0&size=20`, { headers })
  expect(api.status()).toBe(200)
  expect((await api.json()).totalElements).toBeGreaterThanOrEqual(1)

  await page.goto(`/catalogos/${catalogo.id}`)

  const linhaItem = linhaDoItem(page, item.nome)
  await linhaItem.getByRole('button', { name: 'Mais ações' }).click()
  await page.getByRole('button', { name: 'Histórico de preço' }).click()
  await expect(page.getByTestId('linha-historico-preco').filter({ hasText: 'Edição do item' })).toHaveCount(1)

  await page.keyboard.press('Escape')
  const linhaVazia = linhaDoItem(page, 'Laço sem mudança')
  await linhaVazia.getByRole('button', { name: 'Mais ações' }).click()
  await page.getByRole('button', { name: 'Histórico de preço' }).click()
  await expect(page.getByTestId('historico-vazio')).toHaveText('Nenhuma mudança registrada')
})
