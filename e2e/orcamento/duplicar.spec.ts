import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComPreco, atualizarPrecoProduto, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, buscarOrcamento } from '../helpers/orcamento'

/**
 * CEN-NOVO-F/G (P-T003, V0.8.2, RN-NOVA-5/ORC-039) — duplicar orçamento. Formaliza
 * `e2e/scripts-avulsos/validar-duplicar-orcamento.mjs` (P-F008, 14/14 verde) como spec oficial,
 * reaproveitando os helpers de `e2e/helpers/`.
 */
test.describe('CEN-NOVO-F/G — Duplicar orçamento', () => {
  let criadosProdutoIds: string[] = []
  let criadosClienteIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosClienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosClienteIds) {
      await request.delete(`http://localhost:8080/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-F — duplicar com sinal por percentual: nasce em Rascunho, número próprio, sinal recalculado, preços refletem o valor atual do produto', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAduplicar-ProdutoF-${Date.now()}`
    const produto = await criarProdutoComPreco(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAduplicar-ClienteF-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 100, margemAplicada: 0, quantidade: 2 },
    ], { temPrazoProducao: false, prazoProducaoDias: null, sinalAtivo: true, percentualSinal: 30 })

    // Preço do produto muda DEPOIS da criação do original — prova que a duplicação recalcula pelo
    // valor vivo do cadastro, não pelo snapshot congelado do item original (ORC-001 só vale para o
    // orçamento já existente; o item duplicado é, para todos os efeitos, um item novo — RN-NOVA-5).
    const precoNovo = 150
    await atualizarPrecoProduto(request, token, produto, precoNovo)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Duplicar' }).click()
    await page.waitForURL(new RegExp(`/orcamentos/(?!${orcamento.id})[a-f0-9-]+$`), { timeout: 10_000 })

    const idDuplicado = page.url().split('/orcamentos/')[1]
    const duplicado = await buscarOrcamento(request, token, idDuplicado)

    expect(duplicado.status).toBe('RASCUNHO')
    expect(duplicado.numero).not.toBe(orcamento.numero)
    expect(duplicado.itens).toHaveLength(1)
    expect(duplicado.itens[0].precoUnitario).toBeCloseTo(precoNovo, 2)
    expect(duplicado.itens[0].quantidade).toBe(2)

    const totalNovoEsperado = precoNovo * 2
    expect(duplicado.total).toBeCloseTo(totalNovoEsperado, 2)
    expect(duplicado.valorSinal).toBeCloseTo(totalNovoEsperado * 0.3, 2)

    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('CEN-NOVO-G — duplicar com sinal por valor direto (sem percentual): funciona sem erro, valor do sinal copiado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAduplicar-ProdutoG-${Date.now()}`
    const produto = await criarProdutoComPreco(request, token, nomeProduto, 80)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAduplicar-ClienteG-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 80, margemAplicada: 0, quantidade: 1 },
    ], { temPrazoProducao: false, prazoProducaoDias: null, sinalAtivo: true, valorSinal: 12.5 })
    expect(orcamento.percentualSinal ?? null).toBeNull()

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Duplicar' }).click()
    await page.waitForURL(new RegExp(`/orcamentos/(?!${orcamento.id})[a-f0-9-]+$`), { timeout: 10_000 })

    const idDuplicado = page.url().split('/orcamentos/')[1]
    const duplicado = await buscarOrcamento(request, token, idDuplicado)

    expect(duplicado.status).toBe('RASCUNHO')
    expect(duplicado.sinalAtivo).toBe(true)
    expect(duplicado.valorSinal).toBeCloseTo(12.5, 2)

    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Quando o sinal está ativo/i)).toHaveCount(0)
  })
})
