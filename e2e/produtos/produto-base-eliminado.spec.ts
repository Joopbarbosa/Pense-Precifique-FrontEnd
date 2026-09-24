import { test, expect, APIRequestContext } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { resolverUnidadeMedidaId } from '../helpers/unidadeMedida'

/**
 * OpenProject #210+231+234 — Eliminação do tipo PRODUTO_BASE / unificação do modelo de preço.
 * CEN-NOVO-1/CEN-NOVO-2 (DECISOES_V0.7.md, RN-NOVA-1/PDT-001).
 *
 * CEN-NOVO-2 — achado de auditoria original (V0.7): a busca de componente
 * (`InsumoSearch`/`buscarProdutosComponente`) filtrava por `tipo=PRODUTO` (CUSTOMIZACAO nunca
 * aparecia) mas NÃO filtrava por `ativo` — um produto tipo PRODUTO inativo aparecia normalmente
 * nos resultados e só era rejeitado no clique em "Salvar" (banner genérico no topo do form,
 * `ProdutoService.java:490`), não com mensagem inline no item da busca.
 *
 * [Atualização V0.10.0 — #462/RN-NOVA-8, altera PDT-015] A restrição de tipo foi **revertida**:
 * Customização ativa passa a ser aceita como componente de ficha técnica (`FichaTecnicaService`
 * substitui `ProdutoService.java:490` nesse fluxo) — usuária confirmou explicitamente o caso de
 * uso real (ex. reaproveitar uma Customização já configurada como componente de outro Produto).
 * A mensagem de erro para componente inativo também mudou de texto (`"Apenas produtos/
 * customizações ativos podem ser usados..."`, `FichaTecnicaService.java:60`).
 *
 * [Atualização V0.14.0 — #347] A busca de componente passou a enviar `ativo=true`: PRODUTO
 * inativo não aparece mais na busca (antes aparecia e só era barrado ao salvar).
 */

async function criarInsumoBarato(request: APIRequestContext, token: string, nome: string) {
  const unidadeMedidaId = await resolverUnidadeMedidaId(request, token, 'unidade')
  const res = await request.post(`${API_URL}/insumos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      unidadeMedidaId,
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

  test('CEN-NOVO-2 (revisado V0.10.0/#462, V0.14.0/#347) — busca de componente aceita Customização ativa; PRODUTO inativo não aparece na busca', async ({ page, request }) => {
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

    // RN-NOVA-8 (#462, V0.10.0): Customização ativa agora aparece na busca de componente e pode
    // ser adicionada e salva normalmente — reversão deliberada da restrição original.
    await busca.fill(nomeCustom)
    const itemCustom = page.getByText(nomeCustom, { exact: true })
    await expect(itemCustom).toBeVisible({ timeout: 5000 })
    await itemCustom.click()
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()

    await busca.fill(nomeComponenteInativo)
    await expect(page.getByText('Nenhum componente encontrado')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(nomeComponenteInativo, { exact: true })).toHaveCount(0)
  })
})
