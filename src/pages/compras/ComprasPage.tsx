import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { ClipboardList, Plus, ShoppingCart, Users } from 'lucide-react'
import DashboardCompras from '../../components/compra/DashboardCompras'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import Toast from '../../components/shared/Toast'
import { FornecedorSelect } from '../../components/compra/Pickers'
import { NaoPagaBadge, StatusCompraBadge } from '../../components/compra/StatusCompraBadge'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { compraService } from '../../services/compraService'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useToast } from '../../hooks/useToast'
import type { CadastroRef, StatusCompra } from '../../types/compra'

// V0.15.0 — "Minhas compras" (RN-NOVA-16): listagem de compras (#541). O dashboard (#548) fica acima.

const FILTROS_STATUS: { id: StatusCompra | 'TODAS'; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'RASCUNHO', label: 'Rascunhos' },
  { id: 'CONFIRMADA', label: 'Confirmadas' },
  { id: 'CANCELADA', label: 'Canceladas' },
]

const dateInput = 'h-11 rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus'

export default function ComprasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, setToast } = useToast()
  const [status, setStatus] = useState<StatusCompra | 'TODAS'>('TODAS')
  const [fornecedor, setFornecedor] = useState<CadastroRef | null>(null)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

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
  }), [status, fornecedor, de, ate])

  const { items: compras, hasMore, loading, loadingMore, error, loadMore, reset } = usePaginatedList({
    fetcher, errorMessage: 'Não foi possível carregar as compras.',
  })

  useEffect(() => { reset() }, [reset])

  const temFiltro = status !== 'TODAS' || !!fornecedor || !!de || !!ate

  return (
    <AppLayout active="compras" compact>
      <Toast message={toast} />

      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Minhas compras</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">O que você comprou, de quem e quanto pagou.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="ghost" icon={<Users size={16} />} onClick={() => navigate('/clientes')}>Clientes e Fornecedores</Button>
          <Button variant="secondary" icon={<ShoppingCart size={16} />} onClick={() => navigate('/compras/lista')}>Gerar lista de compras</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/compras/nova')}>Registrar compra</Button>
        </div>
      </div>

      <div className="mb-7"><DashboardCompras /></div>

      <h2 className="mb-3 mt-0 text-[18px] font-bold text-dark">Compras</h2>
      <div className="mb-[18px] flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          {FILTROS_STATUS.map(f => {
            const on = status === f.id
            return (
              <button key={f.id} onClick={() => setStatus(f.id)} aria-pressed={on}
                className={clsx('inline-flex h-[34px] items-center rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                  on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
                {f.label}
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
          <div className="hidden grid-cols-[0.8fr_0.9fr_2fr_0.6fr_1fr_1.2fr] gap-4 border-b border-line px-[18px] py-[13px] md:grid">
            {['Compra', 'Data', 'Fornecedor', 'Itens', 'Total', 'Status'].map(h => (
              <div key={h} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">{h}</div>
            ))}
          </div>
          {compras.map(c => (
            <div key={c.id} data-testid="linha-compra" onClick={() => navigate(`/compras/${c.id}`)}
              className="mb-3 cursor-pointer rounded-card border border-[#F0EEE9] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors hover:bg-cream md:mb-0 md:grid md:grid-cols-[0.8fr_0.9fr_2fr_0.6fr_1fr_1.2fr] md:items-center md:gap-4 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-line md:px-[18px] md:py-3.5 md:shadow-none">
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
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-5 flex justify-center">
          <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</Button>
        </div>
      )}
    </AppLayout>
  )
}
