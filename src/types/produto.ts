import type { TipoProduto } from './index'
import type { TipoExibicaoQuantidade } from './insumo'

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
  tipoExibicaoQuantidade?: TipoExibicaoQuantidade | null
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
  permitirEstoqueNegativo?: boolean
  fichaTecnica: FichaTecnicaItemRequest[]
}

export interface ProdutoResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  tipo: TipoProduto
  precoVenda?: number
  precoCusto: number
  rendimento?: number
  custoTotalLote?: number
  custoUnitario?: number
  estoqueAtual: number
  estoqueMinimo?: number
  permitirEstoqueNegativo: boolean
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface ProdutoDetalheResponse extends ProdutoResponse {
  descricao?: string
  tempoProducao: number
  algumInsumoNaoFracionavel?: boolean
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
  catalogoReferencia?: string
  precoVendido?: number
  estornada: boolean
  createdAt: string
}

export interface PrecoSugeridoResponse {
  custoUnitario: number
  margem: number
  precoSugerido: number
}

