import assert from 'node:assert/strict'
import test from 'node:test'
import { formatarDataHora } from '../../src/utils/data.ts'

test('formatarDataHora permite que cada chamador preserve seu texto de vazio', () => {
  assert.equal(formatarDataHora(null), '')
  assert.equal(formatarDataHora(undefined, '—'), '—')
})

test('formatarDataHora exibe data e hora sem conversão de fuso', () => {
  assert.equal(formatarDataHora('2026-10-02T14:10:59'), '02/10/2026 14:10')
  assert.equal(formatarDataHora('2026-10-02'), '02/10/2026')
})

test('formatarDataHora preserva a formatação por fatias para entrada inválida', () => {
  assert.equal(formatarDataHora('inválida'), 'undefined/undefined/inválida')
})
