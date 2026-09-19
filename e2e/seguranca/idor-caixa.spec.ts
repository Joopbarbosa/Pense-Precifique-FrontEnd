import { test, expect } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { API_URL, registrarEmpresaEfemera } from '../helpers/auth'
import {
  apiAbrirTurno, apiFecharTurnoSeAberto, apiMetodoPagamentoPorTipo, apiCriarProdutoComEstoque,
} from '../helpers/caixa'

/**
 * Gate `seguranca-resiliencia` (V0.12.0, pocket #486 — Caixa/PDV) — A01: IDOR/Autorização
 * Quebrada. Padrão Conta A (dona dos dados) x Conta B (efêmera, "atacante") em
 * `references/teste-idor.md`. Recorte: todo endpoint por-ID novo deste pocket — módulo CAIXA
 * (VendaCaixaController/CaixaTurnoController) e a configuração de métodos de pagamento que o
 * Caixa depende (MetodoPagamentoConfiguravelController, #491/#506) — nenhum coberto pelos specs
 * de `idor-orcamento.spec.ts`/`idor-producao-produto.spec.ts` (pockets anteriores).
 *
 * Achado de leitura de código antes de escrever este spec: todo lookup por-ID do escopo já usa
 * `findByIdAndUsuarioId(...)` (VendaCaixaService/CaixaTurnoService/MetodoPagamentoConfiguravel-
 * Service) — este spec confirma em runtime que o comportamento é o esperado, não é uma correção.
 */
test.describe('#486 (gate seguranca-resiliencia) — IDOR no módulo Caixa/PDV', () => {
  test('usuário de outra empresa não lê, cancela nem lista vendas alheias', async ({ request }) => {
    const tokenA = await apiLogin(request)
    await apiAbrirTurno(request, tokenA, 100)
    const metodo = await apiMetodoPagamentoPorTipo(request, tokenA, 'DINHEIRO')
    const produto = await apiCriarProdutoComEstoque(request, tokenA, `QA-IDOR-Caixa-${Date.now()}`, 10, 5, true)

    const resVenda = await request.post(`${API_URL}/caixa/vendas`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        itens: [{ produtoId: produto.id, quantidade: 1, customizacoes: [] }],
        pagamentos: [{ metodoPagamentoId: metodo.id, valor: 10 }],
      },
    })
    expect(resVenda.ok()).toBeTruthy()
    const venda = await resVenda.json()

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-caixa-venda')

    const leitura = await request.get(`${API_URL}/caixa/vendas/${venda.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(leitura.status())

    const cancelamento = await request.post(`${API_URL}/caixa/vendas/${venda.id}/cancelar`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { cancelamentoMotivo: 'Tentativa de cancelamento cross-tenant via IDOR — 30+ caracteres.', senha: 'senha12345', retornarEstoque: true },
    })
    expect([403, 404]).toContain(cancelamento.status())

    // Confirma que a venda de A não foi cancelada por tabela (falso-positivo de "bloqueou mas mutou")
    const confirmacaoA = await request.get(`${API_URL}/caixa/vendas/${venda.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    expect((await confirmacaoA.json()).status).toBe('CONCLUIDA')

    await apiFecharTurnoSeAberto(request, tokenA)
  })

  test('usuário de outra empresa não acessa turno de caixa alheio (vendas, prévia, movimentos, fechamento)', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const turnoA = await apiAbrirTurno(request, tokenA, 50)

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-caixa-turno')

    const vendas = await request.get(`${API_URL}/caixa/turnos/${turnoA.id}/vendas`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(vendas.status())

    const previa = await request.get(`${API_URL}/caixa/turnos/${turnoA.id}/fechamento-previa`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(previa.status())

    const movimentos = await request.get(`${API_URL}/caixa/turnos/${turnoA.id}/movimentos`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    expect([403, 404]).toContain(movimentos.status())

    // Write-path — B tentando fechar o turno de A é o achado mais grave possível aqui
    const fechamento = await request.post(`${API_URL}/caixa/turnos/${turnoA.id}/fechar`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { valorFechamentoInformado: 0 },
    })
    expect([403, 404]).toContain(fechamento.status())

    // Confirma que o turno de A permanece aberto (B não conseguiu fechar por tabela)
    const confirmacaoA = await request.get(`${API_URL}/caixa/turnos/atual`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    expect((await confirmacaoA.json()).id).toBe(turnoA.id)

    await apiFecharTurnoSeAberto(request, tokenA)
  })

  test('usuário de outra empresa não edita método de pagamento alheio (PUT /configuracoes/metodos-pagamento/{id})', async ({ request }) => {
    const tokenA = await apiLogin(request)
    const metodoA = await apiMetodoPagamentoPorTipo(request, tokenA, 'DINHEIRO')

    const { token: tokenB } = await registrarEmpresaEfemera(request, 'idor-caixa-metodo')

    const resposta = await request.put(`${API_URL}/configuracoes/metodos-pagamento/${metodoA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { ativo: !metodoA.ativo },
    })
    expect([403, 404]).toContain(resposta.status())

    // Confirma que o método de A não foi alterado por tabela
    const confirmacaoA = await apiMetodoPagamentoPorTipo(request, tokenA, 'DINHEIRO')
    expect(confirmacaoA.ativo).toBe(metodoA.ativo)
  })
})
