import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  criarProdutoSemFicha,
  tentarCriarProdutoSemRendimento,
  inativarProduto,
  buscarProducao,
  teardownProducoes,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

/**
 * Homologação P-QA-001 / OpenProject #115 — Criar Produção (Fluxo A), cenários 150-157.
 *
 * Vários cenários abaixo documentam divergência entre o Gherkin de aceite e o comportamento
 * real de `NovoProducaoPage.tsx` / `ProducaoService.java` — achados de homologação, não bugs
 * no teste. Cada `test.fail()`/comentário aponta o arquivo:linha responsável. Ver relatório
 * final da tarefa para o resumo consolidado.
 */

function hojeISO(diasOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + diasOffset)
  return d.toISOString().slice(0, 10)
}

function linhaProduto(page: Page, nome: string) {
  return page.locator('div.border-t.border-line', { hasText: nome })
}

async function buscarEAdicionarProduto(page: Page, nome: string) {
  const busca = page.getByPlaceholder('Buscar produto...')
  await busca.fill(nome)
  const resultado = page.getByRole('button', { name: new RegExp(nome) })
  await expect(resultado.first()).toBeVisible({ timeout: 5000 })
  await resultado.first().click()
}

async function definirQuantidade(page: Page, nome: string, quantidade: number) {
  await linhaProduto(page, nome).locator('input[type="number"]').fill(String(quantidade))
}

