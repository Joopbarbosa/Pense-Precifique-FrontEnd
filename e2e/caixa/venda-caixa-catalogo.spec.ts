import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'
import {
  apiAbrirTurno, apiFecharTurnoSeAberto, apiCriarCatalogoComItem, apiCriarProdutoTipo,
} from '../helpers/caixa'

/**
 * Reabertura de RN-NOVA-1 (V0.12.0, achado do teste manual do usuário) — Caixa passa a vender
 * também ItemCatalogo (com customização fixa expandida automaticamente) e aceitar customização
 * ad-hoc em qualquer origem (Produto direto ou ItemCatalogo). Ver modulos/CAIXA/decisoes-caixa.md.
 */

/** #504/#506 — pagamento abre modal "Escolher forma de pagamento"; marcar o método e confirmar
 *  faz a linha de valor aparecer na tela principal. Quando Dinheiro é o ÚNICO método marcado, um
 *  passo extra pergunta "Vai ter troco?" antes de fechar — `troco` resolve esse passo ('sem' =
 *  Não, preenche o valor com o total sozinho; `{ recebido }` = Sim, com "Total recebido"). */
async function escolherFormaPagamento(
  page: import('@playwright/test').Page, nomeMetodo: string | RegExp, troco?: 'sem' | { recebido: string }
) {
  await page.getByRole('button', { name: 'Escolher forma de pagamento' }).click()
  await page.getByRole('button', { name: nomeMetodo }).click()
  await page.getByRole('button', { name: /^OK/ }).click()
  if (troco) {
    if (troco === 'sem') {
      await page.getByRole('button', { name: 'Não' }).click()
    } else {
      await page.getByRole('button', { name: 'Sim' }).click()
      await page.getByRole('dialog').getByRole('textbox').first().fill(troco.recebido)
    }
    await page.getByRole('button', { name: 'Confirmar' }).click()
  }
}

test.describe('Reabertura de RN-NOVA-1 — Catálogo e customização no Caixa', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(async ({ request }) => {
    criadosProdutoIds = []
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    await apiFecharTurnoSeAberto(request, token)
  })

  test('vende item de Catálogo com customização fixa expandida automaticamente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const { item, produtoPrincipal, produtoCustomizacao } = await apiCriarCatalogoComItem(
      request, token, `QA-Cat-Bombom-${sufixo}`, 20.00, 10,
      { nome: `QA-Cat-Laco-${sufixo}`, precoVenda: 5.00, estoqueAtual: 10 })
    criadosProdutoIds.push(produtoPrincipal.id, produtoCustomizacao.id)

    await login(page)
    await page.goto('/caixa')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(`QA-Cat-Bombom-${sufixo}`)
    await page.getByRole('button', { name: new RegExp(`QA-Cat-Bombom-${sufixo}`) }).click()

    // Customização fixa aparece automaticamente, sem ação da usuária.
    await expect(page.getByText(`QA-Cat-Laco-${sufixo}`)).toBeVisible()
    const totalLinha = page.locator('text="Total"').locator('xpath=following-sibling::span[1]')
    await expect(totalLinha).toHaveText('R$ 25,00') // 20 (item) + 5 (fixa)

    await escolherFormaPagamento(page, /Dinheiro/, 'sem')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()

    const resPrincipal = await request.get(`http://localhost:8080/produtos/${produtoPrincipal.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const resCustomizacao = await request.get(`http://localhost:8080/produtos/${produtoCustomizacao.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await resPrincipal.json()).estoqueAtual).toBe(9)
    expect((await resCustomizacao.json()).estoqueAtual).toBe(9)
  })

  test('anexa customização ad-hoc a um Produto direto (fora de Catálogo)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const produtoDireto = await apiCriarProdutoTipo(request, token, `QA-Direto-${sufixo}`, 'PRODUTO', 15.00, 10)
    const customizacao = await apiCriarProdutoTipo(request, token, `QA-AdHoc-${sufixo}`, 'CUSTOMIZACAO', 8.00, 10)
    criadosProdutoIds.push(produtoDireto.id, customizacao.id)

    await login(page)
    await page.goto('/caixa')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(`QA-Direto-${sufixo}`)
    await page.getByRole('button', { name: new RegExp(`QA-Direto-${sufixo}`) }).click()

    await page.getByRole('button', { name: /Customizações/ }).click()
    await page.getByRole('button', { name: new RegExp(`QA-AdHoc-${sufixo}`) }).click()
    await page.getByRole('button', { name: /Confirmar/ }).click()

    await expect(page.getByText(`QA-AdHoc-${sufixo}`)).toBeVisible()
    const totalLinha = page.locator('text="Total"').locator('xpath=following-sibling::span[1]')
    await expect(totalLinha).toHaveText('R$ 23,00') // 15 (produto) + 8 (ad-hoc)

    await escolherFormaPagamento(page, /Dinheiro/, 'sem')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()

    const resCustomizacao = await request.get(`http://localhost:8080/produtos/${customizacao.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await resCustomizacao.json()).estoqueAtual).toBe(9)
  })
})
