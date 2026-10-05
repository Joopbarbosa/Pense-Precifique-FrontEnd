export type TipoExibicaoQuantidade = 'FRACAO' | 'DECIMAL'

export interface InsumoRequest {
  nome: string
  marca?: string
  qualquerMarca?: boolean
  /** #298 (V0.14.0) — substitui o texto livre antigo (`unidadeMedida: string`). */
  unidadeMedidaId: string
  fracionavel?: boolean
  tipoExibicaoQuantidade?: TipoExibicaoQuantidade
  estoqueAtual?: number
  estoqueMinimo?: number
  permitirEstoqueNegativo?: boolean
  /** #590 (RN-NOVA-39) — nulo na edição = mantém. */
  regraPrecoReferencia?: RegraPrecoReferencia
  /** V0.16.0 (#687, RN-NOVA-18) — só ao completar insumo em rascunho: custo = preço ÷ quantidade. */
  precoTotalCompraInicial?: number
  quantidadeCompradaInicial?: number
}

/** #590 (RN-NOVA-39) — como o preço de referência dos fornecedores deste insumo é calculado. */
export type RegraPrecoReferencia = 'MEDIA' | 'MENOR_VALOR' | 'MANUAL'

export interface NovoInsumoRequest {
  nome: string
  marca?: string
  qualquerMarca?: boolean
  unidadeMedidaId: string
  fracionavel?: boolean
  tipoExibicaoQuantidade?: TipoExibicaoQuantidade
  estoqueMinimo?: number
  precoTotalCompraInicial: number
  quantidadeCompradaInicial: number
  permitirEstoqueNegativo?: boolean
  /** #590 — nulo na criação = MEDIA. */
  regraPrecoReferencia?: RegraPrecoReferencia
}

export interface InsumoResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  marca?: string
  qualquerMarca: boolean
  /** Sigla denormalizada, mantida para exibição (telas de histórico/listagem já consomem como texto).
   *  V0.16.0 (#687) — nula só em insumo em rascunho criado sem unidade conhecida. */
  unidadeMedida: string | null
  /** #298 (V0.14.0) — id da UnidadeMedida real, usado para preselecionar o dropdown na edição. */
  unidadeMedidaId: string | null
  fracionavel: boolean
  tipoExibicaoQuantidade: TipoExibicaoQuantidade | null
  permitirEstoqueNegativo: boolean
  custoUnitario: number
  estoqueAtual: number
  estoqueMinimo?: number
  ativo: boolean
  regraPrecoReferencia: RegraPrecoReferencia
  createdAt: string
  updatedAt: string
  /** V0.16.0 (#687, RN-NOVA-18) — rascunho vindo da nota: não entra em ficha, orçamento nem estoque. */
  rascunho: boolean
  /** Custo calculado a partir da nota, mostrado como "proposto, a revisar". */
  custoProposto: boolean
}

/** V0.16.0 (#687, RN-NOVA-18) — POST /insumos/rascunho: o backend propõe unidade e custo a partir do item. */
export interface InsumoRascunhoRequest {
  nome: string
  marca?: string
  unidadeNota?: string
  quantidadeNota?: number
  valorFinalNota?: number
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
  /** V0.15.0 (#542, RN-NOVA-7) — identificador legível da origem (PRD-N, ORC-N, COM-N, CX-N), pronto do backend. */
  referencia?: string | null
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

