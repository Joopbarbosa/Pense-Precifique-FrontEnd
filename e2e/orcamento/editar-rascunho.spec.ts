import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComPreco, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, editarOrcamentoViaApi, buscarOrcamento } from '../helpers/orcamento'

/**
 * CEN-NOVO-C/D/E (P-T003, V0.8.2, RN-NOVA-4/ORC-038) — edição de orçamento em RASCUNHO. Formaliza
 * `e2e/scripts-avulsos/validar-editar-orcamento-rascunho.mjs` (P-F007, 25/25 verde) como spec
 * oficial, reaproveitando os helpers de `e2e/helpers/`.
 */
test.describe('CEN-NOVO-C/D/E — Editar orçamento em RASCUNHO', () => {
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

  test('CEN-NOVO-C — editar campos simples de um Rascunho: observações persiste, botão Editar continua disponível', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAeditar-ProdutoC-${Date.now()}`
    const produto = await criarProdutoComPreco(request, token, nomeProduto, 50)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAeditar-ClienteC-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 },
    ], { temPrazoProducao: false, prazoProducaoDias: null })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()

    await page.getByRole('button', { name: 'Editar' }).click()
    await page.waitForURL(new RegExp(`/orcamentos/${orcamento.id}/editar`), { timeout: 10_000 })
    await page.getByRole('heading', { name: 'Editar Orçamento' }).waitFor({ timeout: 10_000 })

    const novaObservacao = `Observação de teste ${Date.now()}`
    await page.getByPlaceholder('Ex: Entrega combinada para 15/06').last().fill(novaObservacao)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await page.waitForURL(new RegExp(`/orcamentos/${orcamento.id}$`), { timeout: 10_000 })

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.observacoes).toBe(novaObservacao)
    expect(orcamentoDepois.status).toBe('RASCUNHO')

    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
  })

  test('CEN-NOVO-D — trocar produto de um item: item antigo removido, item novo com preço atual, total recalculado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProdutoX = `QAeditar-ProdutoX-${Date.now()}`
    const nomeProdutoY = `QAeditar-ProdutoY-${Date.now()}`
    const produtoX = await criarProdutoComPreco(request, token, nomeProdutoX, 40)
    const produtoY = await criarProdutoComPreco(request, token, nomeProdutoY, 70)
    criadosProdutoIds.push(produtoX.id, produtoY.id)

    const nomeCliente = `QAeditar-ClienteD-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produtoX.id, precoUnitario: produtoX.precoVenda, margemAplicada: 0, quantidade: 2 },
    ], { temPrazoProducao: false, prazoProducaoDias: null })

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}/editar`)
    await page.getByRole('heading', { name: 'Editar Orçamento' }).waitFor({ timeout: 10_000 })

    // Escopo por linha (ItemRow renderiza cada item num container `div.animate-fade-up` próprio).
    const linhaX = page.locator('div.animate-fade-up', { hasText: produtoX.nome })
    await linhaX.locator('button:has(svg.lucide-trash2)').click()
    await expect(page.getByText(produtoX.nome, { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(produtoY.nome)
    await page.getByText(produtoY.nome, { exact: true }).click()
    await expect(page.getByText(produtoY.nome, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await page.waitForURL(new RegExp(`/orcamentos/${orcamento.id}$`), { timeout: 10_000 })

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.itens.some((i: { produtoId: string }) => i.produtoId === produtoX.id)).toBe(false)
    const itemY = orcamentoDepois.itens.find((i: { produtoId: string }) => i.produtoId === produtoY.id)
    expect(itemY).toBeTruthy()
    expect(itemY.precoUnitario).toBeCloseTo(produtoY.precoVenda, 2)
    expect(orcamentoDepois.total).toBeCloseTo(produtoY.precoVenda * itemY.quantidade, 2)

    await page.waitForLoadState('networkidle')
    await expect(page.getByText(produtoY.nome, { exact: true })).toBeVisible()
    await expect(page.getByText(produtoX.nome, { exact: true })).toHaveCount(0)
  })

  test('CEN-NOVO-E — editar bloqueado fora de Rascunho: botão some no Detalhe, endpoint direto retorna 400 com mensagem clara', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QAeditar-ProdutoE-${Date.now()}`
    const produto = await criarProdutoComPreco(request, token, nomeProduto, 50)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QAeditar-ClienteE-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    criadosClienteIds.push(cliente.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 },
    ], { temPrazoProducao: false, prazoProducaoDias: null })
    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)

    const resDireto = await editarOrcamentoViaApi(request, token, orcamento.id, {
      clienteId: cliente.id,
      metodoPagamento: 'PIX',
      temPrazoProducao: false,
      sinalAtivo: false,
      itens: [{ produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 }],
    })
    expect(resDireto.status()).toBe(400)
    const corpoErro = await resDireto.json()
    expect(corpoErro.message).toBe('Só é possível editar um orçamento em Rascunho.')
  })
})
