// V0.15.0 — módulo Compras (Epic #414). Espelha modulos/COMPRAS/contrato-compras.md.
import type { TipoMetodoPagamento } from './empresa'

export type StatusCompra = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA'

export interface CadastroRef {
  id: string
  identificador: string
  nome: string
  ativa: boolean
}

export interface InsumoRef {
  id: string
  identificador: string
  nome: string
  marca: string | null
  unidade: string
  ativo: boolean
}

export interface MetodoPagamentoRef {
  id: string
  tipo: TipoMetodoPagamento
  nome: string
  ativo: boolean
}

export interface CompraItemResponse {
  id: string
  ordem: number
  insumo: InsumoRef
  fornecedor: CadastroRef | null
  quantidade: number | null
  precoTotal: number | null
  /** precoTotal ÷ quantidade (4 casas), calculado pelo backend; null se faltar um dos dois. */
  precoUnitario: number | null
  /** Só depois da confirmação. */
  precoUnitarioPago: number | null
  custoUnitarioAnterior: number | null
  custoUnitarioPosterior: number | null
  /** #576 — preço cheio, desconto como digitado e em R$ (da linha e a parte da nota). `precoTotal` = pago. */
  precoCheio: number | null
  descontoTipo: TipoDesconto | null
  descontoInformado: number | null
  descontoLinha: number
  descontoNota: number
}

export interface CompraResponse {
  id: string
  numero: number
  identificador: string
  status: StatusCompra
  dataCompra: string
  multiplosFornecedores: boolean
  fornecedor: CadastroRef | null
  pago: boolean
  metodoPagamento: MetodoPagamentoRef | null
  observacoes: string | null
  origem: 'MANUAL'
  total: number
  itens: CompraItemResponse[]
  confirmadaEm: string | null
  canceladaEm: string | null
  observacaoCancelamento: string | null
  createdAt: string
  updatedAt: string
  descontoNotaTipo: TipoDesconto | null
  descontoNotaInformado: number | null
  descontoNota: number
  totalCheio: number
  totalDescontos: number
  /** #597 (RN-NOVA-42) — só quando pago com cartão de crédito. */
  parcelas: number | null
  /** #596 (RN-NOVA-41) — lista de onde a compra foi criada. */
  listaCompra: { id: string; identificador: string } | null
}

export interface CompraResumoResponse {
  id: string
  numero: number
  identificador: string
  status: StatusCompra
  dataCompra: string
  fornecedores: string[]
  pago: boolean
  total: number
  quantidadeItens: number
  /** DT-NOVA-19 — "Fita de cetim ×10 m, Cola ×3 un". */
  resumoItens: string
}

/** #576 (RN-NOVA-28) — desconto como a artesã digitou: em R$ ou em %. */
export type TipoDesconto = 'VALOR' | 'PERCENTUAL'

export interface CompraItemRequest {
  insumoId: string
  fornecedorId?: string | null
  quantidade?: number | null
  /** Legado (sem desconto): preço pago. O formulário manda sempre `precoCheio`. */
  precoTotal?: number | null
  precoCheio?: number | null
  descontoTipo?: TipoDesconto | null
  descontoValor?: number | null
}

export interface CompraRequest {
  dataCompra: string
  multiplosFornecedores: boolean
  fornecedorId?: string | null
  pago: boolean
  metodoPagamentoId?: string | null
  observacoes?: string
  itens: CompraItemRequest[]
  descontoNotaTipo?: TipoDesconto | null
  descontoNotaValor?: number | null
  /** #597 — só com método CARTAO_CREDITO e pago (1..maxParcelas, sem máximo 12). */
  parcelas?: number | null
}

export interface CompraFiltros {
  /** #585 — vários status somam como OU. */
  status?: StatusCompra | StatusCompra[]
  pago?: boolean
  comDesconto?: boolean
  /** #585 — vários somam como OU. */
  fornecedorId?: string | string[]
  de?: string
  ate?: string
  /** #565 — `campo,direcao` (dataCompra, numero, fornecedor, itens, total, status). */
  sort?: string
  /** DT-NOVA-19 — compras com o insumo em alguma linha; busca por COM-N, insumo ou fornecedor. */
  insumoId?: string | string[]
  busca?: string
}

// ---------- Impacto (#543, RN-NOVA-8) ----------

export interface ImpactoInsumo {
  id: string
  identificador: string
  nome: string
  unidade: string
  custoAntes: number
  custoDepois: number
}

export interface ImpactoProduto {
  id: string
  identificador: string
  nome: string
  tipo: 'PRODUTO' | 'CUSTOMIZACAO'
  direto: boolean
  custoAntes: number
  custoDepois: number
  precoSugeridoAntes: number
  precoSugeridoDepois: number
  precoVenda: number
  precoVendaManual: boolean
}

export interface ImpactoCompraResponse {
  alterouCustos: boolean
  insumos: ImpactoInsumo[]
  produtos: ImpactoProduto[]
}

export interface CompraConfirmacaoResponse {
  compra: CompraResponse
  impacto: ImpactoCompraResponse
}

// ---------- Cancelamento (#544) ----------

