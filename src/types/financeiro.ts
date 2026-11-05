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
  foraProjecao: boolean
}

export interface ContaAvulsaRequest {
  tipo: TipoLancamento
  descricao: string
  valor: number
  vencimento: string
  categoriaId?: string
  meses?: number
  foraProjecao: boolean
  jaPaga: boolean
  dataBaixa?: string
  metodoPagamentoId?: string
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

// V0.19.0 (PP-524 / #1176, F5) — resumo do mês. Contrato: modulos/FINANCEIRO/contrato-financeiro.md.
export interface PendenciaResumo { emAberto: number; vencido: number }

export interface PrevistoRealizadoResumo {
  previstoEntradas: number
  realizadoEntradas: number
  previstoSaidas: number
  realizadoSaidas: number
}

export interface ProximosVencimentosResumo {
  itens: ParcelaFinanceira[]
  total: number
  temMais: boolean
  mensagemVazio: string
}

export interface SemanaResumo {
  numero: number
  rotulo: string
  de: string
  ate: string
  entradas: number
  saidas: number
  saldoAcumulado: number
}

export interface MarcoProjecao { dias: number; data: string; saldo: number }
export interface PontoProjecao { data: string; saldo: number }

export interface ProjecaoResumo {
  saldoAtual: number
  marcos: MarcoProjecao[]
  serie: PontoProjecao[]
  semDados: boolean
  mensagemSemDados: string
}

export interface CategoriaDespesaResumo {
  categoriaId: string | null
  nome: string
  valor: number
  percentual: number
  outras: boolean
}

export interface ResumoFinanceiro {
  mes: string
  de: string
  ate: string
  hoje: string
  saldoInicial: number
  saldoInicialInformado: boolean
  avisoSaldoInicial: string | null
  entradasRealizadas: number
  saidasRealizadas: number
  movimentoPeriodo: number
  saldoFinal: number
  aReceber: PendenciaResumo
  aPagar: PendenciaResumo
  previstoRealizado: PrevistoRealizadoResumo
  semMovimentos: boolean
  mensagemSemMovimentos: string | null
  proximosVencimentos: ProximosVencimentosResumo
  entrouSaiu: SemanaResumo[]
  projecao: ProjecaoResumo
  maioresDespesas: CategoriaDespesaResumo[]
}

export interface ListaVencimentos {
  itens: ParcelaFinanceira[]
  total: number
  pagina: number
  tamanhoPagina: number
}
