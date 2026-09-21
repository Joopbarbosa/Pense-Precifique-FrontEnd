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

// RN-NOVA-4 (V0.10.0, #336) — GET /insumos/contagens, badges de filtro de ListaInsumosPage.tsx.
export interface InsumoContagensResponse {
  todos: number
  ativos: number
  inativos: number
  estoqueBaixo: number
  estoqueNegativo: number
  estoquePositivo: number
}

export interface BaixaManualInsumoRequest {
  /** #514 (V0.14.0) — "Edição manual" vira bidirecional; mesmos motivos/observação (INS-007)
   *  servem tanto para ENTRADA (acréscimo) quanto para SAIDA (baixa, comportamento anterior). */
  tipo: 'ENTRADA' | 'SAIDA'
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

// V0.13.0 (#516, DT-NOVA-1) — reestruturado em 2 blocos independentes (mesmo formato de
// ResolverVinculosProdutoRequest), porque o Insumo passou a ter 2 tipos de vínculo: ficha técnica
// (já existia) e componente de Item de Catálogo (novo, RN-NOVA-1 — antes Insumo nunca podia ser
// componente de item de catálogo). Cada bloco só é obrigatório se o insumo tiver vínculo daquele tipo.
export interface SubstituicaoVinculoCatalogoInsumoRequest {
  vinculoId: string
  novoInsumoId: string
}

export interface ResolucaoVinculoFichaTecnicaInsumoRequest {
  acao: 'REMOVER_VINCULOS' | 'SUBSTITUIR'
  substituicoes?: SubstituicaoInsumoRequest[]
}

export interface ResolucaoVinculoCatalogoInsumoRequest {
  acao: 'REMOVER_VINCULOS' | 'SUBSTITUIR'
  substituicoes?: SubstituicaoVinculoCatalogoInsumoRequest[]
}

export interface ResolverVinculosInsumoRequest {
  operacao: 'INATIVAR' | 'EXCLUIR'
  fichaTecnica?: ResolucaoVinculoFichaTecnicaInsumoRequest
  catalogo?: ResolucaoVinculoCatalogoInsumoRequest
}

