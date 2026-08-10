import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #212 — Etiqueta de fracionável na aba Ficha Técnica de Cadastrar/Editar Produto.
 * CEN-NOVO-3/CEN-NOVO-4 (DECISOES_V0.7.md, RN-NOVA-3).
 * `FracionavelBadge` só renderiza quando `ficha.length > 0` (CadastrarProdutoPage.tsx:362-368).
 */
test.describe('OpenProject #212 — Etiqueta "Produto fracionável"/"Produto não fracionável" na Ficha Técnica', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-3 — todos os insumos fracionáveis → etiqueta "Produto fracionável"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-CEN3-InsumoFrac-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 100, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-CEN3-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await page.getByRole('button', { name: '2 Ficha Técnica' }).click()

    await expect(page.getByText('Produto fracionável', { exact: true })).toBeVisible()
    await expect(page.getByText('Produto não fracionável', { exact: true })).toHaveCount(0)
  })

  test('CEN-NOVO-4 — ao menos um insumo não-fracionável → etiqueta "Produto não fracionável"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoFrac = `QA-CEN4-InsumoFrac-${Date.now()}`
    const insumoFrac = await criarInsumoFracionavel(request, token, nomeInsumoFrac, 100, 'DECIMAL')
    criadosInsumoIds.push(insumoFrac.id)
    const nomeInsumoNaoFrac = `QA-CEN4-InsumoNaoFrac-${Date.now()}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 100, true)
    criadosInsumoIds.push(insumoNaoFrac.id)
    const nomeProduto = `QA-CEN4-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [
      { insumoId: insumoFrac.id, quantidade: 1 },
      { insumoId: insumoNaoFrac.id, quantidade: 1 },
    ], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await page.getByRole('button', { name: '2 Ficha Técnica' }).click()

    await expect(page.getByText('Produto não fracionável', { exact: true })).toBeVisible()
    await expect(page.getByText('Produto fracionável', { exact: true })).toHaveCount(0)
  })
})
