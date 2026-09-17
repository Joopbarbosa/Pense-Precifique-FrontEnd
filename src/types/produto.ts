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
  /** #462 (achado do teste manual) — distingue Produto de Customização ao recarregar uma ficha
   *  técnica já salva; sem isso o Frontend rotulava todo componente como "produto". */
  tipoProdutoBase?: TipoProduto
  quantidade: number
  custoUnitario: number
  custoTotal: number
}

/** #489 (V0.12.0) — lista fechada do Simples Nacional (RN-NOVA-13). */
export type Csosn = '101' | '102' | '103' | '201' | '202' | '203' | '300' | '400' | '500' | '900'

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
  /** RN-NOVA-2 (V0.10.0, #299) — ausente ou igual ao derivado da ficha técnica = sem override;
   *  diferente do derivado = override ativo, persiste até a artesã reverter manualmente. */
  fracionavel?: boolean
  /** #489 (V0.12.0) — campos fiscais mínimos, todos opcionais. Preparação para emissão futura de
   *  NFC-e/NF-e (fora de escopo) — nenhum cálculo de imposto nesta versão. */
  codigoBarras?: string
  ncm?: string
  cfop?: string
  cest?: string
  unidadeComercial?: string
  csosn?: Csosn
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
  algumInsumoNaoFracionavel?: boolean
  /** RN-NOVA-2 (V0.10.0, #299) — persistido+editável, padrão calculado+override. NUNCA usar para
   *  gate de negócio (travamento de quantidade em Produção) — isso continua em `algumInsumoNaoFracionavel`. */
  fracionavel?: boolean
  fracionavelOverride?: boolean
  /** #489 (V0.12.0) — campos fiscais mínimos, todos opcionais. */
  codigoBarras?: string
  ncm?: string
  cfop?: string
  cest?: string
  unidadeComercial?: string
  csosn?: Csosn
  createdAt: string
  updatedAt: string
}

// RN-NOVA-4 (V0.10.0, #336) — GET /produtos/contagens, badges de categoria de ListaProdutosPage.tsx.
export interface ProdutoContagensResponse {
  total: number
  inativos: number
  porTipo: {
    produto: number
    customizacao: number
  }
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
  catalogoReferencia?: string
  precoVendido?: number
  estornada: boolean
  createdAt: string
}

export interface CatalogoVinculadoResponse {
  id: string
  identificador: string
  nome: string
}

export interface ComponenteVinculadoResponse {
  vinculoId: string
  produtoId: string
  produtoIdentificador?: string
  produtoNome: string
}

export type TipoVinculoProduto = 'ITEM_CATALOGO_PRINCIPAL' | 'CUSTOMIZACAO_ANEXADA' | 'COMPONENTE_FICHA_TECNICA'

export type AcaoResolucaoVinculo = 'REMOVER_VINCULOS' | 'SUBSTITUIR'

export interface SubstituicaoVinculoProdutoRequest {
  tipo: TipoVinculoProduto
  vinculoId: string
  novoProdutoId: string
}

export interface SubstituicaoComponenteVinculoRequest {
  vinculoId: string
  novoProdutoId: string
}

export interface ResolucaoVinculoCatalogoRequest {
  acao: AcaoResolucaoVinculo
  substituicoes?: SubstituicaoVinculoProdutoRequest[]
}

export interface ResolucaoVinculoComponenteRequest {
  acao: AcaoResolucaoVinculo
  substituicoes?: SubstituicaoComponenteVinculoRequest[]
}

export interface ResolverVinculosProdutoRequest {
  operacao: 'INATIVAR' | 'EXCLUIR'
  catalogo?: ResolucaoVinculoCatalogoRequest
  componente?: ResolucaoVinculoComponenteRequest
}

