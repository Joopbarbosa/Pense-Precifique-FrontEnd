export interface CustomizacaoAnexadaRequest {
  produtoId: string
  quantidade: number
}

export interface CustomizacaoAnexadaResponse {
  id: string
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
  algumInsumoNaoFracionavel: boolean
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
}

export interface PreviewPrecoRequest {
  produtoId: string
  quantidadePacote: number
  customizacoesAnexadas: CustomizacaoAnexadaRequest[]
}

export interface PreviewPrecoResponse {
  precoVendaProduto: number
  quantidadePacote: number
  precoVendaCustomizacoes: number
  precoSugerido: number
}
