import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'
import {
  criarCliente,
  criarOrcamentoComNumeroDeDoisDigitos,
  avancarStatusViaApi,
  cancelarOrcamentoViaApi,
  buscarOrcamento,
} from '../helpers/orcamento'

const API_URL = 'http://localhost:8080'

/**
 * Homologação Onda 5 (Frente 6, Cenários 237-238) — RN-053: remoção do zero-padding artificial
 * (`String(numero).padStart(4,'0')`) do número do orçamento nas 4 telas de PDF/recibo
 * (`PreviewPdfOrcamentoPage`, `PreviewMultaPage`, `ReciboSinalPage`, `ReciboPagamentoPage`) e no Detalhe
 * (cabeçalho + modal de confirmar estorno). Confirmado via `git log` (commits `401d119`,
 * `c307262`, `e6b4e86`) e via grep (`padStart` não existe mais em `src/`).
 *
 * `numero` é sempre `MAX(numero)+1` por usuário, gerado só no servidor — o zero-padding só é
 * observável com 2+ dígitos ("47" vs "0047"; "7" vs "0007" não distinguiria visualmente um bug
 * de dígito único). `criarOrcamentoComNumeroDeDoisDigitos` (`e2e/helpers/orcamento.ts`) cria
 * orçamentos descartáveis em sequência até o número virar >= 10.
 *
 * Rotas confirmadas em `src/routes/index.tsx`: `/orcamentos/:id/preview`,
 * `/orcamentos/:id/recibo-sinal`, `/orcamentos/:id/multa`, `/orcamentos/:id/recibo-pagamento` —
 * nenhuma delas gate no `status` do orçamento (só o botão que leva até elas em
 * `DetalheOrcamentoPage.tsx`'s `DownloadsCard` é condicional), então a automação navega direto
 * por URL depois de preparar o estado via API.
 *
 * P-T002 (V0.8.1, retomada da homologação do pocket) — spec corrigido: quando este arquivo foi
 * escrito, só a rota de preview do orçamento (`/preview`) tinha migrado para o padrão de
 * `<iframe srcDoc>` renderizado pelo microsserviço (Épico #89). `recibo-sinal`,
 * `recibo-pagamento` e `multa` ainda eram componentes Tailwind locais, por isso o teste original
 * lia o número via `page.getByText` direto, sem `frameLocator`. O Épico #248 (mesmo pocket
 * V0.8.1) migrou os 3 para o mesmo padrão de iframe — `page.getByText` deixou de alcançar o
 * conteúdo real (sempre vazio, teste ficaria "verde" só porque o "NÃO mostra zero-padding"
 * também dava vazio, um falso-positivo). RN-053 em si continua correta — o gap era só na
 * estratégia de seletor do teste, desatualizada pela migração do #248. Corrigido para usar
 * `frameLocator` nos 3 (títulos confirmados em `ReciboSinalPage.tsx`/`ReciboPagamentoPage.tsx`/
 * `PreviewMultaPage.tsx`), mesmo padrão já usado para `/preview`. Ver `DECISOES_V0.8.1.md`,
 * entrada P-T002.
 */
