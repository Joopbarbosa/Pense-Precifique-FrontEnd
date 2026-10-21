import type { OrigemCompromisso } from '../../types/agenda'

/** Rótulo e cor (tokens do sistema) de cada origem do compromisso — o indicador visual da RN-NOVA-2. */
export const ORIGEM: Record<OrigemCompromisso, { rotulo: string; chip: string; ponto: string }> = {
  ORCAMENTO: { rotulo: 'Orçamento', chip: 'border-teal/40 bg-teal/20 text-teal-deep', ponto: 'bg-teal' },
  PRODUCAO: { rotulo: 'Produção', chip: 'border-purple/30 bg-purple/15 text-purple', ponto: 'bg-purple' },
  COMPRA: { rotulo: 'Compra', chip: 'border-azul/40 bg-azul/20 text-azul', ponto: 'bg-azul' },
  AVULSO: { rotulo: 'Avulso', chip: 'border-line-deep bg-line-soft text-body', ponto: 'bg-subtle' },
}
