import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { apiCriarCatalogoComItem } from '../helpers/caixa'

/**
 * V0.18.0 #1194 (correção da #1179, RN-NOVA-47) — na linha do item de Catálogo, clicar no link da descrição abre o cadastro em nova aba
 * e a tela do Catálogo continua onde está (o clique não propaga para a linha, que abre a edição do item).
 */
test('V0.18.0 — #1194 link da descrição no Catálogo abre nova aba e não navega a aba de origem', async ({ page, request, context }) => {
  const conta = await registrarEmpresaEfemera(request, 'desc-link-cat')
  const headers = { Authorization: `Bearer ${conta.token}` }
  await loginComoEmail(page, conta.email, 'senha12345')
  const { catalogo, item, produtoPrincipal } = await apiCriarCatalogoComItem(request, conta.token, 'Laço link', 10, 5)
  const edicao = await request.put(`${API_URL}/catalogos/${catalogo.id}/itens/${item.id}`, {
    headers,
    data: { nome: item.nome, tempoProducao: 1, componentes: [{ produtoBaseId: produtoPrincipal.id, quantidade: 1 }], precoVenda: 10, descricao: `Feito com ${produtoPrincipal.nome}` },
  })
  expect(edicao.status(), await edicao.text()).toBe(200)

  await page.goto(`/catalogos/${catalogo.id}`)
  const link = page.getByTestId('link-descricao').first()
  await expect(link).toHaveText(produtoPrincipal.nome)

  const [nova] = await Promise.all([context.waitForEvent('page'), link.click()])
  await nova.waitForLoadState()
  await expect(nova).toHaveURL(new RegExp(`/produtos/${produtoPrincipal.id}`))
  await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`))
})
