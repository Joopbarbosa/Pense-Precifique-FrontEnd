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
  retomarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação P-QA-004 / OpenProject #125 — Detalhe de Produção (Fluxo G), cenários 185-188.
 * Mesma regra dos prompts anteriores: cenários que falham documentam o delta Gherkin-vs-real
 * com file:line, não são adaptados ao comportamento observado.
 */

function secaoPorTitulo(page: import('@playwright/test').Page, titulo: string) {
  return page.locator('section', { has: page.getByRole('heading', { name: titulo }) })
}

test.describe('Cenários 185-188 — Detalhe de Produção (Fluxo G) (#125)', () => {
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

  test('185 — histórico de status exibe as 4 transições em ordem cronológica', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA185-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA185-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    await iniciarProducaoViaApi(request, token, producao.id) // AGUARDANDO_INICIO -> EM_ANDAMENTO
    await travarProducaoViaApi(request, token, producao.id, 'Trava manual para gerar a sequência de 4 transições do Cenário 185.') // -> TRAVADA
    const retomada = await retomarProducaoViaApi(request, token, producao.id) // -> EM_ANDAMENTO
    expect((await retomada.json()).estado).toBe('EM_ANDAMENTO')

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.historicoStatus.length).toBe(4)
    const datas = producaoApi.historicoStatus.map((h: { dataTransicao: string }) => h.dataTransicao)
    const datasOrdenadas = [...datas].sort()
    expect(datas).toEqual(datasOrdenadas) // já vem cronológico crescente da API

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    const secao = secaoPorTitulo(page, 'Histórico de status')
    const linhas = secao.locator('div.flex.items-start.gap-3.py-3')
    await expect(linhas).toHaveCount(4)

    const textosLinhas = await linhas.allTextContents()
    expect(textosLinhas[0]).toContain('Aguardando início')
    expect(textosLinhas[1]).toContain('Aguardando início')
    expect(textosLinhas[1]).toContain('Em andamento')
    expect(textosLinhas[2]).toContain('Em andamento')
    expect(textosLinhas[2]).toContain('Travada')
    expect(textosLinhas[3]).toContain('Travada')
    expect(textosLinhas[3]).toContain('Em andamento')
    expect(textosLinhas[2]).toContain('Trava manual para gerar a sequência de 4 transições do Cenário 185.')
  })

  test('186 — justificativa de trava manual aparece em destaque no cabeçalho e no histórico', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA186-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA186-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    const justificativa = 'Maquinário quebrado, aguardando manutenção técnica — Cenário 186.'
    await travarProducaoViaApi(request, token, producao.id, justificativa)

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Produção travada')).toBeVisible()
    const ocorrencias = page.getByText(justificativa)
    await expect(ocorrencias).toHaveCount(2) // caixa de destaque no cabeçalho + linha do histórico
  })

  test('187 — produção NÃO_REALIZADA exibe links clicáveis para as produções geradas pela divisão', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoA = `QA187-InsumoA-${Date.now()}`
    const insumoA = await criarInsumoComEstoque(request, token, nomeInsumoA, 100, false)
    const nomeInsumoB = `QA187-InsumoB-${Date.now()}`
    const insumoB = await criarInsumoComEstoque(request, token, nomeInsumoB, 0, false) // bloqueante
    criadosInsumoIds.push(insumoA.id, insumoB.id)

    const nomeA = `QA187-KitA-${Date.now()}`
    const produtoA = await criarProdutoComFicha(request, token, nomeA, [{ insumoId: insumoA.id, quantidade: 1 }], 1)
    const nomeB = `QA187-KitB-${Date.now()}`
    const produtoB = await criarProdutoComFicha(request, token, nomeB, [{ insumoId: insumoB.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoA.id, produtoB.id)

    const producao = await criarProducaoViaApi(request, token, [
      { produtoId: produtoA.id, quantidade: 1 },
      { produtoId: produtoB.id, quantidade: 1 },
    ])
    criadasProducaoIds.push(producao.id)
    await iniciarProducaoViaApi(request, token, producao.id) // auto-trava (bloqueio em Kit B)
    const divisao = await retomarProducaoViaApi(request, token, producao.id, true) // efetiva a divisão
    const divisaoJson = await divisao.json()
    const idFilhaA: string = divisaoJson.producaoA.id
    const idFilhaB: string = divisaoJson.producaoB.id
    criadasProducaoIds.push(idFilhaA, idFilhaB)

    const original = await buscarProducao(request, token, producao.id)
    expect(original.estado).toBe('NAO_REALIZADA')
    expect(original.justificativaNaoRealizada).toBeTruthy()

    const filhaA = await buscarProducao(request, token, idFilhaA)
    const identificadorFilhaA = filhaA.identificador as string

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByText('Produções relacionadas')).toBeVisible()
    const linkFilhaA = page.getByRole('button', { name: new RegExp(identificadorFilhaA) })
    await expect(linkFilhaA).toBeVisible()
    await linkFilhaA.click()

    await expect(page).toHaveURL(new RegExp(`/producao/${idFilhaA}$`), { timeout: 5000 })
  })

  test('188 — detalhe de produção EM_ANDAMENTO usa botões explícitos, sem menu ⋮', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA188-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA188-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}`)

    await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Travar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mais ações' })).toHaveCount(0)
  })
})
