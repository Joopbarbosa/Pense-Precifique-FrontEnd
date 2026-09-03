import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarCliente,
  selecionarCliente,
  criarCatalogoComItens,
  criarCustomizacoes,
  desativarCatalogo,
  adicionarItemAvulso,
} from '../helpers/orcamento'
import { inativarProduto } from '../helpers/producao'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #217 — RN-NOVA-6 (busca de item de catálogo server-side) e RN-NOVA-7 (listagem
 * completa com rolagem, até 8 itens visíveis por vez) em `ItemSearch`/`ModalCustomizacoes`
 * (`CriarOrcamentoPage.tsx`). Backend ganhou `busca` em `GET /orcamentos/itens-catalogo`
 * (achado da Análise — o endpoint não tinha esse parâmetro, ver `ItemCatalogoRepository`).
 */
test.describe('#217 — RN-NOVA-6/RN-NOVA-7 — busca e listagem em Novo Orçamento', () => {
  let catalogoIds: string[] = []
  let produtoIds: string[] = []

  test.beforeEach(() => {
    catalogoIds = []
    produtoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of catalogoIds) await desativarCatalogo(request, token, id)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  test('RN-NOVA-6/CEN-NOVO-8 — busca de item de catálogo envia ?busca= ao backend e mostra só o retorno da API', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const { catalogo, produtoIds: ids } = await criarCatalogoComItens(request, token, `QA-217a-Catalogo-${ts}`, [
      `QA-217a-Alpha-${ts}`,
      `QA-217a-Beta-${ts}`,
      `QA-217a-Gama-${ts}`,
    ])
    catalogoIds.push(catalogo.id)
    produtoIds.push(...ids)
    const cliente = await criarCliente(request, token, `QA-217a-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Catálogo' }).click()

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await expect(page.getByText(`QA-217a-Alpha-${ts}`)).toBeVisible()
    await expect(page.getByText(`QA-217a-Beta-${ts}`)).toBeVisible()

    const buscaRequest = page.waitForRequest(req =>
      req.url().includes('/orcamentos/itens-catalogo') && req.url().includes(`busca=QA-217a-Alpha-${ts}`)
    )
    await page.getByPlaceholder('Buscar item de catálogo...').fill(`QA-217a-Alpha-${ts}`)
    await buscaRequest

    await expect(page.getByText(`QA-217a-Alpha-${ts}`)).toBeVisible()
    await expect(page.getByText(`QA-217a-Beta-${ts}`)).toHaveCount(0)
    await expect(page.getByText(`QA-217a-Gama-${ts}`)).toHaveCount(0)
  })

  test('RN-NOVA-6/CEN-NOVO-8 — termo sem correspondência retorna lista vazia (server-side, não filtro local)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const { catalogo, produtoIds: ids } = await criarCatalogoComItens(request, token, `QA-217b-Catalogo-${ts}`, [
      `QA-217b-Item-${ts}`,
    ])
    catalogoIds.push(catalogo.id)
    produtoIds.push(...ids)
    const cliente = await criarCliente(request, token, `QA-217b-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Catálogo' }).click()
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()

    const buscaRequest = page.waitForRequest(req =>
      req.url().includes('/orcamentos/itens-catalogo') && req.url().includes('busca=zzz-nao-existe')
    )
    await page.getByPlaceholder('Buscar item de catálogo...').fill('zzz-nao-existe')
    await buscaRequest

    await expect(page.getByText('Nenhum item de catálogo encontrado. Cadastre um item de catálogo primeiro.')).toBeVisible()
  })

  test('RN-NOVA-18/CEN-NOVO-19 — paginação real: 8 itens na primeira página, "Carregar mais" busca o resto, botão some sem mais páginas', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const nomes = Array.from({ length: 10 }, (_, i) => `QA-217c-Item-${ts}-${String(i + 1).padStart(2, '0')}`)
    const { catalogo, produtoIds: ids } = await criarCatalogoComItens(request, token, `QA-217c-Catalogo-${ts}`, nomes)
    catalogoIds.push(catalogo.id)
    produtoIds.push(...ids)
    const cliente = await criarCliente(request, token, `QA-217c-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Catálogo' }).click()
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()

    const dropdown = page.locator('div.animate-pop')
    await dropdown.waitFor({ state: 'visible' })
    const buttons = dropdown.getByRole('button').filter({ hasText: `QA-217c-Item-${ts}` })

    // Primeira página real (RN-NOVA-18/#353 completo): só 8 dos 10 itens chegam ao DOM — os 2
    // últimos não existem ainda (paginação de verdade, não mais "10 no DOM cortados por CSS").
    await expect(buttons).toHaveCount(8)
    await expect(page.getByText(`QA-217c-Item-${ts}-09`)).toHaveCount(0)
    await expect(page.getByText(`QA-217c-Item-${ts}-10`)).toHaveCount(0)

    const carregarMais = page.getByRole('button', { name: 'Carregar mais', exact: true })
    await expect(carregarMais).toBeVisible()

    const segundaPagina = page.waitForResponse(res =>
      res.url().includes('/orcamentos/itens-catalogo') && res.url().includes('page=1')
    )
    await carregarMais.click()
    await segundaPagina

    // Segunda página: os 2 itens restantes aparecem, os 8 primeiros continuam (append, não replace).
    await expect(buttons).toHaveCount(10)
    for (const nome of nomes) {
      await expect(page.getByText(nome)).toBeAttached()
    }

    // hasMore=false (10/10 carregados, last=true) — botão desaparece.
    await expect(carregarMais).toHaveCount(0)
  })

  test('RN-NOVA-7/CEN-NOVO-10 — listagem completa + no máximo 8 customizações visíveis, resto via rolagem', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const nomeProdutoAvulso = `QA-217e-ProdutoAvulso-${ts}`
    const nomesCustom = Array.from({ length: 10 }, (_, i) => `QA-217e-Custom-${ts}-${String(i + 1).padStart(2, '0')}`)
    const customizacoes = await criarCustomizacoes(request, token, nomesCustom)
    produtoIds.push(...customizacoes.map(c => c.id))
    const cliente = await criarCliente(request, token, `QA-217e-Cliente-${ts}`)
    const resProdutoAvulso = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: nomeProdutoAvulso, tipo: 'PRODUTO', tempoProducao: 10, fichaTecnica: [] },
    })
    const produtoAvulso = await resProdutoAvulso.json()
    produtoIds.push(produtoAvulso.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await adicionarItemAvulso(page, nomeProdutoAvulso, 1)

    await page.getByRole('button', { name: 'Customizações', exact: true }).click()

    const dialog = page.locator('div[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Sem digitar nada no campo de busca da customização: listagem completa já aparece.
    for (const nome of nomesCustom) {
      await expect(page.getByText(nome)).toBeAttached()
    }

    const listWrap = dialog.locator('.flex.flex-col.gap-2').first()
    const rows = listWrap.locator('> div')
    await expect(rows).toHaveCount(10)
    const total = 10
    const listBox = await listWrap.boundingBox()
    expect(listBox).not.toBeNull()

    let visiveis = 0
    for (let i = 0; i < total; i++) {
      const box = await rows.nth(i).boundingBox()
      if (!box) continue
      const dentro = box.y >= listBox!.y - 1 && box.y + box.height <= listBox!.y + listBox!.height + 1
      if (dentro) visiveis++
    }
    expect(visiveis).toBe(8)

    const scrollInfo = await listWrap.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight)
  })

  test('busca de produto avulso (já server-side, não tocada por #217) continua funcionando normalmente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const nomeProduto = `QA-217f-ProdutoAvulso-${ts}`
    const resProduto = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, fichaTecnica: [] },
    })
    const produto = await resProduto.json()
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-217f-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)

    const buscaRequest = page.waitForRequest(req =>
      req.url().includes('/produtos') && req.url().includes(`busca=${encodeURIComponent(nomeProduto)}`)
    )
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await buscaRequest

    await expect(page.getByText(nomeProduto)).toBeVisible()
  })
})
