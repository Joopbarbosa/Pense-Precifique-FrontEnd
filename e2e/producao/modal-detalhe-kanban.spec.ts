import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação V0.6.2 — Modal de detalhe rápido no Kanban (Cenário 223, OpenProject #185).
 * `ModalDetalheResumidoProducao.tsx`, aberto a partir de `ListaProducaoPage.tsx`
 * (`onClick` do card → `setDetalheResumido(p)`, item já presente em `kanbanProducoes`).
 */
test.describe('Cenário 223 — Modal de detalhe rápido no Kanban (#185)', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadasProducaoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadasProducaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, criadasProducaoIds)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('223a — clicar no card abre modal com dados corretos, sem chamada de rede adicional', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoBloqueante = `QA223-InsumoBloq-${Date.now()}`
    const insumoBloqueante = await criarInsumoComEstoque(request, token, nomeInsumoBloqueante, 0, false)
    criadosInsumoIds.push(insumoBloqueante.id)
    const nomeInsumoOk = `QA223-InsumoOk-${Date.now()}`
    const insumoOk = await criarInsumoComEstoque(request, token, nomeInsumoOk, 100, false)
    criadosInsumoIds.push(insumoOk.id)

    const nomeA = `QA223-ProdutoA-${Date.now()}`
    // rendimento 2 — RN-051 trava quantidade em produtos com insumo não-fracionável (aqui,
    // insumoBloqueante) no valor exato do rendimento; a produção abaixo pede quantidade 2 de A.
    const produtoA = await criarProdutoComFicha(request, token, nomeA, [{ insumoId: insumoBloqueante.id, quantidade: 1 }], 2)
    const nomeB = `QA223-ProdutoB-${Date.now()}`
    const produtoB = await criarProdutoComFicha(request, token, nomeB, [{ insumoId: insumoOk.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoA.id, produtoB.id)

    const producao = await criarProducaoViaApi(request, token, [
      { produtoId: produtoA.id, quantidade: 2 },
      { produtoId: produtoB.id, quantidade: 1 },
    ])
    criadasProducaoIds.push(producao.id)
    const identificador = producao.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeA)
    await page.waitForTimeout(800)

    const chamadasAoDetalhe: string[] = []
    page.on('request', req => {
      if (new RegExp(`/producoes/${producao.id}$`).test(req.url())) chamadasAoDetalhe.push(req.url())
    })

    await page.getByTestId(`kanban-card-${producao.id}`).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(identificador, { exact: true })).toBeVisible()
    await expect(dialog.getByText('Aguardando início')).toBeVisible()
    await expect(dialog.getByText(nomeA)).toBeVisible()
    await expect(dialog.getByText('×2')).toBeVisible()
    await expect(dialog.getByText(nomeB)).toBeVisible()
    await expect(dialog.getByText('×1')).toBeVisible()
    await expect(dialog.getByText('Alertas de insumos')).toBeVisible()
    await expect(dialog.getByText(new RegExp(`${nomeInsumoBloqueante}.*bloqueará ao iniciar`))).toBeVisible()

    // GET /producoes/{id} nunca é chamado — os dados vêm do item já carregado pelo Kanban (GET /producoes).
    expect(chamadasAoDetalhe).toHaveLength(0)
  })

  test('223b — modal não exibe seção de alertas quando todos os insumos são suficientes', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA223b-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA223b-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await page.getByTestId(`kanban-card-${producao.id}`).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(nomeProduto)).toBeVisible()
    await expect(dialog.getByText('Alertas de insumos')).toHaveCount(0)
  })

  test('223c — modal fecha via botão Fechar, X e Escape, sem navegar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA223c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA223c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    const card = page.getByTestId(`kanban-card-${producao.id}`)
    const dialog = page.getByRole('dialog')

    // Fechar (botão do rodapé, texto visível)
    await card.click()
    await expect(dialog).toBeVisible()
    await dialog.getByText('Fechar', { exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/producao$/)

    // X do cabeçalho — aria-label específico por produção (`Fechar detalhes de {identificador}`,
    // OpenProject #186-a11y) pra não colidir nome acessível com o "Fechar" de texto do rodapé, que
    // chama o mesmo onClose. Sem texto visível "Fechar".
    await card.click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: `Fechar detalhes de ${producao.identificador}`, exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/producao$/)

    // Escape
    await card.click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/producao$/)
  })

  test('223d — botão "Ver detalhes completos" navega para o detalhe da produção correta', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA223d-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA223d-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await page.getByTestId(`kanban-card-${producao.id}`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Ver detalhes completos' }).click()

    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}$`), { timeout: 5000 })
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
