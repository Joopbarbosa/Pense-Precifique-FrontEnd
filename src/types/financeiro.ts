// V0.19.0 (PP-520, F1) — contrato: modulos/FINANCEIRO/contrato-financeiro.md.
export type TipoLancamento = 'A_PAGAR' | 'A_RECEBER'
export type OrigemLancamento = 'AVULSO' | 'COMPRA' | 'ORCAMENTO'
export type FiltroSituacaoParcela = 'EM_ABERTO' | 'VENCIDAS' | 'BAIXADAS' | 'TODAS'
export type SituacaoExibida = 'EM_ABERTO' | 'VENCE_HOJE' | 'VENCIDA' | 'PAGA' | 'RECEBIDA' | 'CANCELADA'

export interface ParcelaFinanceira {
  id: string
  lancamentoId: string
  tipo: TipoLancamento
  descricao: string
  origem: OrigemLancamento
  compraId?: string | null
  orcamentoId?: string | null
  numero: number
  totalParcelas: number
  valor: number
  vencimento: string
  situacao: string
  situacaoExibida: SituacaoExibida
  diasEmAtraso?: number | null
  /** Texto pronto vindo da API (ex.: "Vencida há 3 dias"). */
  rotulo?: string | null
  dataBaixa?: string | null
  metodoPagamentoId?: string | null
  metodoPagamentoNome?: string | null
  origemBaixa?: string | null
  /** F6 (PP-525): só despesa tem categoria. */
  categoriaId?: string | null
  categoriaNome?: string | null
}

export interface ListaParcelas {
  itens: ParcelaFinanceira[]
  total: number
  pagina: number
  tamanhoPagina: number
  totalEmAberto: number
  totalVencido: number
  vazioDeLancamentos: boolean
}

export interface FiltroParcelas {
  tipo: TipoLancamento
  /** Ausentes = período padrão da API: mês atual + todas as vencidas de qualquer mês (PP-697). */
  de?: string
  ate?: string
  situacao: FiltroSituacaoParcela
  page?: number
  size?: number
}

export interface BaixaParcelaRequest {
  dataBaixa?: string
  metodoPagamentoId: string
}

/** PP-525 (F6) — categoria de despesa. `semeada` = padrão do sistema (não se renomeia, inativa nem exclui). */
export interface CategoriaFinanceira {
  id: string
  nome: string
  semeada: boolean
  ativa: boolean
}
