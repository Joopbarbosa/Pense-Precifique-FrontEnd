import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, criarProdutoComEstoqueEFlag, inativarProduto } from '../helpers/producao'
import { criarCliente, buscarOrcamento, selecionarCliente, adicionarItemAvulso, avancarStatusViaApi } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

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
 *
 * Re-homologação P-TESTE-001 (V0.6.1): testes renomeados para a numeração oficial (189→207,
 * 190→208). #163 mudou a tela de sucesso alternativa de "troca a página inteira" para "modal por
 * cima da mesma tela" (CriarOrcamentoPage.tsx, ver commit 6a34c63) — mas o delta central do
 * Cenário 207 (aviso é sempre pós-criação, nunca inline enquanto o item é montado) continua real,
 * confirmado e SEM correção — gap de produto, não bug de teste. Cenário 208 já usava seletores por
 * texto (título/botão), que não mudaram com o modal — segue passando sem alteração.
 *
 * Re-homologação (achados restantes, onda pós-P-TESTE-001): teste 207 reescrito para validar o
 * comportamento real (nenhum aviso inline ao montar o item + aviso pós-criação com o texto correto
 * do Gherkin, só que depois de salvar) em vez de replicar a asserção literal do Gherkin — mesmo
 * padrão já usado no achado "RN-052 ampliada" mais abaixo neste arquivo. Documenta o gap sem
 * corrigir o app e mantém a suíte verde; segue pendente de tarefa de Frontend (ver relatório final).
 *
 * #218 (V0.8, RN-NOVA-8/9/11) — gap fechado: o teste 207 foi reescrito de novo para refletir o
 * aviso inline real (`CriarOrcamentoPage.tsx`, bloco `simulacao?.situacao === 'AVISO'` em
 * `ItemRow`), que agora aparece assim que a quantidade do item ultrapassa o estoque, antes de
 * qualquer submit. `POST /orcamentos` deixou de ser o único gatilho da modal de aviso — RN-NOVA-9
 * intercepta o clique em "Criar orçamento" com uma modal própria (`pendentesAvanco`) quando existe
 * item em `AVISO`; só depois de "Continuar mesmo assim" o POST de fato acontece e a modal
 * pós-criação pré-existente (`avisosEstoque`) segue aparecendo normalmente, sem conflito entre as
 * duas. Cenários novos de bloqueio (RN-NOVA-8, `permitirEstoqueNegativo=false`), da modal com link
 * de produção e do erro 400 (RN-NOVA-10, defesa em profundidade) vivem em
 * `bloqueio-aviso-estoque.spec.ts`.
 *
 * OpenProject #246/#245 (RN-NOVA-11) — o bloco de aviso inline em `ItemRow` citado acima foi
 * removido: o aviso de estoque negativo (`permitirEstoqueNegativo=true`) passou a ser concentrado
 * só na modal de checkpoint (`pendentesAvanco`) ao clicar "Criar orçamento", nunca mais durante o
 * preenchimento. Testes 207/208 reescritos para não depender do marcador visual inline (removido)
 * como sinal de fim do debounce — usam `page.waitForTimeout(600)`, mesmo padrão de
 * `insumo-busca-server-side.spec.ts`.
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

  test('207 (era 189) — aviso de estoque insuficiente ao adicionar item no orçamento (concentrado na modal de checkpoint, RN-NOVA-11)', async ({ page, request }) => {
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

    // RN-NOVA-11 (#246/#245) — nenhum aviso inline junto ao item, mesmo com a quantidade (10)
    // ultrapassando o estoque (5). Espera o debounce de 300ms + round-trip da simulação ao vivo
    // (mesmo padrão de `insumo-busca-server-side.spec.ts`) antes de seguir, já que não há mais
    // marcador visual do fim do debounce nesta tela.
    await page.waitForTimeout(600)
    await expect(page.getByText('Itens com estoque insuficiente')).toHaveCount(0)

    await page.locator('input[type="number"][placeholder="10"]').fill('7')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // O aviso passa a ser concentrado na modal de checkpoint ao clicar "Criar orçamento" — não
    // bloqueia, só avisa; só depois de "Continuar mesmo assim" a criação de fato acontece.
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/dispon[ií]vel 5, necess[áa]rio 10/i)).toBeVisible()
    await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click()

    await expect(page.getByText('Orçamento criado com aviso de estoque')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(new RegExp(`Estoque insuficiente para 10 unidades de ${nomeProduto}`))).toBeVisible()
  })

  test('208 (era 190) — aviso de estoque não bloqueia a criação do orçamento (status RASCUNHO normal)', async ({ page, request }) => {
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
    // Espera a simulação ao vivo (debounce de 300ms disparado pelo Stepper, RN-NOVA-11) terminar
    // antes de submeter — sem isso, `handleSubmit` pode rodar com `simulacoes` ainda desatualizado
    // (ainda a resposta da quantidade inicial 1, não da 10 alcançada pelos cliques em "+"). Desde
    // #246/#245 não há mais marcador visual (aviso inline removido), então espera o tempo fixo do
    // debounce + round-trip, mesmo padrão de `insumo-busca-server-side.spec.ts`.
    await page.waitForTimeout(600)
    await page.locator('input[type="number"][placeholder="10"]').fill('7')

    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // #218 (RN-NOVA-9) — modal de aviso ao avançar aparece primeiro (não bloqueia); "Continuar
    // mesmo assim" segue com o POST normalmente.
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click()

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

  test('RN-052 ampliada (P-FE-CORRIGE-003) — orçamento: aviso de estoque negativo ao finalizar é tratado via modal de confirmação', async ({ page, request }) => {
    // Corrigido em P-FE-CORRIGE-003: `orcamentoService.avancarStatus` agora é tipado como união
    // (OrcamentoDetalheResponse | ConfirmacaoEstoqueNegativoResponse, reaproveitado de
    // types/producao.ts) e `handleAvancar` (DetalheOrcamentoPage.tsx) checa
    // `isConfirmacaoEstoqueNegativoResponse` antes de gravar no estado. Quando pendente, abre
    // `ConfirmarEstoqueNegativoModal` (mesmo componente de Produção) e reenvia com
    // `confirmarEstoqueNegativoProdutoIds` ao confirmar.
    const token = await apiLogin(request)
    const nomeProduto = `QA-RN052-Orc-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 5) // permitirEstoqueNegativo default true (RN-059) → aviso, não bloqueio
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA-RN052-Orc-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    const resCriar = await request.post(`${API_URL}/orcamentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clienteId: cliente.id,
        itens: [{ produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 }],
        metodoPagamento: 'PIX',
        prazoProducaoDias: 5,
        sinalAtivo: false,
      },
    })
    if (!resCriar.ok()) throw new Error(`Falha ao criar orçamento de teste: ${resCriar.status()} ${await resCriar.text()}`)
    const orcamento = await resCriar.json()

    // Avança até EM_PRODUCAO via API — não é o que este teste investiga.
    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO -> APROVADO
    const resEmProducao = await avancarStatusViaApi(request, token, orcamento.id) // APROVADO -> EM_PRODUCAO (sem sinal)
    expect((await resEmProducao.json()).status).toBe('EM_PRODUCAO')

    const errosRuntime: string[] = []
    page.on('pageerror', err => errosRuntime.push(err.message))

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Marcar como finalizado', exact: true }).click()

    // Modal de confirmação aparece com o aviso real (não um erro genérico nem tela quebrada).
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText(new RegExp(nomeProduto))).toBeVisible()

    // Ainda não persistido nesse ponto — só a confirmação explícita reenvia com os ids confirmados.
    const orcamentoAntesConfirmar = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoAntesConfirmar.status).toBe('EM_PRODUCAO')

    await page.getByRole('button', { name: 'Confirmar mesmo assim', exact: true }).click()
    // Só o modal precisa fechar — RN-NOVA-5 (#194, P-FE-CORRIGE-006) passou a exibir um indicador
    // "Estoque insuficiente" persistente na linha do item quando o produto ainda não tem estoque
    // suficiente para a quantidade do orçamento, independente do status do orçamento em si; não é
    // mais seguro assumir que nenhum texto "Estoque insuficiente" existe na página inteira.
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.status).toBe('FINALIZADO')

    expect(errosRuntime).toEqual([])
  })
})
