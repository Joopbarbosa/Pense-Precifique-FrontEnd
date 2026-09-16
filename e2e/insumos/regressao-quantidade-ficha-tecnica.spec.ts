import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, inativarInsumo } from '../helpers/api'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

/**
 * Cenário 228 — Regressão do bug "025/0,25" no campo de quantidade da ficha técnica (#186)
 *
 * Bug histórico (006.1 no CLAUDE.md do frontend) vivia em `QtyInput`
 * (CadastrarProdutoPage.tsx:308-330, componente da ficha técnica de Produto): o round-trip
 * qtd -> num() -> toLocaleString() truncava "0,25" para "025"/"0" ao resincronizar `display` a
 * partir da prop `value` a cada keystroke, quando `maximumFractionDigits: 0` (insumo
 * não-fracionável). Fix confirmado em código: `display` é useState inicializado uma única vez,
 * nunca resincronizado por prop. Não existe campo equivalente dentro do próprio
 * FormInsumoPage.tsx — por isso este teste dirige a tela de Produto, não a de Insumo.
 *
 * [Atualização V0.10.0 — #338/#468] Premissa do cenário original mudou: na época, "0,25" digitado
 * num insumo não-fracionável DEVIA aparecer normalmente no campo (bloqueio só existia ao salvar,
 * RN-006) — esse era o próprio escopo do bug 025 (cosmético, não de validação). #338/#468
 * mudaram essa regra deliberadamente: para insumo não-fracionável, `QtyInput` agora filtra
 * ","/"."/"/" já durante a digitação (`permitidos = /[^\d]/g`, `CadastrarProdutoPage.tsx`), não
 * só no submit — usuária pediu explicitamente que o bloqueio acontecesse "ao digitar", não só ao
 * salvar. O teste abaixo foi ajustado para essa regra nova; o insumo fracionável continua sem
 * bloqueio de "," (não regride).
 */
test.describe('Cenário 228 — Regressão bug 025/0,25 na ficha técnica (#186)', () => {
  let insumoNaoFracId: string
  let insumoFracId: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, `E2E Bug025 NaoFrac ${Date.now()}`, 100, true)
    insumoNaoFracId = insumoNaoFrac.id
    const insumoFrac = await criarInsumoFracionavel(request, token, `E2E Bug025 Frac ${Date.now()}`, 100, 'DECIMAL')
    insumoFracId = insumoFrac.id
    await login(page)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoNaoFracId)
    await inativarInsumo(request, token, insumoFracId)
  })

  test('digitar "0,25" — insumo fracionável mantém "0,25", não-fracionável filtra para "025" (#338/#468)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumoNaoFrac = await request.get(`http://localhost:8080/insumos/${insumoNaoFracId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json())
    const insumoFrac = await request.get(`http://localhost:8080/insumos/${insumoFracId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json())

    await page.goto('/produtos/novo')
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(`E2E Produto Bug025 ${Date.now()}`)
    await page.getByPlaceholder('45').fill('30')
    await page.getByRole('button', { name: 'Próximo: Ficha Técnica' }).click()

    const busca = page.getByPlaceholder('Buscar insumo ou produto...')

    // insumo não-fracionável — #338/#468 (V0.10.0) passaram a filtrar ","/"."/"/" já na digitação
    // (antes só bloqueava ao salvar, regressão original do bug 025) — "," some, dígitos ficam.
    await busca.fill(insumoNaoFrac.nome)
    await page.getByRole('button', { name: new RegExp(insumoNaoFrac.nome) }).first().click()
    const linhaNaoFrac = page.locator('div.grid.animate-row-in', { hasText: insumoNaoFrac.nome })
    const inputNaoFrac = linhaNaoFrac.locator('input')
    await inputNaoFrac.fill('')
    await inputNaoFrac.pressSequentially('0,25')
    await expect(inputNaoFrac).toHaveValue('025')

    // insumo fracionável — mesmo campo, não deve truncar tampouco
    await busca.fill(insumoFrac.nome)
    await page.getByRole('button', { name: new RegExp(insumoFrac.nome) }).first().click()
    const linhaFrac = page.locator('div.grid.animate-row-in', { hasText: insumoFrac.nome })
    const inputFrac = linhaFrac.locator('input')
    await inputFrac.fill('')
    await inputFrac.pressSequentially('0,25')
    await expect(inputFrac).toHaveValue('0,25')

    // Não salvamos o produto com "0,25" no item não-fracionável: essa é uma quantidade
    // genuinamente inválida para esse insumo (RN-006), e o formulário corretamente bloqueia o
    // envio com "O insumo '...' não pode ser usado em fração — informe uma quantidade inteira."
    // O escopo deste cenário é só a exibição do campo (bug 025 era cosmético — a observação
    // original já registrava "validação de envio funciona").
  })
})
