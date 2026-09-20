import { test, expect, Locator, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { criarProdutoComFicha } from '../helpers/producao'
import { API_URL } from '../helpers/auth'

/**
 * O `ActionMenu` compartilhado fecha o menu em qualquer evento de scroll na janela (captura) —
 * inclui o auto-scroll que o próprio Playwright dispara ao garantir visibilidade antes do clique,
 * gerando uma corrida ocasional (menu abre e fecha antes do clique alcançar o item). Mesmo achado
 * e mesmo workaround de `resolver-vinculos-produto.spec.ts` (`abrirAcaoNoCard`) — não é flakiness
 * introduzida por #517/#518/#519.
 */
async function abrirAcaoNaLinha(page: Page, linha: Locator, itemLabel: string) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    try {
      await page.getByText(itemLabel, { exact: true }).click({ timeout: 2000 })
      return
    } catch {
      // menu pode ter se fechado sozinho por um scroll espúrio — tenta de novo
    }
  }
  throw new Error(`Não foi possível clicar em "${itemLabel}" após múltiplas tentativas`)
}

/**
 * OpenProject #228, #237 — Resolução de vínculos ao inativar/excluir insumo vinculado a ficha
 * técnica, acionado tanto por "Inativar" quanto por "Excluir" (POST /insumos/{id}/resolver-vinculos).
 *
 * V0.13.0 (#517) — `InsumoResolverVinculosModal` foi reescrito de um wizard de 2 passos (opções
 * "Inativar produtos vinculados"/"Substituir insumo") para 1 modal com uma seção por tipo de
 * vínculo (aqui só "Vínculo de ficha técnica", já que o insumo não tem vínculo de catálogo),
 * cada seção com um toggle "Remover"/"Substituir" (default "Remover") e um único botão
 * "Confirmar" no rodapé do modal — mesma mecânica de resolver-vínculos usada em Produto.
 *
 * Dado um insumo vinculado à ficha técnica de um produto
 * Quando a artesã tenta inativá-lo e confirma com a ação padrão ("Remover")
 * Então o insumo e o produto vinculado ficam inativos
 * Quando a artesã tenta excluir outro insumo vinculado e alterna para "Substituir"
 * Então a ficha técnica do produto passa a referenciar o insumo substituto e o insumo original é excluído
 */
test.describe('OpenProject #228,#237 — Resolver vínculos ao inativar/excluir insumo', () => {
  let insumoInativarId: string
  let insumoInativarNome: string
  let produtoInativarNome: string

  let insumoExcluirId: string
  let insumoExcluirNome: string
  let produtoExcluirId: string
  let produtoExcluirNome: string

  let insumoSubstitutoId: string
  let insumoSubstitutoNome: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    insumoInativarNome = `E2E237 InsInativar ${ts}`
    const insInativar = await criarInsumo(request, token, insumoInativarNome)
    insumoInativarId = insInativar.id
    produtoInativarNome = `E2E237 ProdInativar ${ts}`
    await criarProdutoComFicha(request, token, produtoInativarNome, [{ insumoId: insumoInativarId, quantidade: 1 }])

    insumoExcluirNome = `E2E237 InsExcluir ${ts}`
    const insExcluir = await criarInsumo(request, token, insumoExcluirNome)
    insumoExcluirId = insExcluir.id
    produtoExcluirNome = `E2E237 ProdExcluir ${ts}`
    const produtoExcluir = await criarProdutoComFicha(request, token, produtoExcluirNome, [{ insumoId: insumoExcluirId, quantidade: 1 }])
    produtoExcluirId = produtoExcluir.id

    insumoSubstitutoNome = `E2E237 InsSubstituto ${ts}`
    const insSubstituto = await criarInsumo(request, token, insumoSubstitutoNome)
    insumoSubstitutoId = insSubstituto.id

    await login(page)
    await page.goto('/insumos')
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoInativarId).catch(() => {})
    await inativarInsumo(request, token, insumoSubstitutoId).catch(() => {})
  })

  test('inativar insumo vinculado — confirma com a ação padrão ("Remover")', async ({ page }) => {
    await page.getByPlaceholder('Buscar por nome ou marca…').fill(insumoInativarNome)
    await expect(page.getByText(insumoInativarNome, { exact: true }).first()).toBeVisible()

    const linha = page.getByText(insumoInativarNome, { exact: true }).first().locator('xpath=../..')
    await abrirAcaoNaLinha(page, linha, 'Inativar')
    await page.getByRole('button', { name: 'Inativar insumo' }).click()

    await expect(page.getByText('Não foi possível inativar')).toBeVisible()
    await expect(page.getByText(produtoInativarNome)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Substituir', exact: true })).toBeVisible()

    // Ação padrão da seção já é "Remover" — só confirmar.
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByText('Insumo inativado.')).toBeVisible()

    await page.getByRole('button', { name: /^Ativos\b/ }).click()
    await expect(page.getByText(insumoInativarNome, { exact: true })).toHaveCount(0)
  })

  test('excluir insumo vinculado — modal aparece igual, alternar para "Substituir" atualiza ficha técnica', async ({ page, request }) => {
    await page.getByPlaceholder('Buscar por nome ou marca…').fill(insumoExcluirNome)
    await expect(page.getByText(insumoExcluirNome, { exact: true }).first()).toBeVisible()

    const linha = page.getByText(insumoExcluirNome, { exact: true }).first().locator('xpath=../..')
    await abrirAcaoNaLinha(page, linha, 'Excluir')
    await page.getByRole('button', { name: 'Excluir insumo' }).click()

    await expect(page.getByText('Não foi possível excluir')).toBeVisible()
    await expect(page.getByText(produtoExcluirNome)).toBeVisible()

    await page.getByRole('button', { name: 'Substituir', exact: true }).click()
    await page.getByPlaceholder('Buscar insumo substituto…').fill(insumoSubstitutoNome)
    await page.getByText(insumoSubstitutoNome, { exact: true }).click()

    const confirmar = page.getByRole('button', { name: 'Confirmar', exact: true })
    await expect(confirmar).toBeEnabled()
    await confirmar.click()
    await expect(page.getByText('Insumo excluído.')).toBeVisible()

    const token = await apiLogin(request)
    const produtoRes = await request.get(`${API_URL}/produtos/${produtoExcluirId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const produtoAtualizado = await produtoRes.json()
    expect(produtoAtualizado.fichaTecnica.map((f: { insumoId: string }) => f.insumoId)).toContain(insumoSubstitutoId)
    expect(produtoAtualizado.fichaTecnica.map((f: { insumoId: string }) => f.insumoId)).not.toContain(insumoExcluirId)
  })
})
