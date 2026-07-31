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
} from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

/**
 * Homologação P-QA-002 / OpenProject #116 — Editar Produção (Fluxo A.1), cenários 158-159.
 * Mesma regra do P-QA-001: cenários que falham documentam o delta Gherkin-vs-real com
 * file:line, não são adaptados ao comportamento observado.
 */

function linhaProduto(page: Page, nome: string) {
  return page.locator('div.border-t.border-line', { hasText: nome })
}

async function definirQuantidade(page: Page, nome: string, quantidade: number) {
  await linhaProduto(page, nome).locator('input[type="number"]').fill(String(quantidade))
}

test.describe('Cenários 158-159 — Editar Produção (Fluxo A.1) (#116)', () => {
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

  test('158 — editar produção AGUARDANDO_INICIO salva alterações e reexibe alertas recalculados', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA158-Insumo-${Date.now()}`
    const insumo = await criarInsumoFracionavel(request, token, nomeInsumo, 5, 'DECIMAL', true) // estoque baixo, permite negativo
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA158-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 3 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}/editar`)

    const novaData = new Date()
    novaData.setDate(novaData.getDate() + 7)
    const novaDataISO = novaData.toISOString().slice(0, 10)
    await page.getByLabel(/Data de término prevista/).fill(novaDataISO)
    // necessária vira 10 > estoque 5 (permite negativo) — força alerta AVISO recalculado
    await definirQuantidade(page, nomeProduto, 10)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}$`), { timeout: 10_000 })

    const producaoApi = await buscarProducao(request, token, producao.id)
    expect(producaoApi.dataTerminoPrevista).toBe(novaDataISO)
    expect(producaoApi.produtos[0].quantidade).toBe(10)

    // Comportamento real (descoberto no P-QA-001, cenário 151): não existe preview pré-confirmar;
    // aqui a seção de alertas aparece na tela de DETALHE pós-salvar, recalculada via GET /producoes/{id}
    // (calcularAlertasAoVivo, ProducaoService.java — ver achados P-QA-001 #6).
    await expect(page.getByText('Alertas de insumos')).toBeVisible()
    await expect(page.getByText(new RegExp(nomeInsumo))).toBeVisible()
  })

  test('159 — produção EM_ANDAMENTO bloqueia acesso à edição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA159-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA159-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    criadasProducaoIds.push(producao.id)
    expect(producao.estado).toBe('EM_ANDAMENTO')

    await login(page)
    await page.goto(`/producao/${producao.id}/editar`)

    // Bloqueio real é um guard em memória (EditarProducaoPage.tsx:144-160), não um redirect:
    // a URL permanece em /editar, mas o formulário nunca é montado — a tela renderiza a mensagem
    // de bloqueio no lugar. Verificamos as duas frentes citadas na diretriz de automação.
    await expect(page.getByText('Esta produção não pode mais ser editada.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}/editar$`))
  })
})
