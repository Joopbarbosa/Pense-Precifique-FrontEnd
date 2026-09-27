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
}

export interface CompraItemRequest {
  insumoId: string
  fornecedorId?: string | null
  quantidade?: number | null
  precoTotal?: number | null
}

export interface CompraRequest {
  dataCompra: string
  multiplosFornecedores: boolean
  fornecedorId?: string | null
  pago: boolean
  metodoPagamentoId?: string | null
  observacoes?: string
  itens: CompraItemRequest[]
}

export interface CompraFiltros {
  status?: StatusCompra
  fornecedorId?: string
  de?: string
  ate?: string
  /** #565 — `campo,direcao` (dataCompra, numero, fornecedor, itens, total, status). */
  sort?: string
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
}

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
  quantidade: number
  fornecedorId: string | null
  fornecedorNome: string | null
  precoReferencia: number | null
}

export interface ListaCompraResponse {
  id: string
  numero: number
  identificador: string
  geradaEm: string
  itens: ListaCompraItemResponse[]
}

export interface ListaCompraResumoResponse {
  id: string
  numero: number
  identificador: string
  geradaEm: string
  quantidadeItens: number
}

// ---------- Dashboard (#548, RN-NOVA-15) ----------

export interface DashboardComprasResponse {
  totalGastoMes: number
  totalGastoAno: number
  fornecedorMaisUsado: { fornecedor: CadastroRef; quantidadeCompras: number } | null
  insumoMaiorAumento: {
    insumo: InsumoRef
    precoInicial: number
    dataInicial: string
    precoFinal: number
    dataFinal: string
    variacaoPercentual: number
  } | null
}

export interface PontoEvolucaoPreco {
  data: string
  compraId: string
  identificador: string
  precoUnitarioPago: number
  quantidade: number
  fornecedor: string | null
  variacaoPercentual: number
}

export interface EvolucaoPrecoResponse {
  de: string
  ate: string
  series: { insumo: InsumoRef; pontos: PontoEvolucaoPreco[] }[]
}
