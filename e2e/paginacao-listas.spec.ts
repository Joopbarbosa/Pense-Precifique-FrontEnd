import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail, API_URL } from './helpers/auth'
import { criarInsumo } from './helpers/api'
import { registrarCompraConfirmada } from './helpers/compra'
import { avancarStatusViaApi, criarCliente, criarOrcamentoViaApi } from './helpers/orcamento'

/**
 * V0.17.0 #994 (RN-NOVA-31, CEN-NOVO-97 e 98): paginação numerada nos pontos com dados reais — Produtos, Clientes e
 * fornecedores, Orçamentos (com a ordem por Status valendo em todas as páginas), Compras, histórico do Detalhe do Insumo
 * e a modal de adicionar insumos à lista de compras. Conta efêmera, para não depender dos dados de outros specs.
 */
const proxima = (page: Page) => page.getByRole('button', { name: 'Próxima', exact: true })
const anterior = (page: Page) => page.getByRole('button', { name: 'Anterior', exact: true })
const total = (page: Page) => page.getByTestId('total-registros')

test.describe.configure({ mode: 'serial' })

test.describe('#994 — Paginação numerada nas demais listas', () => {
  let token: string
  let email: string
  let insumoId: string

  test.beforeAll(async ({ request }) => {
    test.setTimeout(240_000)
    const conta = await registrarEmpresaEfemera(request, 'pag-listas')
    token = conta.token
    email = conta.email
    const headers = { Authorization: `Bearer ${token}` }

    // 25 clientes e 25 produtos
    const clientes: { id: string }[] = []
    for (let n = 1; n <= 25; n++) clientes.push(await criarCliente(request, token, `Cliente ${String(n).padStart(2, '0')}`))
    const produtos: { id: string }[] = []
    for (let n = 1; n <= 25; n++) {
      const r = await request.post(`${API_URL}/produtos`, { headers, data: { nome: `Produto ${String(n).padStart(2, '0')}`, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, precoVenda: 10, fichaTecnica: [] } })
      if (!r.ok()) throw new Error(`Produto de teste: ${r.status()} ${await r.text()}`)
      produtos.push(await r.json())
    }
    // 25 orçamentos (3 deles enviados) do primeiro cliente
    const orcamentos: { id: string }[] = []
    for (let n = 1; n <= 25; n++) {
      orcamentos.push(await criarOrcamentoViaApi(request, token, clientes[0].id, [{ produtoId: produtos[0].id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }]))
    }
    for (const o of orcamentos.slice(0, 3)) {
      const r = await avancarStatusViaApi(request, token, o.id)
      if (!r.ok()) throw new Error(`Avançar orçamento: ${r.status()} ${await r.text()}`)
    }
    // 12 insumos e 25 compras do primeiro (25 entradas no histórico dele)
    const insumos: { id: string }[] = []
    for (let n = 1; n <= 12; n++) insumos.push(await criarInsumo(request, token, `Insumo ${String(n).padStart(2, '0')}`))
    insumoId = insumos[0].id
    // todos acima do mínimo (1): nenhum já entra sugerido na lista de compras, e a marcação à mão fica livre
    await registrarCompraConfirmada(request, token, insumos.map(i => ({ insumoId: i.id, quantidade: 5, precoTotal: 5 })))
    for (let n = 1; n <= 25; n++) await registrarCompraConfirmada(request, token, [{ insumoId, quantidade: 1, precoTotal: 5 }])
  })

  test.beforeEach(async ({ page }) => {
    await loginComoEmail(page, email, 'senha12345')
  })

  test('Produtos: 25 em páginas de 20, sem "Carregar mais"', async ({ page }) => {
    await page.goto('/produtos')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(total(page)).toHaveText('25 produtos')
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(proxima(page)).toBeDisabled()
    await anterior(page).click()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
  })

  test('Clientes e fornecedores: 25 em páginas de 20; a busca volta à página 1', async ({ page }) => {
    await page.goto('/clientes')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(total(page)).toHaveText('25 cadastros')
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await page.getByPlaceholder(/Buscar/).fill('Cliente 2')
    await expect(page.getByText('Página 1 de 1')).toBeVisible()
    await expect(total(page)).toHaveText('6 cadastros')
  })

  test('Orçamentos: 25 em páginas de 20 e a ordem por Status vale para todas as páginas', async ({ page }) => {
    await page.goto('/orcamentos')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(total(page)).toHaveText('25 orçamentos')
    // Status decrescente: os 3 enviados vêm antes dos rascunhos, na primeira página (a ordem é do servidor, não da página carregada)
    await page.getByRole('button', { name: 'Status', exact: true }).click()
    await page.getByRole('button', { name: 'Status', exact: true }).click()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByText('Enviado', { exact: true }).locator('visible=true')).toHaveCount(3 + 1) // 3 linhas + o filtro "Enviado"
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(page.getByText('Enviado', { exact: true }).locator('visible=true')).toHaveCount(1) // só o filtro: nenhum enviado na página 2
  })

  test('Compras: 26 em páginas de 20, com o total do filtro', async ({ page }) => {
    await page.goto('/compras')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(total(page)).toHaveText('26 compras')
    await expect(page.getByTestId('linha-compra')).toHaveCount(20)
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(page.getByTestId('linha-compra')).toHaveCount(6)
  })

  test('Histórico do Detalhe do Insumo: movimentações em páginas, abaixo do histórico', async ({ page }) => {
    await page.goto(`/insumos/${insumoId}`)
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(proxima(page)).toBeDisabled()
  })

  test('Adicionar insumos à lista de compras: 10 por página e a marcação atravessa as páginas (CEN-NOVO-98)', async ({ page }) => {
    await page.goto('/compras/lista?aba=nova')
    await page.getByRole('button', { name: 'Adicionar insumos', exact: true }).click()
    const modal = page.getByTestId('modal-adicionar-insumos')
    await expect(modal).toBeVisible()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByTestId('opcao-insumo')).toHaveCount(10)
    await page.getByLabel('Selecionar Insumo 01').check()
    await proxima(page).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(page.getByTestId('opcao-insumo')).toHaveCount(2)
    await page.getByLabel('Selecionar Insumo 12').check()
    await expect(page.getByRole('button', { name: 'Adicionar 2 insumos' })).toBeEnabled()
  })
})
