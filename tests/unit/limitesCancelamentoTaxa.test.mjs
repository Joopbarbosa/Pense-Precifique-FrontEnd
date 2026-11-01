import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MSG_MULTA_ZERO, MSG_MULTA_ACIMA, MSG_TAXA, validarPercentualMulta, validarTaxaMaquininha,
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
