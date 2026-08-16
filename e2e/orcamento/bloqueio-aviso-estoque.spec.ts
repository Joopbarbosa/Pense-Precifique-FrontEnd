import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoqueEFlag, inativarProduto } from '../helpers/producao'
import { criarCliente, selecionarCliente } from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #218 (V0.8, RN-NOVA-8/9/10/11) — bloqueio/aviso de estoque ao adicionar item em
 * Novo Orçamento, modal de aviso ao avançar com link de criação de produção, e estoque sempre
 * vivo (não mais snapshot congelado no momento da adição). Cenários oficiais em
 * `docs-pense-precifique/modulos/ORCAMENTO/cenarios-orcamento.md`, ORC-CEN-062 a 066 — texto de
 * ORC-CEN-063/064 desatualizado ali (ver DECISOES_V0.8.1.md), consolidação formal do doc fica
 * para o fechamento de versão.
 *
 * OpenProject #246/#245 (RN-NOVA-11) — o aviso inline por item foi removido; ORC-CEN-063 passou a
 * validar sua ausência (CEN-NOVO-15) e ORC-CEN-064 passou a validar o texto único concentrado na
 * modal de checkpoint (CEN-NOVO-16).
 *
 * `adicionarItemAvulso` (e2e/helpers/orcamento.ts) não serve para os cenários de bloqueio: ela
 * assume que "Adicionar ao orçamento" sempre confirma e a item entra na lista — aqui o próprio
 * clique pode ficar bloqueado (RN-NOVA-8), então os testes deste arquivo montam o fluxo de
 * adição manualmente onde precisam checar o estado do modal/toast no meio do caminho.
 */
test.describe('ORC-CEN-062 a 066 — Bloqueio/aviso de estoque em Novo Orçamento (#218, #246, #245)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('ORC-CEN-062 — bloqueia a adição de item sem estoque quando permitirEstoqueNegativo=false', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-Bloqueio-${Date.now()}`
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

    // RN-NOVA-8: bloqueado — toast explica o motivo, item nunca entra na lista, modal de margem
    // continua aberto (não fecha sozinho num bloqueio, diferente de uma adição bem-sucedida).
    await expect(page.getByText(/Estoque insuficiente para adicionar/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/n[ãa]o permite estoque negativo/i)).toBeVisible()
    await expect(confirmar).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByText('Nenhum produto adicionado')).toBeVisible()
  })

  test('ORC-CEN-063 / CEN-NOVO-15 — sem aviso inline quando permitirEstoqueNegativo=true, mesmo com estoque insuficiente', async ({ page, request }) => {
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

    // Não bloqueado: item entra na lista normalmente (qtd inicial 1 <= estoque 2, sem aviso ainda).
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible({ timeout: 5000 })

    // RN-NOVA-11 — sobe a quantidade além do estoque (2) via Stepper: item fica com estoque
    // insuficiente, mas nenhum aviso inline é exibido junto à linha (CEN-NOVO-15). O aviso passa a
    // ser concentrado só na modal de checkpoint ao clicar "Criar orçamento" (ver ORC-CEN-064).
    // Espera o debounce de 300ms + round-trip da simulação ao vivo (RN-NOVA-11) antes de checar a
    // ausência — garante que a checagem cobre o estado já com `situacao: 'AVISO'` na resposta, não
    // só o instante antes da simulação chegar.
    await page.getByRole('button', { name: '+', exact: true }).click()
    await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible()
    await expect(page.getByText(/dispon[ií]vel 2, necess[áa]rio 3/i)).toHaveCount(0)
    await expect(page.getByText('Itens com estoque insuficiente')).toHaveCount(0)
  })

  test('ORC-CEN-064 / CEN-NOVO-16 — modal de checkpoint único ao criar orçamento, com disponível/necessário e link "Criar produção"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-Modal-${Date.now()}`
    const produto = await criarProdutoComEstoqueEFlag(request, token, nomeProduto, 2, true)
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

    // quantidade 5, estoque 2 -> falta 3. RN-NOVA-11: nenhum aviso inline aparece ao subir a
    // quantidade — só a modal de checkpoint ao clicar "Criar orçamento", abaixo. Espera o debounce
    // de 300ms + round-trip da simulação ao vivo antes de submeter — sem isso, `handleSubmit` pode
    // rodar com `simulacoes` ainda desatualizado (mesmo risco documentado em validacao-estoque.spec.ts).
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText('Itens com estoque insuficiente')).toHaveCount(0)

    await page.locator('input[type="number"][placeholder="10"]').fill('5')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/dispon[ií]vel 2, necess[áa]rio 5/i)).toBeVisible()
    await expect(page.getByText(/faltam 3 un\./i)).toBeVisible()

    const linkProducao = page.getByRole('button', { name: 'Criar produção', exact: true })
    await expect(linkProducao).toBeVisible()
    await linkProducao.click()

    await expect(page).toHaveURL(new RegExp(`/producao/nova\\?produtoId=${produto.id}&quantidade=3`), { timeout: 5000 })
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

  test('ORC-CEN-066 — erro 400 de POST /orcamentos (corrida de estoque, RN-NOVA-10) é tratado via toast, nunca alert()', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA218-Corrida-${Date.now()}`
    const produto = await criarProdutoComEstoqueEFlag(request, token, nomeProduto, 5, false)
    criadosProdutoIds.push(produto.id)
    const nomeCliente = `QA218-Cliente-066-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)

    let dialogApareceu = false
    page.on('dialog', d => { dialogApareceu = true; d.dismiss() })

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()
    const confirmar = page.getByRole('button', { name: 'Adicionar ao orçamento', exact: true })
    await expect(confirmar).toBeEnabled({ timeout: 5000 })
    await confirmar.click()

    // Item adicionado com qtd 1 <= estoque 5 (RN-NOVA-8 não bloqueia neste ponto). Simula corrida:
    // estoque cai para 0 por fora entre a simulação inicial e o submit, sem nova checagem local —
    // só o POST final (RN-NOVA-10) vai barrar.
    await expect(page.getByText(nomeProduto, { exact: true })).toBeVisible({ timeout: 5000 })
    const resBaixa = await request.post(`${API_URL}/produtos/${produto.id}/baixa-manual`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { quantidade: 5, motivo: 'OUTRO', observacao: 'QA218 ORC-CEN-066 — zera estoque para forçar 400 defensivo no POST /orcamentos' },
    })
    if (!resBaixa.ok()) throw new Error(`Falha na baixa manual de teste: ${resBaixa.status()} ${await resBaixa.text()}`)

    await page.locator('input[type="number"][placeholder="10"]').fill('5')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()

    // Toast com a mensagem real do backend — nunca `alert()` (checado via listener de dialog).
    await expect(page.getByText(/Estoque insuficiente/i)).toBeVisible({ timeout: 10_000 })
    expect(dialogApareceu).toBe(false)
    await expect(page).toHaveURL(/\/orcamentos\/novo$/)
  })
})
