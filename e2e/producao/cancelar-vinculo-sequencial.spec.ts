import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, buscarOrcamento, vincularProducaoViaApi } from '../helpers/orcamento'
import { criarProdutoComFicha, inativarProduto, criarProducaoViaApi, buscarProducao, teardownProducoes } from '../helpers/producao'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * P-F003 (#375+308) — RN-NOVA-17, lado espelhado: cancelar Produção com orçamento(s) vinculado(s).
 * Cobre CEN-NOVO-18 (DECISOES_V0.8.3.md). PDC-CEN-101, também ORC-CEN-094 (cross-módulo).
 *
 * Produção fica AGUARDANDO_INICIO (Fluxo A de cancelamento, `CancelarProducaoModal`) — a fila de
 * vínculos roda ANTES dessa modal abrir (achado de arquitetura desta mesma tarefa, ver
 * DECISOES_V0.8.3.md): "Sim" num vínculo cujo lado Produção é o que está sendo cancelado precisa
 * do estado real (AGUARDANDO_INICIO) ainda intacto no servidor para reverter via
 * desvincularProducao — depois de cancelada a produção vira CANCELADA e a chamada falharia com 400.
 */
test.describe('P-F003/#375+308 — RN-NOVA-17: cancelar Produção com vínculo ativo (CEN-NOVO-18)', () => {
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

  test('PDC-CEN-101/ORC-CEN-094 — CEN-NOVO-18: 2 orçamentos vinculados, modais sequenciais, "Sim" e "Não"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QAF003-18-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QAF003-18-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const quantidadeBase = 2
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: quantidadeBase }])
    criadasProducaoIds.push(producao.id)

    const cliente1 = await criarCliente(request, token, `QAF003-18-Cliente1-${Date.now()}`)
    const qtd1 = 3
    const orcamento1 = await criarOrcamentoViaApi(request, token, cliente1.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: qtd1 },
    ])
    const cliente2 = await criarCliente(request, token, `QAF003-18-Cliente2-${Date.now()}`)
    const qtd2 = 4
    const orcamento2 = await criarOrcamentoViaApi(request, token, cliente2.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: qtd2 },
    ])

    await vincularProducaoViaApi(request, token, orcamento1.id, producao.id)
    await vincularProducaoViaApi(request, token, orcamento2.id, producao.id)

    const producaoAntes = await buscarProducao(request, token, producao.id)
    expect(producaoAntes.orcamentosVinculados).toHaveLength(2)
    expect(producaoAntes.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id).quantidade)
      .toBe(quantidadeBase + qtd1 + qtd2)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()

    // fila roda ANTES da modal de justificativa — a modal de cancelamento real ainda não deve
    // estar visível neste ponto.
    await expect(page.getByText('Esta ação não pode ser desfeita.')).not.toBeVisible()

    const dialog1 = page.getByRole('dialog')
    await expect(dialog1.getByText('Vínculo 1 de 2')).toBeVisible()
    await expect(dialog1.getByText('Desfazer vínculo com o orçamento?')).toBeVisible()
    await dialog1.getByRole('button', { name: 'Sim, desfazer vínculo' }).click()

    const dialog2 = page.getByRole('dialog')
    await expect(dialog2.getByText('Vínculo 2 de 2')).toBeVisible()
    await dialog2.getByRole('button', { name: 'Não', exact: true }).click()

    // fila esgotada — agora sim abre a modal real de cancelamento (justificativa)
    await expect(page.getByText('Esta ação não pode ser desfeita.')).toBeVisible()
    await page.getByPlaceholder('Descreva o motivo do cancelamento...').fill('Cancelamento de teste QA-F003 — cenário CEN-NOVO-18, produção sem uso real.')
    await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    await expect(page.getByText('Produção cancelada')).toBeVisible()

    const producaoDepois = await buscarProducao(request, token, producao.id)
    expect(producaoDepois.estado).toBe('CANCELADA')
    expect(producaoDepois.orcamentosVinculados).toHaveLength(1) // um foi desfeito, o outro ficou órfão

    const idRestante = producaoDepois.orcamentosVinculados[0].orcamentoId
    const idDesfeito = idRestante === orcamento1.id ? orcamento2.id : orcamento1.id

    const orcamentoOrfao = await buscarOrcamento(request, token, idRestante)
    expect(orcamentoOrfao.producoesVinculadas).toHaveLength(1) // "Não" — vínculo intacto, agora órfão

    const orcamentoDesfeito = await buscarOrcamento(request, token, idDesfeito)
    expect(orcamentoDesfeito.producoesVinculadas).toHaveLength(0) // "Sim" — vínculo removido
  })
})
