import { test, expect, Locator } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import {
  criarCliente,
  criarOrcamentoViaApi,
  avancarStatusViaApi,
  selecionarCliente,
  adicionarItemAvulso,
  buscarOrcamento,
} from '../helpers/orcamento'

/**
 * Homologação Onda 5 (Cenário 239) — os 4 modais de Orçamento que usam `ModalShell` nunca tinham
 * sido validados visualmente na correção original, só por herança estrutural do componente
 * (`ModalShell.tsx:63-72`: título na `div` de cima, subtitle logo abaixo, mesmo cabeçalho;
 * Escape tratado dentro do próprio `ModalShell` via keydown em `document`, não duplicado nos
 * consumidores). Modais cobertos:
 * - `ModalCustomizacoes` (CriarOrcamentoPage.tsx:240-394) — título = nome do item, subtitle fixo
 * - `ModalMargemAvulso` (CriarOrcamentoPage.tsx:940-1030) — título = nome do produto avulso
 * - `ModalSinal` (DetalheOrcamentoPage.tsx:180-303) — usa ModalShell direto
 * - `ModalCancelJustificativa` (DetalheOrcamentoPage.tsx:340-398) — usa ConfirmacaoModal,
 *   wrapper fino sobre ModalShell que repassa title/subtitle sem alterar a estrutura
 *
 * Fora de escopo: `ModalCancelMulta` e `ModalCancelEstorno` (DetalheOrcamentoPage) são diálogos
 * hand-rolled, não usam ModalShell — cobertos por outro spec (RN-053/estorno).
 */

async function expectTituloAcimaDoSubtitle(dialog: Locator, titulo: string, subtitle: string) {
  const tituloLoc = dialog.getByText(titulo, { exact: true }).first()
  const subtitleLoc = dialog.getByText(subtitle, { exact: true }).first()
  await expect(tituloLoc).toBeVisible()
  await expect(subtitleLoc).toBeVisible()
  const tituloBox = await tituloLoc.boundingBox()
  const subtitleBox = await subtitleLoc.boundingBox()
  expect(tituloBox).not.toBeNull()
  expect(subtitleBox).not.toBeNull()
  expect(tituloBox!.y).toBeLessThan(subtitleBox!.y)
}

test.describe('Cenário 239 — ModalShell nos 4 modais de Orçamento (título acima do subtitle + abre/fecha, incl. Escape)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('239a — ModalCustomizacoes (CriarOrcamentoPage): título do item acima de "Customizações", fecha com Escape', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA239a-Cliente-${Date.now()}`
    await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA239a-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)
    await adicionarItemAvulso(page, nomeProduto, 1)

    await page.getByRole('button', { name: 'Customizações', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expectTituloAcimaDoSubtitle(dialog, nomeProduto, 'Customizações')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('239b — ModalMargemAvulso (CriarOrcamentoPage): título do produto acima de "Adicionar produto avulso", fecha com Escape sem adicionar o item', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA239b-Cliente-${Date.now()}`
    await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA239b-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, nomeCliente)

    // Abre o modal sem confirmar — só o início do fluxo de `adicionarItemAvulso`.
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto)
    await page.getByText(nomeProduto, { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expectTituloAcimaDoSubtitle(dialog, nomeProduto, 'Adicionar produto avulso')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    // Escape fecha sem adicionar o item ao orçamento (ModalMargemAvulso não foi confirmado).
    await expect(page.getByText('Venda sem catálogo')).toHaveCount(0)
  })

  test('239c — ModalSinal (DetalheOrcamentoPage): "Confirmar recebimento do sinal" acima de "Aguardando Sinal", fecha com X e com Escape', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA239c-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA239c-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 10)
    criadosProdutoIds.push(produto.id)

    const orcamento = await criarOrcamentoViaApi(
      request,
      token,
      cliente.id,
      [{ produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }],
      { sinalAtivo: true, percentualSinal: 30 }
    )
    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO -> APROVADO
    const resAguardandoSinal = await avancarStatusViaApi(request, token, orcamento.id) // APROVADO -> AGUARDANDO_SINAL
    expect((await resAguardandoSinal.json()).status).toBe('AGUARDANDO_SINAL')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Confirmar recebimento do sinal', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expectTituloAcimaDoSubtitle(dialog, 'Confirmar recebimento do sinal', 'Aguardando Sinal')

    // X do cabeçalho
    await page.locator('[role="dialog"] button[aria-label="Fechar"]').click()
    await expect(dialog).toHaveCount(0)

    // Reabre e fecha via Escape
    await page.getByRole('button', { name: 'Confirmar recebimento do sinal', exact: true }).click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // Nenhum dos dois fechamentos avançou o status.
    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.status).toBe('AGUARDANDO_SINAL')
  })

  test('239d — ModalCancelJustificativa (DetalheOrcamentoPage): "Cancelar pedido já entregue?" acima de "Justificativa obrigatória", fecha com "Voltar" e com Escape', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA239d-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA239d-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 },
    ])
    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO -> APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO -> EM_PRODUCAO (sinalAtivo=false)
    await avancarStatusViaApi(request, token, orcamento.id) // EM_PRODUCAO -> FINALIZADO
    const resEntregue = await avancarStatusViaApi(request, token, orcamento.id) // FINALIZADO -> ENTREGUE
    expect((await resEntregue.json()).status).toBe('ENTREGUE')

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expectTituloAcimaDoSubtitle(dialog, 'Cancelar pedido já entregue?', 'Justificativa obrigatória')

    // Voltar (rodapé)
    await dialog.getByRole('button', { name: 'Voltar', exact: true }).click()
    await expect(dialog).toHaveCount(0)

    // Reabre e fecha via Escape
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // Nenhum dos dois fechamentos cancelou o orçamento.
    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.status).toBe('ENTREGUE')
  })
})
