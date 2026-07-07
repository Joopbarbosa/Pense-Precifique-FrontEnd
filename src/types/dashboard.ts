import type { StatusOrcamento } from './index'

export interface ProdutoMaisVendido {
  nomeProduto: string
  quantidade: number
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
