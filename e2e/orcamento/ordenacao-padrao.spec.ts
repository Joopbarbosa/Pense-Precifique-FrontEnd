import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'

test.describe('#380 — Ordenação padrão dos orçamentos', () => {
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

  test('CEN-NOVO-68 — abre por número decrescente e respeita a ordem salva na URL', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const produto = await criarProdutoComEstoque(request, token, `QA380-Produto-${sufixo}`, 100)
    produtoIds.push(produto.id)
    const registros: Array<{ nome: string; numero: number }> = []

    for (const letra of ['A', 'B', 'C']) {
      const nome = `QA380-${sufixo}-${letra}`
      const cliente = await criarCliente(request, token, nome)
      clienteIds.push(cliente.id)
      const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
        { produtoId: produto.id, precoUnitario: 50, margemAplicada: 0, quantidade: 1 },
      ])
      registros.push({ nome, numero: orcamento.numero })
    }

    const conferir = async (dir: 'asc' | 'desc') => {
      const esperados = [...registros].sort((a, b) => dir === 'desc' ? b.numero - a.numero : a.numero - b.numero).map(item => item.nome)
      await expect.poll(async () => {
        const texto = await page.locator('body').innerText()
        const indices = esperados.map(nome => texto.indexOf(nome))
        return indices.every(i => i >= 0) && indices.every((i, p) => p === 0 || indices[p - 1] < i)
      }).toBe(true)
    }

    const aguardarListaOrdenada = (dir: 'asc' | 'desc') => page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/orcamentos') && url.searchParams.get('busca') === `QA380-${sufixo}`
        && url.searchParams.get('sort') === `numero,${dir}` && response.ok()
    })

    await login(page)
    const respostaPadrao = aguardarListaOrdenada('desc')
    await page.goto(`/orcamentos?busca=QA380-${sufixo}`)
    await (await respostaPadrao).finished()
    await conferir('desc')

    const respostaSalva = aguardarListaOrdenada('asc')
    await page.goto(`/orcamentos?busca=QA380-${sufixo}&ordem=numero&dir=asc`)
    await (await respostaSalva).finished()
    await conferir('asc')
  })
})
