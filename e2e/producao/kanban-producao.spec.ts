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
  arrastarCard,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

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
 *   `handleKanbanDrop` (ListaProducaoPage.tsx:358-389), que consulta a tabela estática
 *   `TRANSICOES_KANBAN` (linhas 38-52) por `[colunaOrigem][colunaDestino]`. Três tipos de
 *   transição: `modal` (abre modal existente, ex. iniciar/travar/finalizar), `navegar`
 *   (NAVEGA para outra página — usado em EM_ANDAMENTO→CANCELADA e TRAVADA→CANCELADA, chamando
 *   `navigate('/producao/{id}/cancelar')`, NÃO abre nenhum modal), `direto` (chama a API
 *   imediatamente, só usado em TRAVADA→EM_ANDAMENTO via retomar). Não existe nenhuma forma de
 *   "modal de cancelamento abrindo sobre o Kanban" — o cancelamento de EM_ANDAMENTO/TRAVADA
 *   sempre navega para fora da tela de Kanban.
 * - NÃO há movimento otimista: `getItemColumn` deriva sempre do `producao.estado` real vindo da
 *   última resposta de `GET /producoes` — o card só migra de coluna depois de `carregarKanban()`
 *   recarregar os dados após a API confirmar a transição (ex. `handleSuccess`, linha 346-351).
 * - `KanbanBoard.tsx` não tem nenhum `data-testid` em colunas ou cards.
 * - Abordagem de drag-and-drop que funcionou (ver `arrastarCard` em `e2e/helpers/producao.ts`):
 *   sequência manual `page.mouse.move/down/move.../up` com um "jiggle" inicial de +10px (supera
 *   o `activationConstraint: {distance: 6}` do `PointerSensor`) e 20 passos intermediários de
 *   50ms cada. `page.dragAndDrop()` nativo NÃO moveu o estado real (testado, sem sucesso — o
 *   card nunca saiu da coluna original). Simulação via teclado é estruturalmente impossível:
 *   `useSensors(useSensor(PointerSensor, ...))` (KanbanBoard.tsx:69) não registra nenhum
 *   `KeyboardSensor`, então `Space`/`ArrowRight` não acionam nada no dnd-kit.
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

  test('181 — colunas padrão visíveis no Kanban', async ({ page }) => {
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
    await expect(page.getByText('Não realizada', { exact: true })).toHaveCount(0)
  })

  test('182 — ativar NÃO_REALIZADA no filtro de colunas visíveis exibe a coluna', async ({ page }) => {
    await login(page)
    await page.goto('/producao')
    await page.getByRole('button', { name: 'Kanban' }).click()
    await page.waitForTimeout(800)

    // Achado de homologação: não existe nenhum "filtro de colunas visíveis" no Kanban — a única
    // entrada de filtro é a busca por produto (placeholder "Buscar por produto…",
    // ListaProducaoPage.tsx:588-593). NAO_REALIZADA está permanentemente fundida na coluna
    // "Cancelada / Não realizada" (getColumnId, linha 34) e nunca aparece separada, com ou sem
    // qualquer ação da artesã. A asserção abaixo procura o controle descrito no Gherkin, que não
    // existe, e deve falhar por timeout.
    await page.getByRole('checkbox', { name: /Não realizada/i }).click({ timeout: 5000 })
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

  test('184 — arrastar EM_ANDAMENTO para CANCELADA abre modal de cancelamento e reverte se cancelado', async ({ page, request }) => {
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

    // Achado de homologação: EM_ANDAMENTO→CANCELADA é do tipo `navegar`
    // (ListaProducaoPage.tsx:46, handleKanbanDrop:366-369) — não abre nenhum modal sobre o
    // Kanban, navega para a página cheia /producao/{id}/cancelar (confirmado: a asserção abaixo
    // acerta a URL de destino real). Não há movimento otimista nem "cancelar o modal para
    // reverter" possível — a artesã já foi tirada do Kanban antes de decidir qualquer coisa.
    // O Gherkin espera permanecer em /producao (Kanban) com um modal sobreposto; isso nunca
    // acontece, então a asserção fiel ao Gherkin (permanecer em /producao) deve falhar aqui.
    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}/cancelar$`), { timeout: 5000 })
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/producao$/)
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
})
