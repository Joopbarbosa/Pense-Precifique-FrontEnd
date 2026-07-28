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

export interface HistoricoStatus {
  statusAnterior: EstadoProducao | null
  statusNovo: EstadoProducao
  dataTransicao: string
  justificativa: string | null
  origem: 'SISTEMA' | 'USUARIO'
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
  historicoStatus: HistoricoStatus[]
}

export interface ProducaoDetalhe extends ProducaoResumo {
  dataTerminoReal: string | null
  justificativaCancelamento: string | null
  justificativaNaoRealizada: string | null
  producaoOrigemId: string | null
  tipoOrigem: string | null
  insumosConsumidos: {
    insumoId: string | null
    produtoBaseId?: string | null
    nomeInsumo: string | null
    marca: string | null
    unidadeMedida: string | null
    quantidade: number
    estoqueAntes: number | null
    estoqueInsuficiente: boolean
    fracionavel: boolean | null
  }[]
  producoesFilhas: { id: string; identificador: string; estado: EstadoProducao }[]
}

export interface CriarProducaoRequest {
  dataInicio?: string
  dataTerminoPrevista: string
  observacoes?: string
  produtos: { produtoId: string; quantidade: number }[]
}

export interface DivisaoResponse {
  producaoOriginal: ProducaoDetalhe
  producaoA: ProducaoDetalhe
  producaoB: ProducaoDetalhe
}

// RN-052 — retornado no lugar da resposta normal de iniciar()/retomar() quando há insumo/produto-base
// com permitirEstoqueNegativo=true cuja baixa deixaria o estoque negativo e ainda não foi confirmada.
// Nada é persistido nessa resposta — é preciso reenviar confirmando os `componenteId` listados via
// `confirmarEstoqueNegativoInsumoIds` para a transição prosseguir.
export interface AvisoEstoqueNegativo {
  componenteId: string
  nome: string
  estoqueAtual: number
  quantidadeNecessaria: number
  mensagem: string
}

export interface ConfirmacaoEstoqueNegativoResponse {
  avisos: AvisoEstoqueNegativo[]
}

export interface ConsumoRealItem {
  insumoId?: string
  produtoBaseId?: string
  quantidadeConsumida: number
}

export interface CancelarProducaoRequest {
  justificativa: string
  consumoReal?: ConsumoRealItem[]
}

export interface AgruparProducoesRequest {
  producaoIds: string[]
  estadoDestino: string
  dataInicio?: string
  dataTerminoPrevista?: string
  justificativa: string
  consumoRealPorProducao?: Record<string, ConsumoRealItem[]>
}

export interface AgruparResponse {
  producaoNova: ProducaoDetalhe
  producoesOriginais: ProducaoDetalhe[]
}

export function isDivisaoResponse(
  x: ProducaoDetalhe | DivisaoResponse | ConfirmacaoEstoqueNegativoResponse
): x is DivisaoResponse {
  return 'producaoOriginal' in x
}

export function isConfirmacaoEstoqueNegativoResponse<T extends object>(
  x: T | ConfirmacaoEstoqueNegativoResponse
): x is ConfirmacaoEstoqueNegativoResponse {
  return 'avisos' in x
}