test.describe('Cenários 150-157 — Criar Produção / Fluxo A (#115)', () => {
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
      await request.delete(`http://localhost:8080/insumos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  })

  test('150 — criar produção com produtos válidos gera PRD-N, sem movimentação de estoque, histórico com origem SISTEMA', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA150-KitConviteCasamento-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, `QA150-Papel-${Date.now()}`, 1000, false)
    criadosInsumoIds.push(insumo.id)
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const insumoAntes = await (await request.get(`http://localhost:8080/insumos/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto('/producao/nova')

    await page.getByLabel(/Data de início/).fill(hojeISO(0))
    await page.getByLabel(/Data de término prevista/).fill(hojeISO(1))
    await buscarEAdicionarProduto(page, nomeProduto)
    await definirQuantidade(page, nomeProduto, 10)
    await page.getByRole('button', { name: 'Criar Produção' }).click()

    await expect(page).toHaveURL(/\/producao\/[0-9a-f-]+$/, { timeout: 10_000 })
    const identificador = await page.getByText(/PRD-\d+/).first().textContent()
    expect(identificador).toMatch(/PRD-\d+/)
    await expect(page.getByText('Aguardando início').first()).toBeVisible()

    const idProducao = page.url().split('/producao/')[1]
    criadasProducaoIds.push(idProducao)
    const producaoApi = await buscarProducao(request, token, idProducao)
    expect(producaoApi.estado).toBe('AGUARDANDO_INICIO')

    const insumoDepois = await (await request.get(`http://localhost:8080/insumos/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual)

    // Achado de homologação: ProducaoService.java:151-156 grava origem=USUARIO na criação,
    // não SISTEMA como descrito no cenário (SISTEMA é usado só em transições automáticas,
    // ex. travamento por insumo bloqueante, linha 351). Esta asserção falha por design da app atual.
    expect(producaoApi.historicoStatus[0].origem).toBe('SISTEMA')
  })

  test('151 — alertas de insumo (✅/⚠️/❌) exibidos antes de confirmar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomePapel = `QA151-PapelCouche250g-${Date.now()}`
    const nomeCola = `QA151-ColaBranca1L-${Date.now()}`
    const nomeFita = `QA151-FitaCetim-${Date.now()}`
    const papel = await criarInsumoComEstoque(request, token, nomePapel, 100, false)
    const cola = await criarInsumoComEstoque(request, token, nomeCola, 1, true)
    const fita = await criarInsumoComEstoque(request, token, nomeFita, 1, false)
    criadosInsumoIds.push(papel.id, cola.id, fita.id)

    const nomeProduto = `QA151-KitConviteCasamento-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [
      { insumoId: papel.id, quantidade: 1 },
      { insumoId: cola.id, quantidade: 1 },
      { insumoId: fita.id, quantidade: 1 },
    ], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(hojeISO(2))
    await buscarEAdicionarProduto(page, nomeProduto)
    await definirQuantidade(page, nomeProduto, 5) // necessária por insumo = 5 > estoque de cola/fita

    // Achado de homologação: NovoProducaoPage.tsx não tem etapa de preview de alertas antes de
    // confirmar. AlertasInsumos (linhas 134-160) só é renderizado DEPOIS do POST /producoes já
    // ter criado o registro (linhas 216-231), e filtra fora qualquer situação SUFICIENTE
    // (linha 135: `alertas.filter(a => a.situacao !== 'SUFICIENTE')`), então "✅ Suficiente"
    // nunca aparece. As asserções abaixo replicam o Gherkin literalmente e devem falhar aqui,
    // antes mesmo do clique em "Criar Produção".
    await expect(page.getByText(new RegExp(`${nomePapel}.*Suficiente`))).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(new RegExp(`${nomeCola}.*Insuficiente.*permite negativo`))).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(new RegExp(`${nomeFita}.*Insuficiente.*bloqueará`))).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Criar Produção' })).toBeEnabled()
  })

  test('152 — produto sem ficha técnica bloqueia adição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA152-CaixinhaKraft-${Date.now()}`
    const produto = await criarProdutoSemFicha(request, token, nomeProduto)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(hojeISO(1))
    await buscarEAdicionarProduto(page, nomeProduto)

    // Achado de homologação: handleSelectProduto (NovoProducaoPage.tsx:173-181) não valida
    // ficha técnica/rendimento — adiciona qualquer produto retornado pela busca sem checagem.
    // O bloqueio só existe no backend (ProducaoService.java:822-826) e só é acionado ao clicar
    // em "Criar Produção" (POST falha com 400), não no momento da adição como o Gherkin descreve.
    await expect(linhaProduto(page, nomeProduto)).toHaveCount(0)
    await expect(page.getByText(/complete o cadastro/i)).toBeVisible({ timeout: 3000 })
  })

  test('153 — produto com ficha técnica e rendimento zerado: precondição inalcançável via API (invariante já garantido no backend)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA153-InsumoBase-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 50, true)
    criadosInsumoIds.push(insumo.id)

    // Achado de homologação: a precondição do Cenário 153 ("Laço Decorativo tem ficha técnica
    // mas rendimento zerado") não pode ser criada via API. `ProdutoService.validarRendimento`
    // (ProdutoService.java:238-243) roda tanto em POST quanto em PUT e rejeita qualquer produto
    // com fichaTecnica não-vazia e rendimento nulo/<=0 com 400. Não existe endpoint alternativo
    // (sem PATCH, sem sub-rota de ficha técnica) para forçar esse estado. Como o estado nunca
    // existe, o comportamento "bloqueia a adição na tela de produção" descrito no Gherkin nunca
    // chega a ser exercitado pela UI — o teste abaixo prova a garantia equivalente na origem.
    const res = await tentarCriarProdutoSemRendimento(request, token, `QA153-LacoDecorativo-${Date.now()}`, [
      { insumoId: insumo.id, quantidade: 1 },
    ])
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/rendimento/i)
  })

  test('154 — produto inativo não aparece na busca da criação de produção', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA154-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 50, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA154-KitAntigo-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    await inativarProduto(request, token, produto.id) // não entra em criadosProdutoIds: já foi inativado aqui

    await login(page)
    await page.goto('/producao/nova')
    const busca = page.getByPlaceholder('Buscar produto...')
    await busca.fill(nomeProduto)
    await page.waitForTimeout(600) // debounce (300ms) + round-trip

    await expect(page.getByRole('button', { name: new RegExp(nomeProduto) })).toHaveCount(0)
    await expect(page.getByText('Nenhum produto encontrado.')).toBeVisible()
  })

  test('155 — sistema agrupa produto duplicado em uma única linha', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA155-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA155-KitConviteCasamento-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(hojeISO(1))

    // A busca sempre adiciona +1 por seleção (handleSelectProduto, NovoProducaoPage.tsx:173-181);
    // não existe ação única de "adicionar com quantidade 3". Operacionaliza-se o Gherkin como:
    // adiciona (qtd vira 1) → ajusta para 5 (equivalente a "adicionou com quantidade 5") →
    // seleciona o mesmo produto mais 3 vezes (+1 cada) → total 8, provando o agrupamento.
    await buscarEAdicionarProduto(page, nomeProduto)
    await definirQuantidade(page, nomeProduto, 5)
    await buscarEAdicionarProduto(page, nomeProduto)
    await buscarEAdicionarProduto(page, nomeProduto)
    await buscarEAdicionarProduto(page, nomeProduto)

    await expect(linhaProduto(page, nomeProduto)).toHaveCount(1)
    await expect(linhaProduto(page, nomeProduto).locator('input[type="number"]')).toHaveValue('8')
  })

  test('156 — data de término anterior à data de início bloqueia criação', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA156-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA156-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de início/).fill('2026-07-20')
    await page.getByLabel(/Data de término prevista/).fill('2026-07-19')
    await buscarEAdicionarProduto(page, nomeProduto)
    await page.getByRole('button', { name: 'Criar Produção' }).click()

    await expect(page.getByText(/data de término prevista deve ser igual ou posterior/i)).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/producao\/nova$/)
  })

  test('157 — data de início vem preenchida com hoje por padrão e permanece editável', async ({ page }) => {
    await login(page)
    await page.goto('/producao/nova')

    const campoDataInicio = page.getByLabel(/Data de início/)
    // Achado de homologação: NovoProducaoPage.tsx:165 inicializa `dataInicio` com string vazia
    // (`useState('')`), não com a data de hoje. Esta asserção falha por design da app atual.
    await expect(campoDataInicio).toHaveValue(hojeISO(0))
    await expect(campoDataInicio).toBeEditable()
  })
})
