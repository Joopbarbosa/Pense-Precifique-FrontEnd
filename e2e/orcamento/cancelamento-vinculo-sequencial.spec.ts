import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import {
  criarCliente,
  criarOrcamentoViaApi,
  buscarOrcamento,
  vincularProducaoViaApi,
} from '../helpers/orcamento'
import {
  criarProdutoComFicha,
  inativarProduto,
  criarProducaoViaApi,
  iniciarProducaoViaApi,
  buscarProducao,
  teardownProducoes,
} from '../helpers/producao'

const INSUMO_URL = `${E2E_API_URL}/insumos`

/**
 * V0.18.0 (#1167) — RN-NOVA-40: ao cancelar o orçamento, uma pergunta por produção vinculada aberta:
 * "Cancelar também a produção PRD-N?" (Sim, cancelar a produção / Não, manter a produção).
 * Cobre CEN-NOVO-138 a 141. Substitui a sequência "Desfazer vínculo?" / "Manter o produto sendo
 * produzido?" da V0.8.3 (RN-NOVA-17) neste fluxo; o lado Produção segue em
 * e2e/producao/cancelar-vinculo-sequencial.spec.ts. CEN-NOVO-142 (produção finalizada não entra na
 * pergunta) é coberto no backend (OrcamentoCancelarDecideProducaoIT).
 */
async function buscarInsumo(request: import('@playwright/test').APIRequestContext, token: string, id: string) {
  const res = await request.get(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}

test.describe('V0.18.0/#1167 — RN-NOVA-40: cancelar orçamento pergunta se cancela a produção junto (CEN-NOVO-138 a 141)', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadasProducaoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadasProducaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, criadasProducaoIds)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function montar(request: import('@playwright/test').APIRequestContext, token: string, rotulo: string, producoes: number, iniciar = false) {
    const insumo = await criarInsumoComEstoque(request, token, `${rotulo}-Insumo-${Date.now()}`, 1000, false)
    criadosInsumoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, `${rotulo}-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${rotulo}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 5 },
    ])
    const lista: { id: string; identificador: string }[] = []
    for (let i = 0; i < producoes; i++) {
      const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
      criadasProducaoIds.push(producao.id)
      await vincularProducaoViaApi(request, token, orcamento.id, producao.id)
      lista.push(producao)
    }
    if (iniciar) {
      const res = await iniciarProducaoViaApi(request, token, lista[0].id)
      expect((await res.json()).estado).toBe('EM_ANDAMENTO')
    }
    return { insumo, orcamento, producoes: lista }
  }

  async function confirmarCancelamento(page: import('@playwright/test').Page, orcamentoId: string) {
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    const cancelamento = page.waitForResponse(response =>
      response.request().method() === 'POST'
      && new URL(response.url()).pathname.endsWith(`/orcamentos/${orcamentoId}/cancelar`),
    )
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    const resposta = await cancelamento
    expect(resposta.ok()).toBe(true)
    await resposta.finished()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }

  test('CEN-NOVO-138 — "Sim, cancelar a produção": produção vai para Cancelada e o orçamento se desvincula', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento, producoes } = await montar(request, token, 'QA1167-138', 1)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Cancelar também a produção ${producoes[0].identificador}?`)).toBeVisible()
    await expect(dialog.getByText(/não voltam ao estoque/)).toHaveCount(0) // aguardando início: sem aviso
    await dialog.getByRole('button', { name: 'Sim, cancelar a produção' }).click()
    await confirmarCancelamento(page, orcamento.id)

    const depois = await buscarOrcamento(request, token, orcamento.id)
    expect(depois.status).toBe('CANCELADO')
    expect(depois.producoesVinculadas).toHaveLength(0)
    expect((await buscarProducao(request, token, producoes[0].id)).estado).toBe('CANCELADA')
  })

  test('CEN-NOVO-139 — "Não, manter a produção": produção continua e o orçamento se desvincula', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento, producoes } = await montar(request, token, 'QA1167-139', 1)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Cancelar também a produção ${producoes[0].identificador}?`)).toBeVisible()
    await dialog.getByRole('button', { name: 'Não, manter a produção' }).click()
    await confirmarCancelamento(page, orcamento.id)

    const depois = await buscarOrcamento(request, token, orcamento.id)
    expect(depois.status).toBe('CANCELADO')
    expect(depois.producoesVinculadas).toHaveLength(0)
    expect((await buscarProducao(request, token, producoes[0].id)).estado).toBe('AGUARDANDO_INICIO')
  })

  test('CEN-NOVO-140/141 — duas produções: uma pergunta por produção, em ordem; Esc equivale a "Não, manter"; em andamento avisa e não estorna insumo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { insumo, orcamento, producoes } = await montar(request, token, 'QA1167-140', 2, true)
    const insumoAposIniciar = await buscarInsumo(request, token, insumo.id)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    // 1ª (em andamento): aviso de insumo consumido; responde Sim
    const dialog1 = page.getByRole('dialog')
    await expect(dialog1.getByText('Produção 1 de 2')).toBeVisible()
    await expect(dialog1.getByText(`Cancelar também a produção ${producoes[0].identificador}?`)).toBeVisible()
    await expect(dialog1.getByText(/não voltam ao estoque/)).toBeVisible()
    await dialog1.getByRole('button', { name: 'Sim, cancelar a produção' }).click()

    // 2ª (aguardando início): fechar sem responder = manter
    const dialog2 = page.getByRole('dialog')
    await expect(dialog2.getByText('Produção 2 de 2')).toBeVisible()
    await expect(dialog2.getByText(`Cancelar também a produção ${producoes[1].identificador}?`)).toBeVisible()
    await page.keyboard.press('Escape')
    await confirmarCancelamento(page, orcamento.id)

    const depois = await buscarOrcamento(request, token, orcamento.id)
    expect(depois.status).toBe('CANCELADO')
    expect(depois.producoesVinculadas).toHaveLength(0)
    expect((await buscarProducao(request, token, producoes[0].id)).estado).toBe('CANCELADA')
    expect((await buscarProducao(request, token, producoes[1].id)).estado).toBe('AGUARDANDO_INICIO')
    expect((await buscarInsumo(request, token, insumo.id)).estoqueAtual).toBe(insumoAposIniciar.estoqueAtual)
  })
})
