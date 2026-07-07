export interface CustomizacaoAnexadaRequest {
  produtoId: string
  quantidade: number
}

export interface CustomizacaoAnexadaResponse {
  produtoId: string
  produtoNome: string
  quantidade: number
}

export interface ItemCatalogoRequest {
  produtoId: string
  quantidadePacote: number
  precoVenda?: number
  customizacoesAnexadas: CustomizacaoAnexadaRequest[]
}

export interface ItemCatalogoResponse {
  id: string
  produtoId: string
  produtoNome: string
  quantidadePacote: number
  precoVenda: number
  precoSugerido: number
  override: boolean
  bloqueadoParaVenda: boolean
  customizacoesAnexadas: CustomizacaoAnexadaResponse[]
}