test.describe('Cenários 237-238 — RN-053: número sem zero-padding em PDFs/recibos e Detalhe do Orçamento', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('237 — os 4 templates de PDF/recibo exibem o número puro, sem zero-padding (regressão GREEN incluída)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA237-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    // Orçamento levado até PAGO (com sinal) — cobre PreviewPdfOrcamentoPage, ReciboSinalPage e
    // ReciboPagamentoPage de uma vez, já que os três só exigem status/flags diferentes do mesmo
    // fluxo linear (SINAL_PAGO fica marcado para sempre, mesmo depois de avançar).
    const nomeClientePago = `QA237-ClientePago-${Date.now()}`
    const clientePago = await criarCliente(request, token, nomeClientePago)
    const orcamentoPago = await criarOrcamentoComNumeroDeDoisDigitos(request, token, clientePago.id, produto.id, {
      sinalAtivo: true,
      percentualSinal: 30,
    })
    await avancarStatusViaApi(request, token, orcamentoPago.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamentoPago.id) // ENVIADO -> APROVADO
    await avancarStatusViaApi(request, token, orcamentoPago.id) // APROVADO -> AGUARDANDO_SINAL
    await avancarStatusViaApi(request, token, orcamentoPago.id, { metodoSinalRecebido: 'PIX' }) // -> SINAL_PAGO
    await avancarStatusViaApi(request, token, orcamentoPago.id) // SINAL_PAGO -> EM_PRODUCAO
    await avancarStatusViaApi(request, token, orcamentoPago.id) // EM_PRODUCAO -> FINALIZADO
    await avancarStatusViaApi(request, token, orcamentoPago.id) // FINALIZADO -> ENTREGUE
    const resPago = await avancarStatusViaApi(request, token, orcamentoPago.id) // ENTREGUE -> PAGO
    expect((await resPago.json()).status).toBe('PAGO')

    const numeroPuro = `#${orcamentoPago.numero}`
    const numeroPadded = `#${String(orcamentoPago.numero).padStart(4, '0')}`
    expect(orcamentoPago.numero).toBeGreaterThanOrEqual(10)

    await login(page)

    // Épico #89 (V0.8) — preview passou a renderizar o HTML real do microsserviço dentro de um
    // <iframe> (RN-NOVA-2/Fluxo E do PRD), não mais um componente Tailwind local no documento
    // principal — o número do orçamento só existe dentro do iframe agora.
    await page.goto(`/orcamentos/${orcamentoPago.id}/preview`)
    const previewFrame = page.frameLocator('iframe[title="Preview do orçamento"]')
    await expect(previewFrame.getByText(numeroPuro, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(previewFrame.getByText(numeroPadded, { exact: true })).toHaveCount(0)

    await page.goto(`/orcamentos/${orcamentoPago.id}/recibo-sinal`)
    const reciboSinalFrame = page.frameLocator('iframe[title="Preview do recibo do sinal"]')
    await expect(reciboSinalFrame.getByText(numeroPuro, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(reciboSinalFrame.getByText(numeroPadded, { exact: true })).toHaveCount(0)

    await page.goto(`/orcamentos/${orcamentoPago.id}/recibo-pagamento`)
    const reciboPagamentoFrame = page.frameLocator('iframe[title="Preview do recibo de pagamento"]')
    await expect(reciboPagamentoFrame.getByText(numeroPuro, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(reciboPagamentoFrame.getByText(numeroPadded, { exact: true })).toHaveCount(0)
    // P-T002 — achado adicional dentro do mesmo bug: esta asserção também estava morta, por um
    // segundo motivo além da falta de frameLocator. A seção "Detalhes financeiros" não existe mais
    // desde a migração #248 — o card de status hoje é `SecaoStatus` (ReciboPagamentoDoc.jsx),
    // título "Pedido quitado". A classe Tailwind `text-success` também nunca poderia ter
    // funcionado ali: o microsserviço de PDF usa CSS-in-JS puro (cor aplicada via `style` inline,
    // ver `SecaoStatus.jsx`/`tokens.js`), sem Tailwind carregado. Corrigido para checar o valor
    // real: `corDestaque: COLORS.success` (#1F8A5B = rgb(31, 138, 91)), não teal.
    const tituloStatusPagamento = reciboPagamentoFrame.getByText('Pedido quitado', { exact: true })
    await expect(tituloStatusPagamento).toBeVisible()
    const iconeStatusPagamento = tituloStatusPagamento.locator('..').locator('span').first()
    await expect(iconeStatusPagamento).toHaveCSS('color', 'rgb(31, 138, 91)')

    // Orçamento cancelado com multa — único jeito de popular percentualMulta e cobrir
    // PreviewMultaPage (não tem nenhuma relação com prazo/atraso, é sobre cancelamento).
    const nomeClienteCancelado = `QA237-ClienteCancelado-${Date.now()}`
    const clienteCancelado = await criarCliente(request, token, nomeClienteCancelado)
    const orcamentoCancelado = await criarOrcamentoComNumeroDeDoisDigitos(request, token, clienteCancelado.id, produto.id)
    await avancarStatusViaApi(request, token, orcamentoCancelado.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamentoCancelado.id) // ENVIADO -> APROVADO
    await avancarStatusViaApi(request, token, orcamentoCancelado.id) // APROVADO -> EM_PRODUCAO (sinalAtivo=false)
    const resCancelado = await cancelarOrcamentoViaApi(request, token, orcamentoCancelado.id, { percentualMulta: 50 })
    expect(resCancelado.ok()).toBe(true)

    const numeroPuroCancelado = `#${orcamentoCancelado.numero}`
    const numeroPaddedCancelado = `#${String(orcamentoCancelado.numero).padStart(4, '0')}`
    expect(orcamentoCancelado.numero).toBeGreaterThanOrEqual(10)

    await page.goto(`/orcamentos/${orcamentoCancelado.id}/multa`)
    const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]')
    await expect(multaFrame.getByText(numeroPuroCancelado, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(multaFrame.getByText(numeroPaddedCancelado, { exact: true })).toHaveCount(0)
  })

  test('238 — cabeçalho e modal de confirmar estorno no Detalhe do Orçamento exibem número puro', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeCliente = `QA238-Cliente-${Date.now()}`
    const cliente = await criarCliente(request, token, nomeCliente)
    const nomeProduto = `QA238-Produto-${Date.now()}`
    const produto = await criarProdutoComEstoque(request, token, nomeProduto, 1000)
    criadosProdutoIds.push(produto.id)

    const orcamento = await criarOrcamentoComNumeroDeDoisDigitos(request, token, cliente.id, produto.id, {
      sinalAtivo: true,
      percentualSinal: 30,
    })
    await avancarStatusViaApi(request, token, orcamento.id) // RASCUNHO -> ENVIADO
    await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO -> APROVADO
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO -> AGUARDANDO_SINAL
    const resSinalPago = await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' }) // -> SINAL_PAGO
    expect((await resSinalPago.json()).status).toBe('SINAL_PAGO')

    const numeroPuro = `#${orcamento.numero}`
    const numeroPadded = `#${String(orcamento.numero).padStart(4, '0')}`
    expect(orcamento.numero).toBeGreaterThanOrEqual(10)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(numeroPuro)
    await expect(page.getByText(numeroPadded)).toHaveCount(0)

    // cancelKind(SINAL_PAGO) === "estorno" -> ModalCancelEstorno, migrado para ModalShell (tem
    // role="dialog", Escape sem useEffect próprio) — ver cobertura estrutural em 239f, modal-shell-consumidores.spec.ts
    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click()
    await expect(page.getByText(/Estornar sinal para/)).toBeVisible()
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click()

    await expect(page.getByText('Confirmar estorno do sinal', { exact: true })).toBeVisible()
    await expect(page.getByText(numeroPuro, { exact: true })).toBeVisible()
    await expect(page.getByText(numeroPadded, { exact: true })).toHaveCount(0)

    // Só chegou até a confirmação — não persistiu nenhum cancelamento.
    const orcamentoDepois = await buscarOrcamento(request, token, orcamento.id)
    expect(orcamentoDepois.status).toBe('SINAL_PAGO')
  })
})
