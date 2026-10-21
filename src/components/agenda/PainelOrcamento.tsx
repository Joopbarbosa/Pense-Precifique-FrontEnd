import { useEffect, useRef, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import Spinner from '../ui/Spinner'
import ModalEvento from './ModalEvento'
import Button from '../ui/Button'
import Toast from '../shared/Toast'
import ModaisAvancarStatus from '../orcamento/ModaisAvancarStatus'
import ComentariosOrcamento from '../orcamento/ComentariosOrcamento'
import { ACAO_AVANCAR_STATUS } from '../orcamento/acaoAvancarStatus'
import { useAvancarStatusOrcamento } from '../../hooks/useAvancarStatusOrcamento'
import { useToast } from '../../hooks/useToast'
import { orcamentoService } from '../../services/orcamentoService'
import { STATUS_LABEL } from '../../constants'
import { BRL } from '../venda/formato'
import { formatarData } from '../../utils/data'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'

/**
 * V0.18.0 (#1035 e #1037, RN-NOVA-7 e RN-NOVA-15) — dados do orçamento no detalhe do compromisso (número, cliente, status atual,
 * prazo, valor total, entrega estimada e "Sinal até") e o botão do próximo passo, com as mesmas regras e modais do Detalhe do
 * Orçamento (o fluxo extraído na #1050). A Agenda só avança o orçamento: cancelar fica no Detalhe do Orçamento. Depois de avançar, a
 * Agenda recarrega para refletir os compromissos novos.
 */
export default function PainelOrcamento({ orcamentoId, onAlterado }: { orcamentoId: string; onAlterado: () => void }) {
  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [novoEvento, setNovoEvento] = useState(false)
  const { toast, setToast } = useToast()
  const statusInicial = useRef<string | null>(null)
  const fluxo = useAvancarStatusOrcamento({ id: orcamentoId, orcamento, setOrcamento, setToast })

  useEffect(() => {
    let vivo = true
    orcamentoService.buscarPorId(orcamentoId)
      .then(o => { if (vivo) { statusInicial.current = o.status; setOrcamento(o) } })
      .catch(() => { if (vivo) setErro('Não foi possível carregar o orçamento.') })
    return () => { vivo = false }
  }, [orcamentoId])

  // o orçamento avançou pelo fluxo: a Agenda recarrega e o detalhe se fecha
  useEffect(() => {
    if (orcamento && statusInicial.current && orcamento.status !== statusInicial.current) onAlterado()
  }, [orcamento]) // eslint-disable-line react-hooks/exhaustive-deps

  if (erro) return <p className="text-sm text-danger">{erro}</p>
  if (!orcamento) return <div className="flex justify-center py-3"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
  const o = orcamento
  const acao = ACAO_AVANCAR_STATUS[o.status]
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-card border border-line bg-cream px-4 py-3 text-sm text-body" data-testid="painel-orcamento">
        <dt className="font-semibold text-dark">Cliente</dt><dd>{o.nomeCliente}</dd>
        <dt className="font-semibold text-dark">Status</dt><dd data-testid="status-orcamento">{STATUS_LABEL[o.status]}</dd>
        <dt className="font-semibold text-dark">Prazo</dt>
        <dd>{o.prazoProducaoDias != null ? `${o.prazoProducaoDias} ${o.prazoProducaoDias === 1 ? 'dia' : 'dias'}` : 'Sem prazo de produção'}</dd>
        {o.dataEntregaEstimada && (<><dt className="font-semibold text-dark">Entrega</dt><dd>{formatarData(o.dataEntregaEstimada)}</dd></>)}
        {o.sinalAtivo && o.sinalAte && (<><dt className="font-semibold text-dark">Sinal até</dt><dd>{formatarData(o.sinalAte)}</dd></>)}
        <dt className="font-semibold text-dark">Valor total</dt><dd>{BRL(o.total)}</dd>
      </dl>
      {fluxo.erroAvanco && <p className="rounded-card border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-danger-deep" role="alert">{fluxo.erroAvanco}</p>}
      {acao && (
        <div>
          <Button variant="secondary" size="sm" disabled={fluxo.saving} onClick={fluxo.onPrimaryAction}>{fluxo.saving ? 'Processando...' : acao}</Button>
        </div>
      )}
      <div>
        <div className="mb-2 text-[13px] font-semibold text-dark">Comentários</div>
        <ComentariosOrcamento orcamentoId={orcamentoId} />
      </div>
      <div>
        <Button variant="ghost" size="sm" icon={<CalendarPlus size={14} />} onClick={() => setNovoEvento(true)}>Novo evento deste orçamento</Button>
      </div>
      {novoEvento && (
        <ModalEvento vinculoInicial={{ orcamento: { id: o.id, identificador: `ORC-${o.numero}` } }} onClose={() => setNovoEvento(false)}
          onSalvo={() => { setNovoEvento(false); onAlterado() }} />
      )}
      <ModaisAvancarStatus orcamento={o} fluxo={fluxo} />
      <Toast message={toast} />
    </div>
  )
}