export interface SimulacaoCancelamentoResponse {
  podeCancelar: boolean
  bloqueios: { insumoId: string; nome: string; unidade: string; estoqueAtual: number; quantidadeEstornada: number; estoqueResultante: number }[]
  avisos: { insumoId: string; nome: string; custoAtual: number; custoAntesDaCompra: number }[]
}

// ---------- Vínculo Fornecedor↔Insumo (#540, RN-NOVA-6) ----------

export interface FornecedorInsumoResponse {
  id: string
  fornecedor: CadastroRef
  insumo: InsumoRef
  precoReferencia: number | null
  updatedAt: string
  /** #590 (RN-NOVA-39) — regra do insumo, vale para todos os fornecedores dele. */
  regraPrecoReferencia: RegraPrecoReferencia
  ultimaCompra: { compraId: string; identificador: string; data: string; precoUnitario: number } | null
}

export type { RegraPrecoReferencia } from './insumo'
import type { RegraPrecoReferencia } from './insumo'

/** #591 (RN-NOVA-44) — total da conta, sem filtros. */
export interface ContagensCompra {
  todas: number
  rascunhos: number
  confirmadas: number
  canceladas: number
}

/** #596 (RN-NOVA-41). */
export type StatusListaCompra = 'RASCUNHO' | 'GERADA' | 'PARCIALMENTE_COMPRADA' | 'COMPRADA' | 'CANCELADA'

// ---------- Lista de compras (#546) ----------

export interface LinhaPreviaListaCompra {
  insumo: InsumoRef
  estoqueAtual: number
  estoqueMinimo: number | null
  quantidadeSugerida: number | null
  fornecedorSugerido: CadastroRef | null
  precoReferencia: number | null
  fornecedores: { fornecedor: CadastroRef; precoReferencia: number | null }[]
}

export interface PreviaListaCompraResponse {
  linhas: LinhaPreviaListaCompra[]
}

export interface FiltrosPreviaLista {
  abaixoMinimo: boolean
  estoqueNegativo: boolean
  fornecedorId?: string
  insumoIds: string[]
}

export interface GerarListaCompraRequest {
  itens: { insumoId: string; quantidade: number | null; fornecedorId: string | null }[]
}

export interface ListaCompraItemResponse {
  ordem: number
  insumoId: string
  insumoNome: string
  unidade: string
  estoqueAtual: number
  estoqueMinimo: number | null
  /** Nula só em rascunho (RN-NOVA-41). */
  quantidade: number | null
  fornecedorId: string | null
  fornecedorNome: string | null
  precoReferencia: number | null
}

export interface ListaCompraResponse {
  id: string
  numero: number
  identificador: string
  /** Nulo em rascunho. */
  geradaEm: string | null
  status: StatusListaCompra
  itens: ListaCompraItemResponse[]
}

export interface ListaCompraResumoResponse {
  id: string
  numero: number
  identificador: string
  geradaEm: string | null
  quantidadeItens: number
  status: StatusListaCompra
  createdAt: string
}

// ---------- Dashboard (#548, RN-NOVA-15) ----------

/** #577/#578 (RN-NOVA-29) — número do painel com o do período anterior; variação nula sem base. */
export interface NumeroPainel {
  valor: number | null
  anterior: number | null
  variacaoPercentual: number | null
}

export interface InsumoVariacao {
  insumo: InsumoRef
  precoInicial: number
  dataInicial: string
  precoFinal: number
  dataFinal: string
  variacaoPercentual: number
}

export interface FornecedorDesconto {
  fornecedor: CadastroRef
  desconto: number
  totalCheio: number
  percentual: number | null
}

/** #577/#578 (RN-NOVA-29) — painel da aba Dashboard. Só compras CONFIRMADAS; tudo calculado no backend. */
export interface DashboardComprasResponse {
  de: string
  ate: string
  deAnterior: string
  ateAnterior: string
  gasto: NumeroPainel
  quantidadeCompras: NumeroPainel
  ticketMedio: NumeroPainel
  economia: { valor: number; totalCheio: number; percentual: number | null; anterior: number; variacaoPercentual: number | null }
  /** RN-NOVA-27 — `estimado`: parte calculada com o custo de hoje; `vendasSemCusto`: vendas fora do cálculo. */
  cmv: {
    valor: number; faturamento: number; percentual: number | null; estimado: number; vendasSemCusto: number
    anterior: number; percentualAnterior: number | null; variacaoPercentual: number | null
  }
  naoPagas: { quantidade: number; valor: number }
  maiorAumento: InsumoVariacao | null
  meses: { mes: string; gasto: number; cmv: number; faturamento: number; cmvPercentual: number }[]
  insumosQueMaisSubiram: InsumoVariacao[]
  fornecedoresPorGasto: { fornecedor: CadastroRef; valor: number; quantidadeCompras: number }[]
  fornecedoresPorDescontoPercentual: FornecedorDesconto[]
  fornecedoresPorDescontoValor: FornecedorDesconto[]
}

export interface PontoEvolucaoPreco {
  data: string
  compraId: string
  identificador: string
  precoUnitarioPago: number
  quantidade: number
  fornecedor: string | null
  variacaoPercentual: number
  /** #590 — filtro das compras do par na modal do vínculo. */
  fornecedorId: string | null
}

export interface EvolucaoPrecoResponse {
  de: string
  ate: string
  series: { insumo: InsumoRef; pontos: PontoEvolucaoPreco[] }[]
}
