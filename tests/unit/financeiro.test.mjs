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

// ---- PP-524 (#1176, F5): resumo do mês — apresentação pura ----
import { diaMes, formatarPercentual, larguraBarra, mesDaData, mudarMes, primeiroDiaNegativo, rotuloMes, rotuloUrgencia, rotuloVerTodas, urgenciaVencimento, MENSAGEM_SEM_MOVIMENTOS_GRAFICO, MENSAGEM_SEM_VENCIMENTOS } from '../../src/utils/financeiro.ts'

test('trocar de mês vira o ano nos dois sentidos', () => {
  assert.equal(mudarMes('2026-12', 1), '2027-01')
  assert.equal(mudarMes('2026-01', -1), '2025-12')
  assert.equal(mudarMes('2026-10', 0), '2026-10')
  assert.equal(mudarMes('2026-03', -15), '2024-12')
  assert.equal(mesDaData(new Date(2026, 9, 31)), '2026-10')
  assert.equal(rotuloMes('2026-03'), 'março de 2026')
})

test('urgência: vencida e vence hoje trazem texto próprio; próximos dias não depende de cor', () => {
  assert.equal(urgenciaVencimento({ situacaoExibida: 'VENCIDA' }), 'VENCIDA')
  assert.equal(urgenciaVencimento({ situacaoExibida: 'VENCE_HOJE' }), 'HOJE')
  assert.equal(urgenciaVencimento({ situacaoExibida: 'EM_ABERTO' }), 'PROXIMA')
  assert.equal(rotuloUrgencia({ situacaoExibida: 'VENCIDA', rotulo: 'Vencida há 3 dias' }), 'Vencida há 3 dias')
  assert.equal(rotuloUrgencia({ situacaoExibida: 'VENCIDA' }), 'Vencida')
  assert.equal(rotuloUrgencia({ situacaoExibida: 'VENCE_HOJE' }), 'Vence hoje')
  assert.equal(rotuloUrgencia({ situacaoExibida: 'EM_ABERTO', rotulo: 'Vence em 3 dias' }), 'Próximos dias')
})

test('Ver todas mostra o total real; mensagens vazias fixas', () => {
  assert.equal(rotuloVerTodas(12), 'Ver todas (12)')
  assert.equal(MENSAGEM_SEM_VENCIMENTOS, 'Nenhum vencimento nos próximos 7 dias.')
  assert.equal(MENSAGEM_SEM_MOVIMENTOS_GRAFICO, 'Sem movimentos para mostrar.')
})

test('barra de categoria: proporcional à maior, mínimo 2% e nunca fora de 0 a 100', () => {
  assert.equal(larguraBarra(100, 100), 100)
  assert.equal(larguraBarra(50, 100), 50)
  assert.equal(larguraBarra(1, 1000), 2)
  assert.equal(larguraBarra(0, 100), 0)
  assert.equal(larguraBarra(10, 0), 0)
  assert.equal(larguraBarra(500, 100), 100)
  assert.equal(larguraBarra(Number.NaN, 100), 0)
})

test('percentual com vírgula e uma casa; dia/mês curto; primeiro dia negativo', () => {
  assert.equal(formatarPercentual(47.1), '47,1%')
  assert.equal(formatarPercentual(100), '100,0%')
  assert.equal(diaMes('2026-11-05'), '05/11')
  assert.equal(primeiroDiaNegativo([{ data: '2026-11-01', saldo: 10 }, { data: '2026-11-02', saldo: -1 }, { data: '2026-11-03', saldo: -9 }]), '2026-11-02')
  assert.equal(primeiroDiaNegativo([{ data: '2026-11-01', saldo: 0 }]), null)
  assert.equal(primeiroDiaNegativo([]), null)
})
