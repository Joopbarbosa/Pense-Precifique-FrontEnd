import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import { criarCliente, buscarOrcamento, selecionarCliente, adicionarItemAvulso } from '../helpers/orcamento'

/**
 * Homologação P-QA-005 / OpenProject #126 — Validação de Estoque no Orçamento (Fluxo H),
 * cenários 189-190. Mesma regra dos prompts anteriores: cenários que falham documentam o delta
 * Gherkin-vs-real com file:line, não são adaptados ao comportamento observado.
 *
 * Achados de leitura de código (registrados aqui conforme pedido no prompt):
 * - `avisosEstoque` NÃO é uma checagem client-side ao adicionar/alterar quantidade de um item —
 *   é calculado inteiramente no backend, uma única vez, depois do `POST /orcamentos` já ter
 *   persistido o orçamento (OrcamentoService.java:212-217, `calcularAvisosEstoque` linhas
 *   226-252). Não existe nenhuma chamada de API nem cálculo local disparado pelo Stepper de
 *   quantidade em `CriarOrcamentoPage.tsx` — o array `avisosEstoque` só existe na resposta do
 *   POST.
 * - Consequência: NÃO existe "aviso inline" enquanto o item está sendo montado na tela (delta
 *   direto com o Cenário 189, "Dado"/"Então" descrevem um aviso inline antes de salvar). O que
 *   existe é uma tela de sucesso alternativa, renderizada só se `avisosEstoque.length > 0` na
 *   resposta do POST (`CriarOrcamentoPage.tsx:1172-1215`) — troca a tela inteira de "Novo
 *   Orçamento" por um card "Orçamento criado com aviso de estoque" com um botão "Ver orçamento".
 *   O orçamento já foi criado normalmente nesse ponto (mesmo `RASCUNHO` de sempre — nenhum status
 *   especial de aviso existe no backend, `OrcamentoService.criar` não distingue).
 * - Mensagem real (`OrcamentoService.java:245-247`): "Estoque insuficiente para {N} unidades de
 *   {nomeProduto}. Estoque atual: {estoqueAtual}" — bate com o texto do Gherkin, só o mecanismo
 *   de exibição (pós-criação, não inline) diverge.
 * - `calcularAvisosEstoque` acumula quantidade por produto (RN-059-like) e compara contra
 *   `produto.estoqueAtual` — não valida nada no momento do POST que bloqueie a criação; é
 *   puramente informativo, nunca lança `BusinessException` (confirma "não bloqueia" do Cenário
 *   190).
 * - Não há `data-testid` em `CriarOrcamentoPage.tsx` nem nos componentes internos (`ItemSearch`,
 *   `ModalMargemAvulso`, `Stepper`) — seletores por `getByPlaceholder`/`getByRole`/`getByText`,
 *   mesmo padrão dos specs de Produção.
 */

test.describe('Cenários 189-190 — Validação de Estoque no Orçamento (Fluxo H) (#126)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('189 — aviso de estoque insuficiente ao adicionar item no orçamento (aviso inline)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA189-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 5)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA189-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)
    await adicionarItemAvulso(page, nomeProduto, 10)

    // Achado de homologação: não existe aviso inline (ver nota no topo do arquivo,
    // CriarOrcamentoPage.tsx:1172-1215) — o item é adicionado e a tela segue normal, sem nenhuma
    // mensagem de estoque insuficiente visível antes de salvar. Asserção abaixo replica o Gherkin
    // literalmente e deve falhar por esse motivo (delta Gherkin-vs-real).
    await expect(page.getByText(/Estoque insuficiente para 10 unidades de/i)).toBeVisible({ timeout: 3000 })
  })

  test('190 — aviso de estoque não bloqueia a criação do orçamento (status RASCUNHO normal)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA190-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 5)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA190-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    let avisosEstoqueCapturado: unknown = null
    page.on('response', res => {
      if (res.url().includes('/orcamentos') && res.request().method() === 'POST') {
        res.json().then(body => { avisosEstoqueCapturado = body.avisosEstoque })
      }
    })

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)
    await adicionarItemAvulso(page, nomeProduto, 10)
    await page.locator('input[type="number"][placeholder="10"]').fill('7')

    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // Não bloqueado: a artesã é levada à tela de sucesso alternativa (com aviso), não a um erro.
    await expect(page.getByText('Orçamento criado com aviso de estoque')).toBeVisible({ timeout: 10_000 })

    await expect.poll(() => avisosEstoqueCapturado, { timeout: 5000 }).not.toBeNull()
    console.log('avisosEstoque (POST /orcamentos, cenário 190):', JSON.stringify(avisosEstoqueCapturado))
    expect(avisosEstoqueCapturado).toEqual([
      expect.objectContaining({
        nomeProduto,
        estoqueAtual: 5,
        quantidadeNecessaria: 10,
        mensagem: `Estoque insuficiente para 10 unidades de ${nomeProduto}. Estoque atual: 5`,
      }),
    ])

    // Continua navegável (botão "Ver orçamento") e o orçamento foi de fato persistido como RASCUNHO normal.
    const verBtn = page.getByRole('button', { name: 'Ver orçamento', exact: true })
    await expect(verBtn).toBeVisible()
    await verBtn.click()
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10_000 })

    const orcamentoId = page.url().split('/orcamentos/')[1]
    const orcamentoApi = await buscarOrcamento(request, token, orcamentoId)
    expect(orcamentoApi.status).toBe('RASCUNHO')
  })
})
