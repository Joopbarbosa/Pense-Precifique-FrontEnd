import type { StatusOrcamento } from '../types/orcamento'

// RN-NOVA-10 (V0.10.0, #466, altera ORC-005) — ordem do ciclo de vida: Pago vem antes de Entregue
// (era o inverso). Record não depende de ordem para lookup, mas mantém consistente com STEPS
// (DetalheOrcamentoPage.tsx) para quem usar Object.keys/values como sequência.
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
