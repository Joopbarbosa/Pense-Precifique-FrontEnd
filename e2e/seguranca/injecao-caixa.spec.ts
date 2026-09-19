import { test, expect } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { API_URL } from '../helpers/auth'
import { apiAbrirTurno, apiFecharTurnoSeAberto, apiMetodoPagamentoPorTipo, apiCriarProdutoComEstoque } from '../helpers/caixa'

/**
 * Gate `seguranca-resiliencia` (V0.12.0, pocket #486 — Caixa/PDV) — A05: Injeção (runtime).
 * Semgrep (Fase 1, SAST) não apontou nenhum arquivo do backend/frontend com regra de SQLi/XSS
 * disparada, então não há alvo priorizado pelo SAST (`references/teste-injecao.md`) — cobertura
 * baseline nos campos de busca/texto livre novos deste pocket: busca de itens do Caixa, motivo de
 * sangria/suprimento, motivo de cancelamento de venda, nome de método de pagamento tipo OUTRO.
 * Nenhum coberto por spec de pocket anterior (módulo CAIXA é novo em V0.12.0).
 */
const SQL_PAYLOADS = ["' OR '1'='1", "'; DROP TABLE usuarios; --", '1 UNION SELECT null--']
const XSS_PAYLOADS = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>']
const PAYLOADS = [...SQL_PAYLOADS, ...XSS_PAYLOADS]

test.describe('#486 (gate seguranca-resiliencia) — A05 Injeção no módulo Caixa/PDV', () => {
  test('busca de itens do Caixa nunca quebra com payload de SQLi/XSS (GET /caixa/busca-itens-catalogo)', async ({ request }) => {
    const token = await apiLogin(request)
    for (const payload of PAYLOADS) {
      const resposta = await request.get(`${API_URL}/caixa/busca-itens-catalogo`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { busca: payload },
      })
      expect(resposta.status(), `payload: ${payload}`).not.toBe(500)
      expect(resposta.ok(), `payload: ${payload}`).toBeTruthy()
    }
  })

  test('motivo de sangria/suprimento aceita payload como texto literal, nunca 500 (POST /caixa/movimentos)', async ({ request }) => {
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)

    for (const payload of PAYLOADS) {
      const motivo = `${payload} — preenchimento até o mínimo de 30 caracteres exigido pela regra`
      const resposta = await request.post(`${API_URL}/caixa/movimentos`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'SANGRIA', valor: 1, motivo },
      })
      expect(resposta.status(), `payload: ${payload}`).not.toBe(500)
      expect(resposta.ok(), `payload: ${payload}`).toBeTruthy()
      // Gravado literal — prova que não houve interpretação/execução do payload no servidor
      expect((await resposta.json()).motivo).toBe(motivo)
    }

    await apiFecharTurnoSeAberto(request, token)
  })

  test('motivo de cancelamento de venda aceita payload como texto literal, nunca 500 (POST /caixa/vendas/{id}/cancelar)', async ({ request }) => {
    const token = await apiLogin(request)
    await apiAbrirTurno(request, token, 100)
    const metodo = await apiMetodoPagamentoPorTipo(request, token, 'DINHEIRO')

    for (const payload of PAYLOADS) {
      const produto = await apiCriarProdutoComEstoque(request, token, `QA-INJ-Caixa-${Date.now()}-${Math.random().toString(36).slice(2)}`, 10, 5, true)
      const resVenda = await request.post(`${API_URL}/caixa/vendas`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { itens: [{ produtoId: produto.id, quantidade: 1, customizacoes: [] }], pagamentos: [{ metodoPagamentoId: metodo.id, valor: 10 }] },
      })
      expect(resVenda.ok(), `payload: ${payload}`).toBeTruthy()
      const venda = await resVenda.json()

      const cancelamentoMotivo = `${payload} — preenchimento até o mínimo de 30 caracteres exigido`
      const resposta = await request.post(`${API_URL}/caixa/vendas/${venda.id}/cancelar`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { cancelamentoMotivo, senha: 'senha12345', retornarEstoque: true },
      })
      expect(resposta.status(), `payload: ${payload}`).not.toBe(500)
      expect(resposta.ok(), `payload: ${payload}`).toBeTruthy()
    }

    await apiFecharTurnoSeAberto(request, token)
  })

  test('nome de método de pagamento tipo OUTRO aceita payload como texto literal, nunca 500 (POST /configuracoes/metodos-pagamento)', async ({ request }) => {
    const token = await apiLogin(request)
    for (const payload of PAYLOADS) {
      const nome = `${payload}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const resposta = await request.post(`${API_URL}/configuracoes/metodos-pagamento`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'OUTRO', nome },
      })
      expect(resposta.status(), `payload: ${payload}`).not.toBe(500)
      expect(resposta.ok(), `payload: ${payload}`).toBeTruthy()
      expect((await resposta.json()).nome).toBe(nome)
    }
  })
})
