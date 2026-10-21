import type { StatusOrcamento } from '../../types/orcamento'

/**
 * Rótulo do botão principal de cada status (o próximo passo do orçamento) — mesmo texto no Detalhe do Orçamento e no detalhe
 * do compromisso da Agenda (#1037, RN-NOVA-15). RN-NOVA-10 (V0.10.0, #466): FINALIZADO leva a PAGO e PAGO leva a ENTREGUE.
 */
export const ACAO_AVANCAR_STATUS: Partial<Record<StatusOrcamento, string>> = {
  RASCUNHO: 'Enviar orçamento',
  ENVIADO: 'Marcar como aprovado',
  APROVADO: 'Confirmar início',
  AGUARDANDO_SINAL: 'Confirmar recebimento do sinal',
  SINAL_PAGO: 'Iniciar produção',
  EM_PRODUCAO: 'Marcar como finalizado',
  FINALIZADO: 'Confirmar pagamento',
  PAGO: 'Marcar como entregue',
}
