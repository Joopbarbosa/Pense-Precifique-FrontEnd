import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MSG_FORMA, MSG_SINAL, MSG_SINAL_ATE, MSG_DATA_ANTERIOR_SALDO, MSG_DATA_ANTERIOR_SINAL,
  lerDecimal, montarCorpoPagamento, podeAlterarPagamento, percentualPorValor, sinalPorPercentual, validarPagamentoOrcamento,
} from '../../src/utils/pagamentoOrcamento.ts'

const base = (extra = {}) => ({
  total: 100, metodoId: 'pix', metodosAtivosIds: ['pix', 'din'], temSinal: false, tipoSinal: 'PERCENTUAL',
  percentualTexto: '', valorTexto: '', sinalAte: '', vencimentoSaldo: '', hoje: '2026-10-31', ...extra,
})

test('sem sinal o saldo e o total e gera parcela de saldo', () => {
  const r = validarPagamentoOrcamento(base())
  assert.deepEqual(r.erros, {})
  assert.equal(r.resumo.saldo, 100)
  assert.equal(r.resumo.geraParcelaSaldo, true)
})

test('sinal sem percentual digitado usa 50% por padrao', () => {
  const r = validarPagamentoOrcamento(base({ temSinal: true, sinalAte: '2026-11-05', total: 101 }))
  assert.equal(r.resumo.percentualSinal, 50)
  assert.equal(r.resumo.valorSinal, 50.5)
  assert.equal(r.resumo.saldo, 50.5)
})

test('percentual vira reais arredondando para baixo em centavos', () => {
  assert.equal(sinalPorPercentual(10, 33.33), 3.33)
  assert.equal(sinalPorPercentual(0.1, 50), 0.05)
  assert.equal(sinalPorPercentual(19.99, 12.5), 2.49)
})

test('valor vira percentual com duas casas', () => {
  assert.equal(percentualPorValor(100, 25), 25)
  assert.equal(percentualPorValor(30, 10), 33.33)
})

test('percentual fora de 1 a 100 ou com tres casas e recusado', () => {
  for (const p of ['0', '0,99', '100,01', '10,123', 'abc', '-5']) {
    const r = validarPagamentoOrcamento(base({ temSinal: true, sinalAte: '2026-11-05', percentualTexto: p }))
    assert.equal(r.erros.sinal, MSG_SINAL, p)
    assert.equal(r.resumo, null)
  }
})

test('sinal que arredonda para zero e recusado', () => {
  const r = validarPagamentoOrcamento(base({ temSinal: true, sinalAte: '2026-11-05', total: 0.5, percentualTexto: '1' }))
  assert.equal(r.erros.sinal, MSG_SINAL)
})

test('sinal por valor: de 0,01 ate o total, no maximo 2 casas', () => {
  const ok = validarPagamentoOrcamento(base({ temSinal: true, tipoSinal: 'VALOR', valorTexto: '100', sinalAte: '2026-11-05' }))
  assert.deepEqual(ok.erros, {})
  assert.equal(ok.resumo.saldo, 0)
  for (const v of ['0', '0,00', '100,01', '10,001', '', 'x']) {
    const r = validarPagamentoOrcamento(base({ temSinal: true, tipoSinal: 'VALOR', valorTexto: v, sinalAte: '2026-11-05' }))
    assert.equal(r.erros.sinal, MSG_SINAL, v)
  }
})

test('sinal de 100% zera o saldo e nao gera parcela de saldo, mesmo com vencimento digitado fora do prazo', () => {
  const r = validarPagamentoOrcamento(base({ temSinal: true, percentualTexto: '100', sinalAte: '2026-11-05', vencimentoSaldo: '2020-01-01' }))
  assert.deepEqual(r.erros, {})
  assert.equal(r.resumo.geraParcelaSaldo, false)
  assert.equal(r.resumo.saldo, 0)
})

test('total zero nao aceita sinal', () => {
  const r = validarPagamentoOrcamento(base({ total: 0, temSinal: true, sinalAte: '2026-11-05' }))
  assert.equal(r.erros.sinal, MSG_SINAL)
})

test('forma precisa estar na lista de ativas; sem ativa nenhuma recusa', () => {
  assert.equal(validarPagamentoOrcamento(base({ metodoId: null })).erros.metodoPagamentoId, MSG_FORMA)
  assert.equal(validarPagamentoOrcamento(base({ metodoId: 'inativo' })).erros.metodoPagamentoId, MSG_FORMA)
  assert.equal(validarPagamentoOrcamento(base({ metodosAtivosIds: [] })).erros.metodoPagamentoId, MSG_FORMA)
})

test('prazo do sinal e obrigatorio e nao pode ser anterior a hoje', () => {
  assert.equal(validarPagamentoOrcamento(base({ temSinal: true })).erros.sinalAte, MSG_SINAL_ATE)
  assert.equal(validarPagamentoOrcamento(base({ temSinal: true, sinalAte: '2026-10-30' })).erros.sinalAte, MSG_DATA_ANTERIOR_SINAL)
  assert.deepEqual(validarPagamentoOrcamento(base({ temSinal: true, sinalAte: '2026-10-31' })).erros, {})
})

test('vencimento do saldo vazio vale hoje; anterior a hoje ou fora da faixa e recusado', () => {
  assert.deepEqual(validarPagamentoOrcamento(base()).erros, {})
  assert.equal(validarPagamentoOrcamento(base({ vencimentoSaldo: '2026-10-30' })).erros.vencimentoSaldo, MSG_DATA_ANTERIOR_SALDO)
  assert.ok(validarPagamentoOrcamento(base({ vencimentoSaldo: '1999-12-31' })).erros.vencimentoSaldo)
  assert.ok(validarPagamentoOrcamento(base({ vencimentoSaldo: '2026-02-30' })).erros.vencimentoSaldo)
})

test('lerDecimal aceita virgula e ponto e recusa lixo', () => {
  assert.equal(lerDecimal('12,5'), 12.5)
  assert.equal(lerDecimal('12.50'), 12.5)
  for (const t of ['', ' ', 'a', '1e5', '-1', '1,2,3']) assert.equal(lerDecimal(t), null, t)
})

test('corpo enviado ao servidor omite o que nao se aplica', () => {
  assert.deepEqual(montarCorpoPagamento(base()), { metodoPagamentoId: 'pix', temSinal: false })
  const c = montarCorpoPagamento(base({ temSinal: true, sinalAte: '2026-11-05', vencimentoSaldo: '2026-12-01' }))
  assert.equal(c.percentualSinal, 50)
  assert.equal(c.sinalAte, '2026-11-05')
  assert.equal(c.vencimentoSaldo, '2026-12-01')
  assert.equal('valorSinal' in c, false)
})

test('alterar pagamento: só de aprovado a finalizado e sem parcela recebida (RN-NOVA-41)', () => {
  const aberta = [{ situacao: 'EM_ABERTO' }, { situacao: 'CANCELADA' }]
  assert.equal(podeAlterarPagamento('APROVADO', aberta), true)
  assert.equal(podeAlterarPagamento('AGUARDANDO_SINAL', aberta), true)
  assert.equal(podeAlterarPagamento('ENVIADO', aberta), false)
  assert.equal(podeAlterarPagamento('PAGO', aberta), false)
  assert.equal(podeAlterarPagamento('EM_PRODUCAO', [{ situacao: 'BAIXADA' }, { situacao: 'EM_ABERTO' }]), false)
  assert.equal(podeAlterarPagamento('APROVADO', []), false)
  assert.equal(podeAlterarPagamento(undefined, undefined), false)
})
