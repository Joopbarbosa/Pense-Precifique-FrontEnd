import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #444 (V0.18.0) — RN-NOVA-8 (prazo em dias corridos; entrega estimada pelo sinal pago ou pela aprovação) e
 * RN-NOVA-11 (selo "Vencido" calculado no servidor). CEN-NOVO-13, 14, 17, 19.
 */
function dataIso(offsetDias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

test.describe('#444 — Entrega estimada e Vencido', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  test('CT-444-01 (positivo) — o prazo de produção diz "dias" (não "dias úteis")', async ({ page }) => {
    await login(page)
    await page.goto('/orcamentos/novo')
    await page.getByText('Vai ter prazo de produção?').waitFor()
    await page.getByRole('button', { name: 'Sim' }).first().click()
    await expect(page.getByText('dias', { exact: true })).toBeVisible()
    await expect(page.getByText(/dias úteis/)).toHaveCount(0)
  })

  test('CT-444-02 (positivo) — sem sinal, a entrega estimada conta da aprovação; com sinal, só depois do pagamento', async ({ request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA444-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA444-Cliente-${Date.now()}`)
    const itens = [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 1 }]

    const semSinal = await criarOrcamentoViaApi(request, token, cliente.id, itens, { prazoProducaoDias: 10 })
    await avancarStatusViaApi(request, token, semSinal.id) // ENVIADO
    expect((await buscarOrcamento(request, token, semSinal.id)).dataEntregaEstimada ?? null).toBeNull()
    await avancarStatusViaApi(request, token, semSinal.id) // APROVADO
    expect((await buscarOrcamento(request, token, semSinal.id)).dataEntregaEstimada).toBe(dataIso(10))

    const comSinal = await criarOrcamentoViaApi(request, token, cliente.id, itens, {
      prazoProducaoDias: 10, sinalAtivo: true, percentualSinal: 30,
    })
    await avancarStatusViaApi(request, token, comSinal.id) // ENVIADO
    await avancarStatusViaApi(request, token, comSinal.id) // APROVADO
    await avancarStatusViaApi(request, token, comSinal.id, { metodoSinalRecebido: 'PIX' }) // AGUARDANDO_SINAL
    expect((await buscarOrcamento(request, token, comSinal.id)).dataEntregaEstimada ?? null).toBeNull()
    await avancarStatusViaApi(request, token, comSinal.id, { metodoSinalRecebido: 'PIX' }) // SINAL_PAGO
    expect((await buscarOrcamento(request, token, comSinal.id)).dataEntregaEstimada).toBe(dataIso(10))
  })

  test('CT-444-03 (positivo/negativo) — "Vencido" só em RASCUNHO ou ENVIADO com validade passada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA444V-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const nomeEnviado = `QA444V-Enviado-${Date.now()}`
    const nomeAprovado = `QA444V-Aprovado-${Date.now()}`
    const itens = [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 1 }]
    const validadePassada = `${dataIso(-3)}T12:00:00`

    const enviado = await criarOrcamentoViaApi(request, token, (await criarCliente(request, token, nomeEnviado)).id, itens, { dataValidade: validadePassada })
    await avancarStatusViaApi(request, token, enviado.id) // ENVIADO
    const aprovado = await criarOrcamentoViaApi(request, token, (await criarCliente(request, token, nomeAprovado)).id, itens, { dataValidade: validadePassada })
    await avancarStatusViaApi(request, token, aprovado.id)
    await avancarStatusViaApi(request, token, aprovado.id) // APROVADO

    const lista = await request.get(`${E2E_API_URL}/orcamentos?size=100`, { headers: { Authorization: `Bearer ${token}` } })
    const itensLista = (await lista.json()).content as Array<{ id: string; vencido: boolean }>
    expect(itensLista.find((o) => o.id === enviado.id)?.vencido).toBe(true)
    expect(itensLista.find((o) => o.id === aprovado.id)?.vencido).toBe(false)

    await login(page)
    await page.goto('/orcamentos')
    const busca = page.getByPlaceholder('Buscar por cliente ou número…')
    await busca.fill(nomeEnviado)
    await expect(page.getByText(nomeEnviado).first()).toBeVisible()
    await expect(page.getByText('Vencido').first()).toBeVisible()
    await busca.fill(nomeAprovado)
    await expect(page.getByText(nomeAprovado).first()).toBeVisible()
    await expect(page.getByText('Vencido')).toHaveCount(0)
  })
})
