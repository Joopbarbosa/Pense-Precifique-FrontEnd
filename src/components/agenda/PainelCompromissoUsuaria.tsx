import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, Ban } from 'lucide-react'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import ModalShell from '../ui/ModalShell'
import TextArea from '../ui/TextArea'
import SegmentedControl from '../ui/SegmentedControl'
import ModalEvento from './ModalEvento'
import { agendaService } from '../../services/agendaService'
import { extractApiError } from '../../utils/apiError'
import type { Compromisso, CompromissoUsuariaDetalhe, EscopoEdicao } from '../../types/agenda'

const SITUACAO = { PENDENTE: 'Pendente', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' } as const

/**
 * V0.18.0 (#1039, RN-NOVA-7 e RN-NOVA-21) — o compromisso da usuária no detalhe: vínculos com orçamento e insumo (o insumo excluído ou
 * inativado mostra "Insumo removido" no lugar do link), a observação do cancelamento e as ações Concluir (sempre de uma ocorrência),
 * Editar e Cancelar. Em compromisso de série, Editar e Cancelar perguntam: só esta ocorrência ou a série inteira.
 */
export default function PainelCompromissoUsuaria({ compromisso, onAlterado }: { compromisso: Compromisso; onAlterado: () => void }) {
  const navigate = useNavigate()
  const dataOriginal = compromisso.dataOriginalOcorrencia ?? compromisso.dataOrigem
  const [detalhe, setDetalhe] = useState<CompromissoUsuariaDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<null | { acao: 'editar' | 'cancelar'; escopo: EscopoEdicao; escolhendo: boolean }>(null)
  const [observacao, setObservacao] = useState('')
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    agendaService.detalheCompromisso(compromisso.referenciaId, dataOriginal)
      .then(d => { if (vivo) setDetalhe(d) })
      .catch(() => { if (vivo) setErro('Não foi possível carregar o compromisso.') })
    return () => { vivo = false }
  }, [compromisso.referenciaId, dataOriginal])

  if (erro) return <p className="text-sm text-danger">{erro}</p>
  if (!detalhe) return <div className="flex justify-center py-3"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
  const d = detalhe
  const pendente = d.situacao === 'PENDENTE'

  const iniciar = (acao: 'editar' | 'cancelar') => { setErroAcao(null); setObservacao(''); setEtapa({ acao, escopo: 'OCORRENCIA', escolhendo: d.serie }) }
  const concluir = async () => {
    setSalvando(true); setErroAcao(null)
    try { await agendaService.concluirCompromisso(d.id, d.dataOriginal); onAlterado() }
    catch (err) { setErroAcao(extractApiError(err, 'Não foi possível concluir o compromisso.')) }
    finally { setSalvando(false) }
  }
  const cancelar = async () => {
    if (!etapa) return
    setSalvando(true); setErroAcao(null)
    try { await agendaService.cancelarCompromisso(d.id, d.dataOriginal, etapa.escopo, observacao); setEtapa(null); onAlterado() }
    catch (err) { setErroAcao(extractApiError(err, 'Não foi possível cancelar o compromisso.')) }
    finally { setSalvando(false) }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="painel-compromisso-usuaria">
      <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-card border border-line bg-cream px-4 py-3 text-sm text-body">
        <dt className="font-semibold text-dark">Situação</dt><dd>{SITUACAO[d.situacao]}</dd>
        {d.serie && (<><dt className="font-semibold text-dark">Repetição</dt><dd>{d.recorrencia === 'SEMANAL' ? 'Semanal' : 'Mensal'}{d.quantidadeOcorrencias ? `, ${d.quantidadeOcorrencias} ocorrências` : ', sem fim'}</dd></>)}
        {d.orcamento && (
          <><dt className="font-semibold text-dark">Orçamento</dt>
            <dd><button type="button" className="border-none bg-transparent p-0 font-[inherit] font-semibold text-teal underline" onClick={() => navigate(`/orcamentos/${d.orcamento!.id}`)}>{d.orcamento.identificador}</button> — {d.orcamento.cliente}</dd></>
        )}
        {d.insumo && (
          <><dt className="font-semibold text-dark">Insumo</dt>
            <dd data-testid="vinculo-insumo">{d.insumo.removido ? 'Insumo removido' : (
              <button type="button" className="border-none bg-transparent p-0 font-[inherit] font-semibold text-teal underline" onClick={() => navigate(`/insumos/${d.insumo!.id}`)}>{d.insumo.nome}</button>)}</dd></>
        )}
        {d.observacaoCancelamento && (<><dt className="font-semibold text-dark">Observação</dt><dd data-testid="observacao-cancelamento">{d.observacaoCancelamento}</dd></>)}
      </dl>
      {erroAcao && !etapa && <p className="text-[13px] text-danger" role="alert">{erroAcao}</p>}
      {pendente && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Check size={14} />} disabled={salvando} onClick={concluir}>Concluir</Button>
          <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => iniciar('editar')}>Editar</Button>
          <Button variant="danger" size="sm" icon={<Ban size={14} />} onClick={() => iniciar('cancelar')}>Cancelar</Button>
        </div>
      )}

      {etapa?.escolhendo && (
        <ModalShell open onClose={() => setEtapa(null)} width={420} title={etapa.acao === 'editar' ? 'Editar compromisso' : 'Cancelar compromisso'}
          subtitle="Este compromisso se repete."
          footer={<><Button variant="ghost" onClick={() => setEtapa(null)}>Fechar</Button><Button onClick={() => setEtapa({ ...etapa, escolhendo: false })}>Continuar</Button></>}>
          <SegmentedControl options={[{ value: 'OCORRENCIA' as EscopoEdicao, label: 'Só esta ocorrência' }, { value: 'SERIE' as EscopoEdicao, label: 'A série inteira' }]}
            value={etapa.escopo} onChange={escopo => setEtapa({ ...etapa, escopo })} height="h-11" textSize="text-sm"
            activeColors={['bg-teal text-white', 'bg-teal text-white']} />
        </ModalShell>
      )}
      {etapa && !etapa.escolhendo && etapa.acao === 'editar' && (
        <ModalEvento edicao={d} escopo={etapa.escopo} onClose={() => setEtapa(null)} onSalvo={() => { setEtapa(null); onAlterado() }} />
      )}
      {etapa && !etapa.escolhendo && etapa.acao === 'cancelar' && (
        <ModalShell open onClose={() => setEtapa(null)} width={480} title={etapa.escopo === 'SERIE' ? 'Cancelar a série inteira' : 'Cancelar compromisso'}
          footer={<><Button variant="ghost" onClick={() => setEtapa(null)}>Fechar</Button><Button variant="danger" disabled={salvando} onClick={cancelar}>{salvando ? 'Cancelando...' : 'Cancelar compromisso'}</Button></>}>
          <TextArea value={observacao} onChange={setObservacao} rows={3} minimo={30} ariaLabel="Observação do cancelamento"
            placeholder="Conte por que está cancelando" erro={erroAcao ?? undefined} />
        </ModalShell>
      )}
    </div>
  )
}
