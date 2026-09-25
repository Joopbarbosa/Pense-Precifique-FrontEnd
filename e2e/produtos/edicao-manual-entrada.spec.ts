import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

const PRODUTO_URL = 'http://localhost:8080/produtos'

/**
 * #534 (V0.14.0, RN-NOVA-5, réplica de #514) — direção ENTRADA (toggle "Acréscimo") do modal
 * "Edição manual" de Produto (`DetalheProdutoPage.tsx`, `EdicaoManualProdutoModal`).
 * `e2e/producao/smoke-tech-debt.spec.ts` (#127/#148) já cobre a direção SAIDA via UI — este spec é
 * o 1º E2E da direção ENTRADA, só testada manualmente no navegador até aqui.
 *
 * Diferente de Insumo (`e2e/insumos/edicao-manual-entrada.spec.ts`, mesmo pocket): aqui
 * `MovTitulo()` usa `MOTIVO_LABEL` também para ENTRADA — sem o achado de label bruto encontrado no
 * lado de Insumo. Histórico mostra "Entrada — Perda" (label), corretamente.
 */
test.describe('#534 — Edição manual, direção ENTRADA (Produto)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('toggle Acréscimo registra entrada, soma estoque e aparece no histórico', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA534-Produto-${Date.now()}`, 20)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}`)

    const estoqueLabel = page.getByText('Estoque atual', { exact: true })
    const estoqueValor = estoqueLabel.locator('xpath=following-sibling::div[1]')
    await expect(estoqueValor).toHaveText('20 unidades')

    await page.getByRole('button', { name: 'Edição manual', exact: true }).click()
    const dialog = page.getByRole('dialog')

    // SegmentedControl (Baixa/Acréscimo) vive dentro do mesmo <label> que o texto "Tipo *" — o
    // <label> envolvendo múltiplos <button> (labelable elements) faz o browser atribuir um nome
    // acessível incorreto ao 1º botão (concatena texto do label inteiro), então getByRole por nome
    // não é confiável aqui. Escopa pelo <label> (mesmo padrão do dropdown de Motivo, já usado em
    // smoke-tech-debt.spec.ts) e usa a ordem dos botões (Baixa=0, Acréscimo=1).
    const tipoToggle = dialog.locator('label', { hasText: /^Tipo/ })
    const btnBaixa = tipoToggle.locator('button').nth(0)
    const btnAcrescimo = tipoToggle.locator('button').nth(1)
    await expect(btnBaixa).toHaveClass(/bg-orange/)
    await expect(dialog.getByText('Registra uma saída fora de produção.')).toBeVisible()

    await btnAcrescimo.click()
    await expect(btnAcrescimo).toHaveClass(/bg-teal/)
    await expect(dialog.getByText('Registra uma entrada fora de produção.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Registrar entrada', exact: true })).toBeVisible()

    await dialog.getByPlaceholder('1', { exact: true }).fill('5')
    // Motivo já vem "Perda" por padrão (estado inicial do modal) — só precisa da observação.
    await dialog.getByPlaceholder(/Descreva o motivo da baixa/).fill('Observação de teste com pelo menos 30 caracteres.')
    await dialog.getByRole('button', { name: 'Registrar entrada', exact: true }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(estoqueValor).toHaveText('25 unidades')

    await page.getByRole('button', { name: 'Histórico de movimentações', exact: true }).click()
    // HistTipo renderiza a linha 2x (desktop + mobile, uma delas escondida via CSS) — .first() evita
    // strict mode violation, mesmo padrão de outras specs que leem o histórico de movimentações.
    await expect(page.getByText('Entrada — Perda', { exact: true }).first()).toBeVisible()

    const produtoDepois = await (await request.get(`${PRODUTO_URL}/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.estoqueAtual).toBe(25)
  })
})
