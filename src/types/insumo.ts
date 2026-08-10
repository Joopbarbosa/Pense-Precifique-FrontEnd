export type TipoExibicaoQuantidade = 'FRACAO' | 'DECIMAL'

export interface InsumoRequest {
  nome: string
  marca?: string
  unidadeMedida: string
  fracionavel?: boolean
  tipoExibicaoQuantidade?: TipoExibicaoQuantidade
  estoqueAtual?: number
  estoqueMinimo?: number
  permitirEstoqueNegativo?: boolean
}

export interface NovoInsumoRequest {
  nome: string
  marca?: string
  unidadeMedida: string
  fracionavel?: boolean
  tipoExibicaoQuantidade?: TipoExibicaoQuantidade
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
  tipoExibicaoQuantidade: TipoExibicaoQuantidade | null
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
  motivo: 'PERDA' | 'AVARIA' | 'USO_EXTRA' | 'CORRECAO' | 'OUTRO'
  observacao: string  // mín. 30 chars
}

export interface MovimentacaoInsumoResponse {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  motivo: string
  quantidade: number
  custoUnitario?: number | null
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
  tipo: 'PRODUTO' | 'CUSTOMIZACAO'
}

export interface SubstituicaoInsumoRequest {
  produtoId: string
  novoInsumoId: string
}

export interface ResolverVinculosInsumoRequest {
  acao: 'REMOVER_VINCULOS' | 'SUBSTITUIR'
  operacao: 'INATIVAR' | 'EXCLUIR'
  substituicoes?: SubstituicaoInsumoRequest[]
}

