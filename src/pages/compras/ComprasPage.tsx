import { useCallback, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Ban, BarChart3, ClipboardList, Copy, CreditCard, FileText, Pencil, Plus, ShoppingCart, Trash2, Users, FileSearch } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import Toast from '../../components/shared/Toast'
import ActionMenu, { type ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import SortableHeader from '../../components/shared/SortableHeader'
import ModalCancelarCompra from '../../components/compra/ModalCancelarCompra'
import ModalPagamento from '../../components/compra/ModalPagamentoCompra'
import ModalImpactoCompra from '../../components/compra/ModalImpactoCompra'
import { useModalErro } from '../../hooks/useModalErro'
import { useDuplicarCompra } from '../../components/compra/useDuplicarCompra'
import { FornecedorSelect } from '../../components/compra/Pickers'
import { NaoPagaBadge, StatusCompraBadge } from '../../components/compra/StatusCompraBadge'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { compraService } from '../../services/compraService'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useToast } from '../../hooks/useToast'
import type { CadastroRef, CompraResponse, CompraResumoResponse, ContagensCompra, ImpactoCompraResponse, StatusCompra } from '../../types/compra'

// V0.15.0 — "Minhas compras" (RN-NOVA-16): listagem (#541, #565, #566). #598 (RN-NOVA-37): o Dashboard
// virou página própria (/compras/dashboard); o endereço antigo ?aba=dashboard redireciona para lá.
// #591 (RN-NOVA-44): cada filtro de status mostra a quantidade do total da conta.

const FILTROS_STATUS: { id: StatusCompra | 'TODAS'; label: string; contagem: keyof ContagensCompra }[] = [
  { id: 'TODAS', label: 'Todas', contagem: 'todas' },
  { id: 'RASCUNHO', label: 'Rascunhos', contagem: 'rascunhos' },
  { id: 'CONFIRMADA', label: 'Confirmadas', contagem: 'confirmadas' },
  { id: 'CANCELADA', label: 'Canceladas', contagem: 'canceladas' },
]

// #565 — colunas ordenáveis (allowlist do GET /compras).
type CampoOrdem = 'numero' | 'dataCompra' | 'fornecedor' | 'itens' | 'total' | 'status'
const COLUNAS: { campo: CampoOrdem; label: string }[] = [
  { campo: 'numero', label: 'Compra' },
  { campo: 'dataCompra', label: 'Data' },
  { campo: 'fornecedor', label: 'Fornecedor' },
  { campo: 'itens', label: 'Itens' },
  { campo: 'total', label: 'Total' },
  { campo: 'status', label: 'Status' },
]
const GRADE = 'md:grid-cols-[0.8fr_0.9fr_2fr_0.6fr_1fr_1.2fr_40px]'

type Acao = { tipo: 'cancelar' | 'pagamento'; compra: CompraResponse } | { tipo: 'excluir'; compra: CompraResumoResponse }

const dateInput = 'h-11 rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus'

