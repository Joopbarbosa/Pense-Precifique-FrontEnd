import type { OrigemCompromisso } from '../../types/agenda'

/** Rótulo e cor (tokens do sistema) de cada origem do compromisso — o indicador visual da RN-NOVA-2. */
export const ORIGEM: Record<OrigemCompromisso, { rotulo: string; chip: string; ponto: string }> = {
  ORCAMENTO: { rotulo: 'Orçamento', chip: 'border-teal/30 bg-teal/10 text-teal-deep', ponto: 'bg-teal' },
  PRODUCAO: { rotulo: 'Produção', chip: 'border-orange/30 bg-orange/10 text-warning', ponto: 'bg-orange' },
  COMPRA: { rotulo: 'Compra', chip: 'border-azul/30 bg-azul/10 text-azul', ponto: 'bg-azul' },
  AVULSO: { rotulo: 'Avulso', chip: 'border-line-deep bg-cream text-body', ponto: 'bg-subtle' },
}
