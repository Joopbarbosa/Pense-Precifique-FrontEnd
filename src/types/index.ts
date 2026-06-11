export type TipoProduto = 'PRODUTO' | 'PRODUTO_BASE' | 'CUSTOMIZACAO'

export type StatusOrcamento =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'APROVADO'
  | 'AGUARDANDO_SINAL'
  | 'SINAL_PAGO'
  | 'EM_PRODUCAO'
  | 'FINALIZADO'
  | 'ENTREGUE'
  | 'PAGO'
  | 'CANCELADO'

export type MotivoMovimentacao =
  | 'PRODUCAO'
  | 'ORCAMENTO'
  | 'PERDA'
  | 'AVARIA'
  | 'USO_EXTRA'
  | 'CORRECAO_ESTOQUE'
  | 'OUTRO'