export default function ComprasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, setToast } = useToast()
  const [params] = useSearchParams()
  const { modalErro, mostrarErro } = useModalErro()
  const { pedir: pedirDuplicar, modal: modalDuplicar } = useDuplicarCompra(mostrarErro)
  const [contagens, setContagens] = useState<ContagensCompra | null>(null)
  const atualizarContagens = useCallback(() => { compraService.contagens().then(setContagens).catch(() => setContagens(null)) }, [])
  const [status, setStatus] = useState<StatusCompra | 'TODAS'>('TODAS')
  const [fornecedor, setFornecedor] = useState<CadastroRef | null>(null)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [ordem, setOrdem] = useState<{ campo: CampoOrdem; dir: 'asc' | 'desc' }>({ campo: 'dataCompra', dir: 'desc' })
  const [acao, setAcao] = useState<Acao | null>(null)
  const [processando, setProcessando] = useState(false)
  const [impacto, setImpacto] = useState<{ titulo: string; impacto: ImpactoCompraResponse } | null>(null)

  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) { setToast(msg); navigate(location.pathname, { replace: true, state: null }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetcher = useCallback((page: number, size: number) => compraService.listar(page, size, {
    status: status === 'TODAS' ? undefined : status,
    fornecedorId: fornecedor?.id,
    de: de || undefined,
    ate: ate || undefined,
    sort: `${ordem.campo},${ordem.dir}`,
  }), [status, fornecedor, de, ate, ordem])

  const { items: compras, hasMore, loading, loadingMore, error, loadMore, reset } = usePaginatedList({
    fetcher, errorMessage: 'Não foi possível carregar as compras.',
  })

  useEffect(() => { reset() }, [reset])
  useEffect(() => { atualizarContagens() }, [atualizarContagens])
  const recarregar = () => { reset(); atualizarContagens() }

  const ordenar = (campo: CampoOrdem) => setOrdem(o => o.campo === campo
    ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    // Data e valores começam do maior; texto (fornecedor/status/número) do começo do alfabeto.
    : { campo, dir: campo === 'dataCompra' || campo === 'total' || campo === 'itens' ? 'desc' : 'asc' })

  // #566 — cancelar e alterar pagamento precisam da compra completa (itens, método salvo).
  const abrirComCompra = async (tipo: 'cancelar' | 'pagamento', id: string) => {
    setProcessando(true)
    try {
      setAcao({ tipo, compra: await compraService.buscar(id) })
    } catch (err) {
      mostrarErro(err, 'Não foi possível abrir a compra.')
    } finally {
      setProcessando(false)
    }
  }

  const excluir = async () => {
    if (acao?.tipo !== 'excluir') return
    setProcessando(true)
    try {
      await compraService.excluirRascunho(acao.compra.id)
      setToast(`Rascunho ${acao.compra.identificador} excluído.`)
      setAcao(null)
      recarregar()
    } catch (err) {
      setAcao(null)
      mostrarErro(err, 'Não foi possível excluir o rascunho.')
    } finally {
      setProcessando(false)
    }
  }

  const itensMenu = (c: CompraResumoResponse): ActionMenuItem[] => {
    const pdf: ActionMenuItem = { label: 'PDF', icon: <FileText size={15} />, onClick: () => navigate(`/compras/${c.id}/pdf`) }
    if (c.status === 'RASCUNHO') return [
      { label: 'Editar', icon: <Pencil size={15} />, onClick: () => navigate(`/compras/${c.id}/editar`) },
      pdf,
      { label: 'Excluir', icon: <Trash2 size={15} />, danger: true, dividerBefore: true, onClick: () => setAcao({ tipo: 'excluir', compra: c }) },
    ]
    const duplicarItem: ActionMenuItem = { label: 'Duplicar', icon: <Copy size={15} />, onClick: () => pedirDuplicar(c.id) }
    if (c.status === 'CANCELADA') return [duplicarItem, pdf]
    return [
      { label: 'Alterar pagamento', icon: <CreditCard size={15} />, onClick: () => abrirComCompra('pagamento', c.id) },
      duplicarItem,
      pdf,
      { label: 'Cancelar compra', icon: <Ban size={15} />, danger: true, dividerBefore: true, onClick: () => abrirComCompra('cancelar', c.id) },
    ]
  }

  const temFiltro = status !== 'TODAS' || !!fornecedor || !!de || !!ate

  if (params.get('aba') === 'dashboard') return <Navigate to="/compras/dashboard" replace />

  return (
    <AppLayout active="compras" compact>
      <Toast message={toast} />

      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Minhas compras</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">O que você comprou, de quem e quanto pagou.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="ghost" icon={<BarChart3 size={16} />} onClick={() => navigate('/compras/dashboard')}>Dashboard</Button>
          <Button variant="ghost" icon={<Users size={16} />} onClick={() => navigate('/clientes')}>Clientes e Fornecedores</Button>
          <Button variant="secondary" icon={<ShoppingCart size={16} />} onClick={() => navigate('/compras/lista?aba=nova')}>Gerar lista de compras</Button>
          <Button variant="secondary" icon={<FileSearch size={16} />} onClick={() => navigate('/compras/nota')}>Ler nota fiscal</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/compras/nova')}>Registrar compra</Button>
        </div>
      </div>

      <div className="mb-[18px] flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          {FILTROS_STATUS.map(f => {
            const on = status === f.id
            return (
              <button key={f.id} onClick={() => setStatus(f.id)} aria-pressed={on}
                className={clsx('inline-flex h-[34px] items-center rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                  on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
                {f.label}
                {contagens && (
                  <span data-testid="contagem-filtro" className={clsx('ml-1.5 rounded-full px-1.5 text-[11.5px] font-bold [font-variant-numeric:tabular-nums]',
                    on ? 'bg-white/25 text-white' : 'bg-line-soft text-muted')}>{contagens[f.contagem]}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-[340px]">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Fornecedor</span>
            <FornecedorSelect size="sm" value={fornecedor} onChange={setFornecedor} placeholder="Todos os fornecedores" />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">De</span>
            <input type="date" aria-label="Data inicial" value={de} max={ate || hojeIso()} onChange={e => setDe(e.target.value)} className={dateInput} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Até</span>
            <input type="date" aria-label="Data final" value={ate} min={de || undefined} max={hojeIso()} onChange={e => setAte(e.target.value)} className={dateInput} />
          </label>
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={() => { setStatus('TODAS'); setFornecedor(null); setDe(''); setAte('') }}>Limpar filtros</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando compras…</div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          {error}
          <Button variant="ghost" size="sm" onClick={reset}>Tentar de novo</Button>
        </div>
      ) : compras.length === 0 ? (
        temFiltro
          ? <EmptyState compact title="Nenhuma compra neste filtro" description="Ajuste os filtros para ver as demais compras." />
          : <EmptyState icon={<ClipboardList size={20} />} title="Nenhuma compra registrada ainda"
              description="Registre o que você comprou para manter o estoque e o custo dos insumos em dia."
              action={{ label: 'Registrar primeira compra', icon: <Plus size={16} />, onClick: () => navigate('/compras/nova') }} />
      ) : (
        <div className="rounded-none md:rounded-card md:border md:border-[#F0EEE9] md:bg-white md:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className={`hidden gap-4 border-b border-line px-[18px] py-[13px] md:grid ${GRADE}`}>
            {COLUNAS.map(c => (
              <SortableHeader key={c.campo} label={c.label} field={c.campo} activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
            ))}
            <span />
          </div>
          {compras.map(c => (
            <div key={c.id} data-testid="linha-compra" onClick={() => navigate(`/compras/${c.id}`)}
              className={`relative mb-3 cursor-pointer rounded-card border border-[#F0EEE9] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors hover:bg-cream md:mb-0 md:grid ${GRADE} md:items-center md:gap-4 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-line md:px-[18px] md:py-3.5 md:shadow-none`}>
              <div className="text-[14.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">{c.identificador}</div>
              <div className="text-sm text-body [font-variant-numeric:tabular-nums]">{formatarData(c.dataCompra)}</div>
              <div className="mt-1 truncate text-sm text-body md:mt-0">
                {c.fornecedores.length ? c.fornecedores.join(', ') : <span className="italic text-faint">Sem fornecedor</span>}
              </div>
              <div className="text-sm text-muted">{c.quantidadeItens} {c.quantidadeItens === 1 ? 'item' : 'itens'}</div>
              <div className="text-[14.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(c.total)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 md:mt-0">
                <StatusCompraBadge status={c.status} size="sm" />
                {c.status === 'CONFIRMADA' && !c.pago && <NaoPagaBadge size="sm" />}
              </div>
              <div className="absolute right-2 top-2 md:static md:flex md:justify-end" onClick={e => e.stopPropagation()}>
                <ActionMenu items={itensMenu(c)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {acao?.tipo === 'excluir' && (
        <ConfirmacaoModal open onClose={() => setAcao(null)} onConfirm={excluir} variant="danger"
          title={`Excluir o rascunho ${acao.compra.identificador}?`} icon={<Trash2 size={16} />} width={420}
          confirmLabel="Excluir rascunho" confirming={processando}
          description={`O rascunho some da lista. O número ${acao.compra.identificador} não volta a ser usado.`} />
      )}
      {acao?.tipo === 'pagamento' && (
        <ModalPagamento compra={acao.compra} onClose={() => setAcao(null)}
          onSalvo={() => { setAcao(null); setToast('Pagamento atualizado.'); recarregar() }} />
      )}
      {acao?.tipo === 'cancelar' && (
        <ModalCancelarCompra compra={acao.compra} onClose={() => setAcao(null)}
          onCancelada={r => { setAcao(null); recarregar(); setImpacto({ titulo: `Compra ${r.compra.identificador} cancelada`, impacto: r.impacto }) }} />
      )}
      {impacto && <ModalImpactoCompra titulo={impacto.titulo} impacto={impacto.impacto} onClose={() => setImpacto(null)} />}

      {modalDuplicar}
      {modalErro}

      {hasMore && !loading && (
        <div className="mt-5 flex justify-center">
          <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</Button>
        </div>
      )}
    </AppLayout>
  )
}
