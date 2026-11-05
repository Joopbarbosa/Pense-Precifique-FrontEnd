import type { StatusDescritivo } from '../../../types/orcamentoDescritivo'

export const ROTULO_STATUS_DESCRITIVO: Record<StatusDescritivo, 'Rascunho' | 'Enviado' | 'Cancelado'> = {
  RASCUNHO: 'Rascunho', ENVIADO: 'Enviado', CANCELADO: 'Cancelado',
}
