import { test, expect, APIRequestContext } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'

/** A tag de estoque negativo no resultado de busca reflete `permitirEstoqueNegativo` do PRODUTO
 * (não do insumo da ficha) — precisa ser setado explicitamente no produto para testar o estado "Bloqueia". */
async function criarProdutoComFichaEBloqueioNegativo(
  request: APIRequestContext,
  token: string,
  nome: string,
  insumoId: string
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento: 1,
      permitirEstoqueNegativo: false,
      fichaTecnica: [{ insumoId, quantidade: 1 }],
    },
  })
  if (!res.ok()) throw new Error(`Falha ao criar produto com bloqueio de estoque negativo: ${res.status()} ${await res.text()}`)
  return res.json()
}

/**
 * OpenProject #215 — Tag fracionável/estoque negativo na busca de produto em Nova Produção.
 * CEN-NOVO-9 (DECISOES_V0.7.md, RN-NOVA-5). Componente `EstoqueTags` (Badge.tsx), renderizado no
 * dropdown de busca de `NovaProducaoPage.tsx:106-112`.
 */
test.describe('OpenProject #215 — Tag fracionável/estoque negativo na busca de Nova Produção', () => {
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

  test('CEN-NOVO-9 — cada resultado da busca mostra se é fracionável e se permite estoque negativo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()

    const nomeInsumoFrac = `QA-CEN9-InsumoFrac-${ts}`
    const insumoFrac = await criarInsumoFracionavel(request, token, nomeInsumoFrac, 50, 'DECIMAL', true)
    criadosInsumoIds.push(insumoFrac.id)
    const nomeProdutoFrac = `QA-CEN9-ProdutoFrac-${ts}`
    const produtoFrac = await criarProdutoComFicha(request, token, nomeProdutoFrac, [{ insumoId: insumoFrac.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produtoFrac.id)

    const nomeInsumoNaoFrac = `QA-CEN9-InsumoNaoFrac-${ts}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 50, false)
    criadosInsumoIds.push(insumoNaoFrac.id)
    const nomeProdutoNaoFrac = `QA-CEN9-ProdutoNaoFrac-${ts}`
    const produtoNaoFrac = await criarProdutoComFichaEBloqueioNegativo(request, token, nomeProdutoNaoFrac, insumoNaoFrac.id)
    criadosProdutoIds.push(produtoNaoFrac.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10))

    const busca = page.getByPlaceholder('Buscar produto...')

    await busca.fill(nomeProdutoFrac)
    const resultadoFrac = page.getByRole('button', { name: new RegExp(nomeProdutoFrac) })
    await expect(resultadoFrac.first()).toBeVisible({ timeout: 5000 })
    await expect(resultadoFrac.first().getByText('Fracionável', { exact: true })).toBeVisible()
    await expect(resultadoFrac.first().getByText('Permite estoque negativo', { exact: true })).toBeVisible()

    await busca.fill('')
    await busca.fill(nomeProdutoNaoFrac)
    const resultadoNaoFrac = page.getByRole('button', { name: new RegExp(nomeProdutoNaoFrac) })
    await expect(resultadoNaoFrac.first()).toBeVisible({ timeout: 5000 })
    await expect(resultadoNaoFrac.first().getByText('Não fracionável', { exact: true })).toBeVisible()
    await expect(resultadoNaoFrac.first().getByText('Bloqueia estoque negativo', { exact: true })).toBeVisible()
  })
})
