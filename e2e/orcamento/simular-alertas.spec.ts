import { test, expect } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

const API_URL = 'http://localhost:8080'

/**
 * Homologação Onda 5 (Frente 2, Cenários 232-233) — `POST /orcamentos/simular-alertas`
 * (`OrcamentoController.java:67-71`, `OrcamentoService.java:267-336`). Diferente do endpoint
 * equivalente de Produção (que resolve ficha técnica e checa estoque de Insumo), este simula
 * estoque do próprio Produto vendido no orçamento — "Orçamento vende Produto já pronto, não
 * consumo de insumo via ficha técnica" (Javadoc do método). `SituacaoAlertaInsumo`: SUFICIENTE,
 * AVISO (estoque insuficiente + permitirEstoqueNegativo=true), BLOQUEIO_FUTURO (estoque
 * insuficiente + permitirEstoqueNegativo=false). Endpoint sem prefixo `/api`.
 */
test.describe('Cenários 232-233 — POST /orcamentos/simular-alertas', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('232 — SUFICIENTE aparece na resposta, não é filtrado (mesmo padrão de Produção)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA232-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)

    const res = await request.post(`${API_URL}/orcamentos/simular-alertas`, {
      headers: { Authorization: `Bearer ${token}` },
      data: [{ produtoId: produto.id, quantidade: 5 }],
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      nomeProduto: nomeProduto,
      estoqueAtual: 100,
      quantidadeNecessaria: 5,
      situacao: 'SUFICIENTE',
    })
  })

  test('233 — AVISO (permitirEstoqueNegativo=true) e BLOQUEIO_FUTURO (permitirEstoqueNegativo=false) por estoque insuficiente de Produto', async ({ request }) => {
    const token = await apiLogin(request)

    const nomeAviso = `QA233-Aviso-${Date.now()}`
    const produtoAviso = await criarProdutoComEstoque(request, token, nomeAviso, 3) // default permitirEstoqueNegativo=true
    criadosProdutoIds.push(produtoAviso.id)

    const nomeBloqueio = `QA233-Bloqueio-${Date.now()}`
    const resProdutoBloqueio = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nome: nomeBloqueio,
        tipo: 'PRODUTO',
        tempoProducao: 10,
        estoqueAtual: 3,
        permitirEstoqueNegativo: false,
        fichaTecnica: [],
      },
    })
    if (!resProdutoBloqueio.ok()) {
      throw new Error(`Falha ao criar produto de teste: ${resProdutoBloqueio.status()} ${await resProdutoBloqueio.text()}`)
    }
    const produtoBloqueio = await resProdutoBloqueio.json()
    criadosProdutoIds.push(produtoBloqueio.id)

    const res = await request.post(`${API_URL}/orcamentos/simular-alertas`, {
      headers: { Authorization: `Bearer ${token}` },
      data: [
        { produtoId: produtoAviso.id, quantidade: 10 },
        { produtoId: produtoBloqueio.id, quantidade: 10 },
      ],
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveLength(2)

    const alertaAviso = body.find((a: { nomeProduto: string }) => a.nomeProduto === nomeAviso)
    const alertaBloqueio = body.find((a: { nomeProduto: string }) => a.nomeProduto === nomeBloqueio)
    expect(alertaAviso).toMatchObject({ estoqueAtual: 3, quantidadeNecessaria: 10, situacao: 'AVISO' })
    expect(alertaBloqueio).toMatchObject({ estoqueAtual: 3, quantidadeNecessaria: 10, situacao: 'BLOQUEIO_FUTURO' })
  })
})
