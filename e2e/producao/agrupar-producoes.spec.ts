import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  buscarProducao,
  teardownProducoes,
  criarProducaoViaApi,
  criarProducaoEmAndamento,
  finalizarProducaoViaApi,
  ativarModoAgrupamento,
  selecionarParaAgrupar,
  linhaProducaoDesktop,
} from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * Homologação P-QA-005 / OpenProject #122 — Agrupamento de Produções (Fluxo I), cenários 191-195.
 * Mesma regra dos prompts anteriores: cenários que falham documentam o delta Gherkin-vs-real com
 * file:line, não são adaptados ao comportamento observado.
 *
 * Re-homologação P-TESTE-001 (V0.6.1): bug de z-index corrigido por #165 (ver bloco abaixo,
 * `confirmarAgrupamento` agora usa clique real) — afeta todos os testes deste arquivo, já que
 * todos passam por essa função. Teste 195 renomeado para 213 (numeração oficial), assertiva de
 * pré-preenchimento de data corrigida (#164).
 *
 * Achados de leitura de código (registrados aqui conforme pedido no prompt):
 * - Payload real de `POST /producoes/agrupar` (`types/producao.ts:88-95`,
 *   `AgruparProducoesModal.tsx:79-86`): `{ producaoIds: string[], estadoDestino, dataInicio?,
 *   dataTerminoPrevista?, justificativa, consumoRealPorProducao?: Record<producaoId,
 *   ConsumoRealItem[]> }`. `consumoRealPorProducao` só é preenchido para produções de origem
 *   EM_ANDAMENTO/TRAVADA (`consumoAtivo`, linha 26) — e mesmo para essas, cada array só contém os
 *   itens DIVERGENTES do valor original baixado (mesmo filtro de `CancelarProducaoModal`/`Page`:
 *   `valor !== item.quantidade`, linhas 65-69). Se a artesã não editar nenhum input, a chave da
 *   produção existe no objeto mas com array vazio `[]` — não fica ausente.
 * - `justificativa` é **sempre obrigatória** (mín. 30 chars, `MIN_CHARS` linha 18, validado tanto
 *   no botão "Agrupar" quanto no backend `AgruparProducoesRequest.justificativa`
 *   `@Size(min=30)`), mesmo quando nenhuma das produções de origem está EM_ANDAMENTO/TRAVADA —
 *   não é uma exigência condicional ao consumo real, ao contrário do que os Cenários 191/193/195
 *   (que não mencionam justificativa) poderiam sugerir.
 * - Status bloqueados para seleção no modo de agrupamento (`ESTADOS_AGRUPAVEIS`,
 *   `ListaProducaoPage.tsx:76`): apenas `AGUARDANDO_INICIO`, `EM_ANDAMENTO`, `TRAVADA` são
 *   agrupáveis — `FINALIZADA`, `CANCELADA` e `NAO_REALIZADA` ficam com o checkbox
 *   `disabled` (`SelecaoCheckbox`, linha 78-96, prop `disabled={!agrupavel}` na linha 199/252).
 *   Backend replica a mesma regra em `ProducaoService.agrupar` (linhas 576-579), mas é
 *   estruturalmente inalcançável pela UI porque a seleção já bloqueia antes do POST.
 * - `AgruparProducoesModal` não tem nenhum `data-testid` — seletores por `getByLabel`/`getByRole`.
 *
 * BUG DE UI CORRIGIDO NA RE-HOMOLOGAÇÃO (P-TESTE-001, V0.6.1) — texto original preservado abaixo
 * como histórico, já que o achado foi real e documentado com precisão na primeira rodada:
 * O botão "Agrupar" do rodapé de `AgruparProducoesModal` ficava fisicamente inacessível a clique
 * de mouse. `ModalShell` renderiza o overlay em `z-[100]` e o conteúdo do modal em `z-[110]`
 * (`components/ui/ModalShell.tsx:43,50`), mas a barra fixa de seleção "N selecionada(s) /
 * Cancelar seleção / Agrupar selecionadas" de `ListaProducaoPage.tsx` (`z-[150]`) continuava
 * renderizada por baixo do modal, sobrepondo visualmente o botão "Agrupar" do modal — um clique de
 * mouse real nesse ponto atingia a barra externa, não o modal. `click({ force: true })` não
 * contornava (o clique físico ainda é roteado pelas coordenadas de tela; quem está por cima recebe
 * o evento, força ou não). **Corrigido por #165** (commit `5007ad8`): `ListaProducaoPage.tsx`
 * ganhou o estado `barraSelecaoOculta`, setado em `abrirModalAgrupar()` (antes de abrir o modal) e
 * a barra passou a renderizar condicionada a `modoAgrupamento && !barraSelecaoOculta` — a barra
 * some assim que o modal abre, sem esperar o sucesso do agrupamento. Confirmado empiricamente
 * nesta re-homologação: um `.click()` real no botão "Agrupar" do modal agora funciona sem
 * `force`/`dispatchEvent`. `confirmarAgrupamento` abaixo foi simplificada para um clique real.
 */

async function abrirModalAgrupar(page: Page) {
  await page.getByRole('button', { name: 'Agrupar selecionadas', exact: true }).click()
}

async function preencherJustificativa(page: Page, texto: string) {
  await page.getByLabel(/Justificativa/).fill(texto)
}

/** Clique real — o bug de z-index (barra de seleção sobrepondo o modal) foi corrigido em #165. */
async function confirmarAgrupamento(page: Page) {
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click({ timeout: 8000 })
}

function amanha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

async function criarProducaoComData(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  produtoId: string,
  dataInicio: string,
  dataTerminoPrevista = amanha()
) {
  const res = await request.post(`${API_URL}/producoes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataInicio, dataTerminoPrevista, produtos: [{ produtoId, quantidade: 1 }] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produção com dataInicio: ${res.status()} ${await res.text()}`)
  return res.json()
}

test.describe('Cenários 191-195 — Agrupar Produções (Fluxo I) (#122)', () => {
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

  test('191 — agrupar duas produções AGUARDANDO_INICIO gera nova PRD sem movimentar estoque', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA191-Insumo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 100, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA191-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const prd1 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    criadasProducaoIds.push(prd2.id)

    const insumoAntes = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    let novaId = ''
    page.on('response', res => {
      if (res.url().includes('/producoes/agrupar') && res.request().method() === 'POST') {
        res.json().then(body => { novaId = body.producaoNova?.id ?? '' })
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    // Estado destino default do modal já é AGUARDANDO_INICIO — não precisa trocar (Cenário 191).
    await preencherJustificativa(page, 'Agrupamento de teste automatizado — cenário 191, sem consumo real declarado.')
    await confirmarAgrupamento(page)

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => novaId, { timeout: 5000 }).not.toBe('')
    criadasProducaoIds.push(novaId)

    const nova = await buscarProducao(request, token, novaId)
    expect(nova.estado).toBe('AGUARDANDO_INICIO')
    const produtoNaNova = nova.produtos.find((p: any) => p.produtoId === produto.id)
    expect(produtoNaNova?.quantidade).toBe(3) // 1 (prd1) + 2 (prd2), consolidado por produto (RN-061)

    const prd1Depois = await buscarProducao(request, token, prd1.id)
    const prd2Depois = await buscarProducao(request, token, prd2.id)
    expect(prd1Depois.estado).toBe('NAO_REALIZADA')
    expect(prd2Depois.estado).toBe('NAO_REALIZADA')
    expect(prd1Depois.justificativaNaoRealizada).toContain(nova.identificador)
    expect(prd2Depois.justificativaNaoRealizada).toContain(nova.identificador)

    const insumoDepois = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(insumoAntes.estoqueAtual)
  })

  test('192 — agrupar com produção EM_ANDAMENTO exige declaração de consumo real', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA192-Insumo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 100, 'DECIMAL')
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA192-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 10 }], 1)
    criadosProdutoIds.push(produto.id)

    const prd1 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 3 }]) // baixa 30
    criadasProducaoIds.push(prd2.id)

    const estoqueAposInicio = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(estoqueAposInicio.estoqueAtual).toBe(70) // 100 - 30

    const payloads: string[] = []
    page.on('request', req => {
      if (req.url().includes('/producoes/agrupar') && req.method() === 'POST') payloads.push(req.postData() ?? '')
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    // Só a produção EM_ANDAMENTO (prd2) exige declaração — os insumos baixados dela aparecem com
    // a quantidade original ("Baixado: X un", ConsumoRealSection.tsx:33).
    await expect(page.getByText(`Baixado: 30 ${insumo.unidadeMedida ?? 'un'}`)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(nomeInsumo)).toBeVisible()

    await preencherJustificativa(page, 'Agrupamento de teste automatizado — cenário 192, consumo real igual ao original.')
    await confirmarAgrupamento(page)

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    expect(payloads.length).toBe(1)
    console.log('PAYLOAD consumoRealPorProducao (cenário 192):', payloads[0])
    const payload = JSON.parse(payloads[0])
    // Não editado na UI → filtro de divergência (linha 65-69) produz array vazio, chave presente.
    expect(payload.consumoRealPorProducao).toEqual({ [prd2.id]: [] })
  })

  test('193 — produção FINALIZADA não pode ser selecionada para agrupar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA193-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA193-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const emAndamento = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(emAndamento.id)
    const finalizada = await finalizarProducaoViaApi(request, token, emAndamento.id)
    expect(finalizada.estado).toBe('FINALIZADA')

    const aguardando = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(aguardando.id)

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)

    const checkboxFinalizada = linhaProducaoDesktop(page, finalizada.identificador).locator('button')
    await expect(checkboxFinalizada).toBeDisabled()

    const checkboxAguardando = linhaProducaoDesktop(page, aguardando.identificador).locator('button')
    await expect(checkboxAguardando).toBeEnabled()
  })

  test('194 — agrupamento com destino EM_ANDAMENTO e insumo bloqueante nasce TRAVADA', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA194-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, false) // sem estoque, não permite negativo
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA194-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const prd1 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd2.id)

    let novaId = ''
    page.on('response', res => {
      if (res.url().includes('/producoes/agrupar') && res.request().method() === 'POST') {
        res.json().then(body => { novaId = body.producaoNova?.id ?? '' })
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    await page.getByLabel(/Estado destino/).selectOption('EM_ANDAMENTO')
    await preencherJustificativa(page, 'Agrupamento de teste automatizado — cenário 194, insumo bloqueante esperado.')
    await confirmarAgrupamento(page)

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => novaId, { timeout: 5000 }).not.toBe('')
    criadasProducaoIds.push(novaId)

    const nova = await buscarProducao(request, token, novaId)
    expect(nova.estado).toBe('TRAVADA')
  })

  test('RN-052 (P-FE-CORRIGE-003) — agrupar com destino EM_ANDAMENTO e aviso pendente é tratado via modal de confirmação', async ({ page, request }) => {
    // Corrigido em P-FE-CORRIGE-003: `producaoService.agrupar` agora é tipado como união
    // (AgruparResponse | ConfirmacaoEstoqueNegativoResponse) e `handleAgrupar`/`handleConfirmarAviso`
    // (AgruparProducoesModal.tsx) checam `isConfirmacaoEstoqueNegativoResponse` antes de acessar
    // `producaoNova`. Quando pendente, abre `ConfirmarEstoqueNegativoModal` (mesmo componente já
    // usado em Iniciar/Retomar) e reenvia com `confirmarEstoqueNegativoInsumoIds`.
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RN052-Agrupar-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 0, true) // permite negativo → aviso, não bloqueio
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RN052-Agrupar-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const prd1 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(prd2.id)

    let novaId = ''
    page.on('response', res => {
      if (res.url().includes('/producoes/agrupar') && res.request().method() === 'POST') {
        res.json().then(body => { novaId = body.producaoNova?.id ?? '' })
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    await page.getByLabel(/Estado destino/).selectOption('EM_ANDAMENTO')
    await preencherJustificativa(page, 'Agrupamento de teste automatizado — RN-052, aviso pendente tratado via modal.')
    await confirmarAgrupamento(page)

    // Modal de confirmação real aparece — não mais "Erro ao agrupar produções." genérico.
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Erro ao agrupar produções.')).toHaveCount(0)

    // Nada gravado ainda nesse ponto.
    const prd1Antes = await buscarProducao(request, token, prd1.id)
    expect(prd1Antes.estado).toBe('AGUARDANDO_INICIO')

    await dialog.getByRole('button', { name: 'Confirmar mesmo assim', exact: true }).click()

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => novaId, { timeout: 5000 }).not.toBe('')
    criadasProducaoIds.push(novaId)

    const nova = await buscarProducao(request, token, novaId)
    expect(nova.estado).toBe('EM_ANDAMENTO')
    const prd1Depois = await buscarProducao(request, token, prd1.id)
    const prd2Depois = await buscarProducao(request, token, prd2.id)
    expect(prd1Depois.estado).toBe('NAO_REALIZADA')
    expect(prd2Depois.estado).toBe('NAO_REALIZADA')
  })

  test('213 (era 195) — datas da nova produção agrupada herdam a mais recente e são editáveis', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): corrigido por #164 (commit 988ff3b) — AgruparProducoesModal.tsx:42
    // agora inicializa `dataInicio` via `useState(() => dataInicioMaisRecente(producoes))`, réplica
    // no frontend do `Comparator` do backend (RN-074). Assertiva `.soft` (documentava o campo nascendo
    // vazio) trocada por assertiva normal — o campo já vem pré-preenchido de fato.
    const token = await apiLogin(request)
    const nomeInsumo = `QA213-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA213-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const hoje = new Date().toISOString().slice(0, 10)
    const dataAmanha = amanha()
    const prd1 = await criarProducaoComData(request, token, produto.id, hoje)
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoComData(request, token, produto.id, dataAmanha)
    criadasProducaoIds.push(prd2.id)

    let novaId = ''
    page.on('response', res => {
      if (res.url().includes('/producoes/agrupar') && res.request().method() === 'POST') {
        res.json().then(body => { novaId = body.producaoNova?.id ?? '' })
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    const inputDataInicio = page.getByRole('dialog').getByLabel(/Data de início/)

    // Corrigido por #164: o campo já vem pré-preenchido com a data mais recente entre as
    // produções selecionadas (dataAmanha), sem precisar deixar vazio para o backend herdar.
    await expect(inputDataInicio).toHaveValue(dataAmanha)

    await preencherJustificativa(page, 'Agrupamento de teste automatizado — cenário 213, verificação de herança de datas.')
    await confirmarAgrupamento(page)

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => novaId, { timeout: 5000 }).not.toBe('')
    criadasProducaoIds.push(novaId)

    const nova = await buscarProducao(request, token, novaId)
    // Campo veio pré-preenchido com a data mais recente e foi enviado assim (sem editar) — a
    // produção nova herdou o mesmo valor.
    expect(nova.dataInicio.slice(0, 10)).toBe(dataAmanha)
  })

  test('195b — campo de data de início é editável e sobrepõe a herança quando preenchido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA195b-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA195b-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const hoje = new Date().toISOString().slice(0, 10)
    const dataAmanha = amanha()
    const dataEditada = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) // depois de amanhã
    const prd1 = await criarProducaoComData(request, token, produto.id, hoje)
    criadasProducaoIds.push(prd1.id)
    const prd2 = await criarProducaoComData(request, token, produto.id, dataAmanha)
    criadasProducaoIds.push(prd2.id)

    let novaId = ''
    page.on('response', res => {
      if (res.url().includes('/producoes/agrupar') && res.request().method() === 'POST') {
        res.json().then(body => { novaId = body.producaoNova?.id ?? '' })
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await ativarModoAgrupamento(page)
    await selecionarParaAgrupar(page, [prd1.identificador, prd2.identificador])
    await abrirModalAgrupar(page)

    const inputDataInicio = page.getByRole('dialog').getByLabel(/Data de início/)
    await inputDataInicio.fill(dataEditada)
    await expect(inputDataInicio).toHaveValue(dataEditada)

    await preencherJustificativa(page, 'Agrupamento de teste automatizado — cenário 195b, edição manual da data.')
    await confirmarAgrupamento(page)

    await expect(page.getByText(/Produções agrupadas em PRD-\d+/)).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => novaId, { timeout: 5000 }).not.toBe('')
    criadasProducaoIds.push(novaId)

    const nova = await buscarProducao(request, token, novaId)
    expect(nova.dataInicio.slice(0, 10)).toBe(dataEditada)
  })
})
