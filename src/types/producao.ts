export type EstadoProducao =
  | 'AGUARDANDO_INICIO'
  | 'EM_ANDAMENTO'
  | 'TRAVADA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'NAO_REALIZADA'

export interface AlertaInsumo {
  nomeInsumo: string
  estoqueAtual: number
  quantidadeNecessaria: number
  situacao: 'SUFICIENTE' | 'AVISO' | 'BLOQUEIO_FUTURO'
}

export interface ProducaoProdutoItem {
  produtoId: string
  nomeProduto: string
  tipoProduto: string
  quantidade: number
}

export interface ProducaoResumo {
  id: string
  numero: number
  identificador: string
  estado: EstadoProducao
  dataInicio: string | null
  dataTerminoPrevista: string | null
  observacoes: string | null
  produtos: ProducaoProdutoItem[]
  alertasInsumos: AlertaInsumo[]
}

export interface HistoricoStatus {
  statusAnterior: EstadoProducao | null
  statusNovo: EstadoProducao
  dataTransicao: string
  justificativa: string | null
  origem: 'SISTEMA' | 'USUARIO'
}

export interface ProducaoDetalhe extends ProducaoResumo {
  dataTerminoReal: string | null
  justificativaCancelamento: string | null
  justificativaNaoRealizada: string | null
  producaoOrigemId: string | null
  tipoOrigem: string | null
  insumosConsumidos: {
    insumoId: string | null
    produtoBaseId: string | null
    quantidade: number
  }[]
  historicoStatus: HistoricoStatus[]
  producoesFilhas: { id: string; identificador: string; estado: EstadoProducao }[]
}

export interface CriarProducaoRequest {
  dataInicio?: string
  dataTerminoPrevista: string
  observacoes?: string
  produtos: { produtoId: string; quantidade: number }[]
}
