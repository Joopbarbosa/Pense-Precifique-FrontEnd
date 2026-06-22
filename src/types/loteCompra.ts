export interface ItemLoteCompraRequest {
  insumoId: string
  quantidadeComprada: number
  precoTotalPago: number
}

export interface RegistrarLoteCompraRequest {
  dataCompra?: string
  itens: ItemLoteCompraRequest[]
}

export interface InsumoImpactoResponse {
  insumoId: string
  nomeInsumo: string
  marca?: string
  unidadeMedida: string
  custoUnitarioAnterior: number
  custoUnitarioNovo: number
  quantidadeAdicionada: number
}

export interface ImpactoAgregadoResponse {
  loteId: string
  dataCompra: string
  insumosAtualizados: InsumoImpactoResponse[]
  produtosAfetados: any[]
}
