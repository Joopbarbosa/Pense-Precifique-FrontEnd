import { test, expect } from '@playwright/test'
import { apiLogin, criarInsumo } from '../helpers/api'
import { registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { criarCliente, criarOrcamentoViaApi, buscarOrcamento, vincularProducaoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, criarProdutoComFicha, criarProducaoViaApi, inativarProduto, teardownProducoes } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

/**
 * Gate `seguranca-resiliencia` (V0.14.0) — A01: IDOR/Autorização Quebrada.
 * Conta A (dona dos dados) x Conta B (efêmera, "atacante"), `references/teste-idor.md`.
 * Recorte: superfícies novas ou alteradas desta versão — foto de Produto (#531), CRUD de Unidade
 * de medida + FK em Insumo (#298), Edição manual na direção ENTRADA (#514/#534) e desvincular
 * produção (#401). `/empresa/logo` (#532) não tem id no path — sempre opera na empresa do token.
 */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)
const OBS_30 = 'Tentativa de IDOR no gate de seguranca V0.14.0'
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

test.describe('V0.14.0 (gate seguranca-resiliencia) — IDOR em foto, unidade de medida, estoque e vínculo', () => {
  test('usuário de outra empresa não sobe nem remove foto de produto alheio (#531)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const produtoA = await criarProdutoComEstoque(request, tokenA, `Produto IDOR Foto ${Date.now()}`, 0)
    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-produto-foto')

    const upload = await request.post(`${API_URL}/produtos/${produtoA.id}/foto`, {
      headers: auth(tokenB),
      multipart: { arquivo: { name: 'foto.png', mimeType: 'image/png', buffer: PNG_1X1 } },
    })
    expect([403, 404]).toContain(upload.status())

    const remocao = await request.delete(`${API_URL}/produtos/${produtoA.id}/foto`, { headers: auth(tokenB) })
    expect([403, 404]).toContain(remocao.status())

    const confirmacaoA = await (await request.get(`${API_URL}/produtos/${produtoA.id}`, { headers: auth(tokenA) })).json()
    expect(confirmacaoA.fotoUrl ?? null).toBeNull()

    await inativarProduto(request, tokenA, produtoA.id)
  })

  test('usuário de outra empresa não edita, exclui nem usa unidade de medida alheia (#298)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const sufixo = Date.now()
    const criada = await request.post(`${API_URL}/unidades-medida`, {
      headers: auth(tokenA),
      data: { nome: `IDOR Unidade ${sufixo}`, sigla: `idr${sufixo % 100000}` },
    })
    expect(criada.ok()).toBeTruthy()
    const unidadeA = await criada.json()

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-unidade-medida')

    const listaB = await (await request.get(`${API_URL}/unidades-medida`, { headers: auth(tokenB) })).json()
    expect((listaB as Array<{ id: string }>).some(u => u.id === unidadeA.id)).toBe(false)

    const edicao = await request.put(`${API_URL}/unidades-medida/${unidadeA.id}`, {
      headers: auth(tokenB),
      data: { nome: 'Sequestrada', sigla: 'seq' },
    })
    expect([403, 404]).toContain(edicao.status())

    const exclusao = await request.delete(`${API_URL}/unidades-medida/${unidadeA.id}`, { headers: auth(tokenB) })
    expect([403, 404]).toContain(exclusao.status())

    // FK cruzada: B não pode criar insumo apontando para a unidade de A.
    const insumoB = await request.post(`${API_URL}/insumos`, {
      headers: auth(tokenB),
      data: {
        nome: `Insumo IDOR FK ${sufixo}`,
        unidadeMedidaId: unidadeA.id,
        fracionavel: false,
        estoqueMinimo: 1,
        precoTotalCompraInicial: 10,
        quantidadeCompradaInicial: 10,
        permitirEstoqueNegativo: true,
      },
    })
    expect([400, 403, 404]).toContain(insumoB.status())

    const listaA = await (await request.get(`${API_URL}/unidades-medida`, { headers: auth(tokenA) })).json()
    const aindaDeA = (listaA as Array<{ id: string; nome: string }>).find(u => u.id === unidadeA.id)
    expect(aindaDeA?.nome).toBe(`IDOR Unidade ${sufixo}`)

    await request.delete(`${API_URL}/unidades-medida/${unidadeA.id}`, { headers: auth(tokenA) })
  })

  test('usuário de outra empresa não acrescenta estoque em insumo nem produto alheio (#514/#534)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const insumoA = await criarInsumo(request, tokenA, `Insumo IDOR Entrada ${Date.now()}`)
    const produtoA = await criarProdutoComEstoque(request, tokenA, `Produto IDOR Entrada ${Date.now()}`, 5)
    const estoqueInsumoAntes = insumoA.estoqueAtual

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-edicao-manual')
    const payload = { tipo: 'ENTRADA', quantidade: 100, motivo: 'CORRECAO', observacao: OBS_30 }

    const resInsumo = await request.post(`${API_URL}/insumos/${insumoA.id}/baixa-manual`, { headers: auth(tokenB), data: payload })
    expect([403, 404]).toContain(resInsumo.status())
    const resProduto = await request.post(`${API_URL}/produtos/${produtoA.id}/baixa-manual`, { headers: auth(tokenB), data: payload })
    expect([403, 404]).toContain(resProduto.status())

    const insumoDepois = await (await request.get(`${API_URL}/insumos/${insumoA.id}`, { headers: auth(tokenA) })).json()
    expect(insumoDepois.estoqueAtual).toBe(estoqueInsumoAntes)
    const produtoDepois = await (await request.get(`${API_URL}/produtos/${produtoA.id}`, { headers: auth(tokenA) })).json()
    expect(produtoDepois.estoqueAtual).toBe(5)

    await inativarProduto(request, tokenA, produtoA.id)
    await request.delete(`${API_URL}/insumos/${insumoA.id}`, { headers: auth(tokenA) }).catch(() => {})
  })

  test('usuário de outra empresa não desvincula produção de orçamento alheio (#401)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, tokenA, `IDOR401-Insumo-${Date.now()}`, 1000, true)
    const produto = await criarProdutoComFicha(request, tokenA, `IDOR401-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    const producao = await criarProducaoViaApi(request, tokenA, [{ produtoId: produto.id, quantidade: 2 }])
    const cliente = await criarCliente(request, tokenA, `IDOR401-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, tokenA, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 3 },
    ])
    await vincularProducaoViaApi(request, tokenA, orcamento.id, producao.id)

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-desvincular')
    const res = await request.delete(`${API_URL}/orcamentos/${orcamento.id}/vincular-producao/${producao.id}`, { headers: auth(tokenB) })
    expect([403, 404]).toContain(res.status())

    const orcamentoDepois = await buscarOrcamento(request, tokenA, orcamento.id)
    expect(orcamentoDepois.producoesVinculadas).toHaveLength(1)
    expect(orcamentoDepois.producoesVinculadas[0].producaoId).toBe(producao.id)

    await teardownProducoes(request, tokenA, [producao.id])
    await inativarProduto(request, tokenA, produto.id)
    await request.delete(`${API_URL}/insumos/${insumo.id}`, { headers: auth(tokenA) }).catch(() => {})
  })
})
