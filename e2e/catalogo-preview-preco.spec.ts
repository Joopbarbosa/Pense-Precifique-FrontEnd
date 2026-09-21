import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, getConfiguracao, putConfiguracao } from './helpers/api'
import { criarProdutoComFicha, criarProdutoSemFicha, inativarProduto } from './helpers/producao'
import { criarInsumoComEstoque } from './helpers/insumo'

const API_URL = 'http://localhost:8080'
const INSUMO_URL = `${API_URL}/insumos`

/**
 * V0.13.0 (#516/#517, RN-NOVA-1 a 4) — reescrito na íntegra: Item de Catálogo deixou de ser
 * "1 produto + quantidade de pacote + N customizações anexadas precificadas" e passou a ser
 * composição livre de N componentes (Insumo XOR Produto-base), com custo próprio agregado (soma
 * dos componentes + mão de obra) e margem/preço próprios (calculado+override, mesmo padrão de
 * Produto). Endpoint `POST /catalogos/{catalogoId}/itens/preview-preco` continua existindo, só
 * simulação — `NovoItemCatalogoPage.tsx` chama a cada debounce de 500ms (nome/tempoProducao/
 * margem/componentes); `POST`/`PUT .../itens[/{itemId}]` só disparam no clique em "Salvar"/
 * "Adicionar item ao catálogo".
 */

