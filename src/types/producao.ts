import type { TipoExibicaoQuantidade } from './insumo'

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
  quantidadePerdida: number
  algumInsumoNaoFracionavel: boolean
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
}

export interface HistoricoStatus {
  statusAnterior: EstadoProducao | null
  statusNovo: EstadoProducao | null
  dataTransicao: string
  justificativa: string | null
  origem: 'SISTEMA' | 'USUARIO'
  // RN-NOVA-17 (V0.8.3, #375+308, P-F003) — campos confirmados via curl real que o tipo não
  // expunha ainda (evento sempre existiu no histórico, mas só `STATUS` era consumido até aqui).
  // `tipoEvento === 'ITEM_ADICIONADO'` é a única fonte hoje de "quais produtos este orçamento
  // contribuiu para esta produção" (não existe DTO de vínculo granular por produto) — usado para
  // montar a segunda pergunta ("manter o produto?") do modal sequencial de desfazer vínculo.
  // `statusNovo`/`statusAnterior` vêm `null` nesses eventos (não são transição de estado).
  tipoEvento?: 'STATUS' | 'ITEM_ADICIONADO' | 'ITEM_REMOVIDO'
  produtoId?: string | null
  nomeProduto?: string | null
  quantidade?: number | null
  referenciaOrcamentoId?: string | null
  identificadorOrcamento?: string | null
}

// RN-NOVA-16 (V0.8.3, #375+308) — item de "orçamentos vinculados" na Listagem/Kanban de Produção,
// mesma direção espelhada de OrcamentoProducaoResponse. Presença de 1+ item, independente do
// status do orçamento (inclusive CANCELADO), já basta pro indicador (VinculoAtivoBadge).
export interface ProducaoOrcamentoVinculo {
  orcamentoId: string
  identificadorOrcamento: string
  statusOrcamento: string
  nomeCliente: string
  valorTotal: number
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
  orcamentosVinculados: ProducaoOrcamentoVinculo[]
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
    tipoExibicaoQuantidade?: TipoExibicaoQuantidade | null
  }[]
  producoesFilhas: { id: string; identificador: string; estado: EstadoProducao }[]
}

export interface CriarProducaoRequest {
  dataInicio?: string
  dataTerminoPrevista: string
  observacoes?: string
  produtos: { produtoId: string; quantidade: number }[]
}

export interface FinalizarProducaoRequest {
  perdas?: { produtoId: string; quantidadePerdida: number }[]
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
  confirmarEstoqueNegativoInsumoIds?: string[]
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
