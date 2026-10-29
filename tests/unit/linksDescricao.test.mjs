import assert from 'node:assert/strict'
import test from 'node:test'
import { segmentarDescricao } from '../../src/utils/linksDescricao.ts'

const cadastros = [
  { nome: 'Chocolate meio amargo', to: '/insumos/1' },
  { nome: 'Chocolate', to: '/insumos/2' },
  { nome: 'Caixa Presente', to: '/produtos/3' },
]

test('nome cadastrado vira link e o resto fica texto', () => {
  assert.deepEqual(segmentarDescricao('Barra com Chocolate meio amargo e fita', cadastros), [
    { texto: 'Barra com ' },
    { texto: 'Chocolate meio amargo', to: '/insumos/1' },
    { texto: ' e fita' },
  ])
})

test('o nome mais longo vence e a busca ignora maiúsculas', () => {
  const t = segmentarDescricao('chocolate MEIO AMARGO', cadastros)
  assert.equal(t.length, 1)
  assert.equal(t[0].to, '/insumos/1')
})

test('nome sem cadastro continua texto simples', () => {
  assert.deepEqual(segmentarDescricao('Feito com Canela', cadastros), [{ texto: 'Feito com Canela' }])
})

test('não casa parte de palavra', () => {
  assert.deepEqual(segmentarDescricao('Chocolatera nova', cadastros), [{ texto: 'Chocolatera nova' }])
})

test('caracteres especiais no nome não quebram e texto vazio é aceito', () => {
  assert.deepEqual(segmentarDescricao('a (b) c', [{ nome: '(b)', to: '/x' }]).map(t => t.to), [undefined, '/x', undefined])
  assert.deepEqual(segmentarDescricao('', cadastros), [{ texto: '' }])
  assert.deepEqual(segmentarDescricao('Kit Caixa Presente.', cadastros).map(t => t.to), [undefined, '/produtos/3', undefined])
})
