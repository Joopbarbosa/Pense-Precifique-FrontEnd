import type { Compromisso } from '../../types/agenda'
import PainelOrcamento from './PainelOrcamento'
import PainelProducao from './PainelProducao'
import PainelCompra from './PainelCompra'

/** V0.18.0 (RN-NOVA-7) — o painel de dados da origem do compromisso aberto: orçamento, produção, compra ou da usuária. */
export default function PainelDaOrigem({ compromisso: c, onAlterado }: { compromisso: Compromisso; onAlterado: () => void }) {
  if (c.origem === 'ORCAMENTO') return <PainelOrcamento orcamentoId={c.referenciaId} />
  if (c.origem === 'PRODUCAO') return <PainelProducao producaoId={c.referenciaId} />
  if (c.origem === 'COMPRA') return <PainelCompra compraId={c.referenciaId} onAlterada={onAlterado} />
  return null
}
