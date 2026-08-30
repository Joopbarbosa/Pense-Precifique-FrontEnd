import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import {
  criarCliente,
  selecionarCliente,
  adicionarItemAvulso,
  criarOrcamentoViaApi,
  avancarStatusViaApi,
  buscarOrcamento,
  vincularProducaoViaApi,
  desvincularProducaoViaApi,
} from '../helpers/orcamento'
import {
  criarProdutoComFicha,
  criarProdutoComFichaEEstoque,
  criarProdutoComEstoque,
  inativarProduto,
  criarProducaoViaApi,
  iniciarProducaoViaApi,
  buscarProducao,
  teardownProducoes,
} from '../helpers/producao'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * P-T004 (#320) — Homologação da revisão do vínculo Orçamento↔Produção. Cobre CEN-NOVO-H a N
 * (CENARIOS_NOVOS_TESTE_V0.8.2.md, Bloco 4). RN relacionadas: RN-ORC-VINC-01/02/03,
 * RN-PROD-VINC-01/02/03/04, RN-ORC-PRAZO-01.
 *
 * CEN-NOVO-K/L (desvincular) rodam só via API: `desvincularProducao` (`orcamentoService.ts:99`)
 * não tem nenhum consumidor de UI no branch atual (achado registrado no CSV desta homologação) —
 * o próprio comentário do service confirma "sem consumidor de UI ainda".
 */
function dataFutura(diasAFrente: number): string {
  const d = new Date()
  d.setDate(d.getDate() + diasAFrente)
  return d.toISOString().slice(0, 10)
}

test.describe('P-T004/#320 — Vínculo Orçamento-Produção (CEN-NOVO-H a N)', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadasProducaoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadasProducaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, criadasProducaoIds)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-H — vincular produção existente na criação soma os produtos na produção real', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320H-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320H-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 3)
    criadosProdutoIds.push(produto.id)

    const producaoExistente = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    criadasProducaoIds.push(producaoExistente.id)

    const nomeCliente = `QA320H-Cliente-${Date.now()}`
    await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    const quantidadeItem = 5 // > estoqueAtual (3) — dispara o checkpoint de estoque insuficiente
    await adicionarItemAvulso(page, nomeProduto, quantidadeItem)
    // temPrazoProducao=true é o default do formulário — sem desligar, handleSubmit trava em
    // validação de prazoDias antes de chegar no checkpoint de estoque (mesma técnica do script
    // avulso já validado, scripts-avulsos/validar-vincular-producao-criacao.mjs).
    await page.getByRole('button', { name: 'Não', exact: true }).first().click()

    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible()
    await page.getByRole('button', { name: /Vincular produção existente/ }).click()

    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
    await page.getByText(producaoExistente.identificador, { exact: true }).click()

    await expect(page.getByText('Confirmar vínculo').first()).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar vínculo', exact: true }).click()

    await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 })
    await expect(page.getByText(new RegExp(`Vinculado a produção:.*${producaoExistente.identificador}`))).toBeVisible()

    const producaoDepois = await buscarProducao(request, token, producaoExistente.id)
    const produtoNaProducao = producaoDepois.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id)
    expect(produtoNaProducao.quantidade).toBe(2 + quantidadeItem)
  })

  test('CEN-NOVO-I — criar produção nova embutida na criação nasce vinculada, sem duplicar quantidade', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320I-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320I-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 2)
    criadosProdutoIds.push(produto.id)

    const nomeCliente = `QA320I-Cliente-${Date.now()}`
    await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    const quantidadeItem = 6 // > estoqueAtual (2)
    await adicionarItemAvulso(page, nomeProduto, quantidadeItem)
    await page.getByRole('button', { name: 'Não', exact: true }).first().click()
    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible()
    await page.getByRole('button', { name: /Vincular produção existente/ }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()

    await page.getByRole('button', { name: 'Criar produção nova' }).click()
    await expect(page.getByText('Fica vinculada a este orçamento automaticamente')).toBeVisible()

    const terminoInput = page.locator('label', { hasText: 'Término previsto' }).locator('input[type="date"]')
    await terminoInput.fill(dataFutura(1))

    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()
    await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 })

    const orcamentoId = page.url().match(/\/orcamentos\/([0-9a-f-]+)$/)![1]
    const orcamentoFinal = await buscarOrcamento(request, token, orcamentoId)
    expect(orcamentoFinal.producoesVinculadas).toHaveLength(1)
    const vinculo = orcamentoFinal.producoesVinculadas[0]
    criadasProducaoIds.push(vinculo.producaoId)

    const producaoNova = await buscarProducao(request, token, vinculo.producaoId)
    expect(producaoNova.estado).toBe('AGUARDANDO_INICIO')
    expect(producaoNova.produtos).toHaveLength(1)
    expect(producaoNova.produtos[0].produtoId).toBe(produto.id)
    // não duplicada: nasce sem itens e só recebe os do orçamento uma vez (não 2x quantidadeItem)
    expect(producaoNova.produtos[0].quantidade).toBe(quantidadeItem)

    // histórico de origem completo — evento ITEM_ADICIONADO aponta pro orçamento/produto/quantidade certos
    const evento = producaoNova.historicoStatus.find((h: { tipoEvento: string }) => h.tipoEvento === 'ITEM_ADICIONADO')
    expect(evento).toBeTruthy()
    expect(evento.produtoId).toBe(produto.id)
    expect(evento.quantidade).toBe(quantidadeItem)
    expect(evento.referenciaOrcamentoId).toBe(orcamentoId)
  })

  test('CEN-NOVO-J — avançar pra Em Produção nunca bloqueia por falta de vínculo, mesmo oferecendo a modal', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA320J-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 100)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA320J-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(
      request,
      token,
      cliente.id,
      [{ produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 2 }],
      { sinalAtivo: false }
    )
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO

    const orcamentoAprovado = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoAprovado.status).toBe('APROVADO')
    expect(orcamentoAprovado.producoesVinculadas).toHaveLength(0)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByRole('button', { name: 'Confirmar início', exact: true }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()

    // Fechar/ignorar a modal (botão de texto do rodapé — o X do header do ModalShell também tem
    // aria-label "Fechar", mesma armadilha documentada em helpers/producao.ts/iniciarProducao).
    await page.getByRole('button', { name: 'Fechar' }).filter({ hasText: 'Fechar' }).click()

    // Timeline sempre renderiza o rótulo de todos os passos (inclusive "Em Produção"), então não
    // serve pra provar a transição — o botão de ação seguinte (ACTION_LABEL) só existe no status novo.
    await expect(page.getByRole('button', { name: 'Marcar como finalizado', exact: true })).toBeVisible({ timeout: 10000 })
    const orcamentoFinal = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoFinal.status).toBe('EM_PRODUCAO')
  })

  test('CEN-NOVO-K — desvincular reverte exatamente a quantidade daquele orçamento, sem afetar outros vínculos (API — sem UI, ver achado)', async ({ request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320K-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320K-Produto-${Date.now()}`
    // POST /producoes exige ficha técnica completa + rendimento válido — não aceita produto "raso"
    // (só com estoqueAtual, sem ficha), diferente de POST /orcamentos.
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 3 }])
    criadasProducaoIds.push(producao.id)

    const cliente1 = await criarCliente(request, token, `QA320K-Cliente1-${Date.now()}`)
    const orcamento1 = await criarOrcamentoViaApi(request, token, cliente1.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 4 },
    ])
    const cliente2 = await criarCliente(request, token, `QA320K-Cliente2-${Date.now()}`)
    const orcamento2 = await criarOrcamentoViaApi(request, token, cliente2.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 2 },
    ])

    await vincularProducaoViaApi(request, token, orcamento1.id, producao.id)
    await vincularProducaoViaApi(request, token, orcamento2.id, producao.id)

    const producaoComAmbos = await buscarProducao(request, token, producao.id)
    expect(producaoComAmbos.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id).quantidade).toBe(3 + 4 + 2)

    const desvinculo = await desvincularProducaoViaApi(request, token, orcamento1.id, producao.id)
    expect(desvinculo.status()).toBe(204)

    const producaoDepois = await buscarProducao(request, token, producao.id)
    // decrementa exatamente os 4 do orçamento1; os 2 do orçamento2 (outro vínculo, mesma produção) ficam intactos
    expect(producaoDepois.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id).quantidade).toBe(3 + 2)
  })

  test('CEN-NOVO-L — desvincular é bloqueado quando a produção já saiu de Aguardando início (API — sem UI, ver achado)', async ({ request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320L-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320L-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    criadasProducaoIds.push(producao.id)

    const cliente = await criarCliente(request, token, `QA320L-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 3 },
    ])
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)

    const resIniciar = await iniciarProducaoViaApi(request, token, producao.id)
    expect(resIniciar.ok()).toBe(true)
    const iniciada = await resIniciar.json()
    expect(iniciada.estado).toBe('EM_ANDAMENTO') // insumo com estoque suficiente — não trava

    const resDesvincular = await desvincularProducaoViaApi(request, token, orcamento.id, producao.id)
    expect(resDesvincular.status()).toBe(400)
    const corpoErro = await resDesvincular.json()
    expect(String(corpoErro.message ?? corpoErro)).toContain('já começou')

    const producaoDepois = await buscarProducao(request, token, producao.id)
    // nada revertido — bloqueio impede qualquer alteração de estado
    expect(producaoDepois.produtos.find((p: { produtoId: string }) => p.produtoId === produto.id).quantidade).toBe(2 + 3)
  })

  test('CEN-NOVO-M — aviso de estouro de prazo aparece no Detalhe sem bloquear a transição de status', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320M-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320M-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA320M-Cliente-${Date.now()}`)

    const orcamento = await criarOrcamentoViaApi(
      request,
      token,
      cliente.id,
      [{ produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 2 }],
      { sinalAtivo: false, temPrazoProducao: true, prazoProducaoDias: 1 }
    )
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO — carimba dataAprovacao

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }], dataFutura(20))
    criadasProducaoIds.push(producao.id)
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)

    const orcamentoVinculado = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoVinculado.producoesVinculadas[0].estouroPrazo).toBe(true)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await expect(
      page.getByText(new RegExp(`${producao.identificador}.*deve terminar depois do prazo prometido ao cliente`))
    ).toBeVisible()

    // vínculo já existe -> "Confirmar início" avança direto, sem a modal de oferta — estouro é só aviso
    await page.getByRole('button', { name: 'Confirmar início', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marcar como finalizado', exact: true })).toBeVisible({ timeout: 10000 })

    const orcamentoFinal = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoFinal.status).toBe('EM_PRODUCAO')
  })

  test('CEN-NOVO-N — double-submit ao criar produção nova embutida não duplica a produção', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA320N-Insumo-${Date.now()}`, 1000, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA320N-Produto-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 1)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA320N-Cliente-${Date.now()}`
    await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)
    await adicionarItemAvulso(page, nomeProduto, 5)
    await page.getByRole('button', { name: 'Não', exact: true }).first().click()
    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible()
    await page.getByRole('button', { name: /Vincular produção existente/ }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
    await page.getByRole('button', { name: 'Criar produção nova' }).click()
    await expect(page.getByText('Fica vinculada a este orçamento automaticamente')).toBeVisible()

    const terminoInput = page.locator('label', { hasText: 'Término previsto' }).locator('input[type="date"]')
    await terminoInput.fill(dataFutura(1))

    // achado de P-B020, proteção implementada em P-F005 (guarda `criandoNova`, ModalVincularProducao.tsx)
    // — não achamos o script avulso original de 5 cliques no repo (não commitado); reproduzimos aqui
    // com a mesma ideia (N cliques rápidos no mesmo botão). Escopado ao dialog (ModalShell,
    // role="dialog") — a Detalhe do Orçamento pra onde a tela navega em seguida também tem um botão
    // "Criar produção" (RN-NOVA-5, item sem estoque suficiente), mesmo nome acessível; sem escopo,
    // cliques que ainda não dispararam quando a navegação acontece podem acertar esse outro botão e
    // abrir uma 2ª navegação indesejada. `timeout` curto + `catch` em cada clique evita que um clique
    // "perdedor" (botão já desabilitado ou dialog já fechado) prenda o `Promise.all` até o timeout do
    // teste inteiro.
    const botaoCriar = page.getByRole('dialog').getByRole('button', { name: 'Criar produção', exact: true })
    await Promise.all([
      botaoCriar.click({ timeout: 3000 }).catch(() => {}),
      botaoCriar.click({ timeout: 3000 }).catch(() => {}),
      botaoCriar.click({ timeout: 3000 }).catch(() => {}),
      botaoCriar.click({ timeout: 3000 }).catch(() => {}),
      botaoCriar.click({ timeout: 3000 }).catch(() => {}),
    ])

    await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 })

    const orcamentoId = page.url().match(/\/orcamentos\/([0-9a-f-]+)$/)![1]
    const orcamentoFinal = await buscarOrcamento(request, token, orcamentoId)
    // única prova que importa: apenas 1 produção nasceu vinculada, apesar dos N cliques
    expect(orcamentoFinal.producoesVinculadas).toHaveLength(1)
    criadasProducaoIds.push(orcamentoFinal.producoesVinculadas[0].producaoId)
  })
})
