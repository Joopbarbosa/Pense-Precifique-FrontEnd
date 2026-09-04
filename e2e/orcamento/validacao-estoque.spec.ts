import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import {
  criarCliente,
  buscarOrcamento,
  selecionarCliente,
  adicionarItemAvulso,
  avancarStatusViaApi,
  criarOrcamentoViaApi,
} from '../helpers/orcamento'

/**
 * Homologação P-QA-005 / OpenProject #126 — Validação de Estoque no Orçamento (Fluxo H),
 * cenários 189-190. Mesma regra dos prompts anteriores: cenários que falham documentam o delta
 * Gherkin-vs-real com file:line, não são adaptados ao comportamento observado.
 *
 * V0.8.1 (P-F001c, OpenProject #246/#245, RN-NOVA-11 revisada, 2026-08-16) — reabertura da
 * RN-NOVA-11 registrada em #218 (comentário histórico abaixo): a validação manual do usuário
 * sobre P-F001/P-F001b mostrou que a versão de RN-NOVA-11 de 2026-08-15 estava incorreta em dois
 * pontos, corrigidos nesta sessão:
 * 1. O aviso inline não deveria ter sido removido — só muda de lugar (tag ao lado da tag de
 *    catálogo/venda avulsa em `ItemRow`, não mais um bloco próprio). Cobertura em
 *    `bloqueio-aviso-estoque.spec.ts`.
 * 2. A modal pós-criação "Orçamento criado com aviso de estoque" foi removida — o checkpoint
 *    pré-criação (`pendentesAvanco`) já cumpre esse papel, então "Continuar mesmo assim" leva
 *    direto ao Detalhe do Orçamento, sem tela intermediária. Testes 207/208 atualizados abaixo.
 *
 * `avisosEstoque` continua calculado inteiramente no backend
 * (`OrcamentoService.calcularAvisosEstoque`), na resposta do `POST /orcamentos` — só deixou de
 * ter um consumidor visual no frontend (o checkpoint pré-criação já mostrou o mesmo aviso antes
 * do POST acontecer). O teste 208 mantém a asserção sobre o payload da resposta, só sem a etapa
 * de navegação via modal pós-criação (que não existe mais).
 *
 * Histórico anterior a 2026-08-16 (P-TESTE-001, #218) preservado no `git log` deste arquivo — não
 * repetido aqui para não confundir com o comportamento atual.
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

  test('207 (era 189) — aviso de estoque insuficiente ao adicionar item no orçamento (inline + checkpoint, RN-NOVA-11 revisada)', async ({ page, request }) => {
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

    // RN-NOVA-11 (revisada) — aviso inline aparece assim que a quantidade (10) ultrapassa o
    // estoque (5), junto à tag de catálogo/venda avulsa da linha do item.
    await page.waitForTimeout(600)
    await expect(page.getByText('Estoque insuficiente', { exact: true })).toBeVisible()

    await page.locator('input[type="number"][placeholder="10"]').fill('7')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // O checkpoint pré-criação também mostra o mesmo aviso — não bloqueia, só avisa; só depois de
    // "Continuar mesmo assim" a criação de fato acontece.
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/disponível 5, necessário 10/i)).toBeVisible()
    await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click()

    // Sem modal pós-criação (removida) — vai direto para o Detalhe do Orçamento.
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10_000 })
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
    // Espera a simulação ao vivo (debounce de 300ms, RN-NOVA-11) terminar antes de submeter — sem
    // isso, `handleSubmit` pode rodar com `simulacoes` ainda desatualizado (ainda a resposta da
    // quantidade inicial 1, não da 10 alcançada pelos cliques em "+").
    await page.waitForTimeout(600)
    await page.locator('input[type="number"][placeholder="10"]').fill('7')

    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // Checkpoint pré-criação aparece primeiro (não bloqueia); "Continuar mesmo assim" segue com o
    // POST normalmente.
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click()

    // Não bloqueado: a artesã é levada direto ao Detalhe do Orçamento, sem tela de aviso intermediária.
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10_000 })

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

    // Orçamento foi de fato persistido como RASCUNHO normal.
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
    //
    // V0.8.1 (P-F001c) — reconfirmado sem alteração: este mecanismo (RN-059, backend) já
    // implementa exatamente CEN-NOVO-18/19/20 (avanço para Finalizado bloqueia incondicionalmente
    // só quando permitirEstoqueNegativo=false; quando true, pede confirmação em vez de bloquear
    // com erro — não é um "avanço em 1 clique silencioso", mas também não é um bloqueio real,
    // já que nada impede a artesã de confirmar e avançar). Decisão registrada em
    // `DECISOES_V0.8.1.md`: manter este fluxo como está, não convertê-lo em avanço automático sem
    // confirmação — é comportamento deliberado desde P-FE-CORRIGE-003, não um gap desta revisão.
    const token = await apiLogin(request)
    const nomeProduto = `QA-RN052-Orc-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 5) // permitirEstoqueNegativo default true (RN-059) → aviso, não bloqueio
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA-RN052-Orc-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 },
    ])

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
