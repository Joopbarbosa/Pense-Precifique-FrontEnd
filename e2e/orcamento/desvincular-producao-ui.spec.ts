import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi, buscarOrcamento, vincularProducaoViaApi } from '../helpers/orcamento'
import { criarProdutoComFicha, inativarProduto, criarProducaoViaApi, teardownProducoes } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * #401 (DT-NOVA-3, V0.14.0) — botão "Desvincular" por produção vinculada, no card do Detalhe do
 * Orçamento (`DetalheOrcamentoPage.tsx`, commit 088e5d2). CEN-NOVO-1/2. Diferente de
 * `vinculo-producao.spec.ts` (CEN-NOVO-K/L, P-T004/#320), que só cobre a desvinculação via API
 * direta — aqui o clique real no botão de texto + modal (`ConfirmacaoModal`, variant danger).
 */
test.describe('#401 — Desvincular produção via UI (CEN-NOVO-1/2)', () => {
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

  /** Setup comum: insumo -> produto com ficha -> produção (AGUARDANDO_INICIO) -> orçamento -> vínculo, tudo via API. */
  async function montarOrcamentoComProducaoVinculada(request: import('@playwright/test').APIRequestContext, token: string, prefixo: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${prefixo}-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)

    const produto = await criarProdutoComFicha(request, token, `${prefixo}-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    criadasProducaoIds.push(producao.id)

    const cliente = await criarCliente(request, token, `${prefixo}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 3 },
    ])
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)

    return { orcamento, producao }
  }

  test('CEN-NOVO-1 — confirmar desvincular remove a produção da tela e do backend', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento, producao } = await montarOrcamentoComProducaoVinculada(request, token, 'QA401-1')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await expect(page.getByText('Vinculado a produção:')).toBeVisible()
    await expect(page.getByText(producao.identificador, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Desvincular', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Desvincular ${producao.identificador}?`)).toBeVisible()
    await expect(
      dialog.getByText('O orçamento deixa de estar vinculado a esta produção. Os produtos já lançados na produção não são removidos automaticamente.')
    ).toBeVisible()

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/orcamentos/${orcamento.id}/vincular-producao/${producao.id}`) && res.request().method() === 'DELETE'
      ),
      dialog.getByRole('button', { name: 'Desvincular', exact: true }).click(),
    ])

    await expect(page.getByText('Produção desvinculada.')).toBeVisible()
    await expect(page.getByText('Vinculado a produção:')).not.toBeVisible()
    await expect(page.getByText(producao.identificador, { exact: true })).not.toBeVisible()

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(0)
  })

  test('CEN-NOVO-2 — cancelar no modal mantém a produção vinculada, sem chamar a API', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orcamento, producao } = await montarOrcamentoComProducaoVinculada(request, token, 'QA401-2')

    let chamadasDelete = 0
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/vincular-producao/')) chamadasDelete += 1
    })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await expect(page.getByText(producao.identificador, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Desvincular', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Desvincular ${producao.identificador}?`)).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Vinculado a produção:')).toBeVisible()
    await expect(page.getByText(producao.identificador, { exact: true })).toBeVisible()
    expect(chamadasDelete).toBe(0)

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(1)
    expect(orcamentoDepois.producoesVinculadas[0].producaoId).toBe(producao.id)
  })
})
