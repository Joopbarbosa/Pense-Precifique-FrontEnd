import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * #514 (V0.14.0, RN-NOVA-5) — direção ENTRADA (toggle "Acréscimo") do modal "Edição manual" de
 * Insumo (`DetalheInsumoPage.tsx`, `EdicaoManualModal`). `e2e/producao/smoke-tech-debt.spec.ts`
 * (#127/#148) já cobre a direção SAIDA via UI — este spec é o 1º E2E da direção ENTRADA, só
 * testada manualmente no navegador até aqui.
 *
 * ACHADO (não corrigido, só documentado — instrução da skill `teste`): `tituloMovimentacao()`
 * (`DetalheInsumoPage.tsx`) usa um mapa local `labelsEntrada = { COMPRA: 'Compra' }` para o título
 * de movimentações ENTRADA no histórico, em vez do `MOTIVO_LABEL` compartilhado (que já tem
 * PERDA/AVARIA/USO_EXTRA/CORRECAO/OUTRO). Resultado: uma Entrada manual registrada com motivo
 * "Perda" aparece no histórico como **"Entrada — PERDA"** (código bruto do enum), não "Entrada —
 * Perda" (label) — só a direção SAIDA usa o label certo (`MOTIVO_LABEL[m.motivo]`, função
 * `tituloMovimentacao` mesma função, ramo de baixo). `DetalheProdutoPage.tsx` (réplica #534) NÃO
 * tem esse bug — `MovTitulo()` usa `MOTIVO_LABEL` também para ENTRADA corretamente (ver
 * `e2e/produtos/edicao-manual-entrada.spec.ts`, que já assere o label certo). A asserção abaixo
 * documenta o texto real (com o código bruto) em vez de mascarar o achado.
 */
test.describe('#514 — Edição manual, direção ENTRADA (Insumo)', () => {
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('toggle Acréscimo registra entrada, soma estoque e aparece no histórico', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA514-Insumo-${Date.now()}`, 20, false)
    criadosInsumoIds.push(insumo.id)

    await login(page)
    await page.goto(`/insumos/${insumo.id}`)

    const saldoLabel = page.getByText('Saldo atual', { exact: true })
    const saldoValor = saldoLabel.locator('xpath=following-sibling::div[1]')
    await expect(saldoValor).toHaveText(`20 ${insumo.unidadeMedida}`)

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
    await expect(dialog.getByText('Registra uma entrada fora de compra.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Registrar entrada', exact: true })).toBeVisible()

    await dialog.getByPlaceholder('3', { exact: true }).fill('5')
    // Motivo já vem "Perda" por padrão (estado inicial do modal) — só precisa da observação.
    await dialog.getByPlaceholder(/Descreva o motivo da baixa/).fill('Observação de teste com pelo menos 30 caracteres.')
    await dialog.getByRole('button', { name: 'Registrar entrada', exact: true }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(saldoValor).toHaveText(`25 ${insumo.unidadeMedida}`)

    await page.getByRole('button', { name: 'Histórico de movimentações', exact: true }).click()
    // Achado documentado no comentário do describe: motivo aparece como código bruto ("PERDA"),
    // não o label ("Perda") — só na direção ENTRADA de Insumo.
    // HistRows renderiza a linha 2x (desktop + mobile, uma delas escondida via CSS) — .first() evita
    // strict mode violation, mesmo padrão de outras specs que leem o histórico de movimentações.
    await expect(page.getByText('Entrada — PERDA').first()).toBeVisible()

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(25)
  })
})
