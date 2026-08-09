export interface CatalogoRequest {
  nome: string
}

export interface CatalogoResponse {
  id: string
  numero: number
  identificador: string
  nome: string
  ativo: boolean
  quantidadeItens: number
}
