import type { StatusOrcamento } from '../types/orcamento'

export const STATUS_LABEL: Record<StatusOrcamento, string> = {
  RASCUNHO:         'Rascunho',
  ENVIADO:          'Enviado',
  APROVADO:         'Aprovado',
  AGUARDANDO_SINAL: 'Aguardando Sinal',
  SINAL_PAGO:       'Sinal Pago',
  EM_PRODUCAO:      'Em Produção',
  FINALIZADO:       'Finalizado',
  ENTREGUE:         'Entregue',
  PAGO:             'Pago',
  CANCELADO:        'Cancelado',
}
