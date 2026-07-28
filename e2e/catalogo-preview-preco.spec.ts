import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, getConfiguracao, putConfiguracao } from './helpers/api'
import { criarProdutoComFicha, criarProdutoSemFicha, inativarProduto } from './helpers/producao'
import { criarInsumoComEstoque } from './helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-8: preview de preço de Item de Catálogo.
 * Endpoint dedicado `POST /catalogos/{catalogoId}/itens/preview-preco` (backend, RN-042/RN-044)
 * recalcula ao vivo sem persistir nada — testado diretamente via API abaixo.
 *
 * Achado de homologação (importante): `NovoItemCatalogoPage.tsx` NÃO chama esse endpoint — usa os
 * endpoints reais de criação/edição (`POST`/`PUT /catalogos/{catalogoId}/itens[/{itemId}]`) como
 * mecanismo de "preview ao vivo": a cada mudança debounced de 500ms (produto/quantidade/
 * customização), um ItemCatalogo é de fato criado/atualizado no banco — só é apagado (best-effort,
 * sem tratamento de erro) se o usuário clicar em "Cancelar". A premissa "o preview nunca persiste
 * nada" está incorreta para o estado atual da tela — o último teste abaixo documenta isso via UI,
 * mostrando um ItemCatalogo real aparecendo em GET /catalogos/{id}/itens antes de qualquer clique
 * em "Salvar". Reportado no relatório final como achado de design a decidir com o usuário (rascunho
 * pode ficar órfão se o "Cancelar" falhar — ex. fechar a aba, erro de rede).
 */

test.describe('RN-NOVA-8 — Preview de preço de Item de Catálogo', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadosCatalogoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadosCatalogoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosCatalogoIds) {
      await request.post(`${API_URL}/catalogos/${id}/desativar`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function criarCatalogo(request: import('@playwright/test').APIRequestContext, token: string, nome: string, margem: number) {
    const res = await request.post(`${API_URL}/catalogos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome, margem },
    })
    if (!res.ok()) throw new Error(`Falha ao criar catálogo de teste: ${res.status()} ${await res.text()}`)
    return res.json()
  }

  test('preview recalcula ao vivo pela fórmula RN-042 e não persiste nada (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true) // custo unitário 10 (100/10)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 2 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8-Catalogo-${Date.now()}`, 50)
    criadosCatalogoIds.push(catalogo.id)

    // custoUnitario do produto inclui material (ficha técnica) + mão de obra (tempoProducao ×
    // valorHora da conta) — lê o valor real em vez de assumir só o material, pra não acoplar o
    // teste à configuração de valorHora da conta de teste.
    const produtoInfo = await (await request.get(`${API_URL}/produtos/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    const custoUnitarioReal = produtoInfo.custoUnitario

    const res = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/preview-preco`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { produtoId: produto.id, quantidadePacote: 3, customizacoesAnexadas: [] },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.custoUnitario).toBe(custoUnitarioReal)
    expect(body.precoSugerido).toBeCloseTo(custoUnitarioReal * 3 * 1.5, 2) // RN-042: custo × qtdPacote × (1 + margem/100)

    const itensDepois = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itensDepois).toEqual([]) // preview via API real não persiste nada
  })

  test('preview de produto sem custo calculado orienta completar o cadastro (RN-044) (API)', async ({ request }) => {
    // tempoProducao exige mínimo 1 minuto (validação de campo) e a fórmula de custo sempre soma
    // mão de obra (tempoProducao × valorHora) mesmo sem ficha técnica — então "sem custo
    // calculado" só é alcançável de verdade com valorHora=0 na configuração da conta. Zera
    // temporariamente e restaura no fim (finally), para não vazar efeito para outros specs.
    const token = await apiLogin(request)
    const configuracaoOriginal = await getConfiguracao(request, token)
    try {
      await putConfiguracao(request, token, { valorHora: 0, margemPadrao: configuracaoOriginal.margemPadrao })

      const nomeProduto = `QA-RNNOVA8b-Produto-${Date.now()}`
      const produto = await criarProdutoSemFicha(request, token, nomeProduto) // sem ficha técnica = sem custo de material
      criadosProdutoIds.push(produto.id)
      const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8b-Catalogo-${Date.now()}`, 50)
      criadosCatalogoIds.push(catalogo.id)

      const res = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/preview-preco`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { produtoId: produto.id, quantidadePacote: 1, customizacoesAnexadas: [] },
      })
      expect(res.ok()).toBe(false)
      const body = await res.json()
      expect(body.message).toContain('O produto não possui custo calculado')
    } finally {
      await putConfiguracao(request, token, { valorHora: configuracaoOriginal.valorHora, margemPadrao: configuracaoOriginal.margemPadrao })
    }
  })

  test('achado: a tela real cria/atualiza um ItemCatalogo de verdade a cada alteração, antes de "Salvar"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8c-Catalogo-${Date.now()}`, 50)
    criadosCatalogoIds.push(catalogo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Buscar produto...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()
    await page.getByPlaceholder('1').fill('2')
    await page.waitForTimeout(1200) // debounce de 500ms (sincronizar) + round-trip

    const itensAntesDeSalvar = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    // Achado: já existe um ItemCatalogo real persistido, mesmo sem clicar em "Salvar" ainda.
    expect(itensAntesDeSalvar.length).toBe(1)
    expect(itensAntesDeSalvar[0].quantidadePacote).toBe(2)
    criadosCatalogoIds.push(catalogo.id) // garante desativação mesmo se o item ficar órfão
  })
})
