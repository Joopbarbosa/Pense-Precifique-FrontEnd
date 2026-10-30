import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { filtrarAgenda } from '../helpers/agenda'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { registrarCompraPendente } from '../helpers/compra'
import { criarProdutoComFicha, inativarProduto, teardownProducoes } from '../helpers/producao'

/**
 * #1036 e #549 (V0.18.0, RN-NOVA-16 a RN-NOVA-18) — a produção e a compra pendente de recebimento na Agenda. CEN-NOVO-39, 45 a 50, 77.
 */
test.describe('#1036 e #549 — Produção e compra na Agenda', () => {
  let produtoIds: string[] = []
  let insumoIds: string[] = []
  let producaoIds: string[] = []

  test.beforeEach(() => { produtoIds = []; insumoIds = []; producaoIds = [] })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, producaoIds)
    for (const id of produtoIds) await inativarProduto(request, token, id)
    for (const id of insumoIds) await request.delete(`${E2E_API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  })

  async function produtoComMarca(request: import('@playwright/test').APIRequestContext, token: string, nome: string, marca: string | null, insumoId: string) {
    const res = await request.post(`${E2E_API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome, marca: marca ?? undefined, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, fichaTecnica: [{ insumoId, quantidade: 1 }] },
    })
    if (!res.ok()) throw new Error(`produto: ${res.status()} ${await res.text()}`)
    const p = await res.json()
    produtoIds.push(p.id)
    return p as { id: string }
  }

  test('CT-1036-01 — produção com vários produtos: título com o primeiro e "+N produtos"; o detalhe lista todos', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA1036-Insumo-${Date.now()}`, 1000, true)
    insumoIds.push(insumo.id)
    const sufixo = Date.now()
    const necessaire = await produtoComMarca(request, token, `Necessaire ${sufixo}`, null, insumo.id)
    const bolsa = await produtoComMarca(request, token, `Bolsa ${sufixo}`, 'Atelier', insumo.id)
    const carteira = await produtoComMarca(request, token, `Carteira ${sufixo}`, null, insumo.id)
    const dia = hojeLocal(1)
    const res = await request.post(`${E2E_API_URL}/producoes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { dataInicio: dia, dataTerminoPrevista: hojeLocal(3), produtos: [
        { produtoId: necessaire.id, quantidade: 3 }, { produtoId: bolsa.id, quantidade: 2 }, { produtoId: carteira.id, quantidade: 5 }] },
    })
    const producao = await res.json()
    producaoIds.push(producao.id)

    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await filtrarAgenda(page, `Início previsto — ${producao.identificador}`) // isola o card do "+N" de dia inteiro (#1204)
    const chip = page.getByTestId('compromisso').filter({ hasText: `Início previsto — ${producao.identificador} (Bolsa ${sufixo} — Atelier, +2 produtos)` })
    await expect(chip).toBeVisible()
    await expect(chip).toHaveClass(/bg-purple\/15/)
    await chip.click()
    const itens = page.getByTestId('produtos-da-producao').locator('li')
    await expect(itens).toHaveCount(3)
    await expect(itens.nth(0)).toHaveText(`Bolsa ${sufixo} — Atelier (2)`)
    await expect(itens.nth(1)).toHaveText(`Carteira ${sufixo} (5)`)
    await expect(itens.nth(2)).toHaveText(`Necessaire ${sufixo} (3)`)
    await expect(page.getByRole('button', { name: new RegExp(`Abrir produção ${producao.identificador}`) })).toBeVisible()
  })

  test('CT-549-01 — compra pendente: aparece no dia da previsão; Adiar move; data passada bloqueia', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA549-Insumo-${Date.now()}`, 0, true)
    insumoIds.push(insumo.id)
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 10, precoTotal: 50 }], hojeLocal(2), hojeLocal(0))

    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await filtrarAgenda(page, `Entrega de compra — ${compra.identificador}`) // isola o card do "+N" de dia inteiro (#1204)
    const chip = page.getByTestId('compromisso').filter({ hasText: `Entrega de compra — ${compra.identificador}` })
    await expect(chip).toBeVisible()
    await expect(chip).toHaveClass(/bg-azul\/20/)
    await chip.click()
    await expect(page.getByTestId('insumos-da-compra')).toContainText('×10')

    await page.getByRole('button', { name: 'Adiar' }).click()
    await page.getByLabel('Nova previsão de entrega').fill(hojeLocal(-1))
    await page.getByRole('dialog').last().getByRole('button', { name: 'Adiar' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel('Nova previsão de entrega').fill(hojeLocal(5))
    await page.getByRole('dialog').last().getByRole('button', { name: 'Adiar' }).click()
    await expect(page.getByTestId('painel-compra')).toHaveCount(0)
    const lista = await request.get(`${E2E_API_URL}/compras/${compra.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await lista.json()).previsaoEntrega).toBe(hojeLocal(5))
    expect((await lista.json()).status).toBe('PENDENTE_RECEBIMENTO')
  })

  test('CT-549-02 — compra atrasada fica no dia da previsão com "Atrasada há N dias"; Concluir leva à Entrada de compras', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA549b-Insumo-${Date.now()}`, 0, true)
    insumoIds.push(insumo.id)
    // a previsão não pode nascer no passado: cria para hoje e atrasa pelo banco
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 5, precoTotal: 20 }], hojeLocal(1), hojeLocal(0))
    const { execFileSync } = await import('child_process')
    execFileSync('docker', ['exec', process.env.DB_CONTAINER ?? '', 'psql', '-U', 'pense_user', '-d', process.env.DB_NAME ?? '', '-v', 'ON_ERROR_STOP=1', '-c',
      `UPDATE compras SET previsao_entrega = '${hojeLocal(-3)}' WHERE id = '${compra.id}'`], { stdio: 'ignore' })

    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Anterior' }).click() // o atrasado fica no dia original (RN-NOVA-4 v3)
    const chip = page.getByTestId('compromisso').filter({ hasText: `Entrega de compra — ${compra.identificador}` })
    await expect(chip).toBeVisible()
    await expect(chip).toHaveClass(/bg-danger-strong/)
    await expect(chip).toContainText('Atrasada há 3 dias')
    await chip.click()
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page).toHaveURL(new RegExp(`/compras/entrada\\?compra=${compra.id}`))
  })

  test('CT-549-03 (negativo) — cancelar a compra exige observação de no mínimo 30 caracteres', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA549c-Insumo-${Date.now()}`, 0, true)
    insumoIds.push(insumo.id)
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 5, precoTotal: 20 }], hojeLocal(1), hojeLocal(0))
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await filtrarAgenda(page, `Entrega de compra — ${compra.identificador}`) // isola o card do "+N" de dia inteiro (#1204)
    await page.getByTestId('compromisso').filter({ hasText: `Entrega de compra — ${compra.identificador}` }).click()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    // o campo da observação é achado pelo texto-guia do modal de cancelamento, não pela posição (o último textbox muda com a tela)
    const campo = page.getByPlaceholder(/o fornecedor entregou o pedido errado/)
    const confirmar = () => page.getByRole('button', { name: /Cancelar compra|Confirmar cancelamento/ }).click()
    await campo.fill('Fornecedor desistiu')
    await confirmar()
    await expect(page.getByText(/pelo menos 30 caracteres/).first()).toBeVisible()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    await campo.fill('Fornecedor desistiu da entrega do lote')
    await confirmar()
    await expect(page.getByText(`Compra ${compra.identificador} cancelada`)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()
    await expect(page.getByTestId('painel-compra')).toHaveCount(0)
    const r = await request.get(`${E2E_API_URL}/compras/${compra.id}`, { headers: { Authorization: `Bearer ${token}` } })
    expect((await r.json()).status).toBe('CANCELADA')
  })
})
