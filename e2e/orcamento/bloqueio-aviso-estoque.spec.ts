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
    const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
    await expect(confirmar).toBeEnabled({ timeout: 5000 })
    await confirmar.click()

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
    const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
    await expect(confirmar).toBeEnabled({ timeout: 5000 })
    await confirmar.click()

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

  test('CEN-NOVO-16 — modal de checkpoint com checkbox e ação única "Criar produção" em lote ao clicar "Criar orçamento"', async ({ page, request }) => {
    const token = await apiLogin(request)
    // Precisa de ficha técnica válida (não só estoqueAtual) para POST /producoes/simular-alertas
    // não recusar o produto ao carregar a Nova Produção pré-preenchida — mesmo motivo documentado
    // em itens-sem-estoque.spec.ts ("clicar em Criar produção navega..."). Insumo fracionável evita
    // a trava de múltiplo de rendimento (RN-051/#187), que não é o que este teste investiga.
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
    const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
    await expect(confirmar).toBeEnabled({ timeout: 5000 })
    await confirmar.click()

    // quantidade 5, estoque 2 -> falta 3.
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText('Itens com estoque insuficiente')).toHaveCount(0)

    await page.locator('input[type="number"][placeholder="10"]').fill('5')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/disponível 2, necessário 5/i)).toBeVisible()
    await expect(page.getByText(/faltam 3 un\./i)).toBeVisible()

    // Sem seleção, "Criar produção" fica desabilitado.
    const criarProducaoBtn = page.getByRole('button', { name: /^Criar produção/, exact: false })
    await expect(criarProducaoBtn).toBeDisabled()

    // Marca o checkbox do item — habilita a ação em lote.
    await page.getByRole('checkbox').check()
    await expect(criarProducaoBtn).toBeEnabled()
    await expect(page.getByText('Criar produção (1)')).toBeVisible()

    await criarProducaoBtn.click()
    await expect(page).toHaveURL(/\/producao\/nova$/, { timeout: 5000 })
    // Pré-preenchido em lote via location.state (sem produtoId/quantidade na query string).
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible({ timeout: 5000 })
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
    const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
    await expect(confirmar).toBeEnabled({ timeout: 5000 })
    await confirmar.click()

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
