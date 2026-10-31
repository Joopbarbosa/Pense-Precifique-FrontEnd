import assert from 'node:assert/strict'
import test from 'node:test'
import { TEXTO_PERIODO_PADRAO, parametrosPeriodo, mensagemListaVazia, periodoDoMes, podeBaixar, podeDesfazer, rotuloAcaoBaixa, rotuloParcela, MENSAGEM_SEM_LANCAMENTOS } from '../../src/utils/financeiro.ts'

test('período padrão é o mês corrente, inclusive em fevereiro bissexto e dezembro', () => {
  assert.deepEqual(periodoDoMes(new Date(2028, 1, 10)), { de: '2028-02-01', ate: '2028-02-29' })
  assert.deepEqual(periodoDoMes(new Date(2026, 11, 31)), { de: '2026-12-01', ate: '2026-12-31' })
})

test('mensagens de lista vazia e ação de baixa por tipo', () => {
  assert.equal(mensagemListaVazia('A_PAGAR'), 'Nada a pagar neste período.')
  assert.equal(mensagemListaVazia('A_RECEBER'), 'Nada a receber neste período.')
  assert.equal(rotuloAcaoBaixa('A_PAGAR'), 'Paguei')
  assert.equal(rotuloAcaoBaixa('A_RECEBER'), 'Recebi')
  assert.match(MENSAGEM_SEM_LANCAMENTOS, /começam a valer a partir de agora/)
})

test('rótulo de parcela: "n de N" só quando há mais de uma', () => {
  assert.equal(rotuloParcela({ numero: 2, totalParcelas: 5 }), '2 de 5')
  assert.equal(rotuloParcela({ numero: 1, totalParcelas: 1 }), 'Única')
})

test('baixar só em aberto/vence hoje/vencida; desfazer só paga/recebida; cancelada nenhum', () => {
  for (const s of ['EM_ABERTO', 'VENCE_HOJE', 'VENCIDA']) { assert.equal(podeBaixar({ situacaoExibida: s }), true); assert.equal(podeDesfazer({ situacaoExibida: s }), false) }
  for (const s of ['PAGA', 'RECEBIDA']) { assert.equal(podeBaixar({ situacaoExibida: s }), false); assert.equal(podeDesfazer({ situacaoExibida: s }), true) }
  assert.equal(podeBaixar({ situacaoExibida: 'CANCELADA' }), false)
  assert.equal(podeDesfazer({ situacaoExibida: 'CANCELADA' }), false)
})

test('PP-697: sem período escolhido a API recebe nenhuma data (padrão mês + vencidas); escolhido vai inteiro', () => {
  assert.deepEqual(parametrosPeriodo(null), {})
  assert.deepEqual(parametrosPeriodo({ de: '2026-09-01', ate: '2026-09-30' }), { de: '2026-09-01', ate: '2026-09-30' })
  assert.match(TEXTO_PERIODO_PADRAO, /mês atual e todas as contas vencidas/)
})

test('PP-525: nome de categoria exige 2 a 40 caracteres (espaços nas pontas não contam)', async () => {
  const { mensagemNomeCategoria } = await import('../../src/utils/financeiro.ts')
  assert.equal(mensagemNomeCategoria(''), 'Informe o nome da categoria.')
  assert.equal(mensagemNomeCategoria('   '), 'Informe o nome da categoria.')
  assert.match(mensagemNomeCategoria('a'), /de 2 a 40/)
  assert.match(mensagemNomeCategoria('  b  '), /de 2 a 40/)
  assert.equal(mensagemNomeCategoria('Ab'), null)
  assert.equal(mensagemNomeCategoria('x'.repeat(40)), null)
  assert.match(mensagemNomeCategoria('y'.repeat(41)), /de 2 a 40/)
})
