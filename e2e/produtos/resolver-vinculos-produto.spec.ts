import { test, expect, APIRequestContext, Locator, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, criarProdutoSemFicha } from '../helpers/producao'
import { API_URL } from '../helpers/auth'

/**
 * O `ActionMenu` compartilhado (`components/shared/ActionMenu.tsx`) fecha o menu em qualquer
 * evento de scroll na janela (`window.addEventListener('scroll', ..., true)`, captura). Isso inclui
 * o auto-scroll que o próprio Playwright dispara ao garantir que o botão esteja visível antes do
 * clique — corrida ocasional (não causada por este teste) em que o menu abre e fecha antes do clique
 * no item alcançar o alvo. Retry cobre a flakiness sem tocar em código de produção fora do escopo
 * desta tarefa (#237 é sobre o modal de vínculos, não sobre o ActionMenu).
 */
async function abrirAcaoNoCard(page: Page, card: Locator, itemLabel: string) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    await card.getByRole('button', { name: 'Mais ações' }).click()
    try {
      await page.getByText(itemLabel, { exact: true }).click({ timeout: 2000 })
      return
    } catch {
      // menu pode ter se fechado sozinho por um scroll espúrio — tenta de novo
    }
  }
  throw new Error(`Não foi possível clicar em "${itemLabel}" após múltiplas tentativas`)
}

async function criarInsumoSimples(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      unidadeMedida: 'unidade',
      fracionavel: false,
      estoqueMinimo: 1,
      precoTotalCompraInicial: 10,
      quantidadeCompradaInicial: 10,
      permitirEstoqueNegativo: true,
    },
  })
  if (!res.ok()) throw new Error(`Falha ao criar insumo: ${res.status()} ${await res.text()}`)
  return res.json()
}

