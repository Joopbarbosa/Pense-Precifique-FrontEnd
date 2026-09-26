import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, Ban, Check, ChevronRight, Copy, CreditCard, FileText, Pencil, Trash2 } from 'lucide-react'
import ModalCancelarCompra from '../../components/compra/ModalCancelarCompra'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, ModalShell, SegmentedControl } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import { NaoPagaBadge, StatusCompraBadge } from '../../components/compra/StatusCompraBadge'
import ModalImpactoCompra from '../../components/compra/ModalImpactoCompra'
import MetodoPagamentoEscolha from '../../components/compra/MetodoPagamentoEscolha'
import { formatarData, moeda4, qtd } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { compraService } from '../../services/compraService'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'
import type { CompraResponse, ImpactoCompraResponse } from '../../types/compra'

// V0.15.0 — detalhe da compra (#541, #550). RASCUNHO: editar, excluir, confirmar. CONFIRMADA: só o
// pagamento muda (Decisão 14). Cancelar e duplicar: #544 (RN-NOVA-9/10). PDF: #545 (RN-NOVA-11).

function Info({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-r border-line bg-white px-5 py-4">
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{titulo}</div>
      <div className="mt-1.5 text-[15px] font-semibold text-dark">{children}</div>
    </div>
  )
}

function ModalPagamento({ compra, onClose, onSalvo }: { compra: CompraResponse; onClose: () => void; onSalvo: (c: CompraResponse) => void }) {
  const [pago, setPago] = useState(compra.pago)
  const [metodoId, setMetodoId] = useState<string | null>(compra.metodoPagamento?.id ?? null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async () => {
    setSalvando(true); setErro(null)
    try {
      onSalvo(await compraService.atualizarPagamento(compra.id, pago, pago ? metodoId : null))
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível alterar o pagamento.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell open onClose={onClose} title="Alterar pagamento" subtitle={compra.identificador} icon={<CreditCard size={16} />} width={520}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar pagamento'}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[13px] text-muted">Numa compra confirmada, o pagamento é a única informação que ainda pode mudar.</p>
        <Field label="Pagamento" group size="md">
          <SegmentedControl options={[{ value: false, label: 'Não pago' }, { value: true, label: 'Pago' }]} value={pago}
            onChange={v => { setPago(v); if (!v) setMetodoId(null) }} />
        </Field>
        {pago && (
          <Field label="Como foi paga?" required group size="md">
            <MetodoPagamentoEscolha value={metodoId} onChange={setMetodoId} salvo={compra.metodoPagamento} />
          </Field>
        )}
        {erro && <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-2.5 text-[13px] text-danger-deep">{erro}</div>}
      </div>
    </ModalShell>
  )
}

export default function DetalheCompraPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, setToast } = useToast()

  const [compra, setCompra] = useState<CompraResponse | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [modal, setModal] = useState<'excluir' | 'confirmar' | 'pagamento' | 'cancelar' | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [impacto, setImpacto] = useState<{ titulo: string; impacto: ImpactoCompraResponse } | null>(null)

  // Por navegação (location.key), não só na montagem: duplicar leva de um detalhe a outro sem remontar.
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) { setToast(msg); navigate(location.pathname, { replace: true, state: null }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    if (!id) return
    setCompra(null); setErroCarga(null)
    compraService.buscar(id).then(setCompra).catch(err => setErroCarga(extractApiError(err, 'Não foi possível carregar a compra.')))
  }, [id])

  const excluir = async () => {
    if (!compra) return
    setProcessando(true)
    try {
      await compraService.excluirRascunho(compra.id)
      navigate('/compras', { state: { toast: `Rascunho ${compra.identificador} excluído.` } })
    } catch (err) {
      setToast(extractApiError(err, 'Não foi possível excluir o rascunho.'))
      setModal(null)
    } finally {
      setProcessando(false)
    }
  }

  const confirmar = async () => {
    if (!compra) return
    setModal(null); setProcessando(true); setErroAcao(null)
    try {
      const r = await compraService.confirmar(compra.id)
      setCompra(r.compra)
      setImpacto({ titulo: `Compra ${r.compra.identificador} confirmada`, impacto: r.impacto })
    } catch (err) {
      setErroAcao(extractApiError(err, 'Não foi possível confirmar a compra.'))
    } finally {
      setProcessando(false)
    }
  }

  const duplicar = async () => {
    if (!compra) return
    setProcessando(true)
    try {
      const nova = await compraService.duplicar(compra.id)
      navigate(`/compras/${nova.id}`, { state: { toast: `Rascunho ${nova.identificador} criado a partir de ${compra.identificador}. Revise e confirme.` } })
    } catch (err) {
      setToast(extractApiError(err, 'Não foi possível duplicar a compra.'))
    } finally {
      setProcessando(false)
    }
  }

  if (erroCarga || !compra) {
    return (
      <AppLayout active="compras" compact>
        {erroCarga ? (
          <>
            <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">{erroCarga}</div>
            <div className="mt-4"><Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras')}>Voltar</Button></div>
          </>
        ) : (
          <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando compra…</div>
        )}
      </AppLayout>
    )
  }

  const rascunho = compra.status === 'RASCUNHO'
  const confirmada = compra.status === 'CONFIRMADA'
  const posConfirmacao = compra.status !== 'RASCUNHO'
  const fornecedoresLinhas = Array.from(new Map(compra.itens.filter(i => i.fornecedor).map(i => [i.fornecedor!.id, i.fornecedor!])).values())

  return (
    <AppLayout active="compras" compact>
      <Toast message={toast} />

      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/compras')}>Minhas compras</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="font-semibold text-body">{compra.identificador}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-dark">Compra {compra.identificador}</h1>
            <StatusCompraBadge status={compra.status} />
            {confirmada && !compra.pago && <NaoPagaBadge />}
          </div>
          <div className="mt-1 text-sm text-muted">
            {rascunho ? 'Rascunho: estoque e custo ainda não foram alterados.' : confirmada ? `Confirmada em ${formatarData(compra.confirmadaEm)}` : `Cancelada em ${formatarData(compra.canceladaEm)}`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras')}>Voltar</Button>
          {rascunho && <>
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => setModal('excluir')}>Excluir</Button>
            <Button variant="ghost" icon={<Pencil size={16} />} onClick={() => navigate(`/compras/${compra.id}/editar`)}>Editar</Button>
            <Button variant="primary" icon={processando ? <Spinner size={15} /> : <Check size={16} />} disabled={processando} onClick={() => setModal('confirmar')}>
              Confirmar compra
            </Button>
          </>}
          <Button variant="ghost" icon={<FileText size={16} />} onClick={() => navigate(`/compras/${compra.id}/pdf`)}>PDF</Button>
          {posConfirmacao && (
            <Button variant="ghost" icon={processando ? <Spinner size={15} /> : <Copy size={16} />} disabled={processando} onClick={duplicar}>Duplicar</Button>
          )}
          {confirmada && <>
            <Button variant="ghost" icon={<CreditCard size={16} />} onClick={() => setModal('pagamento')}>Alterar pagamento</Button>
            <Button variant="danger" icon={<Ban size={16} />} onClick={() => setModal('cancelar')}>Cancelar compra</Button>
          </>}
        </div>
      </div>

      {erroAcao && (
        <div role="alert" className="mb-4 rounded-input border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">{erroAcao}</div>
      )}

      {compra.status === 'CANCELADA' && compra.observacaoCancelamento && (
        <div className="mb-4 flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-4 py-3 text-[13.5px] text-danger-deep">
          <Ban size={16} className="mt-0.5 flex-shrink-0" />
          <span><strong className="font-semibold">Motivo do cancelamento:</strong> {compra.observacaoCancelamento}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="-mb-px -mr-px grid grid-cols-2 lg:grid-cols-4">
          <Info titulo="Data da compra">{formatarData(compra.dataCompra)}</Info>
          <Info titulo={compra.multiplosFornecedores ? 'Fornecedores' : 'Fornecedor'}>
            {compra.multiplosFornecedores
              ? (fornecedoresLinhas.length ? fornecedoresLinhas.map(f => f.nome).join(', ') : '—')
              : compra.fornecedor
                ? <Link to={`/clientes/${compra.fornecedor.id}`} className="text-dark no-underline hover:text-teal">{compra.fornecedor.nome}</Link>
                : <span className="font-normal italic text-faint">Sem fornecedor</span>}
          </Info>
          <Info titulo="Pagamento">
            {compra.pago ? `Pago${compra.metodoPagamento ? ` — ${compra.metodoPagamento.nome}` : ''}` : 'Não pago'}
          </Info>
          <Info titulo="Total"><span className="text-[20px] text-teal [font-variant-numeric:tabular-nums]">{BRL(compra.total)}</span></Info>
        </div>
      </div>

      <div className="mt-5 rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="border-b border-line px-5 py-3 text-[13px] font-bold text-dark">Insumos ({compra.itens.length})</div>
        <div className={clsx('hidden gap-3 bg-cream px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim lg:grid',
          compra.multiplosFornecedores ? 'lg:grid-cols-[1.6fr_1.2fr_0.8fr_0.9fr_0.9fr_1.4fr]' : 'lg:grid-cols-[2fr_0.8fr_0.9fr_0.9fr_1.4fr]')}>
          <span>Insumo</span>{compra.multiplosFornecedores && <span>Fornecedor</span>}<span>Quantidade</span><span>Preço total</span>
          <span>{posConfirmacao ? 'Preço pago / un.' : 'Custo / un.'}</span><span>{posConfirmacao ? 'Custo do insumo (antes → depois)' : ''}</span>
        </div>
        {compra.itens.length === 0 && <div className="px-5 py-6 text-sm text-muted">Nenhum insumo neste rascunho.</div>}
        {compra.itens.map(i => (
          <div key={i.id} data-testid="item-compra" className={clsx('grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line px-5 py-3 text-[13.5px] lg:items-center lg:gap-3',
            compra.multiplosFornecedores ? 'lg:grid-cols-[1.6fr_1.2fr_0.8fr_0.9fr_0.9fr_1.4fr]' : 'lg:grid-cols-[2fr_0.8fr_0.9fr_0.9fr_1.4fr]')}>
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <Link to={`/insumos/${i.insumo.id}`} className="font-semibold text-dark no-underline hover:text-teal">{i.insumo.nome}</Link>
              <span className="ml-2 text-[12px] text-muted">{i.insumo.identificador}</span>
              {!i.insumo.ativo && <span className="ml-2 text-[11px] font-semibold text-danger">inativo</span>}
            </div>
            {compra.multiplosFornecedores && <div className="col-span-2 text-body lg:col-span-1">{i.fornecedor?.nome ?? <span className="italic text-faint">Sem fornecedor</span>}</div>}
            <div className="[font-variant-numeric:tabular-nums]">{qtd(i.quantidade)} {i.insumo.unidade}</div>
            <div className="text-right font-semibold [font-variant-numeric:tabular-nums] lg:text-left">{i.precoTotal != null ? BRL(i.precoTotal) : '—'}</div>
            <div className="[font-variant-numeric:tabular-nums]">{moeda4(posConfirmacao ? i.precoUnitarioPago : i.precoUnitario)}</div>
            <div className="text-right text-[12.5px] text-muted [font-variant-numeric:tabular-nums] lg:text-left">
              {posConfirmacao && i.custoUnitarioAnterior != null ? `${moeda4(i.custoUnitarioAnterior)} → ${moeda4(i.custoUnitarioPosterior)}` : ''}
            </div>
          </div>
        ))}
      </div>

      {compra.observacoes && (
        <div className="mt-5 rounded-card border border-[#F0EEE9] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">Observações</div>
          <p className="m-0 mt-1.5 whitespace-pre-line text-[14px] text-dark">{compra.observacoes}</p>
        </div>
      )}

      <ConfirmacaoModal
        open={modal === 'excluir'}
        onClose={() => setModal(null)}
        onConfirm={excluir}
        variant="danger"
        title={`Excluir o rascunho ${compra.identificador}?`}
        icon={<Trash2 size={16} />}
        width={420}
        confirmLabel="Excluir rascunho"
        confirming={processando}
        description={`O rascunho some da lista. O número ${compra.identificador} não volta a ser usado.`}
      />
      <ConfirmacaoModal
        open={modal === 'confirmar'}
        onClose={() => setModal(null)}
        onConfirm={confirmar}
        title="Confirmar a compra?"
        icon={<Check size={16} />}
        width={440}
        confirmLabel="Confirmar compra"
        description="O estoque e o custo dos insumos serão atualizados agora. Depois de confirmada, só o pagamento pode ser alterado; para desfazer, será preciso cancelar a compra."
      />
      {modal === 'pagamento' && (
        <ModalPagamento compra={compra} onClose={() => setModal(null)} onSalvo={c => { setCompra(c); setModal(null); setToast('Pagamento atualizado.') }} />
      )}
      {modal === 'cancelar' && (
        <ModalCancelarCompra compra={compra} onClose={() => setModal(null)}
          onCancelada={r => { setCompra(r.compra); setModal(null); setImpacto({ titulo: `Compra ${r.compra.identificador} cancelada`, impacto: r.impacto }) }} />
      )}
      {impacto && <ModalImpactoCompra titulo={impacto.titulo} impacto={impacto.impacto} onClose={() => setImpacto(null)} />}
    </AppLayout>
  )
}
