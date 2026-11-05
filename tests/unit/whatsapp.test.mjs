import test from 'node:test'
import assert from 'node:assert/strict'
import { numeroWhatsappValido, legendaExcedeu, AVISO_RISCO_WHATSAPP } from '../../src/utils/whatsapp.ts'

test('numero com DDD e formatado e valido', () => {
  assert.equal(numeroWhatsappValido('(11) 91234-5678'), true)
  assert.equal(numeroWhatsappValido('11 1234-5678'), true)
})
test('numero internacional exige +', () => {
  assert.equal(numeroWhatsappValido('+1 415 555 0100'), true)
  assert.equal(numeroWhatsappValido('+55 119'), false)
})
test('entradas invalidas', () => {
  for (const v of ['', '   ', 'abc', '1234', '11 9123', 'x'.repeat(41), '11 91234-56AB'])
    assert.equal(numeroWhatsappValido(v), false, v)
})
test('legenda ate 1024', () => {
  assert.equal(legendaExcedeu('a'.repeat(1024)), false)
  assert.equal(legendaExcedeu('a'.repeat(1025)), true)
})

test('aviso de risco: curto, cita banimento e recomenda número específico (PP-705)', () => {
  assert.match(AVISO_RISCO_WHATSAPP, /banido/)
  assert.match(AVISO_RISCO_WHATSAPP, /não use o WhatsApp principal da loja/)
  assert.match(AVISO_RISCO_WHATSAPP, /número específico para cobranças e envio de orçamentos/)
  assert.doesNotMatch(AVISO_RISCO_WHATSAPP, /não oficial|Evolution/i)
  assert.ok(AVISO_RISCO_WHATSAPP.length < 200)
})
