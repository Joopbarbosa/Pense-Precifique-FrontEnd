import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoqueEFlag, criarProdutoComFichaEEstoque, inativarProduto } from '../helpers/producao'
import { criarInsumoFracionavel } from '../helpers/insumo'
import { criarCliente, selecionarCliente } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #218 (V0.8) → revisado em V0.8.1 (P-F001c, OpenProject #246/#245, RN-NOVA-11
 * revisada) — validação manual do usuário sobre P-F001 (976805f)/P-F001b (960dd96) mostrou que a
 * spec original estava errada em dois pontos: o aviso inline nunca deveria ter sido removido (só
 * mudou de lugar — vira uma tag ao lado da tag de catálogo/venda avulsa) e a adição de item nunca
 * deveria bloquear, independente de permitirEstoqueNegativo. A única trava real de negócio é o
 * avanço para FINALIZADO (RN-059, inalterada — ver `validacao-estoque.spec.ts`, teste "RN-052
 * ampliada"). Ver `DECISOES_V0.8.1.md` para o texto completo da RN-NOVA-11 revisada.
 *
 * ORC-CEN-062 (bloqueio na adição) e ORC-CEN-066 (400 de corrida de estoque no POST /orcamentos)
 * deixaram de existir: nenhum dos dois é mais um comportamento real do sistema.
 *
 * P-F005/#251 (2026-08-16) — clicar no produto avulso agora adiciona direto ao orçamento, sem
 * `ModalMargemAvulso` (removida). Os 4 testes abaixo tinham um passo extra de confirmar via botão
 * "Adicionar ao orçamento" da modal — removido, sem outra mudança de fluxo.
 */
test.describe('ORC-CEN-063 a 065 (revisados) — Aviso de estoque em Novo Orçamento nunca bloqueia (#246, #245)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('CEN-NOVO-17 — adicionar item com estoque insuficiente nunca bloqueia, mesmo com permitirEstoqueNegativo=false', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-SemBloqueio-${Date.now()}`
    const produto = await criarProdutoComEstoqueEFlag(request, token, nomeProduto, 0, false)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-062-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // RN-NOVA-11 (revisada) — item entra na lista normalmente, sem toast de bloqueio, mesmo com
    // permitirEstoqueNegativo=false e estoque 0.
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Estoque insuficiente para adicionar/i)).toHaveCount(0)
  })

  test('CEN-NOVO-15/17 — tag de aviso inline aparece ao lado da tag de catálogo/venda avulsa, independente de permitirEstoqueNegativo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-Aviso-${Date.now()}`
    const produto = await criarProdutoComEstoqueEFlag(request, token, nomeProduto, 2, true)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-063-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // Qtd inicial 1 <= estoque 2 — sem aviso ainda.
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Estoque insuficiente', { exact: true })).toHaveCount(0)

    // Sobe a quantidade além do estoque (2) via Stepper — RN-NOVA-11 revisada: aviso volta a
    // aparecer inline, junto à tag de catálogo/venda avulsa da linha do item (não mais escondido
    // até o clique em "Criar orçamento"). Espera o debounce de 300ms + round-trip da simulação.
    await page.getByRole('button', { name: '+', exact: true }).click()
    await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText('Estoque insuficiente', { exact: true })).toBeVisible()
  })

  test('ORC-CEN-087 (ex-CEN-NOVO-16/CEN-NOVO-1) — checkpoint com checkbox: "Criar produção" em lote persiste o orçamento e cria a produção vinculada só com os itens marcados (RN-NOVA-12/13/14-pt1)', async ({ page, request }) => {
    const token = await apiLogin(request)
    // Precisa de ficha técnica válida (não só estoqueAtual) — mesmo motivo documentado em
    // itens-sem-estoque.spec.ts. Insumo fracionável evita a trava de múltiplo de rendimento
    // (RN-051/#187), que não é o que este teste investiga.
    const insumo = await criarInsumoFracionavel(request, token, `QA218-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeProduto = `QA218-Modal-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 2)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-064-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // quantidade 5, estoque 2 -> falta 3.
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText('Itens com estoque insuficiente')).toHaveCount(0)

    await page.locator('input[type="number"][placeholder="10"]').fill('5')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/disponível 2, necessário 5/i)).toBeVisible()
    await expect(page.getByText(/faltam 3 un\./i)).toBeVisible()

    // Sem seleção, "Criar produção" fica desabilitado (RN-NOVA-13, caso composto — ORC-CEN-089).
    const criarProducaoBtn = page.getByRole('button', { name: /^Criar produção/, exact: false })
    await expect(criarProducaoBtn).toBeDisabled()

    // Marca o checkbox do item — habilita a ação em lote.
    await page.getByRole('checkbox').check()
    await expect(criarProducaoBtn).toBeEnabled()
    await expect(page.getByText('Criar produção (1)')).toBeVisible()

    await criarProducaoBtn.click()

    // RN-NOVA-12 — mini-formulário próprio abre (nunca navega direto pra /producao/nova, o
    // orçamento ainda não foi persistido neste ponto).
    await expect(page.getByText(/Cobre só/)).toBeVisible({ timeout: 5000 })
    await page.locator('label:has-text("Término previsto") input[type="date"]').fill('2026-12-01')
    await page.getByRole('button', { name: 'Criar produção', exact: true }).click()

    // RN-NOVA-14 ponto 1 — sucesso navega de volta pro orçamento recém-criado, não pra Produção.
    await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/, { timeout: 8000 })
    const orcamentoId = page.url().split('/orcamentos/')[1]

    const orcamentoRes = await request.get(`${API_URL}/orcamentos/${orcamentoId}`, { headers: { Authorization: `Bearer ${token}` } })
    const orcamento = await orcamentoRes.json()
    expect(orcamento.producoesVinculadas).toHaveLength(1)

    const producaoRes = await request.get(`${API_URL}/producoes/${orcamento.producoesVinculadas[0].producaoId}`, { headers: { Authorization: `Bearer ${token}` } })
    const producao = await producaoRes.json()
    // RN-NOVA-13 — produção cobre só o item marcado, não todos os itens do orçamento.
    expect(producao.produtos).toHaveLength(1)
    expect(producao.produtos[0].nomeProduto).toBe(nomeProduto)
  })

  test('ORC-CEN-090 (ex-CEN-NOVO-4) — cancelar o mini-formulário antes de confirmar mantém a artesã no checkpoint, sem perder o rascunho (RN-NOVA-14-pt2)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoFracionavel(request, token, `QA218-Insumo-${Date.now()}`, 100, 'DECIMAL')
    const nomeProduto = `QA218-Cancelar-${Date.now()}`
    const produto = await criarProdutoComFichaEEstoque(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 2)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-090-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)

    await page.locator('input[type="number"][placeholder="10"]').fill('5')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })

    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^Criar produção/, exact: false }).click()
    await expect(page.getByText(/Cobre só/)).toBeVisible({ timeout: 5000 })

    // Cancela sem preencher o formulário — orçamento nunca foi persistido, então não há pra onde
    // "voltar": fica no checkpoint, rascunho intacto em memória.
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(/\/orcamentos\/novo$/)
    await expect(page.getByText(nomeProduto, { exact: true }).first()).toBeVisible()
  })

  test('ORC-CEN-065 — estoque exibido reflete a simulação mais recente, não o snapshot da adição', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-Vivo-${Date.now()}`
    const produto = await criarProdutoComEstoqueEFlag(request, token, nomeProduto, 10, true)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-065-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    // Snapshot no momento da adição: 10 em estoque.
    await expect(page.getByText('10 em estoque')).toBeVisible({ timeout: 5000 })

    // Estoque muda por fora (ex.: outra venda/baixa manual) enquanto o orçamento ainda está sendo
    // montado — RN-NOVA-11 exige que a tag reflita o valor vivo, não o congelado no clique de adicionar.
    const resBaixa = await request.post(`${API_URL}/produtos/${produto.id}/baixa-manual`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { quantidade: 7, motivo: 'OUTRO', observacao: 'QA218 ORC-CEN-065 — baixa manual para forçar estoque vivo divergir do snapshot de adição' },
    })
    if (!resBaixa.ok()) throw new Error(`Falha na baixa manual de teste: ${resBaixa.status()} ${await resBaixa.text()}`)

    // Qualquer mudança na lista (aqui, a quantidade) dispara nova simulação (RN-NOVA-11).
    await page.getByRole('button', { name: '+', exact: true }).click()
    await expect(page.getByText('3 em estoque')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('10 em estoque')).toHaveCount(0)
  })
})
