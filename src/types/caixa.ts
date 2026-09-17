import type { TipoMetodoPagamento } from './empresa'

export type { TipoMetodoPagamento }

/** #488/#487 (V0.12.0) — Caixa/PDV, Epic #416. */
export type StatusCaixaTurno = 'ABERTO' | 'FECHADO'
export type StatusVendaCaixa = 'CONCLUIDA' | 'CANCELADA'
export type TipoCaixaMovimento = 'SANGRIA' | 'SUPRIMENTO'
export type TipoDescontoCaixa = 'PERCENTUAL' | 'VALOR'

export interface CaixaTurnoResponse {
  id: string
  dataAbertura: string
  valorAbertura: number
  dataFechamento?: string | null
  valorFechamentoEsperado?: number | null
  valorFechamentoInformado?: number | null
  diferenca?: number | null
  status: StatusCaixaTurno
}

export interface AbrirCaixaTurnoRequest {
  valorAbertura: number
}

export interface FecharCaixaTurnoRequest {
  valorFechamentoInformado: number
}

export interface CaixaMovimentoResponse {
  id: string
  tipo: TipoCaixaMovimento
  valor: number
  motivo: string
  dataMovimento: string
  responsavelId: string
}

export interface CaixaMovimentoRequest {
  tipo: TipoCaixaMovimento
  valor: number
  motivo: string
}

export interface VendaCaixaItemRequest {
  produtoId: string
  quantidade: number
}

export interface VendaCaixaPagamentoRequest {
  metodoPagamentoId: string
  valor: number
}

export interface VendaCaixaRequest {
  clienteId?: string
  itens: VendaCaixaItemRequest[]
  descontoTipo?: TipoDescontoCaixa
  descontoValor?: number
  pagamentos: VendaCaixaPagamentoRequest[]
  confirmarEstoqueNegativoProdutoIds?: string[]
}

export interface CancelarVendaCaixaRequest {
  cancelamentoMotivo: string
}

export interface VendaCaixaItemResponse {
  id: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export interface VendaCaixaPagamentoResponse {
  id: string
  metodoPagamentoId: string
  valor: number
}

export interface VendaCaixaResponse {
  id: string
  numero: number
  identificador: string
  clienteId?: string | null
  dataVenda: string
  caixaTurnoId: string
  status: StatusVendaCaixa
  subtotal: number
  descontoTipo?: TipoDescontoCaixa | null
  descontoValor?: number | null
  total: number
  troco?: number | null
  cancelamentoMotivo?: string | null
  itens: VendaCaixaItemResponse[]
  pagamentos: VendaCaixaPagamentoResponse[]
}

/** RN-052 — mesmo shape de `ConfirmacaoEstoqueNegativoResponse` do backend (Orçamento/Produção),
 * reaproveitado por #487. `vinculosOrfaos` nunca é usado pelo Caixa (específico de Produção). */
export interface AvisoEstoqueNegativoResponse {
  componenteId: string
  nome: string
  estoqueAtual: number
  quantidadeNecessaria: number
  mensagem: string
}

export interface ConfirmacaoEstoqueNegativoResponse {
  avisos: AvisoEstoqueNegativoResponse[]
  vinculosOrfaos: unknown[] | null
}

/** Union de resposta de `POST /caixa/vendas` — distinguido pela presença de `avisos`. */
export type RegistrarVendaResultado = VendaCaixaResponse | ConfirmacaoEstoqueNegativoResponse

export function ehAvisoEstoqueNegativo(r: RegistrarVendaResultado): r is ConfirmacaoEstoqueNegativoResponse {
  return Array.isArray((r as ConfirmacaoEstoqueNegativoResponse).avisos)
}
