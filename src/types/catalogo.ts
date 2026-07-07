export interface CatalogoRequest {
  nome: string
  margem: number
}

export interface CatalogoResponse {
  id: string
  numero: number
  identificador: string
  nome: string
  margem: number
  ativo: boolean
  quantidadeItens: number
}
