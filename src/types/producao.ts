import type { TipoProduto } from './produto'

export type StatusProducao = 'ATIVA' | 'CANCELADA'

export interface LancarProducaoRequest {
  produtoId: string
  quantidade: number
  dataProducao?: string
}

export interface InsumoConsumidoResponse {
  insumoId: string
  nomeInsumo: string
  marca?: string
  unidadeMedida: string
  quantidade: number
  estoqueAntes?: number
  estoqueInsuficiente: boolean
}

export interface ProducaoResponse {
  id: string
  numero: number
  produtoId: string
  nomeProduto: string
  tipoProduto: TipoProduto
  quantidade: number
  dataProducao: string
  status: StatusProducao
}

export interface ProducaoDetalheResponse extends ProducaoResponse {
  observacaoCancelamento?: string
  dataCancelamento?: string
  insumosConsumidos: InsumoConsumidoResponse[]
}
