import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducoesEmLote,
  iniciarProducaoViaApi,
  finalizarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-004 / OpenProject #122 — Lista de Produções (Fluxo E), cenários 177-180.
 * Mesma regra dos prompts anteriores: cenários que falham documentam o delta Gherkin-vs-real
 * com file:line, não são adaptados ao comportamento observado.
 *
 * Achados de leitura de código:
 * - GET /producoes aceita apenas `busca` (String) e `estado` (EstadoProducao) como filtros
 *   explícitos (ProducaoController.java:33-38), mais paginação via Spring `Pageable`
 *   (@PageableDefault(size = 20)) — que aceita implicitamente `?sort=campo,dir`, mas NADA no
 *   frontend jamais constrói ou envia esse parâmetro.
 * - Não existe cabeçalho de coluna clicável na lista: o cabeçalho é texto estático
 *   `['Produção','Produtos','Datas','Estado','','']` sem onClick, sem estado de ordenação
 *   (ListaProducaoPage.tsx:526-532). O rótulo da coluna de datas é "Datas", não "Data de início".
 * - Cada linha renderiza duas vezes no DOM (ProducaoRow para desktop `sm:grid`, ProducaoCard
 *   para mobile `sm:hidden`) — para contar linhas sem duplicar, os specs abaixo contam
 *   `div.sm\:grid` (só a variante desktop, visível no viewport padrão do Playwright).
 *
 * Re-homologação P-TESTE-001 (V0.6.1): teste 179 renomeado para 197 (numeração oficial atual) e
 * reescrito — cabeçalhos de coluna agora são clicáveis de verdade (#158), consolidando também a
 * cobertura de RN-NOVA-6 (ordenação interativa, Bloco 2) nesta mesma spec.
 */

function linhasDesktop(page: import('@playwright/test').Page) {
  // .cursor-pointer exclui o cabeçalho estático da tabela, que também usa a classe sm:grid
  // (ListaProducaoPage.tsx:526) mas não é clicável — só ProducaoRow (as linhas de dado) tem.
  return page.locator('div.sm\\:grid.cursor-pointer')
}

test.describe('Cenários 177-180 — Lista de Produção (Fluxo E) (#122)', () => {
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

  test('177 — lista pagina 25 produções em 20 + 5, "Carregar mais" some ao final', async ({ page, request }) => {
    test.setTimeout(60_000)
    const token = await apiLogin(request)
    const nomeInsumo = `QA177-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA177-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const criadas = await criarProducoesEmLote(request, token, produto.id, 25)
    criadasProducaoIds.push(...criadas.map(c => c.id))

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)

    await expect(linhasDesktop(page)).toHaveCount(20, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toBeVisible()

    await page.getByRole('button', { name: /Carregar mais/ }).click()
    await expect(linhasDesktop(page)).toHaveCount(25, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
  })

  test('178 — aplicar filtro de status reseta a paginação para os resultados filtrados', async ({ page, request }) => {
    test.setTimeout(90_000)
    const token = await apiLogin(request)
    const nomeInsumo = `QA178-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA178-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const genericas = await criarProducoesEmLote(request, token, produto.id, 40)
    criadasProducaoIds.push(...genericas.map(c => c.id))
    const emAndamento = await criarProducoesEmLote(request, token, produto.id, 5)
    criadasProducaoIds.push(...emAndamento.map(c => c.id))
    for (const p of emAndamento) {
      const r = await iniciarProducaoViaApi(request, token, p.id)
      expect(r.ok()).toBe(true)
    }

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)
    await expect(linhasDesktop(page)).toHaveCount(20, { timeout: 10_000 })
    await page.getByRole('button', { name: /Carregar mais/ }).click()
    await expect(linhasDesktop(page)).toHaveCount(40, { timeout: 10_000 })

    await page.getByRole('button', { name: 'Em andamento', exact: true }).click()
    await page.waitForTimeout(600)

    await expect(linhasDesktop(page)).toHaveCount(5, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)
  })

  test('197 (era 179) — RN-NOVA-6 (#158 + item avulso numero): ordenação interativa por cabeçalho de coluna', async ({ page, request }) => {
    // Re-homologação (P-TESTE-001): #158 adicionou cabeçalhos clicáveis reais (SortableHeader,
    // ListaProducaoPage.tsx:133-153) — o achado original (cabeçalho "Datas" estático, sem onClick)
    // não existe mais. Cobre os 4 campos hoje ligados na UI (dataInicio, estado, produto,
    // quantidade — SortField, linha 131) via interceptação do `sort` real enviado a GET
    // /producoes, e o default (sem interação = sem parâmetro `sort` = numero DESC no backend).
    //
    // GAP encontrado (não corrigido aqui — fora de escopo de QA, é trabalho de Frontend): o backend
    // já aceita `numero` na allowlist de sort de GET /producoes (item avulso P-BE-NUMERO-SORT,
    // backend CONTRATO_API.md, adicionado no mesmo pocket) mas o frontend NÃO expõe a coluna
    // "Produção" (identificador PRD-N) como 5º cabeçalho ordenável — `type SortField` (linha 131)
    // só lista 'dataInicio' | 'estado' | 'produto' | 'quantidade', sem 'numero'. Reportado no
    // relatório final da tarefa para abertura de tarefa de Frontend.
    const token = await apiLogin(request)
    const nomeInsumo = `QA197-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA197-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const criadas = await criarProducoesEmLote(request, token, produto.id, 3)
    criadasProducaoIds.push(...criadas.map(c => c.id))

    const sortsCapturados: (string | null)[] = []
    page.on('request', req => {
      if (req.url().includes('/producoes?') && req.method() === 'GET') {
        sortsCapturados.push(new URL(req.url()).searchParams.get('sort'))
      }
    })

    await login(page)
    await page.goto('/producao')
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProduto)
    await page.waitForTimeout(600)
    await expect(linhasDesktop(page)).toHaveCount(3)

    // Default sem interação: nenhum parâmetro `sort` enviado (backend aplica numero DESC).
    expect(sortsCapturados[sortsCapturados.length - 1]).toBeNull()

    const casos: { label: string; campo: string }[] = [
      { label: 'Datas', campo: 'dataInicio' },
      { label: 'Estado', campo: 'estado' },
      { label: 'Produtos', campo: 'produto' },
      { label: 'Qtd.', campo: 'quantidade' },
    ]

    for (const { label, campo } of casos) {
      sortsCapturados.length = 0
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect.poll(() => sortsCapturados[sortsCapturados.length - 1]).toBe(`${campo},asc`)

      sortsCapturados.length = 0
      await page.getByRole('button', { name: label, exact: true }).click() // clique duplo (2º clique no mesmo campo) inverte
      await expect.poll(() => sortsCapturados[sortsCapturados.length - 1]).toBe(`${campo},desc`)
    }

    // GAP RN-NOVA-6: não existe cabeçalho "Produção"/numero clicável na UI — backend já suporta.
    await expect(page.getByRole('button', { name: 'Produção', exact: true })).toHaveCount(0)
  })

  test('180 — menu ⋮ mostra opções específicas por status (AGUARDANDO_INICIO / EM_ANDAMENTO / FINALIZADA)', async ({ page, request }) => {
    test.setTimeout(60_000)
    const token = await apiLogin(request)
    const nomeInsumo = `QA180-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)

    const nomeProdutoAI = `QA180-AguardandoInicio-${Date.now()}`
    const produtoAI = await criarProdutoComFicha(request, token, nomeProdutoAI, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    const nomeProdutoEA = `QA180-EmAndamento-${Date.now()}`
    const produtoEA = await criarProdutoComFicha(request, token, nomeProdutoEA, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    const nomeProdutoFI = `QA180-Finalizada-${Date.now()}`
    const produtoFI = await criarProdutoComFicha(request, token, nomeProdutoFI, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoAI.id, produtoEA.id, produtoFI.id)

    const [aguardando] = await criarProducoesEmLote(request, token, produtoAI.id, 1)
    criadasProducaoIds.push(aguardando.id)

    const [emAndamentoBase] = await criarProducoesEmLote(request, token, produtoEA.id, 1)
    criadasProducaoIds.push(emAndamentoBase.id)
    await iniciarProducaoViaApi(request, token, emAndamentoBase.id)

    const [finalizadaBase] = await criarProducoesEmLote(request, token, produtoFI.id, 1)
    criadasProducaoIds.push(finalizadaBase.id)
    await iniciarProducaoViaApi(request, token, finalizadaBase.id)
    await finalizarProducaoViaApi(request, token, finalizadaBase.id)

    await login(page)
    await page.goto('/producao')

    // AGUARDANDO_INICIO: Iniciar, Editar, Cancelar
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProdutoAI)
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Mais ações' }).first().click()
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    // EM_ANDAMENTO: Travar, Finalizar, Cancelar — sem Editar
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProdutoEA)
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Mais ações' }).first().click()
    await expect(page.getByRole('button', { name: 'Travar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')

    // FINALIZADA: nenhuma ação — nem o botão ⋮ é renderizado
    await page.getByPlaceholder('Buscar por produto…').fill(nomeProdutoFI)
    await page.waitForTimeout(600)
    await expect(linhasDesktop(page)).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Mais ações' })).toHaveCount(0)
  })
})
