import type { StatusOrcamento } from '../../types/orcamento'

/**
 * Rótulo do botão principal de cada status (o próximo passo do orçamento) — mesmo texto no Detalhe do Orçamento e no detalhe
 * do compromisso da Agenda (#1037, RN-NOVA-15). RN-NOVA-10 (V0.10.0, #466): FINALIZADO leva a PAGO e PAGO leva a ENTREGUE.
 */
export const ACAO_AVANCAR_STATUS: Partial<Record<StatusOrcamento, string>> = {
  RASCUNHO: 'Enviar orçamento',
  ENVIADO: 'Marcar como aprovado',
  APROVADO: 'Iniciar produção',
  AGUARDANDO_SINAL: 'Confirmar recebimento do sinal',
  SINAL_PAGO: 'Iniciar produção',
  EM_PRODUCAO: 'Marcar como finalizado',
  FINALIZADO: 'Confirmar pagamento',
  PAGO: 'Marcar como entregue',
}

/**
 * #1110 — no APROVADO sem sinal, a produção só começa com uma produção vinculada: sem vínculo o botão principal é "Vincular
 * produção" (abre a modal de vínculo); com vínculo, "Iniciar produção". Nos demais passos o rótulo é o da tabela.
 */
export function rotuloAcaoAvancar(status: string, precisaVincularProducao: boolean, temVinculo: boolean): string | undefined {
  if (status === 'APROVADO' && precisaVincularProducao && !temVinculo) return 'Vincular produção'
  return ACAO_AVANCAR_STATUS[status as StatusOrcamento]
}
