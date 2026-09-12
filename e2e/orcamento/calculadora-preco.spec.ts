import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarCliente,
  selecionarCliente,
  criarCatalogoComItens,
  criarCustomizacoes,
  desativarCatalogo,
} from '../helpers/orcamento'
import { criarProdutoComFicha, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #399 — ORC-020 (REVISÃO)/RN-NOVA-22 (REVISÃO)/RN-NOVA-23/RN-NOVA-1/RN-NOVA-2/
 * RN-NOVA-3 (V0.8.4). Reverte conscientemente RN-054 revisada (P-F005/#251): os 3 pontos de
 * entrada do Orçamento (produto avulso, customização, item de catálogo) voltam a abrir a
 * calculadora de preço antes de confirmar a adição — com comparação EXATA (sem tolerância),
 * diferente de Produto/Catálogo (que mantêm suas próprias tolerâncias 0.005/0.001).
 *
 * CEN-NOVO-1/2/3/4/5/6/7/8/9 (DECISOES_V0.8.4.md). CEN-NOVO-10 é nota de verificação manual
 * (herança visual em Produto/Catálogo) — não automatizado aqui por definição do próprio cenário.
 */
test.describe('#399 — ORC-020 (REVISÃO) — calculadora de preço no Orçamento', () => {
  let produtoIds: string[] = []
  let catalogoIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
    catalogoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of catalogoIds) await desativarCatalogo(request, token, id)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  /** Cria 1 insumo de custo conhecido (R$10/un) e um produto com ficha técnica de 1 unidade
   *  dele — `precoSugerido` do Backend fica determinístico o bastante pra derivar valores
   *  acima/abaixo sem precisar reproduzir a fórmula de margem aqui (Frontend não recalcula
   *  regra de negócio — lemos o sugerido já pronto, exibido na tela). */
  async function criarProdutoParaCalculadora(request: import('@playwright/test').APIRequestContext, token: string, nome: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${nome}-Insumo`, 100)
    produtoIds.push(insumo.id)
    return criarProdutoComFicha(request, token, nome, [{ insumoId: insumo.id, quantidade: 1 }])
  }

  async function lerPrecoSugerido(page: import('@playwright/test').Page): Promise<number> {
    const texto = await page.getByText('PREÇO SUGERIDO').locator('xpath=following-sibling::div[1]').innerText()
    return parseFloat(texto.replace('R$', '').trim().replace('.', '').replace(',', '.'))
  }

  function precoFinalInput(page: import('@playwright/test').Page) {
    return page.getByText('Preço final de venda', { exact: true }).locator('xpath=following-sibling::div[1]//input')
  }

  test('CEN-NOVO-2 — produto avulso abre a calculadora com dados reais antes de adicionar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoParaCalculadora(request, token, `QA-399a-Produto-${ts}`)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-399a-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produto.nome, { exact: true }).click()

    await expect(page.getByText('Calculadora de Preço').first()).toBeVisible()
    await expect(page.getByText('PREÇO SUGERIDO')).toBeVisible()
    const sugerido = await lerPrecoSugerido(page)
    expect(sugerido).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()
    await expect(page.getByText(produto.nome, { exact: true })).toBeVisible()
    await expect(page.getByText('Calculadora de Preço').first()).toHaveCount(0)
  })

  test('CEN-NOVO-1/5/6 — comparação exata: igual=preto, +R$0,01=azul, -R$0,01=laranja', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoParaCalculadora(request, token, `QA-399b-Produto-${ts}`)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-399b-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produto.nome, { exact: true }).click()

    const sugerido = await lerPrecoSugerido(page)
    const input = precoFinalInput(page)

    // Igual ao sugerido (valor inicial, sem edição) — preto/neutro.
    await expect(input).toHaveClass(/border-line/)
    await expect(input).not.toHaveClass(/border-azul|border-orange/)

    // RN-NOVA-22 (REVISÃO) — 1 centavo já basta, sem tolerância.
    const acima = (sugerido + 0.01).toFixed(2).replace('.', ',')
    await input.fill(acima)
    await expect(input).toHaveClass(/border-azul/)

    const abaixo = (sugerido - 0.01).toFixed(2).replace('.', ',')
    await input.fill(abaixo)
    await expect(input).toHaveClass(/border-orange/)

    // Volta pro valor exato — some a cor.
    await input.fill(sugerido.toFixed(2).replace('.', ','))
    await expect(input).toHaveClass(/border-line/)
  })

  test('CEN-NOVO-7/RN-NOVA-1 — cancelar a calculadora não adiciona o item', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoParaCalculadora(request, token, `QA-399c-Produto-${ts}`)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-399c-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produto.nome, { exact: true }).click()
    await expect(page.getByText('Calculadora de Preço').first()).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByText('Calculadora de Preço').first()).toHaveCount(0)
    await expect(page.getByText('Nenhum produto adicionado')).toBeVisible()
  })

  test('CEN-NOVO-4 — item de catálogo abre a calculadora com o breakdown já persistido', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const { catalogo, itens } = await criarCatalogoComItens(request, token, `QA-399d-Catalogo-${ts}`, [
      `QA-399d-Item-${ts}`,
    ])
    catalogoIds.push(catalogo.id)
    const cliente = await criarCliente(request, token, `QA-399d-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Catálogo' }).click()
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(`QA-399d-Item-${ts}`, { exact: true }).click()

    await expect(page.getByText('Calculadora de Preço').first()).toBeVisible()
    const sugerido = await lerPrecoSugerido(page)
    expect(sugerido).toBe((itens[0] as { precoSugerido: number }).precoSugerido)

    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()
    await expect(page.getByText(`QA-399d-Item-${ts}`, { exact: true })).toBeVisible()
  })

  test('CEN-NOVO-3 — customização abre a calculadora, mesma mecânica do produto avulso', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produtoAvulso = await criarProdutoParaCalculadora(request, token, `QA-399e-Avulso-${ts}`)
    produtoIds.push(produtoAvulso.id)
    const [customizacao] = await criarCustomizacoes(request, token, [`QA-399e-Custom-${ts}`])
    produtoIds.push(customizacao.id)
    const cliente = await criarCliente(request, token, `QA-399e-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produtoAvulso.nome, { exact: true }).click()
    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()

    await page.getByRole('button', { name: 'Customizações', exact: true }).click()
    await page.getByText(customizacao.nome, { exact: true }).click()
    await page.getByRole('button', { name: /Confirmar/ }).click()

    // Fila sequencial (1 customização) — calculadora abre pra ela antes de fechar o modal.
    await expect(page.getByText('Calculadora de Preço').first()).toBeVisible()
    await expect(page.getByText('PREÇO SUGERIDO')).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar ao orçamento' }).click()

    await expect(page.getByText('Calculadora de Preço').first()).toHaveCount(0)
    // exact:false — a tag da customização compartilha o mesmo <span> do preço
    // ("Nome +R$ X,XX/un"), nenhum elemento isolado contém só o nome.
    await expect(page.getByText(customizacao.nome, { exact: false })).toBeVisible()
  })

  test('CEN-NOVO-8/RN-NOVA-2 — falha ao carregar a calculadora bloqueia a adição, sem fallback', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoParaCalculadora(request, token, `QA-399f-Produto-${ts}`)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA-399f-Cliente-${ts}`)

    // Interceptação só depois da página estar pronta (login + cliente selecionado) —
    // outras chamadas a /configuracoes/precificacao antes disso (login/onboarding)
    // não têm relação com #399; interceptar cedo demais derruba a navegação inteira,
    // não só a calculadora (achado desta sessão).
    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.route(`${API_URL}/configuracoes/precificacao`, route => route.fulfill({ status: 500, body: '{}' }))
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produto.nome, { exact: true }).click()

    await expect(page.getByText('Não foi possível carregar os dados de preço deste item.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adicionar ao orçamento' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByText('Nenhum produto adicionado')).toBeVisible()
  })

  test('CEN-NOVO-9/RN-NOVA-3 — item de catálogo com customização anexada inativa bloqueia a adição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const [customizacao] = await criarCustomizacoes(request, token, [`QA-399g-Custom-${ts}`])
    produtoIds.push(customizacao.id)
    const resProduto = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: `QA-399g-Base-${ts}`, tipo: 'PRODUTO', tempoProducao: 10, fichaTecnica: [] },
    })
    const produtoBase = await resProduto.json()
    produtoIds.push(produtoBase.id)
    const resCatalogo = await request.post(`${API_URL}/catalogos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: `QA-399g-Catalogo-${ts}` },
    })
    const catalogo = await resCatalogo.json()
    catalogoIds.push(catalogo.id)
    const resItem = await request.post(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        produtoId: produtoBase.id,
        quantidadePacote: 1,
        precoVenda: 10,
        customizacoesAnexadas: [{ produtoId: customizacao.id, quantidade: 1 }],
      },
    })
    await resItem.json()

    // Achado (2026-09-11): o Backend BLOQUEIA inativar um produto vinculado a catálogo(s)
    // ("Resolva os vínculos antes de continuar", 400) — confirmado nesta sessão via API real.
    // Ou seja, a precondição de RN-NOVA-3 (customização anexada inativa DEPOIS de a
    // composição já ter sido persistida) não é alcançável pelo fluxo normal de inativação —
    // só via inconsistência de dado (migração, edge case não coberto aqui) ou removendo o
    // vínculo primeiro (o que mudaria a composição, não deixaria ela "desatualizada").
    // Registrado em DECISOES_V0.8.4.md para o Gestor decidir se RN-NOVA-3 é defesa em
    // profundidade (mantém) ou código morto (remove) — não decidido aqui.
    // Testamos aqui só o comportamento do FRONTEND diante desse dado (via mock de rede),
    // não a alcançabilidade real da precondição via API.
    await page.route(`${API_URL}/produtos/${customizacao.id}`, async route => {
      const res = await route.fetch()
      const body = await res.json()
      await route.fulfill({ response: res, json: { ...body, ativo: false } })
    })

    const cliente = await criarCliente(request, token, `QA-399g-Cliente-${ts}`)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await page.getByRole('button', { name: 'Catálogo' }).click()
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByText(produtoBase.nome, { exact: true }).click()

    await expect(page.getByText('Não foi possível carregar os dados de preço deste item.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adicionar ao orçamento' })).toHaveCount(0)
  })
})
