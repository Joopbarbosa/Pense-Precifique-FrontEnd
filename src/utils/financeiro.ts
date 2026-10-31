import type { ParcelaFinanceira, SituacaoExibida, TipoLancamento } from '../types/financeiro'

// V0.19.0 (PP-520) — só apresentação: "vencida", totais e rótulos vêm prontos da API (o front não decide regra).

export const MENSAGEM_SEM_LANCAMENTOS = 'Os lançamentos começam a valer a partir de agora: compras e orçamentos antigos não entram aqui.'

// (sem import de runtime: este módulo é testado direto pelo node --test)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Mês corrente (primeiro e último dia), padrão do filtro de período. */
export function periodoDoMes(hoje: Date = new Date()): { de: string; ate: string } {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  return { de: iso(new Date(ano, mes, 1)), ate: iso(new Date(ano, mes + 1, 0)) }
}

export function mensagemListaVazia(tipo: TipoLancamento): string {
  return tipo === 'A_PAGAR' ? 'Nada a pagar neste período.' : 'Nada a receber neste período.'
}

export function rotuloAcaoBaixa(tipo: TipoLancamento): string {
  return tipo === 'A_PAGAR' ? 'Paguei' : 'Recebi'
}

export function rotuloOrigem(origem: ParcelaFinanceira['origem']): string {
  return origem === 'COMPRA' ? 'Compra' : origem === 'ORCAMENTO' ? 'Orçamento' : 'Avulso'
}

export function rotuloSituacao(s: SituacaoExibida): string {
  switch (s) {
    case 'EM_ABERTO': return 'Em aberto'
    case 'VENCE_HOJE': return 'Vence hoje'
    case 'VENCIDA': return 'Vencida'
    case 'PAGA': return 'Paga'
    case 'RECEBIDA': return 'Recebida'
    case 'CANCELADA': return 'Cancelada'
  }
}

/** "2 de 5" — só quando há mais de uma parcela. */
export function rotuloParcela(p: Pick<ParcelaFinanceira, 'numero' | 'totalParcelas'>): string {
  return p.totalParcelas > 1 ? `${p.numero} de ${p.totalParcelas}` : 'Única'
}

export function podeBaixar(p: Pick<ParcelaFinanceira, 'situacaoExibida'>): boolean {
  return p.situacaoExibida === 'EM_ABERTO' || p.situacaoExibida === 'VENCE_HOJE' || p.situacaoExibida === 'VENCIDA'
}

export function podeDesfazer(p: Pick<ParcelaFinanceira, 'situacaoExibida'>): boolean {
  return p.situacaoExibida === 'PAGA' || p.situacaoExibida === 'RECEBIDA'
}
