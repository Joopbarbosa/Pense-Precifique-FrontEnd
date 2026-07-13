import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, StatusBadge, VencidoBadge } from '../../components/ui'
import { ExternalLink, Download, Plus, Filter, Search, Calendar } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { orcamentoService } from '../../services/orcamentoService'
import type { OrcamentoResponse, StatusOrcamento } from '../../types/orcamento'
import { STATUS_LABEL } from '../../constants'

type StatusBadgeLabel =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

const FILTERS: { label: string; value: StatusOrcamento | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Rascunho', value: 'RASCUNHO' },
  { label: 'Enviado', value: 'ENVIADO' },
  { label: 'Aprovado', value: 'APROVADO' },
  { label: 'Aguardando Sinal', value: 'AGUARDANDO_SINAL' },
  { label: 'Sinal Pago', value: 'SINAL_PAGO' },
  { label: 'Em Produção', value: 'EM_PRODUCAO' },
  { label: 'Finalizado', value: 'FINALIZADO' },
  { label: 'Entregue', value: 'ENTREGUE' },
  { label: 'Pago', value: 'PAGO' },
  { label: 'Cancelado', value: 'CANCELADO' },
]

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

function isVencido(orc: OrcamentoResponse): boolean {
  if (!orc.dataValidade) return false
  const inactive: StatusOrcamento[] = ['CANCELADO', 'PAGO', 'FINALIZADO', 'ENTREGUE']
  if (inactive.includes(orc.status)) return false
  return new Date(orc.dataValidade) < new Date()
}

