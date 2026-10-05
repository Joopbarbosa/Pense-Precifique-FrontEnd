import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'

/**
 * CEN-NOVO-21 (P-T002, V0.8.1) — ordenação de colunas na Lista de Orçamentos (OpenProject #255).
 * Gap confirmado no Passo 0: feature já implementada (backend + frontend, `Resumo de Estado` do
 * `BACKLOG_V0.8.1.md` marca #255 ✅/✅), mas sem cenário BDD nem cobertura E2E até esta sessão.
 * `numero`/`total`/`createdAt` ordenam via `?sort=` do backend; `cliente` via campo aninhado
 * `cliente.nome`; `status` ordena client-side (ciclo de vida do pedido, não alfabético) — não
 * coberto aqui, fora do escopo confirmado no Passo 0.
 */
test.describe('CEN-NOVO-21 — Ordenação de colunas na Lista de Orçamentos (#255)', () => {
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
      await request.delete(`${E2E_API_URL}/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-21 — clicar "Total" ordena asc/desc; clicar "Cliente" ordena alfabético', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const nomeProduto = `QACEN21-Produto-${sufixo}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    // Nomes fora de ordem alfabética de propósito (C, A, B) para provar que o clique reordena de
    // verdade, não é coincidência da ordem de criação.
    const nomes = [`ZZOrdenacao-C-${sufixo}`, `ZZOrdenacao-A-${sufixo}`, `ZZOrdenacao-B-${sufixo}`]
    const precos = [300, 100, 200]
    for (let i = 0; i < nomes.length; i++) {
      const cliente = await criarCliente(request, token, nomes[i])
      criadosClienteIds.push(cliente.id)
      await criarOrcamentoViaApi(request, token, cliente.id, [
        { produtoId: produto.id, precoUnitario: precos[i], margemAplicada: 0, quantidade: 1 },
      ])
    }

    await login(page)
    await page.goto('/orcamentos')
    const esperaBusca = page.waitForResponse(r => {
      const u = new URL(r.url())
      return u.pathname.endsWith('/orcamentos') && u.searchParams.get('busca') === 'ZZOrdenacao' && r.ok()
    })
    await page.getByPlaceholder('Buscar por cliente ou número…').fill('ZZOrdenacao')
    await (await esperaBusca).finished()

    const ordemPorPreco = (asc: boolean) => {
      const idx = [0, 1, 2].sort((a, b) => (asc ? precos[a] - precos[b] : precos[b] - precos[a]))
      return idx.map((i) => nomes[i])
    }
    const conferirOrdem = async (ordem: string[]) => {
      // Aguarda todos os registros e a ordem aplicada, não um tempo arbitrário (#691).
      await expect.poll(async () => {
        const texto = await page.locator('body').innerText()
        const indices = ordem.map(n => texto.indexOf(n))
        return indices.every(i => i >= 0) && indices.every((i, p) => p === 0 || indices[p - 1] < i)
      }, { message: `Ordem esperada: ${ordem.join(', ')}` }).toBe(true)
    }

    for (const nome of nomes) await expect(page.getByText(nome, { exact: true }).filter({ visible: true })).toBeVisible()
    const ordenar = async (label: string, sort: string, ordem: string[]) => {
      const espera = page.waitForResponse(r => {
        const u = new URL(r.url())
        return u.pathname.endsWith('/orcamentos') && u.searchParams.get('busca') === 'ZZOrdenacao'
          && u.searchParams.get('sort') === sort && r.ok()
      })
      await page.getByRole('button', { name: label, exact: true }).click()
      await (await espera).finished()
      await conferirOrdem(ordem)
    }
    await ordenar('Total', 'total,asc', ordemPorPreco(true))
    await ordenar('Total', 'total,desc', ordemPorPreco(false))
    await ordenar('Cliente', 'cliente.nome,asc', [...nomes].sort())
  })
})
