import type { AvisoEstoqueNegativo } from './producao';

export type StatusOrcamento =
  'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'AGUARDANDO_SINAL' |
  'SINAL_PAGO' | 'EM_PRODUCAO' | 'FINALIZADO' | 'ENTREGUE' | 'PAGO' | 'CANCELADO';

export type MetodoPagamento =
  'PIX' | 'DINHEIRO' | 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'BOLETO' | 'OUTRO';

export interface OrcamentoItemCustomizacaoRequest {
  produtoId: string;
  quantidade: number;
}

export interface OrcamentoItemRequest {
  itemCatalogoId?: string;
  produtoId?: string;
  precoUnitario?: number;
  quantidade: number;
  customizacoes: OrcamentoItemCustomizacaoRequest[];
}

export interface ItemCatalogoBuscaResponse {
  id: string;
  produtoId: string;
  nomeProduto: string;
  precoVenda: number;
  catalogoNome: string;
  catalogoNumero: number;
  algumInsumoNaoFracionavel: boolean;
  permitirEstoqueNegativo: boolean;
  estoqueAtual: number;
}

// #218 — POST /orcamentos/simular-alertas (RN-NOVA-8/9): simula situação de estoque por Produto
// sem persistir, mesmo XOR itemCatalogoId/produtoId do item de orçamento (ORC-020).
export interface SimularAlertasOrcamentoItemRequest {
  itemCatalogoId?: string;
  produtoId?: string;
  quantidade: number;
}

export type SituacaoAlertaInsumo = 'SUFICIENTE' | 'AVISO' | 'BLOQUEIO_FUTURO';

export interface SimulacaoEstoqueProdutoResponse {
  produtoId: string;
  nomeProduto: string;
  estoqueAtual: number;
  quantidadeNecessaria: number;
  permitirEstoqueNegativo: boolean;
  situacao: SituacaoAlertaInsumo;
}

export interface OrcamentoRequest {
  clienteId: string;
  itens: OrcamentoItemRequest[];
  metodoPagamento: MetodoPagamento;
  metodoPagamentoObs?: string;
  temPrazoProducao: boolean;
  prazoProducaoDias?: number;
  inicioAssimQueAprovado: boolean;
  dataInicioEstimada?: string;
  sinalAtivo: boolean;
  percentualSinal?: number;
  valorSinal?: number;
  tipoDesconto?: string;
  descontoValor?: number;
  observacoes?: string;
  dataValidade?: string;
}

export interface OrcamentoItemCustomizacaoResponse {
  id: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OrcamentoItemResponse {
  id: string;
  itemCatalogoId?: string;
  catalogoIdentificador?: string;
  catalogoNome?: string;
  produtoId: string;
  nomeProduto: string;
  margemAplicada?: number;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  customizacoes: OrcamentoItemCustomizacaoResponse[];
  algumInsumoNaoFracionavel: boolean;
  permitirEstoqueNegativo: boolean;
  estoqueAtual: number;
}

export interface OrcamentoResponse {
  id: string;
  numero: number;
  identificador: string;
  nomeCliente: string;
  status: StatusOrcamento;
  total: number;
  dataValidade?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvisoEstoque {
  produtoId: string;
  nomeProduto: string;
  estoqueAtual: number;
  quantidadeNecessaria: number;
  mensagem: string;
}

export interface ItemSemEstoque {
  produtoId: string;
  identificador: string;
  nomeProduto: string;
  quantidadeSolicitada: number;
  estoqueAtual: number;
  quantidadeFaltante: number;
}

export interface OrcamentoDetalheResponse {
  id: string;
  numero: number;
  clienteId: string;
  nomeCliente: string;
  status: StatusOrcamento;
  metodoPagamento: MetodoPagamento;
  metodoPagamentoObs?: string;
  prazoProducaoDias?: number;
  inicioAssimQueAprovado: boolean;
  dataInicioEstimada?: string;
  dataAprovacao?: string;
  sinalAtivo: boolean;
  percentualSinal?: number;
  valorSinal?: number;
  dataSinalPago?: string;
  metodoSinalRecebido?: MetodoPagamento;
  subtotal: number;
  tipoDesconto?: string;
  descontoValor?: number;
  total: number;
  observacoes?: string;
  dataValidade?: string;
  percentualMulta?: number;
  valorMulta?: number;
  estornoSinal?: boolean;
  dataEstornoSinal?: string;
  itens: OrcamentoItemResponse[];
  createdAt: string;
  updatedAt: string;
  avisosEstoque?: AvisoEstoque[];
}

export interface AvancaStatusRequest {
  metodoSinalRecebido?: MetodoPagamento;
  metodoSinalRecebidoObs?: string;
  motivoCancelamento?: string;
  tipoCancelamento?: string;
  percentualMulta?: number;
  estornarSinal?: boolean;
  dataEstornoSinal?: string;
  justificativa?: string;
  confirmarEstoqueNegativoProdutoIds?: string[];
  // RN-NOVA-2 (revisada, P-B012) — true força o case ENVIADO a ignorar o atalho de aprovação
  // direta mesmo elegível, seguindo o fluxo normal (status vai para APROVADO).
  ignorarAtalhoAprovacaoDireta?: boolean;
}

// RN-NOVA-2 (revisada, P-B012) — resultado de simular POST /orcamentos/{id}/avancar-status sem
// persistir nada. statusResultante é o que a chamada real produziria: FINALIZADO (atalho aplicável)
// ou APROVADO (fluxo normal). avisosEstoque só vem preenchido quando o atalho aplicaria mas a baixa
// deixaria algum produto negativo ainda não confirmado (mesmo shape de AvisoEstoqueNegativo/
// ConfirmacaoEstoqueNegativoResponse já usado em EM_PRODUCAO→FINALIZADO).
export interface SimulacaoAvancoStatusResponse {
  statusAtual: StatusOrcamento;
  statusResultante: StatusOrcamento;
  atalhoAplicavel: boolean;
  avisosEstoque: AvisoEstoqueNegativo[];
}

