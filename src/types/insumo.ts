export interface InsumoRequest {
  nome: string
  marca?: string
  unidadeMedida: string
  fracionavel?: boolean
  estoqueAtual?: number
  estoqueMinimo?: number
  permitirEstoqueNegativo?: boolean
}

export interface NovoInsumoRequest {
  nome: string
  marca?: string
  unidadeMedida: string
  fracionavel?: boolean
  estoqueMinimo?: number
  precoTotalCompraInicial: number
  quantidadeCompradaInicial: number
  permitirEstoqueNegativo?: boolean
}

export interface InsumoResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  marca?: string
  unidadeMedida: string
  fracionavel: boolean
  permitirEstoqueNegativo: boolean
  custoUnitario: number
  estoqueAtual: number
  estoqueMinimo?: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface BaixaManualInsumoRequest {
  quantidade: number
  motivo: 'BAIXA_MANUAL'
  observacao: string  // mín. 50 chars
}

export interface MovimentacaoInsumoResponse {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  motivo: string
  quantidade: number
  observacao?: string
  referenciaId?: string
  referenciaTipo?: string
  estornada: boolean
  createdAt: string
}

export interface ProdutoRelacionadoResponse {
  id: string
  identificador?: string
  nome: string
  tipo: 'PRODUTO' | 'PRODUTO_BASE' | 'CUSTOMIZACAO'
}

// Matches Spring Data Page format
export interface PageResponse<T> {
  content: T[]
  number: number    // 0-indexed page number
  size: number
  totalElements: number
  last: boolean     // true if this is the last page
}
