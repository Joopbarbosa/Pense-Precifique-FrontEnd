import type { PageResponse } from './shared'

// V0.17.0 — #719 (RN-NOVA-17): Dashboard de Vendas. Tudo calculado no backend.

export interface NumeroDash {
  valor: number | null
  anterior: number | null
  variacaoPercentual: number | null
}

export interface DashboardVendasResponse {
  de: string
  ate: string
  deAnterior: string
  ateAnterior: string
  faturamento: NumeroDash
  quantidadeVendas: NumeroDash
  ticketMedio: NumeroDash
  meses: { mes: string; faturamento: number; quantidade: number }[]
  porOrigem: { origem: OrigemVenda; faturamento: number; quantidade: number }[]
  produtosMaisVendidos: { id: string | null; tipo: 'PRODUTO' | 'CATALOGO'; nome: string; quantidade: number; faturamento: number }[]
  /** V0.17.0 #971 (DT-NOVA-18): todos os produtos vendidos, para a lupa do ranking (o ranking mostra 10). */
  todosProdutosVendidos: { id: string | null; tipo: 'PRODUTO' | 'CATALOGO'; nome: string; quantidade: number; faturamento: number }[]
  formasPagamento: { forma: string; valor: number; quantidade: number }[]
}

export type OrigemVenda = 'VENDA_CAIXA' | 'ORCAMENTO'

export interface LinhaListaVendas {
  id: string
  origem: OrigemVenda
  identificador: string
  data: string
  cliente: string | null
  itens: string
  total: number
  /** Nome do status do orçamento (RASCUNHO … CANCELADO) ou da venda do Caixa (CONCLUIDA, CANCELADA). */
  status: string
  contaNosNumeros: boolean
}

export interface ListaVendasResponse {
  vendas: PageResponse<LinhaListaVendas>
  totalFiltrado: number
  quantidadeFiltrada: number
}

export interface FiltroListaVendas {
  de?: string
  ate?: string
  origem?: OrigemVenda
  status?: string[]
  busca?: string
  /** O clique num número ou gráfico abre só o que forma aquele número. */
  somenteQueContam?: boolean
  produtoId?: string
  forma?: string
  /** Ordenação da tabela: campo e sentido, ex. "total,asc" (identificador, data, cliente, total ou status). */
  sort?: string
  page?: number
  size?: number
}
