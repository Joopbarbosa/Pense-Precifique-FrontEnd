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
 * Homologação P-QA-001 / OpenProject #115 — Criar Produção (Fluxo A), cenários 150-157 (numeração
 * antiga dos specs — ver débito de offset +18 documentado em CLAUDE.md/SCENARIOS.md).
 *
 * Vários cenários abaixo documentam divergência entre o Gherkin de aceite e o comportamento
 * real de `NovaProducaoPage.tsx` / `ProducaoService.java` — achados de homologação, não bugs
 * no teste. Cada `test.fail()`/comentário aponta o arquivo:linha responsável. Ver relatório
 * final da tarefa para o resumo consolidado.
 *
 * Re-homologação P-TESTE-001 (V0.6.1): testes 151 e 157 renomeados para a numeração oficial atual
 * do SCENARIOS.md (169 e 175) — corrigidos por #153 (RN-NOVA-7) e #150 respectivamente, os dois
 * agora refletem comportamento real e correto (deixaram de documentar delta). Os demais testes
 * deste arquivo (150, 152-156) não foram tocados nesta rodada — mantêm a numeração antiga.
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

  test('169 (era 151) — RN-NOVA-7 (#153): alertas de insumo simulados ao vivo a cada produto adicionado, antes de confirmar', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): #153 trocou o mecanismo por completo. Antes, AlertasInsumos só
    // era renderizado DEPOIS do POST /producoes (achado original desta suíte). Agora
    // NovaProducaoPage.tsx chama POST /producoes/simular-alertas a cada adição/alteração de
    // quantidade (avaliarAlertas, NovaProducaoPage.tsx:212-241) e reage por situação:
    // BLOQUEIO_FUTURO → toast de erro, produto NÃO é adicionado (linhas 219-224); AVISO → modal de
    // confirmação antes de adicionar (avisoPendente, linhas 226-230, 457-469); SUFICIENTE → some
    // sem alerta algum. O Gherkin original ("Papel Couché 250g" exibe "✅ Suficiente") continua sem
    // correspondência literal — AlertasInsumos sempre filtra fora SUFICIENTE (linha 165) — mas o
    // comportamento real por trás do RN-NOVA-7 (alertas vivos, bloqueio duro, aviso com
    // confirmação) agora existe de fato e é o que este teste verifica.
    const token = await apiLogin(request)
    const nomePapel = `QA169-PapelCouche250g-${Date.now()}`
    const nomeCola = `QA169-ColaBranca1L-${Date.now()}`
    const nomeFita = `QA169-FitaCetim-${Date.now()}`
    const papel = await criarInsumoComEstoque(request, token, nomePapel, 100, false)
    const cola = await criarInsumoComEstoque(request, token, nomeCola, 1, true) // permite negativo → aviso
    const fita = await criarInsumoComEstoque(request, token, nomeFita, 1, false) // não permite → bloqueio
    criadosInsumoIds.push(papel.id, cola.id, fita.id)

    // 3 produtos separados (1 insumo cada) — simularAlertas roda sobre a lista inteira a cada
    // chamada, então isolar por produto deixa claro qual alerta corresponde a qual adição.
    const nomeProdutoOk = `QA169-Suficiente-${Date.now()}`
    const produtoOk = await criarProdutoComFicha(request, token, nomeProdutoOk, [{ insumoId: papel.id, quantidade: 1 }], 1)
    const nomeProdutoAviso = `QA169-Aviso-${Date.now()}`
    const produtoAviso = await criarProdutoComFicha(request, token, nomeProdutoAviso, [{ insumoId: cola.id, quantidade: 5 }], 1)
    const nomeProdutoBloqueio = `QA169-Bloqueio-${Date.now()}`
    const produtoBloqueio = await criarProdutoComFicha(request, token, nomeProdutoBloqueio, [{ insumoId: fita.id, quantidade: 5 }], 1)
    criadosProdutoIds.push(produtoOk.id, produtoAviso.id, produtoBloqueio.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(hojeISO(2))

    // Suficiente: adiciona direto, sem nenhum alerta visível.
    await buscarEAdicionarProduto(page, nomeProdutoOk)
    await expect(linhaProduto(page, nomeProdutoOk)).toBeVisible()
    await expect(page.getByText('Estoque insuficiente')).toHaveCount(0)

    // Bloqueio (RN-059, não permite negativo): adição é recusada, produto não entra na lista.
    await buscarEAdicionarProduto(page, nomeProdutoBloqueio)
    await expect(page.getByText(new RegExp(`Insumo insuficiente.*${nomeFita}`))).toBeVisible({ timeout: 5000 })
    await expect(linhaProduto(page, nomeProdutoBloqueio)).toHaveCount(0)

    // Aviso (permite negativo): modal de confirmação antes de adicionar de fato.
    await buscarEAdicionarProduto(page, nomeProdutoAviso)
    await expect(page.getByText('Estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(new RegExp(`${nomeCola}.*necessário 5.*disponível 1`))).toBeVisible()
    await expect(linhaProduto(page, nomeProdutoAviso)).toHaveCount(0) // ainda não confirmado
    await page.getByRole('button', { name: 'Adicionar mesmo assim' }).click()
    await expect(linhaProduto(page, nomeProdutoAviso)).toBeVisible()

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

  test('175 (era 157) — data de início vem preenchida com hoje por padrão e permanece editável', async ({ page }) => {
    // Re-homologação (P-TESTE-001): corrigido por #150 — NovaProducaoPage.tsx:195 agora inicializa
    // `dataInicio` via `useState(() => new Date().toISOString().slice(0, 10))`. Assertiva antes
    // documentava o delta (useState('') vazio); agora reflete o comportamento real e correto.
    await login(page)
    await page.goto('/producao/nova')

    const campoDataInicio = page.getByLabel(/Data de início/)
    await expect(campoDataInicio).toHaveValue(hojeISO(0))
    await expect(campoDataInicio).toBeEditable()

    await campoDataInicio.fill(hojeISO(3))
    await expect(campoDataInicio).toHaveValue(hojeISO(3))
  })
})
