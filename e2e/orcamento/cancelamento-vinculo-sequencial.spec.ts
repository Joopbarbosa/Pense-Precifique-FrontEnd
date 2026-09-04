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

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * P-F003 (#375+308) — RN-NOVA-17: modal sequencial de "desfazer vínculo?" ao cancelar Orçamento
 * com produção(ões) vinculada(s). Cobre CEN-NOVO-12/13/14/15/16 (DECISOES_V0.8.3.md).
 * ORC-CEN-091/092/093, também PDC-CEN-098/099/100 (cross-módulo, ver referência cruzada nos dois
 * cenarios-*.md). Lado espelhado (cancelar Produção, CEN-NOVO-18) fica em
 * e2e/producao/cancelar-vinculo-sequencial.spec.ts. CEN-NOVO-17 não é implementável (branch
 * estruturalmente inatingível) — sem teste, por completude formal já documentada na Spec.
 *
 * Orçamentos ficam em RASCUNHO (kind "simples" de cancelamento, ModalCancelSimples) — a regra é
 * independente do status do orçamento sendo cancelado, então o caminho mais simples (sem avançar
 * status) já cobre a bifurcação real (estado da produção vinculada).
 */
async function buscarInsumo(request: import('@playwright/test').APIRequestContext, token: string, id: string) {
  const res = await request.get(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}

test.describe('P-F003/#375+308 — RN-NOVA-17: cancelar Orçamento com vínculo ativo (CEN-NOVO-12/13/14/15/16)', () => {
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

  test('ORC-CEN-091/PDC-CEN-098 — CEN-NOVO-13/14: 2 produções vinculadas (AGUARDANDO_INICIO), modais sequenciais, "Não" e "Sim"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QAF003-13-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QAF003-13-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producaoA = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    criadasProducaoIds.push(producaoA.id)
    const producaoB = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producaoB.id)

    const cliente = await criarCliente(request, token, `QAF003-13-Cliente-${Date.now()}`)
    const quantidadeOrcamento = 3
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: quantidadeOrcamento },
    ])

    await vincularProducaoViaApi(request, token, orcamento.id, producaoA.id)
    await vincularProducaoViaApi(request, token, orcamento.id, producaoB.id)

    const orcamentoAntes = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoAntes.producoesVinculadas).toHaveLength(2)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    // A fila de vínculos roda ANTES da modal de cancelamento (arquitetura corrigida — ver
    // DECISOES_V0.8.3.md): clicar "Cancelar orçamento" já abre a 1ª pergunta sequencial direto.
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    // 1º vínculo — responde "Não" (CEN-NOVO-14: prossegue, vínculo fica órfão)
    const dialog1 = page.getByRole('dialog')
    await expect(dialog1.getByText('Vínculo 1 de 2')).toBeVisible()
    await expect(dialog1.getByText('Desfazer vínculo com a produção?')).toBeVisible()
    await dialog1.getByRole('button', { name: 'Não', exact: true }).click()

    // 2º vínculo — responde "Sim" (CEN-NOVO-13: modal seguinte abre sozinha, sequencial)
    const dialog2 = page.getByRole('dialog')
    await expect(dialog2.getByText('Vínculo 2 de 2')).toBeVisible()
    await dialog2.getByRole('button', { name: 'Sim, desfazer vínculo' }).click()

    // fila esgotada — só agora abre a modal real de cancelamento
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.status).toBe('CANCELADO')
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(1) // um ficou órfão, o outro foi desfeito

    const idRestante = orcamentoDepois.producoesVinculadas[0].producaoId
    const idRevertido = idRestante === producaoA.id ? producaoB.id : producaoA.id
    const quantidadeBase = idRestante === producaoA.id ? 5 : 2 // a outra produção, sem o vínculo restante

    const producaoComVinculoOrfao = await buscarProducao(request, token, idRestante)
    const qtdBaseRestante = idRestante === producaoA.id ? 2 : 5
    expect(producaoComVinculoOrfao.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id).quantidade)
      .toBe(qtdBaseRestante + quantidadeOrcamento) // "Não" — nada revertido

    const producaoRevertida = await buscarProducao(request, token, idRevertido)
    const produtoRevertido = producaoRevertida.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id)
    expect(produtoRevertido?.quantidade ?? 0).toBe(quantidadeBase) // "Sim" — reverteu de volta à quantidade base
  })

  test('ORC-CEN-092/PDC-CEN-099 — CEN-NOVO-12/15: produção EM_ANDAMENTO, "Sim" → 2ª pergunta por produto → "Sim, manter"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QAF003-15-Insumo-${Date.now()}`, 1000, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QAF003-15-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const quantidadeBase = 2 // nasce direto na criação da produção, não vem do orçamento
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: quantidadeBase }])
    criadasProducaoIds.push(producao.id)

    const cliente = await criarCliente(request, token, `QAF003-15-Cliente-${Date.now()}`)
    const quantidadeOrcamento = 3
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: quantidadeOrcamento },
    ])
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)

    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect(resIniciar.ok()).toBe(true)
    expect((await resIniciar.json()).estado).toBe('EM_ANDAMENTO')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    const dialog1 = page.getByRole('dialog')
    await expect(dialog1.getByText('Desfazer vínculo com a produção?')).toBeVisible()
    await expect(dialog1.getByText(producao.identificador)).toBeVisible()
    await dialog1.getByRole('button', { name: 'Sim, desfazer vínculo' }).click()

    const dialog2 = page.getByRole('dialog')
    await expect(dialog2.getByText('Manter o produto sendo produzido?')).toBeVisible()
    await expect(dialog2.getByText(nomeProduto)).toBeVisible()
    await expect(dialog2.getByText(/não são revertidos/)).toBeVisible() // aviso explícito de perda, sempre visível
    await dialog2.getByRole('button', { name: 'Sim, manter', exact: true }).click()

    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(0) // vínculo fechado

    const producaoDepois = await buscarProducao(request, token, producao.id)
    const produtoDepois = producaoDepois.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id)
    expect(produtoDepois.quantidade).toBe(quantidadeBase + quantidadeOrcamento) // "Sim, manter" — produto intocado
  })

  test('ORC-CEN-093/PDC-CEN-100 — CEN-NOVO-16: produção EM_ANDAMENTO, "Não, remover" — perda de material, sem estorno de estoque', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QAF003-16-Insumo-${Date.now()}`, 1000, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QAF003-16-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    // Quantidade base (2) nasce direto na criação da produção, independente do orçamento — separada
    // de propósito da quantidade que o orçamento contribui (3) para provar que a remoção "por
    // produto" tira só a contribuição deste orçamento (RN-NOVA-17), não a linha inteira.
    const quantidadeBase = 2
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: quantidadeBase }])
    criadasProducaoIds.push(producao.id)

    const cliente = await criarCliente(request, token, `QAF003-16-Cliente-${Date.now()}`)
    const quantidadeOrcamento = 3
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: quantidadeOrcamento },
    ])
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)

    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect((await resIniciar.json()).estado).toBe('EM_ANDAMENTO')

    const insumoAposIniciar = await buscarInsumo(request, token, insumo.id)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento' }).click()

    const dialog1 = page.getByRole('dialog')
    await dialog1.getByRole('button', { name: 'Sim, desfazer vínculo' }).click()

    const dialog2 = page.getByRole('dialog')
    await expect(dialog2.getByText(/não são revertidos/)).toBeVisible()
    await dialog2.getByRole('button', { name: 'Não, remover' }).click()

    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sim, cancelar' })).toBeVisible()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(0)

    const producaoDepois = await buscarProducao(request, token, producao.id)
    const produtoDepois = producaoDepois.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id)
    expect(produtoDepois.quantidade).toBe(quantidadeBase) // só a contribuição deste orçamento saiu, base intocada

    const insumoDepois = await buscarInsumo(request, token, insumo.id)
    expect(insumoDepois.estoqueAtual).toBe(insumoAposIniciar.estoqueAtual) // nenhuma movimentação nova
  })
})
