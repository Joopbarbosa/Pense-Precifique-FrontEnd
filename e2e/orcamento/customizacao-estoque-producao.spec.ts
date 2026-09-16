import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import {
  criarCliente,
  criarOrcamentoViaApi,
  criarCustomizacaoComFichaEEstoque,
  avancarStatusViaApi,
  cancelarOrcamentoViaApi,
} from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * RN-NOVA-16 (V0.10.0, #476) — Customização (produto tipo CUSTOMIZACAO, produzível — tem ficha
 * técnica/rendimento igual a Produto) passa a participar do tratamento de estoque/produção do
 * Orçamento exatamente como o produto principal do item: aviso na criação, bloqueio/aviso pendente
 * ao finalizar, baixa real ao finalizar, reversão real ao cancelar, e aparição no card "Estoque
 * insuficiente" com o mesmo fluxo de Criar produção/Visualizar produção. Antes desta versão, os 5
 * pontos do `OrcamentoService` só olhavam `OrcamentoItem.getProdutoVendido()` (produto principal),
 * nunca `OrcamentoItemCustomizacao` (customização anexada) — ver `DECISOES_V0.10.0.md`.
 *
 * Cobertura equivalente já existe no backend (`OrcamentoEstoqueCustomizacaoIT`, integração) — esta
 * suíte fecha o lado E2E/UI que ainda não tinha nenhum script (achado da `teste` no fechamento do
 * pocket).
 */
test.describe('RN-NOVA-16 (#476) — Customização participa do estoque/produção do Orçamento', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('Customização com estoque insuficiente aparece em itens-sem-estoque e no card do Resumo (API + UI)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA476-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)

    const nomeInsumo = `QA476-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 2, false)
    criadosInsumoIds.push(insumo.id)
    const nomeCustom = `QA476-Custom-${Date.now()}`
    // ficha: 1 insumo por unidade de customização, estoqueAtual do PRODUTO customização (não do
    // insumo) fica baixo de propósito — RN-NOVA-16 olha o estoque do produto/customização vendido,
    // mesmo critério já usado pro produto principal (não o estoque do insumo da ficha).
    const customizacao = await criarCustomizacaoComFichaEEstoque(request, token, nomeCustom, [{ insumoId: insumo.id, quantidade: 1 }], 2, 1)
    criadosProdutoIds.push(customizacao.id)
    const cliente = await criarCliente(request, token, `QA476-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      {
        produtoId: produto.id,
        margemAplicada: 50,
        precoUnitario: 20,
        quantidade: 1,
        customizacoes: [{ produtoId: customizacao.id, quantidade: 10 }],
      },
    ])

    const res = await request.get(`${API_URL}/orcamentos/${orcamento.id}/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // Produto principal tem estoque de sobra (100 >= 1) — só a customização entra na lista.
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      produtoId: customizacao.id,
      nomeProduto: nomeCustom,
      quantidadeSolicitada: 10,
      estoqueAtual: 2,
      quantidadeFaltante: 8,
    })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByText(/item(?:s)? com estoque insuficiente/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(nomeCustom, { exact: true }).first()).toBeVisible()
  })

  test('Finalizar baixa o estoque real da Customização; cancelar com multa devolve (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA476b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)

    const nomeInsumo = `QA476b-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeCustom = `QA476b-Custom-${Date.now()}`
    const customizacao = await criarCustomizacaoComFichaEEstoque(request, token, nomeCustom, [{ insumoId: insumo.id, quantidade: 1 }], 50, 1)
    criadosProdutoIds.push(customizacao.id)
    const cliente = await criarCliente(request, token, `QA476b-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      {
        produtoId: produto.id,
        margemAplicada: 50,
        precoUnitario: 20,
        quantidade: 1,
        customizacoes: [{ produtoId: customizacao.id, quantidade: 3 }],
      },
    ])

    const buscarCustom = async () =>
      (await (await request.get(`${API_URL}/produtos/${customizacao.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })).json()).estoqueAtual

    expect(await buscarCustom()).toBe(50)

    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO -> APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO -> EM_PRODUCAO (sinalAtivo=false)
    const resFinalizado = await avancarStatusViaApi(request, token, orcamento.id) // EM_PRODUCAO -> FINALIZADO
    expect(resFinalizado.ok()).toBe(true)
    expect((await resFinalizado.json()).status).toBe('FINALIZADO')

    // Baixa real: estoqueAtual da customização caiu exatamente pela quantidade pedida (3).
    expect(await buscarCustom()).toBe(47)

    const resCancelado = await cancelarOrcamentoViaApi(request, token, orcamento.id, { percentualMulta: 0 })
    expect(resCancelado.ok()).toBe(true)

    // Reversão real: volta ao valor original.
    expect(await buscarCustom()).toBe(50)
  })
})
