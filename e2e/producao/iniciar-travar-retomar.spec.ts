import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  buscarProducao,
  teardownProducoes,
  criarProducaoViaApi,
  criarProducaoEmAndamento,
  iniciarProducaoViaApi,
  travarProducaoViaApi,
  iniciarProducao,
  travarProducao,
  retomarProducao,
} from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel, reporEstoque, definirPermitirNegativo } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-002 / OpenProject #117-#119 — Iniciar / Travar / Retomar (Fluxo B),
 * cenários 160-167. Mesma regra do P-QA-001: cenários que falham documentam o delta
 * Gherkin-vs-real com file:line, não são adaptados ao comportamento observado.
 *
 * Re-homologação (achados restantes, onda pós-P-TESTE-001): testes 162, 163 e 167 renomeados
 * para a numeração oficial (180, 181, 185). Todos os três documentavam a mesma divergência de
 * wording do badge de trava (`utils/badges.ts:14`: "Travada (estoque)"/"Travada (manual)",
 * parênteses + minúscula, em vez de "Travada — Estoque"/"Travada — Manual" do Gherkin) — cosmético,
 * mesma categoria dos achados já fechados em P-TESTE-001. O teste 167/185 também suspeitava de um
 * bug funcional (badge da Lista sempre mostrando "Travada (estoque)" mesmo para trava manual,
 * ListaProducaoPage.tsx:167/220 sem passar `historicoStatus`) — investigação confirmou que essa
 * parte já foi corrigida (fix #156, `montarResponseComAlertas` já expõe `historicoStatus` em
 * GET /producoes e `ListaProducaoPage.tsx` já chama `getBadgeEstado(estado, historicoStatus)` nas
 * 3 ocorrências atuais, linhas 63/209/267) — comentário antigo ficou desatualizado. Confirmado ao
 * vivo: badge de sistema e manual têm texto E cor diferentes na Lista. Todos os três corrigidos
 * para refletir o comportamento real e correto.
 */

