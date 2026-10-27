import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import Spinner from '../ui/Spinner'
import ModalEvento from './ModalEvento'
import Button from '../ui/Button'
import Toast from '../shared/Toast'
import ModaisAvancarStatus from '../orcamento/ModaisAvancarStatus'
import ComentariosOrcamento from '../orcamento/ComentariosOrcamento'
import { rotuloAcaoAvancar } from '../orcamento/acaoAvancarStatus'
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
export default function PainelOrcamento({ orcamentoId, tipo, onAlterado }: { orcamentoId: string; tipo?: string; onAlterado: () => void }) {
  const navigate = useNavigate()
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
  const acao = rotuloAcaoAvancar(o.status, fluxo.precisaVincularProducao, fluxo.temVinculo)
  // #1108 — o painel ganha a cor do tipo do compromisso: entrega em verde-água, dinheiro a receber em laranja
  const destaque = tipo === 'ENTREGA_ESTIMADA' ? 'border-teal/30 bg-teal/[0.08]'
    : tipo === 'SINAL_A_RECEBER' || tipo === 'SALDO_A_RECEBER' ? 'border-orange/30 bg-orange/[0.08]'
    : 'border-line bg-cream'
  return (
    <div className="flex flex-col gap-3">
      <dl className={clsx("grid grid-cols-[110px_1fr] gap-y-2 rounded-card border px-4 py-3 text-sm text-body", destaque)} data-testid="painel-orcamento">
        <dt className="font-semibold text-dark">Cliente</dt><dd>{o.nomeCliente}</dd>
        <dt className="font-semibold text-dark">Status</dt><dd data-testid="status-orcamento">{STATUS_LABEL[o.status]}</dd>
        <dt className="font-semibold text-dark">Prazo</dt>
        <dd>{o.prazoProducaoDias != null ? `${o.prazoProducaoDias} ${o.prazoProducaoDias === 1 ? 'dia' : 'dias'}` : 'Sem prazo de produção'}</dd>
        {o.dataEntregaEstimada && (<><dt className="font-semibold text-dark">Entrega</dt><dd>{formatarData(o.dataEntregaEstimada)}</dd></>)}
        {o.sinalAtivo && o.sinalAte && (<><dt className="font-semibold text-dark">Sinal até</dt><dd>{formatarData(o.sinalAte)}</dd></>)}
        <dt className="font-semibold text-dark">Valor total</dt><dd>{BRL(o.total)}</dd>
        <dt className="font-semibold text-dark">Produtos</dt>
        <dd data-testid="produtos-orcamento">
          <ul className="flex flex-col gap-0.5">
            {o.itens.map(i => (
              <li key={i.id}>
                {i.quantidade}× {i.catalogoNome ?? i.nomeProduto}
                {i.customizacoes.length > 0 && <span className="text-muted"> — {i.customizacoes.map(c => c.nomeProduto).join(', ')}</span>}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      {fluxo.erroAvanco && <p className="rounded-card border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-danger-deep" role="alert">{fluxo.erroAvanco}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {acao && (
          <Button variant="secondary" size="sm" disabled={fluxo.saving} onClick={fluxo.onPrimaryAction}>{fluxo.saving ? 'Processando...' : acao}</Button>
        )}
        <Button variant="ghost" size="sm" icon={<CalendarPlus size={14} />} onClick={() => setNovoEvento(true)}>Novo evento deste orçamento</Button>
        <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate(`/orcamentos/${o.id}`)}>Abrir orçamento</Button>
      </div>
      <div>
        <div className="mb-2 text-[13px] font-semibold text-dark">Comentários</div>
        <ComentariosOrcamento orcamentoId={orcamentoId} />
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
