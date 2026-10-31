import test from 'node:test'
import assert from 'node:assert/strict'
import { formatarMoeda2, formatarNumero2 } from '../../src/utils/formatacao.ts'
import { formatQuantidade } from '../../src/utils/quantidade.ts'

test('formatador comum arredonda e sempre exibe duas casas sem alterar entrada', () => {
  const original = 1.125
  assert.equal(formatarNumero2(original), '1,13')
  assert.equal(formatarNumero2(0.25), '0,25')
  assert.equal(formatarNumero2(1000), '1.000,00')
  assert.equal(formatarMoeda2(original), 'R$ 1,13')
  assert.equal(original, 1.125)
})

test('quantidades, inclusive antigas e não fracionáveis, mostram duas casas', () => {
  assert.equal(formatQuantidade(1.125, true, 'FRACAO'), '1,13')
  assert.equal(formatQuantidade(2, false), '2,00')
})
