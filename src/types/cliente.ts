// V0.15.0 (#536) — cadastro único "Clientes e Fornecedores": a rota/tabela continua `clientes`,
// o registro ganha papéis (Cliente, Fornecedor ou os dois), tipo de pessoa e documento.
export type TipoPessoa = 'FISICA' | 'JURIDICA' | 'ESTRANGEIRO'

export type PapelCadastro = 'CLIENTE' | 'FORNECEDOR'

export interface ClienteRequest {
  nome: string
  ehCliente: boolean
  ehFornecedor: boolean
  tipoPessoa: TipoPessoa
  documento?: string
  email?: string
  whatsapp?: string
  telefone?: string
  site?: string
  endereco?: string
  observacoes?: string
}

export interface ClienteResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  email?: string | null
  whatsapp?: string | null
  telefone?: string | null
  site?: string | null
  endereco?: string | null
  observacoes?: string | null
  ehCliente: boolean
  ehFornecedor: boolean
  tipoPessoa: TipoPessoa
  /** Normalizado pelo backend: sem máscara, maiúsculo (a máscara é só de exibição). */
  documento?: string | null
  ativa: boolean
  createdAt: string
  updatedAt: string
}

export interface ClienteContagensResponse {
  ativos: number
  clientes: number
  fornecedores: number
  inativos: number
}

/** Filtros de `GET /clientes` — `ativo` omitido = só ativos; `papel` omitido = os dois papéis. */
export interface ClienteFiltros {
  papel?: PapelCadastro
  ativo?: boolean
}

// ---------- Detalhe do cadastro (#560, RN-NOVA-19) ----------

export type TipoPedidoCliente = 'ORCAMENTO' | 'VENDA_CAIXA'

/** Orçamento ou venda do Caixa — item do histórico e `ultimaCompra` dos indicadores. */
export interface PedidoClienteResponse {
  id: string
  tipo: TipoPedidoCliente
  identificador: string
  data: string
  /** Data que conta como compra (entrega do ENTREGUE / data da venda CONCLUIDA); null nos demais. */
  dataCompra: string | null
  status: string
  valor: number
  contaComoCompra: boolean
}

export interface ItemCompradoResponse {
  id: string
  tipo: 'PRODUTO' | 'ITEM_CATALOGO'
  nome: string
  quantidade: number
  valor: number
}

export interface QuantidadeValorResponse {
  quantidade: number
  valor: number
}

export interface IndicadoresClienteResponse {
  ultimaCompra: PedidoClienteResponse | null
  totalGasto: number
  ticketMedio: number | null
  numeroPedidos: number
  itemMaisComprado: ItemCompradoResponse | null
  clienteDesde: string | null
  orcamentosEmAberto: QuantidadeValorResponse
  orcamentosCancelados: QuantidadeValorResponse
}

export interface IndicadoresFornecedorResponse {
  ultimaCompra: { id: string; identificador: string; data: string } | null
  totalComprado: number
  compraMedia: number | null
  numeroCompras: number
  insumoMaisComprado: { id: string; nome: string; unidade: string; quantidade: number } | null
  insumosVinculados: number
  comprasNaoPagas: QuantidadeValorResponse
}

export interface IndicadoresCadastroResponse {
  cliente: IndicadoresClienteResponse
  fornecedor: IndicadoresFornecedorResponse
}

export interface CompraFornecedorHistoricoResponse {
  id: string
  identificador: string
  dataCompra: string
  status: 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA'
  valor: number
  pago: boolean
}

/** #451 (RN-NOVA-20) — `gastoMensal` tem um ponto por mês do período, inclusive meses com 0. */
export interface GraficosClienteResponse {
  de: string
  ate: string
  gastoMensal: { mes: string; total: number }[]
  itensMaisComprados: ItemCompradoResponse[]
}
