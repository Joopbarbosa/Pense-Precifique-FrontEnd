import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validarQuantidadeOpcoes, validarGerarVenda, quantidadeValida, precoReferenciaDigitado, montarCorpoGerarVenda, opcaoParaRequest,
} from '../../src/utils/orcamentoDescritivo.ts'

test('limite de opcoes: 0 e 101 bloqueiam; 1 e 100 passam', () => {
  assert.equal(validarQuantidadeOpcoes(0), 'Informe de 1 a 100 opções.')
  assert.equal(validarQuantidadeOpcoes(101), 'Informe de 1 a 100 opções.')
  assert.equal(validarQuantidadeOpcoes(1), null)
  assert.equal(validarQuantidadeOpcoes(100), null)
})

test('gerar Venda exige opcao marcada e cliente', () => {
  assert.equal(validarGerarVenda(true, 0), 'Marque ao menos uma opção.')
  assert.equal(validarGerarVenda(false, 2), 'Escolha o cliente para gerar o orçamento.')
  assert.equal(validarGerarVenda(true, 2), null)
})

test('quantidade aceita so inteiro de 1 a 100000', () => {
  assert.equal(quantidadeValida('3'), 3)
  for (const ruim of ['', '0', '-1', '1.5', 'a', '100001', '1e3', '9999999']) assert.equal(quantidadeValida(ruim), null, ruim)
})

test('preco de referencia: vazio usa o atual; ate 2 casas; virgula aceita', () => {
  assert.equal(precoReferenciaDigitado(''), undefined)
  assert.equal(precoReferenciaDigitado('12,50'), 12.5)
  assert.equal(precoReferenciaDigitado('0'), 0)
  for (const ruim of ['1,234', '-1', 'abc', '123456789']) assert.equal(precoReferenciaDigitado(ruim), null, ruim)
})

test('corpos montados nao levam campos vazios', () => {
  assert.deepEqual(montarCorpoGerarVenda(undefined, [{ opcaoId: 'a', quantidade: 2 }]), { itens: [{ opcaoId: 'a', quantidade: 2 }] })
  assert.deepEqual(montarCorpoGerarVenda('c', []), { clienteId: 'c', itens: [] })
  assert.deepEqual(opcaoParaRequest({ produtoId: 'p', quantidadeUnidade: '  ' }), { produtoId: 'p' })
})
