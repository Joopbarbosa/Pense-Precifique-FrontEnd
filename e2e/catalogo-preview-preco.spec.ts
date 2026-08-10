import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, getConfiguracao, putConfiguracao } from './helpers/api'
import { criarProdutoComFicha, criarProdutoSemFicha, inativarProduto } from './helpers/producao'
import { criarInsumoComEstoque } from './helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * Bloco 2/P-TESTE-001 (V0.6.1) — RN-NOVA-8: preview de preço de Item de Catálogo.
 * Endpoint dedicado `POST /catalogos/{catalogoId}/itens/preview-preco` (backend, RN-044) recalcula
 * ao vivo sem persistir nada. Fórmula atualizada em #239 (V0.7) — catálogo deixou de ter margem
 * própria; `precoSugerido = produto.precoVenda × quantidadePacote + Σ(customizacao.precoVenda × quantidade)`.
 *
 * P-FE-CORRIGE-007 (V0.6.1) — `NovoItemCatalogoPage.tsx` passou a chamar o endpoint de preview a
 * cada debounce de 500ms (produto/quantidade/customização) em vez dos endpoints reais de
 * criação/edição; `POST`/`PUT /catalogos/{catalogoId}/itens[/{itemId}]` só são chamados no clique
 * explícito em "Salvar"/"Adicionar item ao catálogo". A remoção best-effort no "Cancelar" foi
 * removida (não há mais nada pra desfazer). Os testes 3+ verificam isso via API/rede diretamente,
 * não só pelo estado visual da tela.
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

  async function criarCatalogo(request: import('@playwright/test').APIRequestContext, token: string, nome: string) {
    const res = await request.post(`${API_URL}/catalogos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome },
    })
    if (!res.ok()) throw new Error(`Falha ao criar catálogo de teste: ${res.status()} ${await res.text()}`)
    return res.json()
  }

  async function itensDoCatalogo(request: import('@playwright/test').APIRequestContext, token: string, catalogoId: string) {
    const res = await request.get(`${API_URL}/catalogos/${catalogoId}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  test('preview recalcula ao vivo pela fórmula precoVenda×quantidade e não persiste nada (API, #239)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true) // custo unitário 10 (100/10)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 2 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    // precoVenda do produto é calculado a partir do custo + margemPadrao da conta na criação
    // (nenhum precoVenda explícito foi passado) — lê o valor real em vez de recalcular aqui, pra
    // não acoplar o teste à configuração de margemPadrao/valorHora da conta de teste.
    const produtoInfo = await (await request.get(`${API_URL}/produtos/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    const precoVendaReal = produtoInfo.precoVenda

    const res = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/preview-preco`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { produtoId: produto.id, quantidadePacote: 3, customizacoesAnexadas: [] },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.precoVendaProduto).toBe(precoVendaReal)
    expect(body.precoVendaCustomizacoes).toBe(0)
    expect(body.precoSugerido).toBeCloseTo(precoVendaReal * 3, 2) // #239: precoVenda do produto × quantidadePacote

    const itensDepois = await itensDoCatalogo(request, token, catalogo.id)
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
      const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8b-Catalogo-${Date.now()}`)
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

  test('tela real: nenhum ItemCatalogo é criado/atualizado antes do clique em "Salvar", mesmo após várias alterações', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8c-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    // Captura toda chamada de rede que crie/edite/remova um ItemCatalogo de verdade — distingue de
    // /itens/preview-preco, que é esperado disparar várias vezes.
    const chamadasReais: string[] = []
    page.on('request', req => {
      const url = req.url()
      const method = req.method()
      if (url.includes('/itens/preview-preco')) return
      if (/\/catalogos\/[^/]+\/itens(\/[^/?]+)?(\?|$)/.test(url) && ['POST', 'PUT', 'DELETE'].includes(method)) {
        chamadasReais.push(`${method} ${url}`)
      }
    })

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Buscar produto...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // Várias alterações, cada uma esperando passar do debounce de 500ms, pra dar chance de
    // qualquer chamada indevida disparar.
    await page.getByPlaceholder('1').fill('2')
    await page.waitForTimeout(900)
    await page.getByPlaceholder('1').fill('5')
    await page.waitForTimeout(900)
    await page.getByPlaceholder('1').fill('3')
    await page.waitForTimeout(900)

    expect(chamadasReais).toEqual([])

    // Confirmação direta via API — não só pela ausência de chamada de rede observada no browser.
    const itensAntesDeSalvar = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensAntesDeSalvar).toEqual([])

    // "Cancelar" também não deve disparar nenhuma chamada real.
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`))
    expect(chamadasReais).toEqual([])

    const itensDepoisDeCancelar = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensDepoisDeCancelar).toEqual([])
  })

  test('preço sugerido atualiza ao vivo (mesmo debounce visual de antes) sem persistir nada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8d-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8d-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8d-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Buscar produto...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // Desde #239 a Calculadora compartilhada também lista uma linha "Produto × N" acima da caixa
    // de sugerido (mesmo formato "R$ X,XX") — não dá mais pra achar o valor por uma regex genérica
    // de "R$". Localiza a caixa pelo rótulo exato "Preço sugerido" e lê o valor no irmão seguinte.
    const precoSugeridoLocator = page.getByText('Preço sugerido', { exact: true }).locator('xpath=following-sibling::div[1]')

    await page.getByPlaceholder('1').fill('1')
    await page.waitForTimeout(900)
    const precoCom1 = await precoSugeridoLocator.textContent()

    await page.getByPlaceholder('1').fill('10')
    await page.waitForTimeout(900)
    const precoCom10 = await precoSugeridoLocator.textContent()

    expect(precoCom10).not.toBe(precoCom1)

    const itens = await itensDoCatalogo(request, token, catalogo.id)
    expect(itens).toEqual([])
  })

  test('produto sem custo calculado (RN-044): erro aparece durante o preview ao vivo, antes de tentar salvar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const configuracaoOriginal = await getConfiguracao(request, token)
    try {
      await putConfiguracao(request, token, { valorHora: 0, margemPadrao: configuracaoOriginal.margemPadrao })

      const nomeProduto = `QA-RNNOVA8e-Produto-${Date.now()}`
      const produto = await criarProdutoSemFicha(request, token, nomeProduto)
      criadosProdutoIds.push(produto.id)
      const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8e-Catalogo-${Date.now()}`)
      criadosCatalogoIds.push(catalogo.id)

      await login(page)
      await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
      await page.getByPlaceholder('Buscar produto...').fill(nomeProduto)
      await page.getByText(nomeProduto, { exact: true }).click()

      // Erro visível (inline sob o campo Produto + toast) sem clicar em Salvar.
      await expect(page.getByText(/não possui custo calculado/i).first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: 'Adicionar item ao catálogo', exact: true })).toBeDisabled()

      const itens = await itensDoCatalogo(request, token, catalogo.id)
      expect(itens).toEqual([])
    } finally {
      await putConfiguracao(request, token, { valorHora: configuracaoOriginal.valorHora, margemPadrao: configuracaoOriginal.margemPadrao })
    }
  })

  test('"Salvar" cria de fato o ItemCatalogo real, com os dados finais da tela', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8f-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8f-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8f-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Buscar produto...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()
    await page.getByPlaceholder('1').fill('4')
    await page.waitForTimeout(900) // deixa o preview rodar antes de salvar, como a usuária real faria

    const itensAntes = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensAntes).toEqual([])

    await page.getByRole('button', { name: 'Adicionar item ao catálogo', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`), { timeout: 10_000 })

    const itensDepois = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensDepois).toHaveLength(1)
    expect(itensDepois[0]).toMatchObject({ produtoId: produto.id, quantidadePacote: 4 })
  })

  test('edição de item existente: preview ao vivo funciona sem alterar o registro real antes de "Salvar"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA8g-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA-RNNOVA8g-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA8g-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    // Item real pré-existente, criado direto via API (não é o que este teste investiga).
    const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { produtoId: produto.id, quantidadePacote: 2, customizacoesAnexadas: [] },
    })
    if (!resItem.ok()) throw new Error(`Falha ao criar item de teste: ${resItem.status()} ${await resItem.text()}`)
    const item = await resItem.json()

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)
    await expect(page.getByText(nomeProduto)).toBeVisible()

    // Muda a quantidade e espera o preview rodar — o registro real não deve mudar ainda.
    await page.getByPlaceholder('1').fill('9')
    await page.waitForTimeout(900)

    const itemAntesDeSalvar = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemAntesDeSalvar[0].quantidadePacote).toBe(2) // continua o valor original — preview não gravou

    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`), { timeout: 10_000 })

    const itemDepoisDeSalvar = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemDepoisDeSalvar).toHaveLength(1) // não duplicou um item novo, editou o mesmo
    expect(itemDepoisDeSalvar[0].id).toBe(item.id)
    expect(itemDepoisDeSalvar[0].quantidadePacote).toBe(9)
  })
})
