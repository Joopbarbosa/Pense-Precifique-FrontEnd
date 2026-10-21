import { useEffect, useState } from 'react'
import Spinner from '../ui/Spinner'
import { orcamentoService } from '../../services/orcamentoService'
import { STATUS_LABEL } from '../../constants'
import { BRL } from '../venda/formato'
import { formatarData } from '../../utils/data'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'

/**
 * V0.18.0 (#1035, RN-NOVA-7) — dados do orçamento no detalhe do compromisso: número, cliente, status atual, prazo de produção,
 * valor total, entrega estimada e "Sinal até". Os comentários e o botão do próximo passo entram nas tarefas #1038 e #1037.
 */
export default function PainelOrcamento({ orcamentoId, orcamento, onCarregado }: {
  orcamentoId: string
  /** Quando quem abriu o painel já tem o orçamento carregado (por exemplo, depois de avançar o status). */
  orcamento?: OrcamentoDetalheResponse | null
  onCarregado?: (o: OrcamentoDetalheResponse) => void
}) {
  const [carregado, setCarregado] = useState<OrcamentoDetalheResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    orcamentoService.buscarPorId(orcamentoId)
      .then(o => { if (vivo) { setCarregado(o); onCarregado?.(o) } })
      .catch(() => { if (vivo) setErro('Não foi possível carregar o orçamento.') })
    return () => { vivo = false }
  }, [orcamentoId]) // eslint-disable-line react-hooks/exhaustive-deps
  const o = orcamento ?? carregado
  if (erro) return <p className="text-sm text-danger">{erro}</p>
  if (!o) return <div className="flex justify-center py-3"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-card border border-line bg-cream px-4 py-3 text-sm text-body" data-testid="painel-orcamento">
      <dt className="font-semibold text-dark">Cliente</dt><dd>{o.nomeCliente}</dd>
      <dt className="font-semibold text-dark">Status</dt><dd>{STATUS_LABEL[o.status]}</dd>
      <dt className="font-semibold text-dark">Prazo</dt>
      <dd>{o.prazoProducaoDias != null ? `${o.prazoProducaoDias} ${o.prazoProducaoDias === 1 ? 'dia' : 'dias'}` : 'Sem prazo de produção'}</dd>
      {o.dataEntregaEstimada && (<><dt className="font-semibold text-dark">Entrega</dt><dd>{formatarData(o.dataEntregaEstimada)}</dd></>)}
      {o.sinalAtivo && o.sinalAte && (<><dt className="font-semibold text-dark">Sinal até</dt><dd>{formatarData(o.sinalAte)}</dd></>)}
      <dt className="font-semibold text-dark">Valor total</dt><dd>{BRL(o.total)}</dd>
    </dl>
  )
}
