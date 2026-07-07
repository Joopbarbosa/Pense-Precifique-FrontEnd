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
  margemAplicada?: number;
  precoUnitario?: number;
  quantidade: number;
  customizacoes: OrcamentoItemCustomizacaoRequest[];
}

export interface ItemCatalogoBuscaResponse {
  id: string;
  nomeProduto: string;
  precoVenda: number;
  catalogoNome: string;
  catalogoNumero: number;
}

export interface OrcamentoRequest {
  clienteId: string;
  itens: OrcamentoItemRequest[];
  metodoPagamento: MetodoPagamento;
  metodoPagamentoObs?: string;
  prazoProducaoDias: number;
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
  produtoId: string;
  nomeProduto: string;
  margemAplicada?: number;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  customizacoes: OrcamentoItemCustomizacaoResponse[];
}

export interface OrcamentoResponse {
  id: string;
  numero: number;
  nomeCliente: string;
  status: StatusOrcamento;
  total: number;
  dataValidade?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrcamentoDetalheResponse {
  id: string;
  numero: number;
  clienteId: string;
  nomeCliente: string;
  status: StatusOrcamento;
  metodoPagamento: MetodoPagamento;
  metodoPagamentoObs?: string;
  prazoProducaoDias: number;
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
  estornoSinal?: boolean;
  dataEstornoSinal?: string;
  itens: OrcamentoItemResponse[];
  createdAt: string;
  updatedAt: string;
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
}

export type PageResponse<T> = {
  content: T[]
  number: number
  size: number
  totalElements: number
  last: boolean
}
