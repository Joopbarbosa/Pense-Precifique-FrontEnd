import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MSG_MULTA_ZERO, MSG_MULTA_ACIMA, MSG_TAXA, MSG_MULTA_MENOS_UM_CENTAVO, MSG_MULTA_CASAS,
  validarPercentualMulta, validarTaxaMaquininha, validarValorMulta, validarMulta, multaBrutaEmReais,
} from '../../src/utils/limitesCancelamentoTaxa.ts'

test('multa: zero, negativa, vazia ou texto sao recusadas (CEN-NOVO-76)', () => {
  for (const v of ['0', '0,00', '-1', '', ' ', 'abc', '1e5', '0.001', '1,234']) {
    assert.equal(validarPercentualMulta(v), MSG_MULTA_ZERO, v)
  }
})

test('multa: acima de 100 recusada, 100 aceita (CEN-NOVO-87 e 88)', () => {
  assert.equal(validarPercentualMulta('100,01'), MSG_MULTA_ACIMA)
  assert.equal(validarPercentualMulta('1000'), MSG_MULTA_ACIMA)
  assert.equal(validarPercentualMulta('100'), null)
  assert.equal(validarPercentualMulta('0,01'), null)
  assert.equal(validarPercentualMulta('50'), null)
})

test('taxa: de 0 a 100 aceita; fora disso ou texto recusado (CEN-NOVO-80 e 81)', () => {
  for (const v of ['0', '2,99', '100', '100,00', '']) assert.equal(validarTaxaMaquininha(v), null, v)
  for (const v of ['100,01', '-1', 'abc', '2,999', '1e3', '--1']) assert.equal(validarTaxaMaquininha(v), MSG_TAXA, v)
})

test('multa em R$: de 0,01 ate o total, no maximo 2 casas (RN-NOVA-58, CEN-NOVO-93 e 94)', () => {
  assert.equal(validarValorMulta('150,00', 300), null)
  assert.equal(validarValorMulta('0,01', 300), null)
  assert.equal(validarValorMulta('300', 300), null)
  for (const v of ['0', '', 'abc', '-5', '1e3']) assert.equal(validarValorMulta(v, 300), MSG_MULTA_ZERO, v)
  assert.equal(validarValorMulta('300,01', 300), MSG_MULTA_ACIMA)
  assert.equal(validarValorMulta('10,001', 300), MSG_MULTA_CASAS)
})

test('multa em %: com o total, percentual que da menos de R$ 0,01 e recusado (CEN-NOVO-103)', () => {
  assert.equal(validarPercentualMulta('0,01', 10), MSG_MULTA_MENOS_UM_CENTAVO)
  assert.equal(validarPercentualMulta('0,01', 300), null)
  assert.equal(validarPercentualMulta('0,01'), null)
})

test('multa: o modo escolhe o validador e a previa em R$', () => {
  assert.equal(validarMulta('valor', '50', 300), null)
  assert.equal(validarMulta('percentual', '101', 300), MSG_MULTA_ACIMA)
  assert.equal(multaBrutaEmReais('valor', '150,50', 300), 150.5)
  assert.equal(multaBrutaEmReais('percentual', '10', 300), 30)
})
