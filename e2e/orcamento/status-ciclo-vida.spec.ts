import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { avancarStatusViaApi, criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

test.describe('#447 — Ordem do ciclo de vida do orçamento', () => {
  let produtoIds: string[] = []
  let clienteIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
    clienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
    for (const id of clienteIds) {
      await request.delete(`${E2E_API_URL}/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-69 — Pago vem antes de Entregue no filtro e na ordenação', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const produto = await criarProdutoComEstoque(request, token, `QA447-Produto-${sufixo}`, 1000)
    produtoIds.push(produto.id)
    const nomes = [`QA447-${sufixo}-Finalizado`, `QA447-${sufixo}-Pago`, `QA447-${sufixo}-Entregue`]
    const passos = [4, 5, 6]
    const statusEsperados = ['FINALIZADO', 'PAGO', 'ENTREGUE']

    for (let i = 0; i < nomes.length; i++) {
      const cliente = await criarCliente(request, token, nomes[i])
      clienteIds.push(cliente.id)
      const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
        { produtoId: produto.id, precoUnitario: 50, margemAplicada: 0, quantidade: 1 },
      ], { sinalAtivo: false })
      for (let passo = 0; passo < passos[i]; passo++) {
        const resposta = await avancarStatusViaApi(request, token, orcamento.id)
        expect(resposta.ok(), await resposta.text()).toBe(true)
      }
      const detalhe = await request.get(`${E2E_API_URL}/orcamentos/${orcamento.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(detalhe.ok()).toBe(true)
      expect((await detalhe.json()).status).toBe(statusEsperados[i])
    }

    await login(page)
    await page.goto('/orcamentos')
    const chips = page.getByRole('button', { name: 'Todos', exact: true }).locator('..').locator('button')
    await expect.poll(() => chips.allTextContents()).toEqual([
      'Todos', 'Rascunho', 'Enviado', 'Aprovado', 'Aguardando Sinal', 'Sinal Pago', 'Em Produção',
      'Finalizado', 'Pago', 'Entregue', 'Cancelado',
    ])

    const aguardarBusca = page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/orcamentos') && url.searchParams.get('busca') === `QA447-${sufixo}` && response.ok()
    })
    await page.goto(`/orcamentos?busca=QA447-${sufixo}`)
    await (await aguardarBusca).finished()

    const ordenacao = page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/orcamentos') && url.searchParams.get('busca') === `QA447-${sufixo}`
        && url.searchParams.get('sort') === 'cicloDeVida,asc' && response.ok()
    })
    await page.getByRole('button', { name: 'Status', exact: true }).click()
    await (await ordenacao).finished()
    await expect.poll(async () => {
      const texto = await page.locator('body').innerText()
      const indices = nomes.map(nome => texto.indexOf(nome))
      return indices.every(i => i >= 0) && indices[0] < indices[1] && indices[1] < indices[2]
    }).toBe(true)
  })
})
