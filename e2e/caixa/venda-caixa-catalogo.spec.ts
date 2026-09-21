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
  let criadosItensCatalogo: { catalogoId: string; itemId: string }[] = []

  test.beforeEach(async ({ request }) => {
    criadosProdutoIds = []
    criadosItensCatalogo = []
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    // OpenProject #529 — inativarProduto (DELETE /produtos/{id}) falha com 400 se o produto ainda
    // está vinculado a um Item de Catálogo (bloqueio de negócio, não bug); o .catch(() => {}) do
    // helper engolia esse erro silenciosamente, deixando a customização órfã e ativa no banco pra
    // sempre — exatamente o tipo de dado que o filtro ativo=true (#529) não consegue esconder,
    // porque nunca chegava a ser inativado. Apaga o Item de Catálogo primeiro (remove o vínculo),
    // só então inativa os produtos.
    for (const { catalogoId, itemId } of criadosItensCatalogo) {
      await request.delete(`http://localhost:8080/catalogos/${catalogoId}/itens/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    await apiFecharTurnoSeAberto(request, token)
  })

  test('vende item de Catálogo com 2 componentes — preço é só o do item, estoque debita todos os componentes (RN-NOVA-9)', async ({ page, request }) => {
    // V0.13.0 (#516/RN-NOVA-1/2/9) — reescrito: "customização fixa anexada" com preço próprio
    // somado ao total não existe mais (item de catálogo passou a ter preço próprio único,
    // componentes sem preço individual) — e componentes de Item de Catálogo não aparecem mais
    // como linha de customização no carrinho (isso ficou exclusivo de customização ad-hoc,
    // RN-030); o que continua a mesma regra de sempre é: vender o item debita o estoque de cada
    // componente, generalizado de "1 produto principal" para "N componentes" (RN-NOVA-9).
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const { catalogo, item, produtoPrincipal, produtoCustomizacao } = await apiCriarCatalogoComItem(
      request, token, `QA-Cat-Bombom-${sufixo}`, 20.00, 10,
      { nome: `QA-Cat-Laco-${sufixo}`, precoVenda: 5.00, estoqueAtual: 10 })
    criadosProdutoIds.push(produtoPrincipal.id, produtoCustomizacao.id)
    criadosItensCatalogo.push({ catalogoId: catalogo.id, itemId: item.id })

    await login(page)
    await page.goto('/caixa')
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(`QA-Cat-Bombom-${sufixo}`)
    await page.getByRole('button', { name: new RegExp(`QA-Cat-Bombom-${sufixo}`) }).click()

    const totalLinha = page.locator('text="Total"').locator('xpath=following-sibling::span[1]')
    await expect(totalLinha).toHaveText('R$ 20,00') // preço próprio do item (override) — não soma mais preço de componente

    await escolherFormaPagamento(page, /Dinheiro/, 'sem')
    await page.getByRole('button', { name: /Finalizar venda/ }).click()

    await expect(page.getByText(/Venda concluída — CX-\d+/)).toBeVisible()

    const resPrincipal = await request.get(`http://localhost:8080/produtos/${produtoPrincipal.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const resCustomizacao = await request.get(`http://localhost:8080/produtos/${produtoCustomizacao.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await resPrincipal.json()).estoqueAtual).toBe(9)
    expect((await resCustomizacao.json()).estoqueAtual).toBe(9) // RN-NOVA-9 — todos os componentes debitam, não só "o principal"
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
