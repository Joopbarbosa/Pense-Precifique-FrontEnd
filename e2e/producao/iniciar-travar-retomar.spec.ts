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
import { criarInsumoComEstoque, reporEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-002 / OpenProject #117-#119 — Iniciar / Travar / Retomar (Fluxo B),
 * cenários 160-167. Mesma regra do P-QA-001: cenários que falham documentam o delta
 * Gherkin-vs-real com file:line, não são adaptados ao comportamento observado.
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
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
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

  test('162 — iniciar com insumo bloqueante, opção travar tudo', async ({ page, request }) => {
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

    // Achado de homologação: o rótulo real do badge (utils/badges.ts:14) é "Travada (estoque)",
    // não "Travada — Estoque" (parênteses + minúscula, não travessão + maiúscula). Asserção
    // abaixo replica o texto literal do Gherkin e deve falhar só por esse detalhe de wording —
    // o restante do cenário (nenhuma baixa, estado TRAVADA) é comportamento real correto.
    await expect(page.getByText('Travada — Estoque').first()).toBeVisible({ timeout: 5000 })

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual)

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.estado).toBe('TRAVADA')
  })

  test('163 — travar manualmente EM_ANDAMENTO não reverte estoque já baixado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA163-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
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

    // Mesmo achado de wording do Cenário 162: rótulo real é "Travada (manual)", não "Travada — Manual".
    await expect(page.getByText('Travada — Manual').first()).toBeVisible({ timeout: 5000 })

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

  test('165 — retomar com estoque resolvido muda para EM_ANDAMENTO', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA165-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // bloqueante
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA165-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    const iniciada = await resIniciar.json()
    expect(iniciada.estado).toBe('TRAVADA') // auto-trava por bloqueio, sem baixar nada (achado #1/#5 do P-QA-002)

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

    // Achado de homologação: a premissa do Gherkin é que a baixa já ocorreu no início original e
    // retomar não deveria baixar de novo. Na prática, `iniciar()` bloqueado nunca baixa nada — o
    // check de insumos bloqueantes roda ANTES de qualquer baixarComponente (ProducaoService.java:
    // 347-358) — então é o `retomar()` bem-sucedido quem faz a ÚNICA baixa, agora
    // (ProducaoService.java:399-415). O estoque pós-retomar será MENOR que o pós-reposição, não
    // igual. Asserção abaixo replica o Gherkin literalmente e deve falhar por esse motivo.
    expect(insumoDepoisRetomar.estoqueAtual).toBe(insumoAntesRetomar.estoqueAtual)
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

  test('167 — badge na listagem distingue trava por sistema de trava manual', async ({ page, request }) => {
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

    // Achado de homologação (bug real, não só wording): na listagem, `getBadgeEstado` é chamado
    // sem o 2º argumento `historicoStatus` (ListaProducaoPage.tsx:167 e :220), e `ProducaoResumo`
    // (tipo devolvido por GET /producoes) nem sequer carrega `historicoStatus` — só
    // `ProducaoDetalhe` tem esse campo (types/producao.ts). Resultado: TODA produção TRAVADA
    // aparece como "Travada (estoque)" na lista, mesmo quando a trava foi manual — a distinção só
    // funciona na tela de Detalhe (DetalheProducaoPage.tsx:108 passa historicoStatus corretamente).
    expect(textoBadgeSistema).toBe('Travada — Estoque') // wording (parênteses vs travessão) — ver 162/163
    expect(textoBadgeManual).toBe('Travada — Manual') // falha "dupla": wording E o bug acima (mostra "Travada (estoque)")
    expect(estiloBadgeSistema).not.toBe(estiloBadgeManual) // cores devem diferir; na prática são idênticas (mesmo bug)
  })
})
