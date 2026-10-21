import type { Compromisso } from '../../types/agenda'
import PainelOrcamento from './PainelOrcamento'

/** V0.18.0 (RN-NOVA-7) — o painel de dados da origem do compromisso aberto: orçamento, produção, compra ou da usuária. */
export default function PainelDaOrigem({ compromisso: c }: { compromisso: Compromisso }) {
  if (c.origem === 'ORCAMENTO') return <PainelOrcamento orcamentoId={c.referenciaId} />
  return null
}
