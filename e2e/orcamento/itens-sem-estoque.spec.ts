import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-5 (#194): backend implementa o endpoint somente leitura
 * `GET /orcamentos/{id}/itens-sem-estoque` (CONTRATO_API.md), que deveria alimentar a condição de
 * exibir o botão "Criar produção" no Detalhe do Orçamento quando algum item tem estoque
 * insuficiente.
 *
 * Achado de homologação: essa feature NÃO existe no frontend — `DetalheOrcamentoPage.tsx` nunca
 * chama esse endpoint (confirmado por grep sem ocorrências de `itens-sem-estoque`/`itensSemEstoque`
 * em todo `src/`), não lê `avisosEstoque` para decidir UI, e o único botão "Criar produção" do
 * sistema é o CTA genérico da listagem vazia de Produção (`ListaProducaoPage.tsx`), sem relação
 * com item de orçamento sem estoque. Cobertura de UI é impossível hoje — os testes abaixo validam
 * o contrato via API diretamente (sem `page`), e o último confirma explicitamente a ausência do
 * botão na tela. Reportado no relatório final como gap de Frontend a ser aberto no OpenProject.
 */

test.describe('RN-NOVA-5 (#194) — GET /orcamentos/{id}/itens-sem-estoque', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('lista só os itens com estoque insuficiente, com os números corretos (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeSemEstoque = `QA-RNNOVA5-SemEstoque-${Date.now()}`
    const produtoSemEstoque = await criarProdutoComEstoque(request, token, nomeSemEstoque, 3)
    const nomeComEstoque = `QA-RNNOVA5-ComEstoque-${Date.now()}`
    const produtoComEstoque = await criarProdutoComEstoque(request, token, nomeComEstoque, 100)
    criadosProdutoIds.push(produtoSemEstoque.id, produtoComEstoque.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5-Cliente-${Date.now()}`)

    const resCriar = await request.post(`${API_URL}/orcamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clienteId: cliente.id,
        itens: [
          { produtoId: produtoSemEstoque.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
          { produtoId: produtoComEstoque.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 },
        ],
        metodoPagamento: 'PIX',
        prazoProducaoDias: 5,
        sinalAtivo: false,
      },
    })
    if (!resCriar.ok()) throw new Error(`Falha ao criar orçamento de teste: ${resCriar.status()} ${await resCriar.text()}`)
    const orcamento = await resCriar.json()

    const res = await request.get(`${API_URL}/orcamentos/${orcamento.id}/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      produtoId: produtoSemEstoque.id,
      nomeProduto: nomeSemEstoque,
      quantidadeSolicitada: 10,
      estoqueAtual: 3,
      quantidadeFaltante: 7,
    })
  })

  test('orçamento com todos os itens com estoque suficiente retorna array vazio (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA5b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5b-Cliente-${Date.now()}`)

    const resCriar = await request.post(`${API_URL}/orcamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clienteId: cliente.id,
        itens: [{ produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 5 }],
        metodoPagamento: 'PIX',
        prazoProducaoDias: 5,
        sinalAtivo: false,
      },
    })
    const orcamento = await resCriar.json()

    const res = await request.get(`${API_URL}/orcamentos/${orcamento.id}/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    expect(await res.json()).toEqual([])
  })

  test('orçamento inexistente retorna 404 (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const res = await request.get(`${API_URL}/orcamentos/00000000-0000-0000-0000-000000000000/itens-sem-estoque`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(404)
  })

  test('achado: nenhum botão "Criar produção" ligado a item sem estoque existe no Detalhe do Orçamento', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA-RNNOVA5c-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-RNNOVA5c-Cliente-${Date.now()}`)

    const resCriar = await request.post(`${API_URL}/orcamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clienteId: cliente.id,
        itens: [{ produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 }],
        metodoPagamento: 'PIX',
        prazoProducaoDias: 5,
        sinalAtivo: false,
      },
    })
    const orcamento = await resCriar.json()

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('button', { name: 'Criar produção', exact: true })).toHaveCount(0)
  })
})
