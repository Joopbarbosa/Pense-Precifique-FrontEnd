import { APIRequestContext, Page, expect } from '@playwright/test'
import { API_URL } from './auth'

interface FichaItem {
  insumoId: string
  quantidade: number
}

/** Produto válido: ficha técnica preenchida + rendimento > 0. */
export async function criarProdutoComFicha(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: FichaItem[],
  rendimento = 1
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento,
      fichaTecnica,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto (com ficha) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Produto válido (ficha técnica + rendimento, necessário para `POST /producoes/simular-alertas`
 * não recusar o produto) com um `estoqueAtual` inicial explícito — usado pelo RN-NOVA-5 para testar
 * o botão "Criar produção" do Detalhe do Orçamento, que precisa de estoque insuficiente E de um
 * produto que a Nova Produção consiga de fato simular alertas (diferente de `criarProdutoComEstoque`,
 * que não tem ficha técnica e faz `simularAlertas` retornar 400).
 */
export async function criarProdutoComFichaEEstoque(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: FichaItem[],
  estoqueAtual: number,
  rendimento = 1
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento,
      fichaTecnica,
      estoqueAtual,
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto (com ficha e estoque) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Produto sem ficha técnica (fichaTecnica: []) — precondição do Cenário 152. */
export async function criarProdutoSemFicha(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      fichaTecnica: [],
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto (sem ficha) de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Tenta criar um produto com ficha técnica preenchida e rendimento zerado/nulo — precondição
 * literal do Cenário 153. `ProdutoService.validarRendimento` (POST e PUT, mesma regra) rejeita
 * essa combinação com 400 sempre que fichaTecnica não está vazia, então esse estado é
 * inalcançável via API. A função devolve a resposta crua (sem checar ok()) para o spec decidir.
 */
export async function tentarCriarProdutoSemRendimento(
  request: APIRequestContext,
  token: string,
  nome: string,
  fichaTecnica: FichaItem[]
) {
  return request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      rendimento: 0,
      fichaTecnica,
    },
  })
}

