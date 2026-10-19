import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail, API_URL } from './helpers/auth'
import { criarCliente } from './helpers/orcamento'

/**
 * V0.17.0 #994 (RN-NOVA-31, CEN-NOVO-97 e 98): paginação numerada nos pontos em que montar o volume real de dados seria
 * pesado — Listas de compras, histórico do Detalhe do Produto, histórico do Detalhe do Cliente e a modal de listagem das
 * lupas. A API responde 45 registros em páginas (a regra de 400 e página além da última tem teste de integração no
 * servidor); aqui se confere o que a tela faz: página X de Y, total, Próxima pede a página seguinte e Anterior volta.
 */
const proxima = (page: Page) => page.getByRole('button', { name: 'Próxima', exact: true })
const anterior = (page: Page) => page.getByRole('button', { name: 'Anterior', exact: true })

function paginaDe<T>(todos: T[], url: string) {
  const u = new URL(url)
  const pagina = Number(u.searchParams.get('page') ?? 0)
  const tamanho = Number(u.searchParams.get('size') ?? 20)
  const totalPages = Math.max(1, Math.ceil(todos.length / tamanho))
  return { content: todos.slice(pagina * tamanho, (pagina + 1) * tamanho), number: pagina, size: tamanho, totalElements: todos.length, totalPages, first: pagina === 0, last: pagina >= totalPages - 1 }
}

async function simular<T>(page: Page, caminho: RegExp, todos: T[], paginasPedidas: number[]) {
  await page.route(caminho, route => {
    if (route.request().method() !== 'GET') return route.fallback()
    const corpo = paginaDe(todos, route.request().url())
    paginasPedidas.push(corpo.number)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) })
  })
}

test.describe('#994 — Paginação numerada (API simulada com 45 registros)', () => {
  let email: string
  let token: string

  test.beforeAll(async ({ request }) => {
    const conta = await registrarEmpresaEfemera(request, 'pag-mocks')
    email = conta.email
    token = conta.token
  })

  test.beforeEach(async ({ page }) => {
    await loginComoEmail(page, email, 'senha12345')
  })

  test('Listas de compras: 20 por página, total e navegação pelas páginas', async ({ page }) => {
    const pedidas: number[] = []
    const listas = Array.from({ length: 45 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, numero: 45 - i, identificador: `LC-${45 - i}`,
      geradaEm: '2026-10-01T10:00:00', quantidadeItens: 3, status: 'GERADA', createdAt: '2026-10-01T10:00:00',
    }))
    await simular(page, /\/listas-compra\?/, listas, pedidas)
    await page.goto('/compras/lista')
    await expect(page.getByText('Página 1 de 3')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('45 listas')
    await expect(page.getByTestId('linha-historico-lista')).toHaveCount(20)
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
    await expect(anterior(page)).toBeDisabled()
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 3')).toBeVisible()
    await proxima(page).click()
    await expect(page.getByText('Página 3 de 3')).toBeVisible()
    await expect(page.getByTestId('linha-historico-lista')).toHaveCount(5)
    await expect(proxima(page)).toBeDisabled()
    await anterior(page).click()
    await expect(page.getByText('Página 2 de 3')).toBeVisible()
    expect(pedidas).toEqual(expect.arrayContaining([0, 1, 2]))
  })

  test('Histórico do Detalhe do Produto: movimentações em páginas, abaixo do histórico', async ({ page, request }) => {
    const r = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: 'Produto do histórico', tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, fichaTecnica: [] },
    })
    const produto = await r.json()
    const pedidas: number[] = []
    const movs = Array.from({ length: 45 }, (_, i) => ({
      id: `10000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, tipo: 'ENTRADA', motivo: 'AJUSTE', quantidade: 1,
      estornada: false, createdAt: `2026-10-01T10:${String(59 - i).padStart(2, '0')}:00`, tipoLinha: 'MOVIMENTACAO',
    }))
    await simular(page, new RegExp(`/produtos/${produto.id}/movimentacoes\\?`), movs, pedidas)
    await page.goto(`/produtos/${produto.id}`)
    await expect(page.getByText('Página 1 de 3')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('45 movimentações')
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
    await proxima(page).click()
    await proxima(page).click()
    await expect(page.getByText('Página 3 de 3')).toBeVisible()
    await expect(proxima(page)).toBeDisabled()
    await anterior(page).click()
    await expect(page.getByText('Página 2 de 3')).toBeVisible()
    expect(pedidas).toEqual(expect.arrayContaining([0, 1, 2]))
  })

  test('Histórico do Detalhe do Cliente e modal de listagem da lupa: páginas de 20 com o total', async ({ page, request }) => {
    const cliente = await criarCliente(request, token, 'Cliente do histórico')
    const pedidasHistorico: number[] = []
    const pedidos = Array.from({ length: 45 }, (_, i) => ({
      id: `20000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, tipo: 'ORCAMENTO', identificador: `ORC-${45 - i}`,
      data: '2026-10-01T10:00:00', dataCompra: null, status: 'RASCUNHO', valor: 10, contaComoCompra: false,
    }))
    await simular(page, new RegExp(`/clientes/${cliente.id}/historico/pedidos\\?`), pedidos, pedidasHistorico)
    const pedidasModal: number[] = []
    const registros = Array.from({ length: 45 }, (_, i) => ({
      id: `30000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, tipo: 'ORCAMENTO', identificador: `ORC-${45 - i}`,
      data: '2026-10-01T10:00:00', status: 'RASCUNHO', valor: 10, quantidadeItens: 1, resumoItens: '1 × Item', contaComoCompra: false, pago: null,
    }))
    await simular(page, new RegExp(`/clientes/${cliente.id}/registros\\?`), registros, pedidasModal)

    await page.goto(`/clientes/${cliente.id}`)

    // modal de listagem de uma lupa: 20 registros, "Página 1 de 3" e o total (CEN-NOVO-98)
    await page.getByRole('button', { name: 'Ver registros de Pedidos' }).click()
    const modal = page.getByTestId('modal-listagem')
    await expect(modal).toBeVisible()
    await expect(modal.getByTestId('linha-listagem')).toHaveCount(20)
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByText('Página 1 de 3')).toBeVisible()
    await expect(dialogo.getByTestId('contagem-registros')).toHaveText('45 registros')
    await dialogo.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(dialogo.getByText('Página 2 de 3')).toBeVisible()
    await dialogo.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(modal.getByTestId('linha-listagem')).toHaveCount(5)
    await expect(dialogo.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
    expect(pedidasModal).toEqual(expect.arrayContaining([0, 1, 2]))
    await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()

    // histórico da aba Histórico
    await page.getByRole('tab', { name: 'Histórico' }).click()
    await expect(page.getByText('Página 1 de 3')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('45 registros')
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 3')).toBeVisible()
    expect(pedidasHistorico).toEqual(expect.arrayContaining([0, 1]))
  })
})
