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
  finalizarProducaoViaApi,
  travarProducaoViaApi,
  arrastarCard,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * Homologação P-QA-004 / OpenProject #123-#124 — Kanban de Produção (Fluxo F), cenários
 * 181-184a. Mesma regra dos prompts anteriores: cenários que falham documentam o delta
 * Gherkin-vs-real com file:line, não são adaptados ao comportamento observado.
 *
 * Achados de leitura de código:
 * - Kanban reutiliza GET /producoes (mesmo endpoint da lista) — `carregarKanban()`
 *   (ListaProducaoPage.tsx:312-323) chama `producaoService.listar({busca, page:0, size:100})`,
 *   sem endpoint próprio.
 * - As 5 colunas são uma constante FIXA `KANBAN_COLUMNS_PRODUCAO` (ListaProducaoPage.tsx:26-32):
 *   AGUARDANDO_INICIO, EM_ANDAMENTO, TRAVADA, FINALIZADA, e uma 5ª coluna de id "CANCELADA"
 *   rotulada "Cancelada / Não realizada". `getColumnId()` (linha 34) mapeia o estado
 *   NAO_REALIZADA para o id de coluna "CANCELADA" sempre — não existe nenhum estado ou UI de
 *   "filtro de colunas visíveis"; NAO_REALIZADA nunca aparece como coluna própria, em hipótese
 *   alguma.
 * - Soltar o card dispara `handleDragEnd` (KanbanBoard.tsx:80-90) → `onDrop` prop = função
 *   `handleKanbanDrop` (ListaProducaoPage.tsx), que consulta a tabela estática
 *   `TRANSICOES_KANBAN` por `[colunaOrigem][colunaDestino]`. Três tipos de
 *   transição: `modal` (abre modal existente, ex. iniciar/travar/finalizar), `navegar`
 *   (ATUALIZADO em OpenProject #160 — antes navegava para `/producao/{id}/cancelar`; agora abre
 *   `CancelarProducaoConsumoModal` por cima do próprio Kanban, sem sair da tela, igual ao tipo
 *   `modal`. O nome do tipo `'navegar'` ficou desatualizado — mantido só para não renomear a
 *   tabela `TRANSICOES_KANBAN` sem necessidade), `direto` (chama a API imediatamente, só usado em
 *   TRAVADA→EM_ANDAMENTO via retomar).
 * - NÃO há movimento otimista: `getItemColumn` deriva sempre do `producao.estado` real vindo da
 *   última resposta de `GET /producoes` — o card só migra de coluna depois de `carregarKanban()`
 *   recarregar os dados após a API confirmar a transição (ex. `handleSuccess`, linha 346-351).
 * - `KanbanBoard.tsx` não tem nenhum `data-testid` em colunas ou cards.
 * - Abordagem de drag-and-drop via mouse que funcionou (ver `arrastarCard` em
 *   `e2e/helpers/producao.ts`): sequência manual `page.mouse.move/down/move.../up` com um
 *   "jiggle" inicial de +10px (supera o `activationConstraint: {distance: 6}` do `PointerSensor`)
 *   e 20 passos intermediários de 50ms cada. `page.dragAndDrop()` nativo NÃO moveu o estado real
 *   (testado, sem sucesso — o card nunca saiu da coluna original).
 * - P-FE-CORRIGE-009 (V0.6.1): `KanbanBoard.tsx` ganhou `KeyboardSensor` (além do `PointerSensor`
 *   já existente, não em substituição) com um `coordinateGetter` próprio que move o card por
 *   coluna inteira (não por pixels) usando a ordem de `columns`/`context.droppableRects` do
 *   dnd-kit — testes 203-205 abaixo cobrem o fluxo só de teclado (Tab, Space/Enter, setas,
 *   Escape), sem nenhum evento de mouse.
 *
 * Re-homologação P-TESTE-001 (V0.6.1): testes 182 e 184 renomeados para a numeração oficial atual
 * (200 e 202). 182→200 reescrito por completo (mecanismo real mudou de "coluna visível" para
 * "filtro de estado com badge distinto" — #159); 184→202 só renomeado, comportamento já correto.
 *
 * Re-homologação (achados restantes, onda pós-P-TESTE-001): teste 181→199 renomeado. Suspeita
 * inicial de dados NAO_REALIZADA acumulados (ver FRENTE 2/reset de banco no relatório final) só
 * explicava parte do problema — mesmo com banco limpo, o pill de filtro "Não realizada"
 * (ListaProducaoPage.tsx:601) é renderizado incondicionalmente, então a asserção literal do
 * Gherkin nunca fecha em 0. Ajustado para validar o comportamento real; mesmo gap de produto já
 * registrado no Cenário 200 (#159), não é bug independente.
 */

test.describe('Cenários 181-184a — Kanban de Produção (Fluxo F) (#123-#124)', () => {
  // As 5 colunas (280px + gap cada) não cabem no viewport padrão do Playwright (1280px) —
  // viewport alargado garante todas as colunas visíveis simultaneamente, sem depender de
  // auto-scroll (que o KanbanBoard não implementa). Ver também a nota de geometria em
  // `arrastarCard` (e2e/helpers/producao.ts) sobre o ponto exato do drop dentro da coluna.
  test.use({ viewport: { width: 2200, height: 1000 } })

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

  test('199 (era 181) — colunas padrão visíveis no Kanban', async ({ page }) => {
    // Re-homologação (achados restantes, onda pós-P-TESTE-001): investigação inicial suspeitou de
    // dados NAO_REALIZADA acumulados entre execuções (sem reset de banco — ver FRENTE 2 do relatório
    // final). Com o reset implementado (e2e/global-setup.ts, TRUNCATE antes da suíte) a asserção de
    // contagem exata de "Não realizada" na tela inteira se mostrou não confiável mesmo assim: o pill
    // de filtro (FILTERS, ListaProducaoPage.tsx:122, renderizado incondicionalmente no cabeçalho
    // compartilhado por Lista/Kanban, linha 601) sempre soma 1, e outras specs da MESMA suíte (rodam
    // antes deste arquivo em ordem alfabética) legitimamente criam produções NAO_REALIZADA reais via
    // divisão/agrupamento, que nunca são removidas (estado terminal, sem hard-delete) — o total varia
    // com a composição da suíte, não é um bug. Causa raiz de produto confirmada (mesma do Cenário
    // 200, #159): a coluna própria nunca existe (checado abaixo por cabeçalho), mas o mecanismo
    // "oculto por padrão" nunca existiu de fato — sempre houve pelo menos o pill de filtro visível.
    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(800)

    const colunas = page.locator('div.rounded-t-card')
    await expect(colunas).toHaveCount(5)
    for (const label of ['Aguardando início', 'Em andamento', 'Travada', 'Finalizada']) {
      await expect(colunas.filter({ hasText: label })).toHaveCount(1)
    }
    // não existe coluna própria "Não realizada" — está sempre fundida em "Cancelada / Não realizada"
    await expect(colunas.filter({ hasText: 'Cancelada' })).toHaveCount(1)
    await expect(colunas.filter({ hasText: 'Não realizada', hasNotText: 'Cancelada' })).toHaveCount(0)
    // O pill de filtro (gap do Cenário 200) está sempre visível, independente de dados.
    await expect(page.getByRole('button', { name: 'Não realizada', exact: true })).toBeVisible()
  })

  test('200 (era 182) — filtro de estado no Kanban isola NÃO_REALIZADA na coluna compartilhada, com badge distinto', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): #159 mudou a solução de raiz — não existe (e continua não
    // existindo) um "filtro de colunas visíveis"/checkbox de coluna como o Gherkin original
    // descreve; NAO_REALIZADA continua permanentemente fundida com CANCELADA na mesma coluna
    // física "Cancelada / Não realizada" (getColumnId, ListaProducaoPage.tsx:36). O que #159
    // entregou foi diferente: o Kanban passou a reaproveitar os mesmos pills de filtro por estado
    // da Listagem (FILTERS, incluindo "Não realizada") e cada card na coluna compartilhada agora
    // mostra um badge (CANCELADA vs NÃO_REALIZADA) que antes não existia — commit 11984b8.
    // Resolve a necessidade funcional (distinguir/isolar NÃO_REALIZADA) por um caminho diferente
    // do descrito no Gherkin original (sem criar uma coluna própria). Documentado aqui como
    // decisão de produto observada, não como bug — mas vale confirmação explícita do usuário se
    // isso encerra ou não o Cenário 200 como está escrito no SCENARIOS.md (ver relatório final).
    const token = await apiLogin(request)
    const nomeInsumo = `QA200-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA200-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    // Gera uma NAO_REALIZADA de verdade via divisão (única forma alcançável — RN-065/066) — precisa
    // de 2 produtos na mesma produção, um liberado e um bloqueante, senão não há o que dividir
    // (mesmo setup do teste 161 em iniciar-travar-retomar.spec.ts).
    const nomeInsumoOk = `QA200-InsumoOk-${Date.now()}`
    const insumoOk = await criarInsumoComEstoque(request, token, nomeInsumoOk, 100, false)
    const nomeInsumoBloq = `QA200-InsumoBloq-${Date.now()}`
    const insumoBloq = await criarInsumoComEstoque(request, token, nomeInsumoBloq, 0, false)
    criadosInsumoIds.push(insumoOk.id, insumoBloq.id)
    const nomeProdutoOk = `QA200-ProdutoOk-${Date.now()}`
    const produtoOk = await criarProdutoComFicha(request, token, nomeProdutoOk, [{ insumoId: insumoOk.id, quantidade: 1 }], 1)
    const nomeProdutoBloq = `QA200-ProdutoBloq-${Date.now()}`
    const produtoBloq = await criarProdutoComFicha(request, token, nomeProdutoBloq, [{ insumoId: insumoBloq.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoOk.id, produtoBloq.id)
    const producaoOriginal = await criarProducaoViaApi(request, token, [
      { produtoId: produtoOk.id, quantidade: 1 },
      { produtoId: produtoBloq.id, quantidade: 1 },
    ])
    criadasProducaoIds.push(producaoOriginal.id)
    const resIniciar = await iniciarProducaoViaApi(request, token, producaoOriginal.id, true) // dividir=true
    const divisao = await resIniciar.json()
    expect(divisao.producaoOriginal.estado).toBe('NAO_REALIZADA')
    criadasProducaoIds.push(divisao.producaoA.id, divisao.producaoB.id)
    const identificadorNaoRealizada = divisao.producaoOriginal.identificador as string

    // E uma CANCELADA comum, para provar que o filtro realmente separa as duas dentro da mesma coluna.
    const producaoCancelavel = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    await request.post(`${API_URL}/producoes/${producaoCancelavel.id}/cancelar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { justificativa: 'Cancelamento de teste automatizado — cenário 200, isolar NÃO_REALIZADA no filtro.' },
    })
    criadasProducaoIds.push(producaoCancelavel.id)
    const identificadorCancelada = producaoCancelavel.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(800)

    const colunaCompartilhada = page.locator('div.rounded-t-card', { hasText: 'Cancelada' }).locator('xpath=../..')
    await expect(colunaCompartilhada.getByText(identificadorNaoRealizada, { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(colunaCompartilhada.getByText(identificadorCancelada, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Não realizada', exact: true }).click()
    await page.waitForTimeout(600)

    await expect(colunaCompartilhada.getByText(identificadorNaoRealizada, { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(colunaCompartilhada.getByText(identificadorCancelada, { exact: true })).toHaveCount(0)
  })

  test('183 — arrastar card FINALIZADA para outra coluna é bloqueado e o card retorna', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA183-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA183-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const finalizada = await finalizarProducaoViaApi(request, token, producao.id)
    expect(finalizada.estado).toBe('FINALIZADA')
    const identificador = finalizada.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await arrastarCard(page, identificador, 'Aguardando início')

    await expect(page.getByText('Transição não permitida')).toBeVisible({ timeout: 5000 })

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('FINALIZADA')

    const colunaFinalizada = page.locator('div.rounded-t-card', { hasText: 'Finalizada' }).locator('xpath=../..')
    await expect(colunaFinalizada.getByText(identificador, { exact: true })).toBeVisible()
  })

  test('202 (era 184) — arrastar EM_ANDAMENTO para CANCELADA abre modal de cancelamento e reverte se cancelado', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): já refletia o comportamento real (#160) antes desta rodada —
    // renomeado para a numeração oficial (SCENARIOS.md Cenário 202), sem mudança de asserções.
    const token = await apiLogin(request)
    const nomeInsumo = `QA184-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA184-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const identificador = producao.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await arrastarCard(page, identificador, 'Cancelada')

    // OpenProject #160: EM_ANDAMENTO→CANCELADA agora abre `CancelarProducaoConsumoModal` por
    // cima do próprio Kanban (sem navegar para /producao/{id}/cancelar) — mesmo padrão já usado
    // para AGUARDANDO_INICIO→CANCELADA (tipo `modal`/CancelarProducaoModal). Fechar sem confirmar
    // não altera o estado real (nenhuma chamada a POST /cancelar foi feita), então o card
    // continua em EM_ANDAMENTO após o Kanban recarregar.
    await expect(page.getByText('Cancelar produção')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/producao$/)
    await expect(page.getByText(nomeInsumo)).toBeVisible()

    await page.getByRole('dialog').getByText('Fechar', { exact: true }).click()
    await expect(page.getByText('Cancelar produção')).toHaveCount(0)

    const colunaEmAndamento = page.locator('div.rounded-t-card', { hasText: 'Em andamento' }).locator('xpath=../..')
    await expect(colunaEmAndamento.getByText(identificador, { exact: true })).toBeVisible()
  })

  test('184a — arrastar qualquer card para NÃO_REALIZADA é bloqueado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA184a-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA184a-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(800)

    // Achado de homologação: a precondição do Gherkin ("a coluna NÃO_REALIZADA está visível")
    // nunca se realiza — KANBAN_COLUMNS_PRODUCAO (ListaProducaoPage.tsx:26-32) hardcoda 5
    // colunas fixas, sem nenhum caminho de código que renderize "Não realizada" como coluna
    // separada (ver achado do Cenário 182). A asserção abaixo procura essa coluna antes de
    // sequer tentar o drag, e deve falhar por elemento inexistente.
    await expect(page.locator('div.rounded-t-card', { hasText: 'Não realizada' })).toBeVisible({ timeout: 5000 })
  })

  // ---------------------------------------------------------------------------------------------
  // P-FE-CORRIGE-009 — KeyboardSensor (RN-052 não se aplica aqui, sem regra de negócio nova)
  // ---------------------------------------------------------------------------------------------

  /** O identificador (ex. "PRD-1") fica num <span> sem tabIndex — o elemento de fato focável/
   *  arrastável via teclado é o div ancestral que o `useDraggable` do dnd-kit marca com tabIndex
   *  (KanbanBoard.tsx, `KanbanCard`). Focar/checar foco tem que mirar esse ancestral, não o texto. */
  function cardLocator(page: import('@playwright/test').Page, identificador: string) {
    return page.getByText(identificador, { exact: true }).locator('xpath=ancestor::div[@tabindex][1]')
  }

  /** Tab real a partir do campo de busca até o foco alcançar o card — prova alcançabilidade por
   *  teclado de verdade, sem assumir uma contagem fixa de tab-stops. */
  async function tabAteCard(page: import('@playwright/test').Page, identificador: string, maxTentativas = 25) {
    for (let i = 0; i < maxTentativas; i++) {
      await page.keyboard.press('Tab')
      const focado = await page.evaluate(() => document.activeElement?.textContent ?? '')
      if (focado.includes(identificador)) return
    }
    throw new Error(`Tab não alcançou o card ${identificador} em ${maxTentativas} tentativas`)
  }

  test('203 (KeyboardSensor) — Tab foca o card; Space/seta/Space move TRAVADA → EM_ANDAMENTO via teclado, mesmo onDrop do mouse', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA203-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA203-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const travada = await travarProducaoViaApi(request, token, producao.id, 'Trava de teste automatizado — cenário 203, drag via teclado.')
    expect(travada.estado).toBe('TRAVADA')
    const identificador = travada.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await expect(page.getByText(identificador, { exact: true })).toBeVisible()

    // Tab real desde a busca — nenhum clique de mouse depois daqui.
    await tabAteCard(page, identificador)
    await expect(cardLocator(page, identificador)).toBeFocused()

    // Space "pega" o card — o DragOverlay clona o conteúdo, então o texto do identificador
    // passa a existir 2x na tela (original com opacidade reduzida + clone flutuante).
    await page.keyboard.press('Space')
    await expect(page.getByText(identificador, { exact: true })).toHaveCount(2)

    // TRAVADA é a 2ª coluna (índice 1), EM_ANDAMENTO é a 3ª (índice 2) — 1 seta basta. Espera o
    // dnd-kit recalcular colisão/`over` (efeito assíncrono) antes de confirmar o drop — sem isso o
    // 2º Space corre risco de fechar o arraste com `over` ainda apontando pra coluna antiga.
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(250)
    await page.keyboard.press('Space')

    // tipo "direto" (TRAVADA→EM_ANDAMENTO) chama /retomar direto, sem modal — mesmo onDrop do mouse.
    await expect(page.getByText('Produção retomada.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(identificador, { exact: true })).toHaveCount(1) // overlay sumiu

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('EM_ANDAMENTO')

    const colunaEmAndamento = page.locator('div.rounded-t-card', { hasText: 'Em andamento' }).locator('xpath=../..')
    await expect(colunaEmAndamento.getByText(identificador, { exact: true })).toBeVisible()
  })

  test('204 (KeyboardSensor) — respeita allowedTransitions: FINALIZADA não pode ir pra Aguardando início via teclado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA204-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA204-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const finalizada = await finalizarProducaoViaApi(request, token, producao.id)
    expect(finalizada.estado).toBe('FINALIZADA')
    const identificador = finalizada.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    // Foco direto (alcançabilidade real por Tab já provada no teste 203) — aqui o alvo é a
    // regra de negócio: teclado não pode fazer o mouse não permitiria.
    await cardLocator(page, identificador).focus()
    await page.keyboard.press('Space')
    await expect(page.getByText(identificador, { exact: true })).toHaveCount(2) // pego

    // FINALIZADA é a 4ª coluna (índice 3), Aguardando início é a 1ª (índice 0) — 3 setas, com
    // espera entre elas pro dnd-kit recalcular colisão a cada passo (mesmo motivo do teste 203).
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(150)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(150)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(250)
    await page.keyboard.press('Space')

    await expect(page.getByText('Transição não permitida')).toBeVisible({ timeout: 5000 })

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('FINALIZADA')

    const colunaFinalizada = page.locator('div.rounded-t-card', { hasText: 'Finalizada' }).locator('xpath=../..')
    await expect(colunaFinalizada.getByText(identificador, { exact: true })).toBeVisible()
  })

  test('205 (KeyboardSensor) — Escape cancela o arraste sem mover o card e sem chamar onDrop', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA205-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA205-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const identificador = producao.identificador as string

    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(800)

    await cardLocator(page, identificador).focus()
    await page.keyboard.press('Space')
    await expect(page.getByText(identificador, { exact: true })).toHaveCount(2) // pego

    await page.keyboard.press('ArrowRight') // rumo a FINALIZADA, ainda não confirmado
    await page.keyboard.press('Escape')

    await expect(page.getByText(identificador, { exact: true })).toHaveCount(1) // overlay sumiu, sem soltar
    await page.waitForTimeout(1000) // tempo de sobra pra um toast indevido aparecer, se houver
    await expect(page.getByText('Transição não permitida')).toHaveCount(0) // onDrop nunca foi chamado

    const depois = await buscarProducao(request, token, producao.id)
    expect(depois.estado).toBe('EM_ANDAMENTO') // inalterado

    const colunaEmAndamento = page.locator('div.rounded-t-card', { hasText: 'Em andamento' }).locator('xpath=../..')
    await expect(colunaEmAndamento.getByText(identificador, { exact: true })).toBeVisible()
  })
})