function fmtData(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function OrcamentoRow({ orc, onVerDetalhes, onBaixarPdf }: {
  orc: OrcamentoResponse
  onVerDetalhes: () => void
  onBaixarPdf: (() => void) | null
}) {
  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <ExternalLink size={14} />, onClick: onVerDetalhes },
    ...(onBaixarPdf ? [{ label: 'Baixar PDF', icon: <Download size={17} />, onClick: onBaixarPdf }] : []),
  ]

  return (
    <div
      className="hidden cursor-pointer grid-cols-[92px_1.4fr_1fr_1.1fr_1.2fr_44px] items-center gap-3.5 border-b border-line px-[18px] py-3.5 transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid"
      onClick={onVerDetalhes}
    >
      <span className="text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">
        ORÇ-{String(orc.numero).padStart(4, '0')}
      </span>

      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-body">
        {orc.nomeCliente}
      </span>

      <span className="text-sm font-semibold text-dark">
        {fmt(orc.total)}
      </span>

      <span className="text-[13.5px] text-muted">{fmtData(orc.createdAt)}</span>

      <div className="flex items-center gap-2">
        <StatusBadge status={STATUS_LABEL[orc.status] as StatusBadgeLabel} />
        {isVencido(orc) && <VencidoBadge />}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function OrcamentoCard({ orc, index, onVerDetalhes, onBaixarPdf }: {
  orc: OrcamentoResponse
  index: number
  onVerDetalhes: () => void
  onBaixarPdf: (() => void) | null
}) {
  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <ExternalLink size={14} />, onClick: onVerDetalhes },
    ...(onBaixarPdf ? [{ label: 'Baixar PDF', icon: <Download size={17} />, onClick: onBaixarPdf }] : []),
  ]

  return (
    <div
      className="block cursor-pointer border-b border-line px-[18px] py-4 sm:hidden"
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.05}s` }}
      onClick={onVerDetalhes}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-dark">
              ORÇ-{String(orc.numero).padStart(4, '0')}
            </span>
            {isVencido(orc) && <VencidoBadge />}
          </div>
          <div className="mb-2 text-sm text-body">{orc.nomeCliente}</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={STATUS_LABEL[orc.status] as StatusBadgeLabel} size="sm" />
            <span className="text-[13px] text-muted">{fmtData(orc.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-[15px] font-bold text-dark">{fmt(orc.total)}</span>
          <div onClick={e => e.stopPropagation()}>
            <ActionMenu items={menuItems} align="right" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListaOrcamentosPage() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<StatusOrcamento | ''>('')
  const [query, setQuery] = useState('')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const periodRef = useRef<HTMLDivElement>(null)

  const [orcamentos, setOrcamentos] = useState<OrcamentoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async (pg: number, statusFiltro: StatusOrcamento | '', q: string) => {
    try {
      const res = await orcamentoService.listar(pg, 20, statusFiltro || undefined, q.trim() || undefined)
      if (pg === 0) {
        setOrcamentos(res.content)
      } else {
        setOrcamentos(prev => [...prev, ...res.content])
      }
      setHasMore(!res.last)
      setPage(pg)
      setError(null)
    } catch {
      setError('Não foi possível carregar os orçamentos.')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const delay = query.trim() ? 300 : 0
    const t = setTimeout(() => {
      carregar(0, filtro, query).finally(() => setLoading(false))
    }, delay)
    return () => clearTimeout(t)
  }, [filtro, query, carregar])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleFiltroChange = (value: StatusOrcamento | '') => {
    setFiltro(value)
    setOrcamentos([])
    setPage(0)
  }

  const handleCarregarMais = async () => {
    setLoadingMore(true)
    await carregar(page + 1, filtro, query)
    setLoadingMore(false)
  }

  const periodActive = !!(dateFrom || dateTo)
  const periodLabel = periodActive
    ? `${dateFrom || '…'} – ${dateTo || '…'}`
    : 'Período'

  const setPreset = (days: number) => {
    const today = new Date()
    const past = new Date(today)
    past.setDate(today.getDate() - days)
    const iso = (d: Date) => d.toISOString().split('T')[0]
    setDateFrom(iso(past))
    setDateTo(iso(today))
  }

  const searchActive = query.trim().length > 0
  const globalEmpty = !loading && orcamentos.length === 0 && filtro === '' && !searchActive
  const filtroEmpty = !loading && orcamentos.length === 0 && (filtro !== '' || searchActive)

  return (
    <AppLayout active="orcamentos">

      {/* HEADER */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Orçamentos</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Acompanhe e gerencie todos os seus orçamentos.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/orcamentos/novo')}>
          Novo Orçamento
        </Button>
      </div>

      {error && (
        <div className="mb-[18px] rounded-input border border-[#F5C4B8] bg-[#FCF0EC] px-[18px] py-3.5 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-[60px] text-sm text-muted">
          Carregando…
        </div>
      ) : globalEmpty ? (
        <EmptyState
          icon={<Filter size={20} />}
          title="Você ainda não tem orçamentos"
          description="Que tal criar o primeiro? Leva poucos minutos e já sai com o preço certo."
          action={{ label: 'Criar primeiro orçamento', icon: <Plus size={16} />, onClick: () => navigate('/orcamentos/novo') }}
        />
      ) : (
        <>
          {/* FILTROS — chips de status */}
          <div className="mb-[18px] flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => {
                const on = filtro === f.value
                return (
                  <button
                    key={f.value}
                    onClick={() => handleFiltroChange(f.value)}
                    className={clsx(
                      'h-[34px] cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-[#FAF8F5]'
                    )}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Busca + Período */}
            <div className="flex flex-wrap gap-3">
              {/* Campo de busca */}
              <div className="relative min-w-[200px] flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por cliente ou número…"
                  className="h-11 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
              </div>

              {/* Dropdown de período */}
              <div ref={periodRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setPeriodOpen(o => !o)}
                  className={clsx(
                    'flex h-11 items-center gap-[9px] whitespace-nowrap rounded-input border-[1.5px] px-4 font-[inherit] text-sm cursor-pointer',
                    periodActive || periodOpen ? 'border-teal' : 'border-line',
                    periodActive ? 'bg-teal/[0.07] font-semibold text-teal' : 'bg-white font-medium text-body'
                  )}
                >
                  <Calendar size={16} className="text-teal" />
                  {periodLabel}
                  <span className={clsx('text-xs', periodActive ? 'text-teal' : 'text-faint')}>▾</span>
                </button>

                {periodOpen && (
                  <div className="absolute right-0 top-[50px] z-40 w-[300px] animate-pop rounded-[14px] border border-line bg-white p-4 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.2)]">
                    <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                      Filtrar por data de criação
                    </div>

                    {/* Presets */}
                    <div className="mb-3.5 flex flex-wrap gap-[7px]">
                      {([['7 dias', 7], ['30 dias', 30], ['90 dias', 90]] as [string, number][]).map(([lbl, d]) => (
                        <button
                          key={d}
                          onClick={() => setPreset(d)}
                          className="h-[30px] cursor-pointer rounded-full border border-line bg-[#FCFBF9] px-3 font-[inherit] text-[12.5px] font-semibold text-body transition-colors duration-100 hover:bg-teal/[0.08] hover:text-teal"
                        >
                          Últimos {lbl}
                        </button>
                      ))}
                    </div>

                    {/* Inputs de data */}
                    <div className="flex flex-col gap-2.5">
                      {([['De', dateFrom, setDateFrom, dateTo, ''], ['Até', dateTo, setDateTo, '', dateFrom]] as [string, string, (v: string) => void, string, string][]).map(([lbl, val, setter, max, min]) => (
                        <label key={lbl} className="block">
                          <span className="mb-[5px] block text-[12.5px] font-semibold text-body">{lbl}</span>
                          <input
                            type="date"
                            value={val}
                            max={max || undefined}
                            min={min || undefined}
                            onChange={e => setter(e.target.value)}
                            className="h-[42px] w-full rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-[13.5px] text-dark outline-none"
                          />
                        </label>
                      ))}
                    </div>

                    {/* Ações */}
                    <div className="mt-4 flex gap-[9px]">
                      <button
                        onClick={() => { setDateFrom(''); setDateTo('') }}
                        disabled={!periodActive}
                        className={clsx(
                          'h-10 flex-1 rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[13.5px] font-semibold',
                          periodActive ? 'cursor-pointer text-body' : 'cursor-default text-[#C0BCB4]'
                        )}
                      >
                        Limpar
                      </button>
                      <button
                        onClick={() => setPeriodOpen(false)}
                        className="h-10 flex-[1.2] cursor-pointer rounded-input border-none bg-teal font-[inherit] text-[13.5px] font-semibold text-white"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filtroEmpty ? (
            <div className="py-12 text-center text-sm text-muted">
              {searchActive
                ? <>Nenhum orçamento encontrado para &ldquo;{query.trim()}&rdquo;.</>
                : <>Nenhum orçamento encontrado em &ldquo;{STATUS_LABEL[filtro as StatusOrcamento]}&rdquo;.</>
              }
            </div>
          ) : (
            <>
              {/* TABELA */}
              <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="hidden grid-cols-[92px_1.4fr_1fr_1.1fr_1.2fr_44px] items-center gap-3.5 border-b border-line px-[18px] py-[13px] sm:grid">
                  {['Número', 'Cliente', 'Total', 'Criação', 'Status', ''].map((h, k) => (
                    <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
                      {h}
                    </div>
                  ))}
                </div>

                {orcamentos.map((o, i) => {
                  const pdfUrl = orcamentoService.downloadPdf(o.id)
                  const onBaixarPdf = o.status !== 'CANCELADO'
                    ? () => window.open(pdfUrl, '_blank')
                    : null
                  return (
                    <React.Fragment key={o.id}>
                      <OrcamentoRow
                        orc={o}
                        onVerDetalhes={() => navigate(`/orcamentos/${o.id}`)}
                        onBaixarPdf={onBaixarPdf}
                      />
                      <OrcamentoCard
                        orc={o}
                        index={i}
                        onVerDetalhes={() => navigate(`/orcamentos/${o.id}`)}
                        onBaixarPdf={onBaixarPdf}
                      />
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Contador + Carregar mais */}
              <div className="mt-3.5 flex items-center justify-between">
                <span className="text-[12.5px] text-muted">
                  {orcamentos.length} {orcamentos.length === 1 ? 'orçamento' : 'orçamentos'}
                </span>
                {hasMore && (
                  <button
                    onClick={handleCarregarMais}
                    disabled={loadingMore}
                    className={clsx(
                      'h-9 rounded-lg border-[1.5px] border-line bg-white px-[18px] font-[inherit] text-[13.5px] font-semibold text-body',
                      loadingMore ? 'cursor-default opacity-60' : 'cursor-pointer'
                    )}
                  >
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

    </AppLayout>
  )
}
