import { test, expect, APIRequestContext } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'

/**
 * OpenProject #210+231+234 — Eliminação do tipo PRODUTO_BASE / unificação do modelo de preço.
 * CEN-NOVO-1/CEN-NOVO-2 (DECISOES_V0.7.md, RN-NOVA-1/PDT-001).
 *
 * CEN-NOVO-2 — achado de auditoria (não corrigido aqui, ver DECISOES_V0.7.md): a busca de
 * componente (`InsumoSearch`/`buscarProdutosComponente`) já filtra por `tipo=PRODUTO` (CUSTOMIZACAO
 * nunca aparece), mas NÃO filtra por `ativo` — um produto tipo PRODUTO inativo aparece normalmente
 * nos resultados e só é rejeitado no clique em "Salvar" (banner genérico no topo do form,
 * `FichaTecnicaService.java:53-58`), não com mensagem inline no item da busca. O teste abaixo
 * valida o comportamento REAL (bloqueio tardio), não a leitura literal do BDD original ("bloqueados
 * [na busca] com mensagem explicativa").
 */

async function criarInsumoBarato(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      unidadeMedida: 'unidade',
      fracionavel: false,
      estoqueMinimo: 1,
      precoTotalCompraInicial: 10, // custoUnitario inicial = 1
      quantidadeCompradaInicial: 10,
      permitirEstoqueNegativo: true,
    },
  })
  if (!res.ok()) throw new Error(`Falha ao criar insumo: ${res.status()} ${await res.text()}`)
  return res.json()
}

async function encarecerInsumo(request: APIRequestContext, token: string, insumoId: string) {
  // Lote de compra caro — eleva a média ponderada de custoUnitario, sem mexer no cadastro do produto.
  const res = await request.post(`${API_URL}/lotes-compra`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { itens: [{ insumoId, quantidadeComprada: 10, precoTotalPago: 500 }] }, // eleva custoUnitario de ~1 para ~25,5
  })
  if (!res.ok()) throw new Error(`Falha ao encarecer insumo: ${res.status()} ${await res.text()}`)
}

async function criarProdutoCustomizacao(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, tipo: 'CUSTOMIZACAO', tempoProducao: 10, precoVenda: 15, fichaTecnica: [] },
  })
  if (!res.ok()) throw new Error(`Falha ao criar customização: ${res.status()} ${await res.text()}`)
  return res.json()
}

test.describe('OpenProject #210+231+234 — Eliminação do Produto Base / unificação do modelo de preço', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-1 — preço de venda com override não é sobrescrito quando o custo do produto muda', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-CEN1-Insumo-${Date.now()}`
    const insumo = await criarInsumoBarato(request, token, nomeInsumo)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-CEN1-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await page.getByRole('button', { name: '2 Ficha Técnica' }).click()

    const sugeridoBox = page.getByText('Preço sugerido', { exact: true }).locator('xpath=following-sibling::div[1]')
    const precoInput = page.getByText('Preço final de venda', { exact: true }).locator('xpath=following-sibling::div[1]//input')

    await expect(sugeridoBox).toBeVisible()
    const precoVendaOriginal = await precoInput.inputValue()
    const sugeridoOriginal = await sugeridoBox.textContent()
    // Produto recém-criado sem precoVenda explícito já carrega com override=true (RN-038a) — o
    // preço de venda inicial reflete o precoSugerido calculado na criação (custo baixo).
    expect(precoVendaOriginal).not.toBe('')

    await encarecerInsumo(request, token, insumo.id)

    await page.reload()
    await page.getByRole('button', { name: '2 Ficha Técnica' }).click()

    // Preço de venda permanece o mesmo valor de antes — não foi sobrescrito pelo recálculo.
    await expect(precoInput).toHaveValue(precoVendaOriginal)
    // Preço sugerido, por outro lado, reflete o novo custo (mais alto) — mudou de valor.
    await expect(sugeridoBox).not.toHaveText(sugeridoOriginal ?? '')
    await expect(page.getByText(/Você ajustou o preço manualmente/)).toBeVisible()
  })

  test('CEN-NOVO-2 — busca de componente de ficha técnica só lista tipo PRODUTO; CUSTOMIZACAO nunca aparece; PRODUTO inativo aparece mas é rejeitado só ao salvar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const nomeCustom = `QA-CEN2-Customizacao-${ts}`
    const customizacao = await criarProdutoCustomizacao(request, token, nomeCustom)
    criadosProdutoIds.push(customizacao.id)

    const nomeInsumo = `QA-CEN2-Insumo-${ts}`
    const insumo = await criarInsumoBarato(request, token, nomeInsumo)
    criadosInsumoIds.push(insumo.id)
    const nomeComponenteInativo = `QA-CEN2-ComponenteInativo-${ts}`
    const componenteInativo = await criarProdutoComFicha(request, token, nomeComponenteInativo, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(componenteInativo.id)
    await request.post(`${API_URL}/produtos/${componenteInativo.id}/inativar`, { headers: { Authorization: `Bearer ${token}` } })

    const nomeAlvo = `QA-CEN2-ProdutoAlvo-${ts}`
    const produtoAlvo = await criarProdutoComFicha(request, token, nomeAlvo, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoAlvo.id)

    await login(page)
    await page.goto(`/produtos/${produtoAlvo.id}/editar`)
    await page.getByRole('button', { name: '2 Ficha Técnica' }).click()

    const busca = page.getByPlaceholder('Buscar insumo ou produto...')

    // CUSTOMIZACAO nunca aparece na busca de componente, mesmo buscando pelo nome exato.
    await busca.fill(nomeCustom)
    await page.waitForTimeout(400)
    await expect(page.getByText(nomeCustom, { exact: true })).toHaveCount(0)

    // PRODUTO inativo aparece normalmente na busca (achado da auditoria — gap de filtro inline).
    await busca.fill(nomeComponenteInativo)
    const itemInativo = page.getByText(nomeComponenteInativo, { exact: true })
    await expect(itemInativo).toBeVisible({ timeout: 5000 })
    await itemInativo.click()

    // Só é rejeitado ao tentar salvar — banner genérico no topo do form, não erro inline na busca.
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Apenas produtos ativos do tipo Produto podem ser usados como componente de ficha técnica.')).toBeVisible({ timeout: 8000 })
  })
})
