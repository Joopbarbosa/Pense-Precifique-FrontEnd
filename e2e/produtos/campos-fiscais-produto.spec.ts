import { test, expect, APIRequestContext } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'

/** Produto sem ficha técnica, mas com `rendimento` explícito — `criarProdutoSemFicha` não envia
 * `rendimento`, o que deixa `CadastrarProdutoPage` com o botão de salvar desabilitado ao editar
 * (`rendimentoInvalido`, campo próprio da tela, não do backend). */
async function criarProdutoComRendimento(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, fichaTecnica: [] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produto de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}

/**
 * OpenProject #489 (V0.12.0) — campos fiscais mínimos no cadastro de produto (RN-NOVA-12/13).
 * Preparação para emissão futura de NFC-e/NF-e (fora de escopo) — todos os campos são opcionais.
 */

test.describe('#489 — Dados Fiscais no cadastro de produto', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('preenche os 6 campos fiscais na aba "Dados Fiscais" e eles persistem após reload', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nome = `QA-489-Fiscal-${Date.now()}`
    const produto = await criarProdutoComRendimento(request, token, nome)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await page.getByRole('button', { name: '3 Dados Fiscais' }).click()

    await page.getByPlaceholder('7891234567895').fill('7891234567895')
    await page.getByPlaceholder('48202000').fill('48202000')
    await page.getByPlaceholder('5102').fill('5102')
    await page.getByPlaceholder('2103200').fill('2103200')
    await page.getByPlaceholder('UN').fill('UN')
    await page.getByLabel('CSOSN').selectOption('102')

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page).toHaveURL(`/produtos/${produto.id}`)

    // Confere via API — fonte de verdade — não só o que a tela mostra antes do reload.
    const res = await request.get(`${API_URL}/produtos/${produto.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json()
    expect(body.codigoBarras).toBe('7891234567895')
    expect(body.ncm).toBe('48202000')
    expect(body.cfop).toBe('5102')
    expect(body.cest).toBe('2103200')
    expect(body.unidadeComercial).toBe('UN')
    expect(body.csosn).toBe('102')

    // Reabre a tela de edição — os 6 campos precisam recarregar com os mesmos valores.
    await page.goto(`/produtos/${produto.id}/editar`)
    await page.getByRole('button', { name: '3 Dados Fiscais' }).click()
    await expect(page.getByPlaceholder('7891234567895')).toHaveValue('7891234567895')
    await expect(page.getByPlaceholder('48202000')).toHaveValue('48202000')
    await expect(page.getByPlaceholder('5102')).toHaveValue('5102')
    await expect(page.getByPlaceholder('2103200')).toHaveValue('2103200')
    await expect(page.getByPlaceholder('UN')).toHaveValue('UN')
    await expect(page.getByLabel('CSOSN')).toHaveValue('102')
  })

  test('cadastro de produto sem nenhum campo fiscal continua funcionando normalmente', async ({ page }) => {
    await login(page)
    await page.goto('/produtos/novo')
    const nome = `QA-489-SemFiscal-${Date.now()}`
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(nome)
    await page.getByPlaceholder('45').fill('10')

    await page.getByRole('button', { name: '3 Dados Fiscais' }).click()
    await page.getByRole('button', { name: 'Salvar produto' }).click()
    await expect(page).toHaveURL('/produtos')
  })
})
