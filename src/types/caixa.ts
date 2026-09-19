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
  /** #488 (V0.12.0) — preenchida só quando o fechamento teve diferença. */
  fechamentoJustificativa?: string | null
  status: StatusCaixaTurno
}

export interface AbrirCaixaTurnoRequest {
  valorAbertura: number
}

export interface FecharCaixaTurnoRequest {
  valorFechamentoInformado: number
  /** Obrigatória (mín. 30 caracteres) só quando o valor informado diverge do esperado — regra
   *  condicional validada no backend; aqui é só o transporte. */
  justificativa?: string
}

/** #488 (V0.12.0) — prévia do fechamento, sem persistir nada (padrão `simular-*`). O Frontend
 *  precisa do valor esperado ANTES de enviar o fechamento pra saber se deve exigir a justificativa. */
export interface FechamentoPreviaResponse {
  valorAbertura: number
  suprimentos: number
  sangrias: number
  vendasDinheiro: number
  valorEsperado: number
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

export interface VendaCaixaItemCustomizacaoRequest {
  produtoId: string
  quantidade: number
}

/** Origem XOR (reabertura de RN-NOVA-1, achado do teste manual): `itemCatalogoId` OU `produtoId`,
 *  nunca os dois. `customizacoes` funciona para as duas origens (soma-se às fixas do Catálogo,
 *  expandidas automaticamente pelo Backend). */
export interface VendaCaixaItemRequest {
  itemCatalogoId?: string
  produtoId?: string
  quantidade: number
  customizacoes?: VendaCaixaItemCustomizacaoRequest[]
}

export interface VendaCaixaPagamentoRequest {
  metodoPagamentoId: string
  valor: number
  /** #506 (V0.12.0) — só aceito em Cartão de Crédito com parcelamento configurado (>1). O
   *  Backend resolve e congela a taxa aplicada sozinho (`VendaCaixaService#resolverTaxaAplicada`)
   *  — o Frontend nunca calcula nem envia taxa. */
  parcelas?: number
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
  /** #497 (V0.12.0) — reautenticação: senha da usuária logada, evita cancelamento num caixa
   *  desatendido sem derrubar a sessão nem o turno aberto. */
  senha: string
  /** #497 (V0.12.0) — até então o estoque sempre voltava; agora é escolha explícita (produto
   *  danificado/perdido não deve voltar). */
  retornarEstoque: boolean
}

export interface VendaCaixaItemCustomizacaoResponse {
  id: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export interface VendaCaixaItemResponse {
  id: string
  produtoId: string
  produtoNome: string
  itemCatalogoId?: string | null
  quantidade: number
  precoUnitario: number
  subtotal: number
  customizacoes: VendaCaixaItemCustomizacaoResponse[]
}

export interface VendaCaixaPagamentoResponse {
  id: string
  metodoPagamentoId: string
  valor: number
  parcelas?: number | null
  taxaPercentualAplicada?: number | null
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