test.describe('RN-NOVA-1/2/4 — Composição e preview de preço de Item de Catálogo', () => {
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

  test('preview recalcula ao vivo pela fórmula custoComponentes+custoMaoDeObra e não persiste nada (API)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA1-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    const config = await getConfiguracao(request, token)
    // `criarInsumoComEstoque` repõe estoque via um 2º lote (POST /lotes-compra) depois da criação
    // — o custoUnitario final é a média ponderada resultante, não o valor de criação; lê o insumo
    // fresco em vez de assumir o custo, pra não acoplar o teste ao efeito colateral do helper.
    const insumoAtual = await (await request.get(`${INSUMO_URL}/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()

    const res = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/preview-preco`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { componentes: [{ insumoId: insumo.id, quantidade: 3 }], tempoProducao: 30, margemLucro: 40 },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const custoComponentesEsperado = insumoAtual.custoUnitario * 3
    const custoMaoDeObraEsperado = (30 / 60) * config.valorHora
    expect(body.custoComponentes).toBeCloseTo(custoComponentesEsperado, 2)
    expect(body.custoMaoDeObra).toBeCloseTo(custoMaoDeObraEsperado, 2)
    expect(body.precoSugerido).toBeCloseTo((custoComponentesEsperado + custoMaoDeObraEsperado) * 1.4, 1)

    const itensDepois = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensDepois).toEqual([]) // preview via API real não persiste nada
  })

  test('salvar com produto-base sem custo calculado é bloqueado (RN-044) — preview não valida isso', async ({ request }) => {
    // Preview não valida RN-044 (achado documentado em contrato-catalogo.md — só adicionar()/
    // editar() validam); este teste confirma as duas metades: preview passa, salvar bloqueia.
    // `criarProdutoSemFicha` usa tempoProducao=10 — sem zerar valorHora da conta, o produto ainda
    // teria custo > 0 só de mão de obra (mesmo cuidado do teste antigo desta suíte, pré-V0.13.0).
    const token = await apiLogin(request)
    const configuracaoOriginal = await getConfiguracao(request, token)
    try {
      await putConfiguracao(request, token, { valorHora: 0, margemPadrao: configuracaoOriginal.margemPadrao })

      const nomeProduto = `QA-RNNOVA1b-Produto-${Date.now()}`
      const produto = await criarProdutoSemFicha(request, token, nomeProduto) // sem ficha técnica = sem custo de material
      criadosProdutoIds.push(produto.id)
      const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1b-Catalogo-${Date.now()}`)
      criadosCatalogoIds.push(catalogo.id)

      const previewRes = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens/preview-preco`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { componentes: [{ produtoBaseId: produto.id, quantidade: 1 }], tempoProducao: 10, margemLucro: 40 },
      })
      expect(previewRes.ok()).toBe(true)

      const salvarRes = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { nome: 'Item sem custo', componentes: [{ produtoBaseId: produto.id, quantidade: 1 }], tempoProducao: 10, margemLucro: 40 },
      })
      expect(salvarRes.ok()).toBe(false)
      const body = await salvarRes.json()
      expect(body.message).toContain('O produto não possui custo calculado')

      const itens = await itensDoCatalogo(request, token, catalogo.id)
      expect(itens).toEqual([])
    } finally {
      await putConfiguracao(request, token, { valorHora: configuracaoOriginal.valorHora, margemPadrao: configuracaoOriginal.margemPadrao })
    }
  })

  test('tela real: nenhum ItemCatalogo é criado/atualizado antes do clique em "Salvar", mesmo após várias alterações', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA1c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1c-Catalogo-${Date.now()}`)
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
    await page.getByPlaceholder('Ex: Kit Presente Dia das Mães').fill('Kit em construção')
    await page.getByPlaceholder('Buscar insumo, produto ou customização...').fill(nomeInsumo)
    await page.getByText(nomeInsumo, { exact: true }).click()

    // Várias alterações, cada uma esperando passar do debounce de 500ms, pra dar chance de
    // qualquer chamada indevida disparar. QtyInput é controlado (o atributo `value` muda a cada
    // edição) — reconsulta pelo valor atual a cada passo, nunca reaproveita o mesmo Locator (que
    // fica obsoleto assim que o valor muda).
    await page.locator('input[value="1"]').first().fill('2')
    await page.waitForTimeout(900)
    await page.locator('input[value="2"]').first().fill('5')
    await page.waitForTimeout(900)
    await page.locator('input[value="5"]').first().fill('3')
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
    const nomeInsumo = `QA-RNNOVA1d-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1d-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Ex: Kit Presente Dia das Mães').fill('Kit preço ao vivo')
    await page.getByPlaceholder('Buscar insumo, produto ou customização...').fill(nomeInsumo)
    await page.getByText(nomeInsumo, { exact: true }).click()

    const precoSugeridoLocator = page.getByText('Preço sugerido', { exact: true }).locator('xpath=following-sibling::div[1]')
    const qtdInput = page.locator('input[value="1"]').first()

    await qtdInput.fill('1')
    await page.waitForTimeout(900)
    const precoCom1 = await precoSugeridoLocator.textContent()

    await qtdInput.fill('10')
    await page.waitForTimeout(900)
    const precoCom10 = await precoSugeridoLocator.textContent()

    expect(precoCom10).not.toBe(precoCom1)

    const itens = await itensDoCatalogo(request, token, catalogo.id)
    expect(itens).toEqual([])
  })

  test('"Adicionar item ao catálogo" cria de fato o ItemCatalogo real, com nome/tempo/componentes da tela', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA1e-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1e-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    const nomeItem = `Kit Salvo ${Date.now()}`

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Ex: Kit Presente Dia das Mães').fill(nomeItem)
    await page.getByPlaceholder('15').fill('12')
    await page.getByPlaceholder('Buscar insumo, produto ou customização...').fill(nomeInsumo)
    await page.getByText(nomeInsumo, { exact: true }).click()
    const qtdInput = page.locator('input[value="1"]').first()
    await qtdInput.fill('4')
    await page.waitForTimeout(900) // deixa o preview rodar antes de salvar, como a usuária real faria

    const itensAntes = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensAntes).toEqual([])

    await page.getByRole('button', { name: 'Adicionar item ao catálogo', exact: true }).click()
    // Premissa desatualizada do teste, não bug: desde a correção do #518 (teste manual do
    // usuário), criar um item permanece em modo edição do item recém-criado em vez de navegar de
    // volta pro catálogo — mesmo padrão já corrigido em catalogo-foto-descricao-pdf.spec.ts:164.
    await expect(page).toHaveURL(/itemId=/, { timeout: 10_000 })

    const itensDepois = await itensDoCatalogo(request, token, catalogo.id)
    expect(itensDepois).toHaveLength(1)
    expect(itensDepois[0]).toMatchObject({ nome: nomeItem, tempoProducao: 12 })
    expect(itensDepois[0].componentes).toHaveLength(1)
    expect(itensDepois[0].componentes[0]).toMatchObject({ insumoId: insumo.id, quantidade: 4 })
  })

  test('edição de item existente: preview ao vivo funciona sem alterar o registro real antes de "Salvar"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA-RNNOVA1f-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, true)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-RNNOVA1f-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)

    // Item real pré-existente, criado direto via API (não é o que este teste investiga).
    const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: 'Item original', componentes: [{ insumoId: insumo.id, quantidade: 2 }], tempoProducao: 10, margemLucro: 40 },
    })
    if (!resItem.ok()) throw new Error(`Falha ao criar item de teste: ${resItem.status()} ${await resItem.text()}`)
    const item = await resItem.json()

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)
    await expect(page.getByText(nomeInsumo)).toBeVisible()

    // Muda a quantidade do componente e espera o preview rodar — o registro real não deve mudar ainda.
    const qtdInput = page.locator('input[value="2"]').first()
    await qtdInput.fill('9')
    await page.waitForTimeout(900)

    const itemAntesDeSalvar = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemAntesDeSalvar[0].componentes[0].quantidade).toBe(2) // continua o valor original — preview não gravou

    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`), { timeout: 10_000 })

    const itemDepoisDeSalvar = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemDepoisDeSalvar).toHaveLength(1) // não duplicou um item novo, editou o mesmo
    expect(itemDepoisDeSalvar[0].id).toBe(item.id)
    expect(itemDepoisDeSalvar[0].componentes[0].quantidade).toBe(9)
  })
})
