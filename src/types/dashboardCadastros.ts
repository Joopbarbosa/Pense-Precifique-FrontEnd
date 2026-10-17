// V0.17.0 — #607 (RN-NOVA-16): Dashboard de Cadastros. Tudo calculado no backend.

export interface ItemRanking {
  id: string | null
  identificador: string
  rotulo: string
  marca: string | null
  valor: number
  anterior: number | null
  detalhe: string | null
}

export interface RankingCadastros { top: ItemRanking[]; todos: ItemRanking[] }

export interface PontoPreco { mes: string; precoMedio: number; quantidade: number; valorPago: number }
export interface EvolucaoPreco { insumoId: string; insumo: string; marca: string | null; pontos: PontoPreco[] }

export interface PrecoAbaixoSugerido { id: string; identificador: string; nome: string; precoVenda: number; precoSugerido: number; diferenca: number }
export interface MargemProduto { id: string; identificador: string; nome: string; precoVenda: number; custo: number; margemPercentual: number }
export interface ItemAbc { id: string | null; identificador: string; nome: string; lucro: number; percentual: number | null; acumulado: number | null; classe: 'A' | 'B' | 'C' | null }
export interface CurvaAbc { totalLucro: number; itens: ItemAbc[]; semLucro: ItemAbc[] }

export interface DashboardCadastrosResponse {
  de: string
  ate: string
  deAnterior: string
  ateAnterior: string
  evolucaoPrecoInsumo: EvolucaoPreco | null
  insumosEmProdutos: RankingCadastros
  insumoMaisComprado: RankingCadastros
  insumoMaisGasto: RankingCadastros
  produtoMaisVendido: RankingCadastros
  produtoMaisLucro: RankingCadastros
  produtosComPrecoAbaixoDoSugerido: PrecoAbaixoSugerido[]
  margemPorProduto: MargemProduto[]
  curvaAbc: CurvaAbc
  insumosQueMaisVariaram: RankingCadastros
  /** V0.17.0 #974 (RN-NOVA-25): faixa de números de estoque e CMV. */
  estoque: EstoqueNumeros
}

/** Número com o do período anterior e a variação (calculada no backend). */
export interface NumeroComparado { valor: number | null; anterior: number | null; variacaoPercentual: number | null }

export interface LinhaEstoque {
  id: string | null
  identificador: string
  nome: string
  tipo: 'INSUMO' | 'PRODUTO'
  estoque: number
  custoUnitario: number | null
  valor: number
  precoVenda: number | null
}

export interface LinhaMinimo { id: string | null; identificador: string; nome: string; estoque: number; minimo: number; falta: number }

export interface EstoqueNumeros {
  valorTotal: number
  valorMaterial: number
  valorProdutosProntos: number
  valorItens: LinhaEstoque[]
  potencialVenda: number
  potencialItens: LinhaEstoque[]
  percentualCmv: NumeroComparado
  margemMaterial: NumeroComparado
  insumosAbaixoMinimo: number
  abaixoMinimoItens: LinhaMinimo[]
}
