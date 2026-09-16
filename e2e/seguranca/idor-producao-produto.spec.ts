import { test, expect } from '@playwright/test'
import { apiLogin, criarInsumo } from '../helpers/api'
import { registrarEmpresaEfemera } from '../helpers/auth'
import { criarProdutoComFicha, criarProducaoViaApi, agruparProducoesViaApi, teardownProducoes } from '../helpers/producao'

const API_URL = 'http://localhost:8080'

/**
 * Gate `seguranca-resiliencia` (V0.10.0) — A01: IDOR/Autorização Quebrada.
 * Padrão Conta A (dona dos dados) x Conta B (efêmera, "atacante") em `references/teste-idor.md`.
 * Recorte: os 2 endpoints de escrita novos/mais alterados deste pocket — `POST /producoes/{id}/
 * desagrupar` (endpoint novo, #450) e `PUT /produtos/{id}/ficha-tecnica` (superfície de entrada
 * ampliada por #462, aceita Customização + grafo de ciclo) — nenhum dos dois tinha teste de IDOR
 * dedicado ainda (`idor-orcamento.spec.ts`, V0.8.4, cobre só Produto/Orçamento/Catálogo em GET).
 */
test.describe('V0.10.0 (gate seguranca-resiliencia) — IDOR em Produção/Produto', () => {
  test('usuário de outra empresa não desagrupa produção alheia (POST /producoes/{id}/desagrupar)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const insumo = await criarInsumo(request, tokenA, `Insumo IDOR Desagrupar ${Date.now()}`)
    const produtoA = await criarProdutoComFicha(request, tokenA, `Produto IDOR Desagrupar A ${Date.now()}`, [
      { insumoId: insumo.id, quantidade: 1 },
    ], 1)
    const produtoB = await criarProdutoComFicha(request, tokenA, `Produto IDOR Desagrupar B ${Date.now()}`, [
      { insumoId: insumo.id, quantidade: 1 },
    ], 1)
    const producao1 = await criarProducaoViaApi(request, tokenA, [{ produtoId: produtoA.id, quantidade: 1 }])
    const producao2 = await criarProducaoViaApi(request, tokenA, [{ produtoId: produtoB.id, quantidade: 1 }])
    const resAgrupar = await agruparProducoesViaApi(request, tokenA, {
      producaoIds: [producao1.id, producao2.id],
      estadoDestino: 'AGUARDANDO_INICIO',
      justificativa: 'Setup de teste automatizado — gate seguranca-resiliencia, IDOR desagrupar.',
    })
    expect(resAgrupar.ok()).toBe(true)
    // AgruparProducoesResponse: { producaoNova, producoesOriginais } — não a produção direto na raiz.
    const agrupadaId = (await resAgrupar.json()).producaoNova.id as string

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-desagrupar')

    const resposta = await request.post(`${API_URL}/producoes/${agrupadaId}/desagrupar`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { itens: [{ produtoId: produtoA.id, estadoDestino: 'AGUARDANDO_INICIO' }, { produtoId: produtoB.id, estadoDestino: 'AGUARDANDO_INICIO' }] },
    })
    expect([403, 404]).toContain(resposta.status())

    // Confirma que a produção de A permanece íntegra (ainda agrupada, não desfeita pelo ataque).
    const confirmacaoA = await (await request.get(`${API_URL}/producoes/${agrupadaId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json()
    expect(confirmacaoA.id).toBe(agrupadaId)
    expect(confirmacaoA.estado).not.toBe('NAO_REALIZADA')

    await teardownProducoes(request, tokenA, [agrupadaId])
  })

  test('usuário de outra empresa não edita ficha técnica de produto alheio (PUT /produtos/{id})', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const nomeProduto = `Produto IDOR Ficha ${Date.now()}`
    const insumo = await criarInsumo(request, tokenA, `Insumo IDOR Ficha ${Date.now()}`)
    const produtoA = await criarProdutoComFicha(request, tokenA, nomeProduto, [
      { insumoId: insumo.id, quantidade: 1 },
    ], 1)

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-ficha-tecnica')
    const insumoB = await criarInsumo(request, tokenB, `Insumo IDOR Ficha B ${Date.now()}`)

    // Ficha técnica não tem endpoint próprio — é editada via PUT /produtos/{id} (payload completo,
    // RN-NOVA-8/#462 ampliou o que esse mesmo campo aceita como componente).
    const resposta = await request.put(`${API_URL}/produtos/${produtoA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: {
        nome: 'Produto sequestrado via IDOR',
        tipo: 'PRODUTO',
        tempoProducao: 10,
        fichaTecnica: [{ insumoId: insumoB.id, quantidade: 5 }],
      },
    })
    expect([403, 404]).toContain(resposta.status())

    // Produto de A permanece intacto (nome/ficha técnica não foram sobrescritos por baixo).
    const confirmacaoA = await (await request.get(`${API_URL}/produtos/${produtoA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json()
    expect(confirmacaoA.nome).toBe(nomeProduto)
    expect(confirmacaoA.fichaTecnica).toHaveLength(1)
    expect(confirmacaoA.fichaTecnica[0].insumoId).toBe(insumo.id)
  })
})
