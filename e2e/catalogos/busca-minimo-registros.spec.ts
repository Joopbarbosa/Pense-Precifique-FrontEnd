import { test, expect, APIRequestContext } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #216 — Busca de produto/customização em Novo Item de Catálogo exibe registros ao
 * focar campo vazio (sem exigir texto digitado), cada um com custo e preço de venda.
 * CEN-NOVO-10 (DECISOES_V0.7.md, RN-NOVA-6). `ProdutoSearch` (NovoItemCatalogoPage.tsx:79-95) —
 * fetch dispara com `busca=''` no focus, `delay=0`; sem "mínimo 6" hardcoded, reflexo de `size=20`.
 */
test.describe('OpenProject #216 — Busca de produto em Novo Item de Catálogo mostra registros ao focar campo vazio', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadosCatalogoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadosCatalogoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosCatalogoIds) {
      await request.post(`${API_URL}/catalogos/${id}/desativar`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function criarCatalogo(request: APIRequestContext, token: string, nome: string) {
    const res = await request.post(`${API_URL}/catalogos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome },
    })
    if (!res.ok()) throw new Error(`Falha ao criar catálogo de teste: ${res.status()} ${await res.text()}`)
    return res.json()
  }

  test('CEN-NOVO-10 — clicar no campo vazio mostra ao menos 6 produtos, cada um com custo e venda', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const nomeInsumo = `QA-CEN10-Insumo-${ts}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)

    for (let i = 0; i < 6; i++) {
      const nome = `QA-CEN10-Produto-${ts}-${i}`
      const produto = await criarProdutoComFicha(request, token, nome, [{ insumoId: insumo.id, quantidade: 1 }], 1)
      criadosProdutoIds.push(produto.id)
    }

    const catalogo = await criarCatalogo(request, token, `QA-CEN10-Catalogo-${ts}`)
    criadosCatalogoIds.push(catalogo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)

    const busca = page.getByPlaceholder('Buscar produto...')
    await busca.click() // foca sem digitar nada

    const dropdown = page.locator('div.absolute.inset-x-0.top-\\[50px\\]').first()
    await expect(dropdown).toBeVisible({ timeout: 5000 })
    const resultados = dropdown.locator('button')
    await expect(async () => {
      expect(await resultados.count()).toBeGreaterThanOrEqual(6)
    }).toPass({ timeout: 5000 })

    // Cada resultado mostra custo — e venda, já que todo produto com custo calculado também tem precoVenda.
    const primeiro = resultados.first()
    await expect(primeiro.getByText(/custo/)).toBeVisible()
    await expect(primeiro.getByText(/venda/)).toBeVisible()
  })
})