async function criarProdutoComComponente(
  request: APIRequestContext, token: string, nome: string, produtoBaseId: string, rendimento = 1
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo: 'PRODUTO', tempoProducao: 10, rendimento, fichaTecnica: [{ produtoBaseId, quantidade: 1 }] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produto com componente: ${res.status()} ${await res.text()}`)
  return res.json()
}

async function criarCatalogo(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/catalogos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome },
  })
  if (!res.ok()) throw new Error(`Falha ao criar catálogo: ${res.status()} ${await res.text()}`)
  return res.json()
}

async function adicionarItemCatalogo(request: APIRequestContext, token: string, catalogoId: string, produtoId: string) {
  const res = await request.post(`${API_URL}/catalogos/${catalogoId}/itens`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { produtoId, quantidadePacote: 1, customizacoesAnexadas: [] },
  })
  if (!res.ok()) throw new Error(`Falha ao adicionar item de catálogo: ${res.status()} ${await res.text()}`)
  return res.json()
}

/**
 * OpenProject #237 (retomada final) — Fluxo Remover/Substituir vínculos de Produto ao
 * inativar/excluir, com até 2 blocos independentes (catálogo/componente), POST
 * /produtos/{id}/resolver-vinculos.
 */
test.describe('OpenProject #237 — Resolver vínculos ao inativar/excluir produto', () => {
  test('produto vinculado só a catálogo — modal com 1 seção, rótulos "Remover"/"Substituir"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const insumoNome = `E2E237P InsA ${ts}`
    const insumo = await criarInsumoSimples(request, token, insumoNome)
    const produtoNome = `E2E237P ProdCatalogo ${ts}`
    const produto = await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumo.id, quantidade: 1 }])
    const catalogo = await criarCatalogo(request, token, `E2E237P Catalogo ${ts}`)
    await adicionarItemCatalogo(request, token, catalogo.id, produto.id)

    await login(page)
    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(produtoNome)
    await expect(page.getByText(produtoNome, { exact: true })).toBeVisible()
    await page.waitForTimeout(500)

    const card = page.locator('.group').filter({ hasText: produtoNome })
    await abrirAcaoNoCard(page, card, 'Desativar')
    await page.getByRole('button', { name: 'Desativar produto' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Não foi possível inativar')).toBeVisible()
    await expect(dialog.getByText('Vínculo de catálogo')).toBeVisible()
    await expect(dialog.getByText('Remover produto dos catálogos vinculados')).toBeVisible()
    await expect(dialog.getByText('Substituir produto no catálogo')).toBeVisible()
    await expect(dialog.getByText('Vínculo de componente')).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Produto inativado.')).toBeVisible()
  })

  test('produto vinculado só a componente — modal com 1 seção, rótulo nunca "Inativar"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const insumoNome = `E2E237P InsB ${ts}`
    const insumo = await criarInsumoSimples(request, token, insumoNome)
    const produtoNome = `E2E237P ProdComponente ${ts}`
    const produto = await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumo.id, quantidade: 1 }])
    const produtoPaiNome = `E2E237P ProdPai ${ts}`
    await criarProdutoComComponente(request, token, produtoPaiNome, produto.id)

    await login(page)
    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(produtoNome)
    await expect(page.getByText(produtoNome, { exact: true })).toBeVisible()
    await page.waitForTimeout(500)

    const card = page.locator('.group').filter({ hasText: produtoNome })
    await abrirAcaoNoCard(page, card, 'Desativar')
    await page.getByRole('button', { name: 'Desativar produto' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Não foi possível inativar')).toBeVisible()
    await expect(dialog.getByText('Vínculo de componente')).toBeVisible()
    await expect(dialog.getByText('Remover produto da ficha técnica de quem o usa como componente')).toBeVisible()
    await expect(dialog.getByText('Substituir componente')).toBeVisible()
    await expect(dialog.getByText('Vínculo de catálogo')).toHaveCount(0)
    await expect(dialog.getByText('Inativar', { exact: true })).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Produto inativado.')).toBeVisible()
  })

  test('produto vinculado a catálogo E componente — 2 seções, ações independentes na mesma operação', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const insumoNome = `E2E237P InsC ${ts}`
    const insumo = await criarInsumoSimples(request, token, insumoNome)
    const produtoNome = `E2E237P ProdDuplo ${ts}`
    const produto = await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumo.id, quantidade: 1 }])

    const produtoPaiNome = `E2E237P ProdPaiDuplo ${ts}`
    await criarProdutoComComponente(request, token, produtoPaiNome, produto.id)

    const catalogo = await criarCatalogo(request, token, `E2E237P CatalogoDuplo ${ts}`)
    await adicionarItemCatalogo(request, token, catalogo.id, produto.id)

    const substitutoNome = `E2E237P ProdSubstituto ${ts}`
    const substituto = await criarProdutoSemFicha(request, token, substitutoNome)

    await login(page)
    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(produtoNome)
    await expect(page.getByText(produtoNome, { exact: true })).toBeVisible()
    await page.waitForTimeout(500)

    const card = page.locator('.group').filter({ hasText: produtoNome })
    await abrirAcaoNoCard(page, card, 'Desativar')
    await page.getByRole('button', { name: 'Desativar produto' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Não foi possível inativar')).toBeVisible()
    await expect(dialog.getByText('Vínculo de catálogo')).toBeVisible()
    await expect(dialog.getByText('Vínculo de componente')).toBeVisible()

    // Catálogo: mantém ação padrão (Remover). Componente: troca para Substituir.
    await dialog.getByRole('button', { name: 'Substituir componente' }).click()
    await dialog.getByPlaceholder('Buscar produto substituto…').fill(substitutoNome)
    await dialog.getByText(substitutoNome, { exact: true }).click()

    const confirmar = dialog.getByRole('button', { name: 'Confirmar' })
    await expect(confirmar).toBeEnabled()
    await confirmar.click()
    await expect(page.getByText('Produto inativado.')).toBeVisible()

    const produtoPaiRes = await request.get(`${API_URL}/produtos?busca=${encodeURIComponent(produtoPaiNome)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const produtoPaiBody = await produtoPaiRes.json()
    const produtoPaiId = produtoPaiBody.content[0].id
    const produtoPaiDetalhe = await (await request.get(`${API_URL}/produtos/${produtoPaiId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoPaiDetalhe.fichaTecnica.map((f: { produtoBaseId: string }) => f.produtoBaseId)).toContain(substituto.id)
    expect(produtoPaiDetalhe.fichaTecnica.map((f: { produtoBaseId: string }) => f.produtoBaseId)).not.toContain(produto.id)

    const itensCatalogoRes = await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const itensCatalogo = await itensCatalogoRes.json()
    expect(itensCatalogo).toHaveLength(0)
  })

  test('botão Excluir também aciona o modal de vínculos', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const insumoNome = `E2E237P InsD ${ts}`
    const insumo = await criarInsumoSimples(request, token, insumoNome)
    const produtoNome = `E2E237P ProdExcluir ${ts}`
    const produto = await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumo.id, quantidade: 1 }])
    const catalogo = await criarCatalogo(request, token, `E2E237P CatalogoExcluir ${ts}`)
    await adicionarItemCatalogo(request, token, catalogo.id, produto.id)

    await login(page)
    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(produtoNome)
    await expect(page.getByText(produtoNome, { exact: true })).toBeVisible()
    await page.waitForTimeout(500)

    const card = page.locator('.group').filter({ hasText: produtoNome })
    await abrirAcaoNoCard(page, card, 'Excluir')
    await page.getByRole('button', { name: 'Excluir produto' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Não foi possível excluir')).toBeVisible()
    await expect(dialog.getByText('Vínculo de catálogo')).toBeVisible()

    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Produto excluído.')).toBeVisible()
  })

  test('CEN-NOVO-16 — produto sem nenhum vínculo inativa direto, sem modal de bloqueio', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const insumoNome = `E2E237P InsSemVinculo ${ts}`
    const insumo = await criarInsumoSimples(request, token, insumoNome)
    const produtoNome = `E2E237P ProdSemVinculo ${ts}`
    await criarProdutoComFicha(request, token, produtoNome, [{ insumoId: insumo.id, quantidade: 1 }])

    await login(page)
    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(produtoNome)
    await expect(page.getByText(produtoNome, { exact: true })).toBeVisible()
    await page.waitForTimeout(500)

    const card = page.locator('.group').filter({ hasText: produtoNome })
    await abrirAcaoNoCard(page, card, 'Desativar')
    await page.getByRole('button', { name: 'Desativar produto' }).click()

    await expect(page.getByText('Produto inativado.')).toBeVisible()
    await expect(page.getByText('Não foi possível inativar')).toHaveCount(0)
  })
})
