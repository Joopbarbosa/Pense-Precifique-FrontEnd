import type { TipoProduto } from './index'

export type { TipoProduto }

export interface FichaTecnicaItemRequest {
  insumoId?: string
  produtoBaseId?: string
  quantidade: number
}

export interface FichaTecnicaItemResponse {
  id: string
  insumoId?: string
  nomeInsumo?: string
  marcaInsumo?: string
  unidadeMedida?: string
  fracionavelInsumo?: boolean
  produtoBaseId?: string
  nomeProdutoBase?: string
  quantidade: number
  custoUnitario: number
  custoTotal: number
}

export interface ProdutoRequest {
  nome: string
  tipo: TipoProduto
  descricao?: string
  tempoProducao: number
  precoVenda?: number
  rendimento?: number
  estoqueMinimo?: number
  fichaTecnica: FichaTecnicaItemRequest[]
}

export interface ProdutoResponse {
  id: string
  nome: string
  tipo: TipoProduto
  precoVenda?: number
  precoCusto: number
  rendimento?: number
  custoTotalLote?: number
  custoUnitario?: number
  estoqueAtual: number
  estoqueMinimo?: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface ProdutoDetalheResponse extends ProdutoResponse {
  descricao?: string
  tempoProducao: number
  fichaTecnica: FichaTecnicaItemResponse[]
}

export interface BaixaManualProdutoRequest {
  quantidade: number
  motivo: 'PERDA' | 'AVARIA' | 'USO_EXTRA' | 'CORRECAO' | 'OUTRO'
  observacao: string
}

export interface MovimentacaoProdutoResponse {
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

export interface PageResponse<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  last: boolean
}
