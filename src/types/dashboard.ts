import type { StatusOrcamento } from './index'

/** #999 — linha do "Mais vendidos" da Início: tipo (PRODUTO ou CATALOGO) e id do cadastro; a quantidade pode ser fracionária (venda do Caixa). */
export interface ProdutoMaisVendido {
  nomeProduto: string
  quantidade: number
  tipo: 'PRODUTO' | 'CATALOGO'
  id: string | null
}

export interface OrcamentoRecenteResponse {
  id: string
  numero: number
  nomeCliente: string
  status: StatusOrcamento
  total: number
}

export interface DashboardResponse {
  receitaMes: number
  receitaTotal: number
  orcamentosPendentes: number
  produtosMaisVendidos: ProdutoMaisVendido[]
  orcamentosRecentes: OrcamentoRecenteResponse[]
}
