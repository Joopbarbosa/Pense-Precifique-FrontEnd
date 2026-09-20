// V0.13.0 (#516/#517, RN-NOVA-1 a 4) — Item de Catálogo deixou de ser "1 produto + quantidade de
// pacote + N customizações anexadas precificadas" e passou a ser composição livre de N componentes
// (Insumo XOR Produto-base, mesmo par XOR de FichaTecnicaItemRequest/Response de Produto), com
// nome/tempo de produção/margem/preço próprios (calculado+override, mesmo padrão de Produto).

export interface ItemCatalogoComponenteRequest {
  insumoId?: string
  produtoBaseId?: string
  quantidade: number
}

export interface ItemCatalogoComponenteResponse {
  id: string
  insumoId?: string | null
  nomeInsumo?: string | null
  produtoBaseId?: string | null
  nomeProdutoBase?: string | null
  tipoProdutoBase?: 'PRODUTO' | 'CUSTOMIZACAO' | null
  quantidade: number
  custoUnitario: number
  custoTotal: number
  ativo: boolean
}

export interface ItemCatalogoRequest {
  nome: string
  componentes: ItemCatalogoComponenteRequest[]
  tempoProducao: number
  margemLucro?: number
  precoVenda?: number
}

export interface ItemCatalogoResponse {
  id: string
  nome: string
  componentes: ItemCatalogoComponenteResponse[]
  tempoProducao: number
  margemLucro: number | null
  custoTotal: number
  precoVenda: number
  precoSugerido: number
  override: boolean
  /** RN-NOVA-4 — true quando qualquer componente está inativo/excluído (generaliza RN-045, antes
   *  só o produto principal bloqueava). */
  bloqueadoParaVenda: boolean
}

export interface PreviewPrecoRequest {
  componentes: ItemCatalogoComponenteRequest[]
  tempoProducao: number
  margemLucro?: number
}

export interface PreviewPrecoResponse {
  custoComponentes: number
  custoMaoDeObra: number
  custoTotal: number
  precoSugerido: number
}