test.describe('Cenários 160-167 — Iniciar/Travar/Retomar (Fluxo B) (#117-#119)', () => {
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

  test('160 — iniciar sem insumo bloqueante baixa estoque pela fórmula e vai para EM_ANDAMENTO/USUARIO', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA160-Insumo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 100, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA160-Produto-${Date.now()}`
    // ficha: 2 unidades de insumo por produto; rendimento 1 → necessária = 2 * (quantidade/1)
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 2 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producao.id)
    const deltaEsperado = 2 * (5 / 1) // 10

    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await iniciarProducao(page)

    await expect(page.getByText('Em andamento').first()).toBeVisible({ timeout: 10_000 })

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoAntes.estoqueAtual - insumoDepois.estoqueAtual).toBe(deltaEsperado)

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('EM_ANDAMENTO')
    const ultimaTransicao = producaoApi.historicoStatus[producaoApi.historicoStatus.length - 1]
    expect(ultimaTransicao.statusNovo).toBe('EM_ANDAMENTO')
    expect(ultimaTransicao.origem).toBe('USUARIO')
  })

  test('161 — iniciar com insumo bloqueante em 1 de 2 produtos, opção Dividir', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoA = `QA161-InsumoA-${Date.now()}`
    const insumoA = await criarInsumoComEstoque(request, token, nomeInsumoA, 100, false)
    const nomeInsumoB = `QA161-InsumoB-${Date.now()}`
    const insumoB = await criarInsumoComEstoque(request, token, nomeInsumoB, 0, false) // bloqueante: 0 e não permite negativo
    criadosInsumoIds.push(insumoA.id, insumoB.id)

    const nomeA = `QA161-KitA-${Date.now()}`
    const produtoA = await criarProdutoComFicha(request, token, nomeA, [{ insumoId: insumoA.id, quantidade: 1 }], 1)
    const nomeB = `QA161-KitB-${Date.now()}`
    const produtoB = await criarProdutoComFicha(request, token, nomeB, [{ insumoId: insumoB.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoA.id, produtoB.id)

    const producao = await criarProducaoViaApi(request, token, [
      { produtoId: produtoA.id, quantidade: 1 },
      { produtoId: produtoB.id, quantidade: 1 },
    ])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await iniciarProducao(page, { escolha: 'dividir' })

    await expect(page.getByText('Produção dividida')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Ver produções' }).click()

    const original = await buscarProducao(request, token, producao.id)
    expect(original.estado).toBe('NAO_REALIZADA')
    expect(original.producoesFilhas.length).toBe(2)

    for (const filha of original.producoesFilhas) {
      criadasProducaoIds.push(filha.id) // teardown também cancela as filhas
      const detalheFilha = await buscarProducao(request, token, filha.id)
      expect(detalheFilha.producaoOrigemId).toBe(producao.id)
      expect(detalheFilha.tipoOrigem).toBe('DIVISAO')
      const ehKitA = detalheFilha.produtos.some((p: { nomeProduto: string }) => p.nomeProduto === nomeA)
      if (ehKitA) {
        expect(detalheFilha.estado).toBe('EM_ANDAMENTO')
      } else {
        expect(detalheFilha.estado).toBe('TRAVADA')
      }
    }
  })

  test('180 (era 162) — iniciar com insumo bloqueante, opção travar tudo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA162-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // bloqueante
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA162-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await iniciarProducao(page, { escolha: 'travar' })

    // Wording real do badge (utils/badges.ts:14) é "Travada (estoque)", não "Travada — Estoque"
    // do Gherkin — divergência cosmética, mesma categoria dos achados já fechados em P-TESTE-001.
    // O restante do cenário (nenhuma baixa, estado TRAVADA) já era comportamento real e correto.
    await expect(page.getByText('Travada (estoque)').first()).toBeVisible({ timeout: 5000 })

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual)

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('TRAVADA')
  })

  test('181 (era 163) — travar manualmente EM_ANDAMENTO não reverte estoque já baixado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA163-Insumo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 100, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA163-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 2 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 5 }])
    criadasProducaoIds.push(producao.id)

    const insumoAposInicio = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await travarProducao(page, 'Maquinário quebrado, aguardando manutenção técnica')

    // Mesma divergência cosmética de wording do Cenário 180: rótulo real é "Travada (manual)".
    await expect(page.getByText('Travada (manual)').first()).toBeVisible({ timeout: 5000 })

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAposInicio.estoqueAtual)
  })

  test('164 — trava manual exige justificativa mínima de 30 caracteres', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA164-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA164-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Travar', exact: true }).click()
    await page.getByPlaceholder('Descreva o motivo da trava...').fill('Muito curto') // 11 chars < 30

    await expect(page.getByRole('button', { name: 'Confirmar trava' })).toBeDisabled()
  })

  test('183 (era 165) — retomar com estoque resolvido muda para EM_ANDAMENTO e realiza a única baixa', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): a versão anterior deste teste assumia (Gherkin original) que a
    // baixa de insumo já tinha ocorrido no `iniciar()` bloqueado, e que `retomar()` não baixaria de
    // novo — asserção de igualdade documentada como delta esperado. Investigação de código mostra
    // que essa era a premissa errada, não um bug: `iniciar()` bloqueado NUNCA baixa nada (mesma
    // garantia do Cenário 180 — "nenhuma movimentação de estoque é registrada" ao travar tudo); é
    // sempre o `retomar()` bem-sucedido quem realiza a ÚNICA baixa de fato (ProducaoService.java,
    // `verificarEBaixarSeLiberado`, chamado tanto por `iniciar()` quanto por `retomar()`). Corrigido
    // para refletir e validar esse comportamento real.
    const token = await apiLogin(request)
    const nomeInsumo = `QA183-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // bloqueante
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA183-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    const iniciada = await resIniciar.json()
    expect(iniciada.estado).toBe('TRAVADA') // auto-trava por bloqueio, sem baixar nada

    await reporEstoque(request, token, insumo.id, 50)
    const insumoAntesRetomar = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await retomarProducao(page)

    await expect(page.getByText('Em andamento').first()).toBeVisible({ timeout: 10_000 })
    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('EM_ANDAMENTO')

    const insumoDepoisRetomar = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    const deltaEsperado = 1 * (1 / 1) // ficha: 1 unidade do insumo, rendimento 1, quantidade 1
    expect(insumoAntesRetomar.estoqueAtual - insumoDepoisRetomar.estoqueAtual).toBe(deltaEsperado)
  })

  test('RN-052 (novo, #136) — iniciar com aviso de estoque negativo não executa até confirmar', async ({ page, request }) => {
    // Bloco 1 (P-TESTE-001): RN-052 religada em iniciar()/retomar()/dividir()/agrupar() — cobre os
    // 2 dos 4 casos que ainda não tinham teste dedicado (estoque suficiente e bloqueio RN-059 já
    // cobertos pelos testes 160-162 acima). Insumo aqui permite negativo (aviso, não bloqueio).
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RN052-Iniciar-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, true) // permite negativo → aviso
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RN052-Iniciar-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    // criarInsumoComEstoque(..., 0, ...) força quantidadeCompradaInicial mínima de 0.01 (helper não
    // aceita 0 de fato — Math.max(estoqueInicial, 0.01)) — lê o estoque real em vez de assumir 0.
    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar início' }).click()

    await expect(page.getByText('Estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(new RegExp(`${nomeInsumo}.*necessário 1.*disponível ${insumoAntes.estoqueAtual}`))).toBeVisible()

    // Aviso pendente, não confirmado: nada foi executado — produção continua AGUARDANDO_INICIO.
    const aindaAguardando = await buscarProducao(request, token, producao.id)
    expect(aindaAguardando.estado).toBe('AGUARDANDO_INICIO')

    await page.getByRole('button', { name: 'Confirmar mesmo assim' }).click()
    await expect(page.getByText('Em andamento').first()).toBeVisible({ timeout: 10_000 })

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('EM_ANDAMENTO')
    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual - 1) // negativo confirmado de fato
  })

  test('RN-052 (novo, #136) — retomar com aviso de estoque negativo não executa até confirmar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RN052-Retomar-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // bloqueante — trava no iniciar
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RN052-Retomar-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect((await resIniciar.json()).estado).toBe('TRAVADA')

    // Insumo passa a permitir negativo, mas continua sem estoque suficiente — retomar() deve
    // encontrar um aviso pendente (RN-052), não mais um bloqueio (RN-059).
    await definirPermitirNegativo(request, token, insumo.id, true)

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Retomar', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar retomada' }).click()

    await expect(page.getByText('Estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(new RegExp(`${nomeInsumo}.*necessário 1.*disponível ${insumoAntes.estoqueAtual}`))).toBeVisible()

    const aindaTravada = await buscarProducao(request, token, producao.id)
    expect(aindaTravada.estado).toBe('TRAVADA')

    await page.getByRole('button', { name: 'Confirmar mesmo assim' }).click()
    await expect(page.getByText('Em andamento').first()).toBeVisible({ timeout: 10_000 })

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('EM_ANDAMENTO')
    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual - 1)
  })

  test('166 — retomar com estoque ainda insuficiente mantém TRAVADA e oferece dividir', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA166-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // permanece bloqueante
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA166-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect((await resIniciar.json()).estado).toBe('TRAVADA')

    await login(page)
    await page.goto(`/producao/${producao.id}`)
    await page.getByRole('button', { name: 'Retomar', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar retomada' }).click()

    await expect(page.getByText('Insumos ainda bloqueantes — produção permanece travada.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Dividir mesmo assim' })).toBeVisible()

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('TRAVADA')
  })

  test('185 (era 167) — badge na listagem distingue trava por sistema de trava manual', async ({ page, request }) => {
    const token = await apiLogin(request)

    // Produção 1: travada automaticamente (insumo bloqueante durante iniciar)
    const nomeInsumoSistema = `QA167-InsumoSistema-${Date.now()}`
    const insumoSistema = await criarInsumoComEstoque(request, token, nomeInsumoSistema, 0, false)
    const nomeProdutoSistema = `QA167-ProdutoSistema-${Date.now()}`
    const produtoSistema = await criarProdutoComFicha(request, token, nomeProdutoSistema, [{ insumoId: insumoSistema.id, quantidade: 1 }], 1)
    criadosInsumoIds.push(insumoSistema.id)
    criadosProdutoIds.push(produtoSistema.id)
    const producaoSistema = await criarProducaoViaApi(request, token, [{ produtoId: produtoSistema.id, quantidade: 1 }])
    criadasProducaoIds.push(producaoSistema.id)
    await iniciarProducaoViaApi(request, token, producaoSistema.id)

    // Produção 2: travada manualmente (EM_ANDAMENTO → travar via API, justificativa válida)
    const nomeInsumoManual = `QA167-InsumoManual-${Date.now()}`
    const insumoManual = await criarInsumoComEstoque(request, token, nomeInsumoManual, 100, false)
    const nomeProdutoManual = `QA167-ProdutoManual-${Date.now()}`
    const produtoManual = await criarProdutoComFicha(request, token, nomeProdutoManual, [{ insumoId: insumoManual.id, quantidade: 1 }], 1)
    criadosInsumoIds.push(insumoManual.id)
    criadosProdutoIds.push(produtoManual.id)
    const producaoManual = await criarProducaoEmAndamento(request, token, [{ produtoId: produtoManual.id, quantidade: 1 }])
    criadasProducaoIds.push(producaoManual.id)
    await travarProducaoViaApi(request, token, producaoManual.id, 'Trava manual para teste de badge — QA167')

    await login(page)
    await page.goto('/producao')

    const busca = page.getByPlaceholder('Buscar por produto…')

    await busca.fill(nomeProdutoSistema)
    await page.waitForTimeout(500)
    const badgeSistema = page.locator('span[style*="background"]', { hasText: /Travada/ }).first()
    await expect(badgeSistema).toBeVisible({ timeout: 5000 })
    const textoBadgeSistema = await badgeSistema.textContent()
    const estiloBadgeSistema = await badgeSistema.getAttribute('style')

    await busca.fill(nomeProdutoManual)
    await page.waitForTimeout(500)
    const badgeManual = page.locator('span[style*="background"]', { hasText: /Travada/ }).first()
    await expect(badgeManual).toBeVisible({ timeout: 5000 })
    const textoBadgeManual = await badgeManual.textContent()
    const estiloBadgeManual = await badgeManual.getAttribute('style')

    // Re-homologação: comentário original suspeitava de bug real (badge da Lista sempre "Travada
    // (estoque)", ignorando trava manual) por `getBadgeEstado` supostamente não receber
    // `historicoStatus` (ListaProducaoPage.tsx:167/220). Confirmado ao vivo que isso já foi
    // corrigido (fix #156): `GET /producoes` expõe `historicoStatus` via `montarResponseComAlertas`
    // (ProducaoService.java:182-186) e `ListaProducaoPage.tsx` já chama
    // `getBadgeEstado(producao.estado, producao.historicoStatus)` (linhas 63, 209, 267) — só resta
    // a mesma divergência cosmética de wording dos Cenários 180/181 (parênteses+minúscula vs
    // travessão+maiúscula).
    expect(textoBadgeSistema).toBe('Travada (estoque)')
    expect(textoBadgeManual).toBe('Travada (manual)')
    expect(estiloBadgeSistema).not.toBe(estiloBadgeManual) // cores diferem de fato — vermelho vs laranja
  })
})
