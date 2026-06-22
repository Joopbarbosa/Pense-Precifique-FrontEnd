export interface InsumoRequest {
  nome: string
  marca?: string
  unidadeMedida: string
  estoqueAtual?: number
  estoqueMinimo?: number
}

export interface InsumoResponse {
  id: string
  nome: string
  marca?: string
  unidadeMedida: string
  custoUnitario: number
  estoqueAtual: number
  estoqueMinimo?: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// Matches Spring Data Page format
export interface PageResponse<T> {
  content: T[]
  number: number    // 0-indexed page number
  size: number
  totalElements: number
  last: boolean     // true if this is the last page
}
