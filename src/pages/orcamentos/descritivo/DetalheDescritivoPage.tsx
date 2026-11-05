import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Pencil, Send, ShoppingCart, XCircle } from 'lucide-react'
import AppLayout from '../../../components/layout/AppLayout'
import { Button, ModalShell, Spinner, StatusBadge } from '../../../components/ui'
import { Toast } from '../../../components/shared'
import { ClienteSelect, BRL } from '../../../components/venda'
import { orcamentoDescritivoService } from '../../../services/orcamentoDescritivoService'
import { useToast } from '../../../hooks/useToast'
import { extractApiError } from '../../../utils/apiError'
import { montarCorpoGerarVenda, quantidadeValida, validarGerarVenda } from '../../../utils/orcamentoDescritivo'
import { ROTULO_STATUS_DESCRITIVO } from './rotulos'
import type { DescritivoResponse, StatusDescritivo } from '../../../types/orcamentoDescritivo'
import type { ClienteResponse } from '../../../types/cliente'

/** V0.19.0 #382 (UC-NOVO-5) — detalhe do Descritivo: opções com preço de referência, PDF, enviar/cancelar e "Gerar orçamento de Venda". */
export default function DetalheDescritivoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [d, setD] = useState<DescritivoResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [modal, setModal] = useState(false)
  const [marcadas, setMarcadas] = useState<Record<string, string>>({})
  const [clienteVenda, setClienteVenda] = useState<ClienteResponse | null>(null)
  const [erroModal, setErroModal] = useState('')
  const { toast, setToast } = useToast()

  useEffect(() => {
    if (!id) return
    orcamentoDescritivoService.buscarPorId(id).then(setD)
      .catch(e => setToast(extractApiError(e, 'Não foi possível carregar o orçamento.')))
      .finally(() => setCarregando(false))
  }, [id, setToast])

  const mudar = async (status: StatusDescritivo) => {
    if (!id || ocupado) return
    if (status === 'CANCELADO' && !window.confirm('Cancelar este orçamento descritivo?')) return
    setOcupado(true)
    try { setD(await orcamentoDescritivoService.mudarStatus(id, status)) }
    catch (e) { setToast(extractApiError(e, 'Não foi possível mudar o status.')) }
    finally { setOcupado(false) }
  }

  const abrirModal = () => { setMarcadas({}); setClienteVenda(null); setErroModal(''); setModal(true) }

  const gerar = async () => {
    if (!id || !d || ocupado) return
    const itens: { opcaoId: string; quantidade: number }[] = []
    for (const [opcaoId, texto] of Object.entries(marcadas)) {
      const q = quantidadeValida(texto)
      if (q === null) { setErroModal('A quantidade deve ser um número inteiro de 1 a 100000.'); return }
      itens.push({ opcaoId, quantidade: q })
    }
    const bloqueio = validarGerarVenda(!!(d.clienteId || clienteVenda), itens.length)
    if (bloqueio) { setErroModal(bloqueio); return }
    setOcupado(true); setErroModal('')
    try {
      const venda = await orcamentoDescritivoService.gerarVenda(id, montarCorpoGerarVenda(d.clienteId ? undefined : clienteVenda?.id, itens))
      navigate(`/orcamentos/${venda.id}`)
    } catch (e) {
      setErroModal(extractApiError(e, 'Não foi possível gerar o orçamento de Venda.'))
    } finally { setOcupado(false) }
  }

  if (carregando) return <AppLayout active="orcamentos" compact><div className="flex justify-center py-[60px]"><Spinner /></div></AppLayout>
  if (!d) return <AppLayout active="orcamentos" compact><p className="text-muted">Orçamento não encontrado.</p><Toast message={toast} variant="error" /></AppLayout>

  const cancelado = d.status === 'CANCELADO'
  return (
    <AppLayout active="orcamentos" compact>
      <button type="button" onClick={() => navigate('/orcamentos/descritivos')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeft size={15} /> Orçamentos descritivos
      </button>
      <div className="mb-section flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">{d.identificador} — {d.titulo}</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Orçamento descritivo · {d.nomeCliente ?? 'Sem cliente'}</p>
        </div>
        <StatusBadge status={ROTULO_STATUS_DESCRITIVO[d.status]} />
      </div>
      <div className="mb-section flex flex-wrap gap-3">
        {d.status === 'RASCUNHO' && <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => navigate(`/orcamentos/descritivos/${d.id}/editar`)}>Editar</Button>}
        <Button variant="secondary" icon={<FileText size={16} />} onClick={() => navigate(`/orcamentos/descritivos/${d.id}/pdf`)}>Ver PDF</Button>
        {d.status === 'RASCUNHO' && <Button variant="secondary" icon={<Send size={16} />} disabled={ocupado} onClick={() => mudar('ENVIADO')}>Marcar como enviado</Button>}
        {!cancelado && <Button icon={<ShoppingCart size={16} />} onClick={abrirModal}>Gerar orçamento de Venda</Button>}
        {!cancelado && <Button variant="danger" icon={<XCircle size={16} />} disabled={ocupado} onClick={() => mudar('CANCELADO')}>Cancelar</Button>}
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <div className="grid grid-cols-[1fr_1fr_140px_140px] gap-3 border-b border-line bg-cream px-5 py-2.5 text-xs font-semibold uppercase text-muted max-[860px]:hidden">
          <span>Opção</span><span>Quantidade / unidade</span><span>Preço de referência</span><span>Preço atual</span>
        </div>
        {d.opcoes.map(o => (
          <div key={o.id} data-testid="opcao-detalhe" className="grid grid-cols-[1fr_1fr_140px_140px] gap-3 border-b border-line px-5 py-3 text-sm last:border-b-0 max-[860px]:grid-cols-1">
            <span className="font-semibold text-dark">{o.nome}</span>
            <span className="text-muted">{o.quantidadeUnidade ?? '—'}</span>
            <span>{BRL(o.precoReferencia)}</span>
            <span className="text-muted">{o.precoAtual != null ? BRL(o.precoAtual) : '—'}</span>
          </div>
        ))}
      </div>
      {d.observacoes && <p className="mt-4 text-sm text-body">{d.observacoes}</p>}

      <ModalShell open={modal} onClose={() => setModal(false)} title="Gerar orçamento de Venda" subtitle="Marque o que o cliente escolheu"
        icon={<ShoppingCart size={18} />} width={680}
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={gerar} disabled={ocupado}>{ocupado ? 'Gerando…' : 'Gerar orçamento'}</Button></>}>
        <p className="mt-0 text-sm text-muted">A Venda nasce em Rascunho com o preço atual do cadastro, não com o preço de referência. Este orçamento descritivo não muda.</p>
        {!d.clienteId && (
          <div className="mb-4">
            <div className="mb-2 text-[13.5px] font-semibold text-body">Cliente da Venda</div>
            <ClienteSelect cliente={clienteVenda} onSelect={setClienteVenda} onClear={() => setClienteVenda(null)} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          {d.opcoes.map(o => {
            const marcada = o.id in marcadas
            return (
              <div key={o.id} className="flex items-center gap-3 text-sm">
                <label className="flex flex-1 items-center gap-2">
                  <input type="checkbox" checked={marcada} aria-label={`Escolher ${o.nome}`}
                    onChange={e => setMarcadas(m => { const n = { ...m }; if (e.target.checked) n[o.id] = '1'; else delete n[o.id]; return n })} />
                  <span>{o.nome} <span className="text-muted">({o.precoAtual != null ? BRL(o.precoAtual) : 'sem preço'})</span></span>
                </label>
                {marcada && (
                  <input value={marcadas[o.id]} inputMode="numeric" aria-label={`Quantidade de ${o.nome}`}
                    onChange={e => setMarcadas(m => ({ ...m, [o.id]: e.target.value }))}
                    className="h-9 w-20 rounded-input border border-line bg-white px-2 text-sm" />
                )}
              </div>
            )
          })}
        </div>
        {erroModal && <p role="alert" className="mb-0 mt-3 text-sm text-danger-deep">{erroModal}</p>}
      </ModalShell>
      <Toast message={toast} variant="error" />
    </AppLayout>
  )
}
