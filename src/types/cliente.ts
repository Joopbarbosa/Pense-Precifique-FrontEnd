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
  /** #583 (RN-NOVA-40) — seletores: ativos primeiro, depois os inativos do papel (ignora `ativo`). */
  incluirInativos?: boolean
  /** #582 — `campo,direcao`: nome, numero, documento (padrão nome,asc). */
  sort?: string
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
  /** INSUMO: gráficos do fornecedor (#587). */
  tipo: 'PRODUTO' | 'ITEM_CATALOGO' | 'INSUMO'
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

/**
 * V0.15.0 (#572/#573, RN-NOVA-24) — linha padronizada da modal de listagem do detalhe do cadastro.
 * `data`: a que conta como compra (entrega/venda/compra) ou, nos demais, a de criação.
 */
export interface RegistroCadastroResponse {
  id: string
  tipo: 'ORCAMENTO' | 'VENDA_CAIXA' | 'COMPRA'
  identificador: string
  data: string
  status: string
  valor: number
  quantidadeItens: number
  resumoItens: string
  contaComoCompra: boolean
  pago: boolean | null
}

export interface RegistrosFiltros {
  papel: PapelCadastro
  busca?: string
  status?: string[]
  somenteCompras?: boolean
  naoPagas?: boolean
  de?: string
  ate?: string
  /** #585 — vários itens somam como OU. */
  itemId?: string | string[]
  /** #585 — ORCAMENTO, VENDA_CAIXA, COMPRA. */
  tipo?: string[]
  /** #585 — "true"/"false" (texto: o serializador do service descarta `false`). */
  pago?: 'true' | 'false'
  comDesconto?: boolean
  /** `campo,direcao` — data, identificador, valor, status. */
  sort?: string
}
