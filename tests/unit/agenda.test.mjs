import assert from 'node:assert/strict'
import test from 'node:test'
import { filtrarCompromissos, numeroDaSemana } from '../../src/utils/agenda.ts'

const compromisso = (chave, origem, situacao, atrasado = false) => ({
  chave,
  origem,
  situacao,
  atrasado,
})

const compromissos = [
  compromisso('orcamento-atrasado', 'ORCAMENTO', 'PENDENTE', true),
  compromisso('compra-pendente', 'COMPRA', 'PENDENTE'),
  compromisso('avulso-concluido', 'AVULSO', 'CONCLUIDO'),
  compromisso('producao-pendente', 'PRODUCAO', 'PENDENTE'),
]

test('filtra atrasados sem remover pendentes do resumo ou alterar a lista original', () => {
  const resultado = filtrarCompromissos(compromissos, { mostrar: 'ATRASADOS', origens: [] })

  assert.deepEqual(resultado.map(c => c.chave), ['orcamento-atrasado'])
  assert.equal(compromissos.length, 4)
})

test('combina situação e origens e trata origem vazia como todas', () => {
  const resultado = filtrarCompromissos(compromissos, { mostrar: 'PENDENTES', origens: ['COMPRA', 'AVULSO'] })

  assert.deepEqual(resultado.map(c => c.chave), ['compra-pendente'])
  assert.deepEqual(
    filtrarCompromissos(compromissos, { mostrar: 'CONCLUIDOS', origens: [] }).map(c => c.chave),
    ['avulso-concluido'],
  )
})

test('calcula número da semana domingo a sábado com a semana de 1º de janeiro como semana 1', () => {
  assert.equal(numeroDaSemana('2026-10-18'), 43)
  assert.equal(numeroDaSemana('2026-01-01'), 1)
  assert.equal(numeroDaSemana('2026-12-27'), 1)
  assert.equal(numeroDaSemana('2025-12-28'), 1)
})
