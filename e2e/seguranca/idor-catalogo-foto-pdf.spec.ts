import { test, expect } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { registrarEmpresaEfemera, API_URL } from '../helpers/auth'
import { criarCatalogoComItens } from '../helpers/orcamento'

/**
 * Gate `seguranca-resiliencia` (V0.13.0) — A01: IDOR/Autorização Quebrada.
 * Padrão Conta A (dona dos dados) x Conta B (efêmera, "atacante") em `references/teste-idor.md`.
 * Recorte: as 2 superfícies novas deste pocket — upload/remoção de foto do Item de Catálogo
 * (#518, grava em Cloudflare R2) e geração de PDF do Catálogo (#519). Revisão de código
 * (`ItemCatalogoService#buscarItemDoUsuario`, `CatalogoPdfPayloadService#montarPayloadCatalogo`)
 * já mostrou os dois filtrando por usuário — este spec confirma em runtime, não substitui a
 * leitura de código.
 */
test.describe('#518/#519 (gate seguranca-resiliencia) — IDOR em foto e PDF de Catálogo', () => {
  test('usuário de outra empresa não sobe foto em item de catálogo alheio (POST .../foto)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const { catalogo, itens } = await criarCatalogoComItens(request, tokenA, `Catálogo IDOR Foto ${Date.now()}`, ['Item IDOR Foto'])
    const itemDeA = itens[0]

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-catalogo-foto')

    // catalogoId no path não é usado pela autorização (a Service deriva o catálogo a partir do
    // próprio item) — usa o id real só pra não cair num 400 de parsing de UUID e mascarar o teste.
    const resposta = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/${itemDeA.id}/foto`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      multipart: {
        arquivo: { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('conteudo-de-teste') },
      },
    })
    expect([403, 404]).toContain(resposta.status())
  })

  test('usuário de outra empresa não remove foto de item de catálogo alheio (DELETE .../foto)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const { catalogo, itens } = await criarCatalogoComItens(request, tokenA, `Catálogo IDOR Remover Foto ${Date.now()}`, ['Item IDOR Remover Foto'])
    const itemDeA = itens[0]

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-catalogo-remover-foto')

    const resposta = await request.delete(`${API_URL}/catalogos/${catalogo.id}/itens/${itemDeA.id}/foto`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(resposta.status())
  })

  test('usuário de outra empresa não gera PDF de catálogo alheio (GET /catalogos/{id}/pdf)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const { catalogo } = await criarCatalogoComItens(request, tokenA, `Catálogo IDOR PDF ${Date.now()}`, ['Item IDOR PDF'])

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-catalogo-pdf')

    const resposta = await request.get(`${API_URL}/catalogos/${catalogo.id}/pdf`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(resposta.status())
  })
})
