import type { StatusOrcamento } from '../types/orcamento'

/** Ordem única do ciclo de vida usada no filtro e na timeline (Cancelado é estado terminal à parte). */
export const ORDEM_CICLO_VIDA_ORCAMENTO: readonly Exclude<StatusOrcamento, 'CANCELADO'>[] = [
  'RASCUNHO',
  'ENVIADO',
  'APROVADO',
  'AGUARDANDO_SINAL',
  'SINAL_PAGO',
  'EM_PRODUCAO',
  'FINALIZADO',
  'PAGO',
  'ENTREGUE',
]

// RN-NOVA-10 (V0.10.0, #466, altera ORC-005) — ordem do ciclo de vida: Pago vem antes de Entregue
// (era o inverso). STATUS_LABEL é um mapa de rótulos; a sequência fica em ORDEM_CICLO_VIDA_ORCAMENTO.
export const STATUS_LABEL: Record<StatusOrcamento, string> = {
  RASCUNHO:         'Rascunho',
  ENVIADO:          'Enviado',
  APROVADO:         'Aprovado',
  AGUARDANDO_SINAL: 'Aguardando Sinal',
  SINAL_PAGO:       'Sinal Pago',
  EM_PRODUCAO:      'Em Produção',
  FINALIZADO:       'Finalizado',
  PAGO:             'Pago',
  ENTREGUE:         'Entregue',
  CANCELADO:        'Cancelado',
}
