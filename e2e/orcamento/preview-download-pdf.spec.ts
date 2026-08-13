import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque } from '../helpers/producao'

/**
 * Épico #89 (V0.8) — consolidação do download de PDF + RN-NOVA-2 (gate preview→download real,
 * via `GET /orcamentos/{id}/preview-html`) + RN-NOVA-3 (retry com cooldown). Os cenários de erro
 * usam `page.route` para simular falha do microsserviço (mesmo padrão de
 * `configuracoes-toast.spec.ts`) — a validação com o container real derrubado foi feita à parte,
 * manualmente (Passo 7), não faz parte da suíte automatizada.
 */

const MENSAGEM_INDISPONIVEL = 'Geração de documento temporariamente indisponível. Tente novamente em instantes.'

async function criarOrcamentoDeTeste(request: import('@playwright/test').APIRequestContext, sufixo: string) {
  const token = await apiLogin(request)
  const nome = `QA-PDF89-${sufixo}-${Date.now()}`
  const produto = await criarProdutoComEstoque(request, token, `${nome}-Produto`, 10)
  const cliente = await criarCliente(request, token, `${nome}-Cliente`)
  const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
    { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 1 },
  ])
  return orcamento
}

test.describe('Épico #89 — Preview/Download de PDF do orçamento', () => {

  test('preview carrega HTML real do microsserviço e habilita o download (RN-NOVA-2)', async ({ page, request }) => {
    const orcamento = await criarOrcamentoDeTeste(request, 'sucesso')
    await login(page)
    // Atraso artificial no preview-html só para conseguir observar o estado "carregando" de forma
    // não-flaky — o microsserviço real responde rápido demais para capturar a janela de disabled
    // de forma confiável neste teste; o gate em si (bloqueio real quando falha) é coberto no teste
    // de erro abaixo, sem mock de atraso.
    await page.route('**/preview-html', async (route) => {
      await new Promise((r) => setTimeout(r, 800))
      await route.continue()
    })
    await page.goto(`/orcamentos/${orcamento.id}/preview`)

    const btnBaixar = page.getByRole('button', { name: /Baixar PDF|Preparando|Aguarde/ })
    await expect(btnBaixar).toBeDisabled()

    const iframe = page.locator('iframe[title="Preview do orçamento"]')
    await expect(iframe).toBeVisible({ timeout: 15_000 })

    // Confirma que é o HTML de verdade do microsserviço (dado real do orçamento), não mais o
    // componente Tailwind local — o número do orçamento aparece dentro do iframe.
    await expect(page.frameLocator('iframe[title="Preview do orçamento"]').locator('body'))
      .toContainText(`#${orcamento.numero}`)

    await expect(page.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled()
  })

  test('preview falha mantém download bloqueado e abre modal de retry com cooldown (RN-NOVA-2 + RN-NOVA-3)', async ({ page, request }) => {
    const orcamento = await criarOrcamentoDeTeste(request, 'preview-erro')
    await login(page)

    await page.route('**/preview-html', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: MENSAGEM_INDISPONIVEL }),
      })
    })

    await page.goto(`/orcamentos/${orcamento.id}/preview`)

    await expect(page.getByText('Não foi possível carregar o preview')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Baixar PDF|Aguarde/ })).toBeDisabled()

    // Modal de retry abre sozinho, com a mensagem real do backend (não texto genérico).
    await expect(page.getByText('Não foi possível gerar o documento')).toBeVisible()
    await expect(page.getByText(MENSAGEM_INDISPONIVEL)).toBeVisible()

    const btnRetry = page.getByRole('button', { name: /Tente novamente em \d+s/ })
    await expect(btnRetry).toBeVisible()
    await expect(btnRetry).toBeDisabled()

    // Cooldown realmente conta (sem esperar os 10s inteiros — só confirma que decresce).
    const textoInicial = await btnRetry.textContent()
    await page.waitForTimeout(1300)
    const textoDepois = await page.getByRole('button', { name: /Tente novamente em \d+s/ }).textContent()
    expect(textoDepois).not.toEqual(textoInicial)
  })

  test('download com erro mostra mensagem amigável, não Blob cru (responseType: blob)', async ({ page, request }) => {
    const orcamento = await criarOrcamentoDeTeste(request, 'download-erro')
    await login(page)

    await page.route('**/orcamentos/*/pdf', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: MENSAGEM_INDISPONIVEL }),
      })
    })

    await page.goto(`/orcamentos/${orcamento.id}/preview`)
    await expect(page.locator('iframe[title="Preview do orçamento"]')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Baixar PDF' }).click()

    await expect(page.getByText('Não foi possível gerar o documento')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(MENSAGEM_INDISPONIVEL)).toBeVisible()
  })

  test('DetalheOrcamentoPage: "Baixar PDF do orçamento" usa o serviço centralizado (download real)', async ({ page, request }) => {
    const orcamento = await criarOrcamentoDeTeste(request, 'detalhe')
    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByText('Documentos').scrollIntoViewIfNeeded()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByRole('button', { name: 'Baixar PDF do orçamento' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^orcamento-.*\.pdf$/)
  })

  test('ListaOrcamentosPage: "Baixar PDF" no menu de ações baixa autenticado (corrige bug de window.open sem auth)', async ({ page, request }) => {
    const orcamento = await criarOrcamentoDeTeste(request, 'lista')
    await login(page)
    await page.goto('/orcamentos')
    // Busca server-side (debounce de 300ms) pelo nome do cliente — único por timestamp, evita
    // ambiguidade com os outros orçamentos já existentes na conta de teste. Espera a resposta
    // filtrada de verdade, não só o texto aparecer — o nome já está visível na listagem
    // não-filtrada (poucos itens, cabe numa página só), então esperar só o texto não garante que
    // o debounce assentou; clicar no menu antes disso e a lista re-renderizar por baixo desmonta
    // o dropdown (fecha sozinho) assim que a busca resolve.
    const respostaBusca = page.waitForResponse((res) =>
      res.url().includes('/orcamentos?') && res.url().includes('busca=') && res.status() === 200
    )
    await page.getByPlaceholder('Buscar por cliente ou número…').fill(orcamento.nomeCliente)
    await respostaBusca
    // A mesma linha renderiza duas vezes no DOM (tabela desktop + card mobile, uma delas oculta
    // via CSS conforme o viewport) — `.first()` antes do `toBeVisible` evita strict-mode violation.
    await expect(page.getByText(orcamento.nomeCliente, { exact: true }).first()).toBeVisible({ timeout: 5_000 })

    const linha = page.getByText(orcamento.nomeCliente, { exact: true }).first()
      .locator('xpath=ancestor::div[contains(@class,"grid-cols-")][1]')
    await linha.getByRole('button', { name: 'Mais ações' }).click()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByRole('button', { name: 'Baixar PDF', exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^orcamento-.*\.pdf$/)
  })
})
