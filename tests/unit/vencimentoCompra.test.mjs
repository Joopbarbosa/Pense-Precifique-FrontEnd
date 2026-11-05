import assert from 'node:assert/strict'
import test from 'node:test'
import { vencimentoPadrao } from '../../src/utils/vencimento.ts'

test('vencimento padrão: a data da compra; no cartão, um mês depois sem passar do fim do mês', () => {
  assert.equal(vencimentoPadrao('2026-10-31', false), '2026-10-31')
  assert.equal(vencimentoPadrao('2026-10-15', true), '2026-11-15')
  assert.equal(vencimentoPadrao('2026-01-31', true), '2026-02-28')
  assert.equal(vencimentoPadrao('2028-01-31', true), '2028-02-29')
  assert.equal(vencimentoPadrao('2026-12-31', true), '2027-01-31')
})

