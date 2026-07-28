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

export interface PreviewPrecoRequest {
  produtoId: string
  quantidadePacote: number
  customizacoesAnexadas: CustomizacaoAnexadaRequest[]
}

export interface PreviewPrecoResponse {
  custoUnitario: number
  quantidadePacote: number
  custoCustomizacoes: number
  margem: number
  precoSugerido: number
}