export async function inativarProduto(request: APIRequestContext, token: string, id: string) {
  await request
    .delete(`${API_URL}/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {})
}

export async function buscarProducao(request: APIRequestContext, token: string, id: string) {
  const res = await request.get(`${API_URL}/producoes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

/** Não existe hard-delete de produção — teardown cancela para não poluir listagens/relatórios. */
export async function teardownProducoes(request: APIRequestContext, token: string, ids: string[]) {
  for (const id of ids) {
    await request
      .post(`${API_URL}/producoes/${id}/cancelar`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { justificativa: 'Cancelamento automático — limpeza de massa de teste QA-115' },
      })
      .catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// P-QA-002 (#116-#119) — editar / iniciar / travar / retomar
// ---------------------------------------------------------------------------

function amanha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function criarProducaoViaApi(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[],
  dataTerminoPrevista = amanha()
) {
  const res = await request.post(`${API_URL}/producoes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataTerminoPrevista, produtos },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Igual a criarProducaoViaApi, mas com dataInicio explícita — usado por specs que testam
 * filtro/ordenação por dataInicio (RN-NOVA-2/RN-NOVA-6), onde a data default (hoje) não serve. */
export async function criarProducaoComData(
  request: APIRequestContext,
  token: string,
  produtoId: string,
  dataInicio: string,
  dataTerminoPrevista = amanha()
) {
  const res = await request.post(`${API_URL}/producoes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataInicio, dataTerminoPrevista, produtos: [{ produtoId, quantidade: 1 }] },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produção com dataInicio: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Resposta crua (sem checar ok()) — quem chama decide se espera EM_ANDAMENTO, TRAVADA ou DivisaoResponse. */
export async function iniciarProducaoViaApi(
  request: APIRequestContext,
  token: string,
  id: string,
  dividir?: boolean
) {
  return request.post(`${API_URL}/producoes/${id}/iniciar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: dividir === undefined ? {} : { dividir },
  })
}

/** Composto de setup: cria produção + inicia via API. Assume que não há insumo bloqueante (senão cai em TRAVADA). */
export async function criarProducaoEmAndamento(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[],
  dataTerminoPrevista = amanha()
) {
  const producao = await criarProducaoViaApi(request, token, produtos, dataTerminoPrevista)
  const res = await iniciarProducaoViaApi(request, token, producao.id)
  if (!res.ok()) {
    throw new Error(`Falha ao iniciar produção via API: ${res.status()} ${await res.text()}`)
  }
  const iniciada = await res.json()
  if (iniciada.estado !== 'EM_ANDAMENTO') {
    throw new Error(`criarProducaoEmAndamento esperava EM_ANDAMENTO, obteve ${iniciada.estado} — setup incompatível (insumo bloqueante?)`)
  }
  return iniciada
}

/** Trava manual via API (setup rápido para cenários que não testam o ato de travar em si). */
export async function travarProducaoViaApi(request: APIRequestContext, token: string, id: string, justificativa: string) {
  const res = await request.post(`${API_URL}/producoes/${id}/travar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { justificativa },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao travar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

// --- wrappers de UI (assumem que a página já está em /producao/{id} com os modais disponíveis) ---

export async function iniciarProducao(page: Page, opcoes?: { escolha?: 'dividir' | 'travar' }) {
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar início' }).click()
  if (opcoes?.escolha === 'dividir') {
    // .click() já espera o elemento ficar acionável — não usar isVisible() aqui, que checa o
    // estado no instante da chamada (sem polling) e corre risco de rodar antes do modal trocar
    // de etapa (round-trip do POST /iniciar), pulando o clique silenciosamente.
    await page.getByRole('button', { name: 'Dividir produção' }).click({ timeout: 8000 })
  } else if (opcoes?.escolha === 'travar') {
    // Achado de flakiness (investigação de flaky pré-existente): o modal "travada" de
    // IniciarProducaoModal.tsx tem DOIS botões cujo nome acessível é "Fechar" ao mesmo tempo — o X
    // genérico do header do ModalShell (aria-label="Fechar", presente em todo modal do sistema) e o
    // botão de texto do próprio rodapé (`<Button variant="ghost">Fechar</Button>`). Os dois chamam o
    // mesmo `onSuccess(...)`, então não é uma divergência de comportamento — mas
    // `getByRole('button', { name: 'Fechar' })` sem desambiguação resolve pra 2 elementos assim que
    // o POST /iniciar troca a etapa do modal para "travada", causando `strict mode violation`
    // sempre que esse re-render acontece antes do clique (ver relatório da investigação). Filtrar
    // por `hasText` isola o botão de texto do rodapé (o X do header não tem texto, só aria-label).
    await page.getByRole('button', { name: 'Fechar' }).filter({ hasText: 'Fechar' }).click({ timeout: 8000 })
  }
}

export async function travarProducao(page: Page, justificativa: string) {
  await page.getByRole('button', { name: 'Travar', exact: true }).click()
  await page.getByPlaceholder('Descreva o motivo da trava...').fill(justificativa)
  await page.getByRole('button', { name: 'Confirmar trava' }).click()
}

export async function retomarProducao(page: Page, opcoes?: { dividirMesmoAssim?: boolean }) {
  await page.getByRole('button', { name: 'Retomar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar retomada' }).click()
  if (opcoes?.dividirMesmoAssim) {
    const dividirBtn = page.getByRole('button', { name: 'Dividir mesmo assim' })
    await expect(dividirBtn).toBeVisible({ timeout: 5000 })
    await dividirBtn.click()
  }
}

// ---------------------------------------------------------------------------
// P-QA-003 (#120-#121) — finalizar / cancelar com consumo real
// ---------------------------------------------------------------------------

export async function finalizarProducaoViaApi(request: APIRequestContext, token: string, id: string) {
  const res = await request.post(`${API_URL}/producoes/${id}/finalizar`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao finalizar produção via API: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function finalizarProducao(page: Page) {
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar finalização' }).click()
}

/** RN-NOVA-4 (#188) — abre o modal de finalizar e declara perda por produto antes de confirmar. */
export async function finalizarProducaoComPerda(page: Page, perdas: Record<string, number>) {
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  for (const [produtoId, valor] of Object.entries(perdas)) {
    await page.locator(`#perda-${produtoId}`).fill(String(valor))
  }
  await page.getByRole('button', { name: 'Confirmar finalização' }).click()
}

/**
 * Composto de setup: cria produção + inicia via API (deduz estoque), devolve o id e o
 * insumosConsumidos original (quantidade baixada por insumo/produtoBase) — usado nos cenários
 * 172-176 (P-QA-003) para comparar consumo declarado vs. original.
 */
export async function criarProducaoEmAndamentoComConsumo(
  request: APIRequestContext,
  token: string,
  produtos: { produtoId: string; quantidade: number }[]
) {
  const iniciada = await criarProducaoEmAndamento(request, token, produtos)
  return {
    producaoId: iniciada.id as string,
    insumosConsumidos: (iniciada.insumosConsumidos as { insumoId: string | null; produtoBaseId?: string | null; quantidade: number }[])
      .map(ic => ({ insumoId: ic.insumoId, produtoBaseId: ic.produtoBaseId ?? null, quantidadeOriginal: ic.quantidade })),
  }
}

// ---------------------------------------------------------------------------
// P-QA-004 (#122-#125) — lista / kanban / detalhe
// ---------------------------------------------------------------------------

export async function retomarProducaoViaApi(request: APIRequestContext, token: string, id: string, dividir?: boolean) {
  return request.post(`${API_URL}/producoes/${id}/retomar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: dividir === undefined ? {} : { dividir },
  })
}

/** Cria N produções via Promise.all, todas com o mesmo produto — usado nos cenários 177/178 (paginação). */
/**
 * Achado de homologação (não ligado a um cenário específico, descoberto durante a massa de
 * dados de 177/178): POST /producoes com `Promise.all` (concorrente) falha com 500 —
 * `duplicate key value violates unique constraint "uq_producao_usuario_numero"`
 * (`ConstraintViolationException`, Postgres). O número sequencial do identificador PRD-N não é
 * atribuído atomicamente (parece ler o próximo número e só then inserir, sem lock/sequence do
 * banco), então requisições concorrentes colidem no mesmo número. Criar em sequência (não em
 * paralelo) evita o problema — é uma limitação real do backend, não um requisito dos cenários
 * 177/178 (que testam paginação, não criação concorrente), por isso a massa de dados usa este
 * caminho sequencial em vez de Promise.all.
 */
export async function criarProducoesEmLote(
  request: APIRequestContext,
  token: string,
  produtoId: string,
  n: number,
  dataTerminoPrevista = amanha()
) {
  const criadas = []
  for (let i = 0; i < n; i++) {
    criadas.push(await criarProducaoViaApi(request, token, [{ produtoId, quantidade: 1 }], dataTerminoPrevista))
  }
  return criadas
}

/**
 * Encadeia as chamadas de API necessárias para levar uma produção recém-criada
 * (AGUARDANDO_INICIO) até o status alvo. Cobre os caminhos "naturais" usados nos cenários
 * 180/185/188 — não cobre NAO_REALIZADA (só alcançável via divisão, ver Cenário 161/187) nem
 * CANCELADA com consumo parcial (ver criarProducaoEmAndamentoComConsumo + cancelar direto).
 */
export async function moverParaStatus(
  request: APIRequestContext,
  token: string,
  id: string,
  statusDestino: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO' | 'TRAVADA' | 'FINALIZADA' | 'CANCELADA'
) {
  if (statusDestino === 'AGUARDANDO_INICIO') return buscarProducao(request, token, id)

  const iniciada = await iniciarProducaoViaApi(request, token, id)
  if (!iniciada.ok()) throw new Error(`moverParaStatus: falha ao iniciar: ${iniciada.status()} ${await iniciada.text()}`)
  if (statusDestino === 'EM_ANDAMENTO') return iniciada.json()

  const travada = await travarProducaoViaApi(request, token, id, 'Trava manual — setup de teste para atingir o status alvo (moverParaStatus).')
  if (statusDestino === 'TRAVADA') return travada

  if (statusDestino === 'FINALIZADA') {
    throw new Error('moverParaStatus: FINALIZADA exige retomar antes de finalizar — chame retomarProducaoViaApi e finalizarProducaoViaApi separadamente após TRAVADA.')
  }
  if (statusDestino === 'CANCELADA') {
    const res = await request.post(`${API_URL}/producoes/${id}/cancelar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { justificativa: 'Cancelamento — setup de teste para atingir o status alvo (moverParaStatus).', consumoReal: [] },
    })
    if (!res.ok()) throw new Error(`moverParaStatus: falha ao cancelar: ${res.status()} ${await res.text()}`)
    return res.json()
  }
  throw new Error(`moverParaStatus: destino não suportado: ${statusDestino}`)
}

/**
 * Simula um drag-and-drop de card via MOUSE no KanbanBoard (@dnd-kit/core, PointerSensor).
 * `page.dragAndDrop()` nativo não funciona aqui (ver relatório da P-QA-004) — a única abordagem
 * de mouse que efetivamente aciona o dnd-kit é uma sequência manual de mouse down/move/up com um
 * pequeno "jiggle" inicial (supera o activationConstraint distance:6) e vários passos
 * intermediários (dnd-kit recalcula colisão a cada pointermove).
 *
 * Duas armadilhas de geometria descobertas empiricamente (ver relatório da P-QA-004):
 * 1. O alvo real do drop é o container droppable (`div.overflow-y-auto`, `ref={setNodeRef}` em
 *    `KanbanColumnView`), IRMÃO do header (`div.rounded-t-card`) — não o próprio header.
 * 2. Mirar no CENTRO exato do container droppable da última coluna (a mais à direita) faz o
 *    dnd-kit perder a detecção de colisão bem no passo final (`aria-live` reporta "is no longer
 *    over a droppable area" mesmo com o card geometricamente sobre a coluna) — reproduzido de
 *    forma consistente em qualquer largura de viewport testada, então não é recorte de tela.
 *    Mirar perto do canto superior-esquerdo do container (colBox.x+40, colBox.y+40) evita o
 *    problema de forma confiável.
 *
 * Limite conhecido desta função (não corrigido, ver P-FE-CORRIGE — coluna própria NÃO_REALIZADA):
 * com 6 colunas o board passa a exigir scroll horizontal mesmo em viewport bem alargado — o
 * conteúdo da página é limitado a `max-w-[1280px]` (AppLayout.tsx), que não escala com o viewport
 * do browser. Se origem e destino não estiverem simultaneamente na área visível sem scroll, o
 * `boundingBox()` de um dos dois fica incorreto (Playwright não faz auto-scroll aqui). Nesse caso,
 * usar o fluxo de teclado (`KeyboardSensor`, P-FE-CORRIGE-009) em vez desta função — o
 * `coordinateGetter` dele opera em espaço de coordenadas relativo, não depende de scroll/
 * visibilidade (ver `kanban-producao.spec.ts`, teste 184a).
 *
 * KeyboardSensor foi adicionado ao KanbanBoard em P-FE-CORRIGE-009 (V0.6.1) — Space/setas/Escape
 * funcionam via teclado desde então, ver os testes 203-205 em `kanban-producao.spec.ts`.
 */
// ---------------------------------------------------------------------------
// P-QA-005 (#126, #122) — validação de estoque no orçamento e agrupamento de produções
// ---------------------------------------------------------------------------

/** Produto tipo PRODUTO com estoqueAtual definido diretamente (ProdutoRequest aceita o campo — ProdutoRequest.java:37). */
export async function criarProdutoComEstoque(
  request: APIRequestContext,
  token: string,
  nome: string,
  estoqueAtual: number
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nome,
      tipo: 'PRODUTO',
      tempoProducao: 10,
      estoqueAtual,
      fichaTecnica: [],
    },
  })
  if (!res.ok()) {
    throw new Error(`Falha ao criar produto com estoque de teste: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

export async function agruparProducoesViaApi(
  request: APIRequestContext,
  token: string,
  data: {
    producaoIds: string[]
    estadoDestino: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO' | 'TRAVADA'
    dataInicio?: string
    dataTerminoPrevista?: string
    justificativa: string
    consumoRealPorProducao?: Record<string, { insumoId?: string; produtoBaseId?: string; quantidadeConsumida: number }[]>
  }
) {
  return request.post(`${API_URL}/producoes/agrupar`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
}

/** Linha desktop (`ProducaoRow`, sm:grid) da lista de produção, escopada pelo identificador exato (PRD-N). */
export function linhaProducaoDesktop(page: Page, identificador: string) {
  return page.locator('div.sm\\:grid.cursor-pointer').filter({ has: page.getByText(identificador, { exact: true }) })
}

export async function ativarModoAgrupamento(page: Page) {
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click()
}

/** Assume modo de agrupamento já ativo. Clica no checkbox de seleção de cada PRD por identificador. */
export async function selecionarParaAgrupar(page: Page, identificadores: string[]) {
  for (const identificador of identificadores) {
    await linhaProducaoDesktop(page, identificador).locator('button').click()
  }
}

export async function arrastarCard(page: Page, identificador: string, colunaDestinoLabel: string) {
  const card = page.getByText(identificador, { exact: true })
  await expect(card).toBeVisible({ timeout: 5000 })
  const cardBox = await card.boundingBox()
  if (!cardBox) throw new Error(`arrastarCard: bounding box não encontrado para card ${identificador}`)

  const droppable = page.locator('div.rounded-t-card', { hasText: colunaDestinoLabel }).first().locator('xpath=following-sibling::div[1]')
  await expect(droppable).toBeVisible({ timeout: 5000 })
  const colBox = await droppable.boundingBox()
  if (!colBox) throw new Error(`arrastarCard: bounding box não encontrado para coluna ${colunaDestinoLabel}`)

  const startX = cardBox.x + cardBox.width / 2
  const startY = cardBox.y + cardBox.height / 2
  const endX = colBox.x + 40
  const endY = colBox.y + 40

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await page.mouse.move(startX + 10, startY + 10) // jiggle — supera activationConstraint distance:6
  await page.waitForTimeout(150)

  const steps = 40
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps
    const y = startY + ((endY - startY) * i) / steps
    await page.mouse.move(x, y)
    await page.waitForTimeout(50)
  }
  await page.waitForTimeout(400)
  await page.mouse.up()
}
