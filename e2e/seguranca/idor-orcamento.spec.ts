import { test, expect } from '@playwright/test'
import { apiLogin, criarInsumo } from '../helpers/api'
import { registrarEmpresaEfemera } from '../helpers/auth'
import { criarProdutoComFicha } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, buscarOrcamento, criarCatalogoComItens } from '../helpers/orcamento'

/**
 * Gate `seguranca-resiliencia` (V0.8.4/#399) — A01: IDOR/Autorização Quebrada.
 * Padrão Conta A (dona dos dados) x Conta B (efêmera, "atacante") em `references/teste-idor.md`.
 * Recorte: recursos que a calculadora de preço de #399 lê (produto, orçamento, item de
 * catálogo) — não é regressão do módulo Orçamento inteiro, é o gate deste pocket.
 */
test.describe('#399 (gate seguranca-resiliencia) — IDOR em Produto/Orçamento/Catálogo', () => {
  test('usuário de outra empresa não acessa produto alheio (GET /produtos/{id})', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const insumo = await criarInsumo(request, tokenA, `Insumo IDOR ${Date.now()}`)
    const produtoDeA = await criarProdutoComFicha(request, tokenA, `Produto IDOR ${Date.now()}`, [
      { insumoId: insumo.id, quantidade: 1 },
    ])

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-produto')

    const resposta = await request.get(`http://localhost:8080/produtos/${produtoDeA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(resposta.status())
  })

  test('usuário de outra empresa não acessa orçamento alheio (GET /orcamentos/{id})', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const cliente = await criarCliente(request, tokenA, `Cliente IDOR ${Date.now()}`)
    const insumo = await criarInsumo(request, tokenA, `Insumo IDOR Orc ${Date.now()}`)
    const produtoDeA = await criarProdutoComFicha(request, tokenA, `Produto IDOR Orc ${Date.now()}`, [
      { insumoId: insumo.id, quantidade: 1 },
    ])
    const orcamentoDeA = await criarOrcamentoViaApi(request, tokenA, cliente.id, [
      { produtoId: produtoDeA.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-orcamento')

    const resposta = await request.get(`http://localhost:8080/orcamentos/${orcamentoDeA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(resposta.status())

    // Confirma que o dado de A permanece íntegro e acessível só por A (não é falso-positivo de "sumiu pra todo mundo")
    const confirmacaoA = await buscarOrcamento(request, tokenA, orcamentoDeA.id)
    expect(confirmacaoA.id).toBe(orcamentoDeA.id)
  })

  test('usuário de outra empresa não lista itens de catálogo alheio (GET /catalogos/{id}/itens)', async ({
    request,
  }) => {
    const tokenA = await apiLogin(request)
    const { catalogo } = await criarCatalogoComItens(request, tokenA, `Catálogo IDOR ${Date.now()}`, [
      `Item IDOR ${Date.now()}`,
    ])

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-catalogo')

    const resposta = await request.get(`http://localhost:8080/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(resposta.status())
  })
})
