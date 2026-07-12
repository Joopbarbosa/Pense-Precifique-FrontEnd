import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="q-row" onClick={onVerDetalhes}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>
        ORÇ-{String(orc.numero).padStart(4, '0')}
      </span>

      <span style={{ fontSize: 14, color: '#5C594F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {orc.nomeCliente}
      </span>

      <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>
        {fmt(orc.total)}
      </span>

      <span style={{ fontSize: 13.5, color: '#A29E96' }}>{fmtData(orc.createdAt)}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
    <div className="q-card-mobile" style={{
      padding: '16px 18px',
      borderBottom: '1px solid #EFEDE8',
      animation: `fadeUp .4s ease both`,
      animationDelay: `${index * 0.05}s`,
      cursor: 'pointer',
    }}
      onClick={onVerDetalhes}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#3A372F' }}>
              ORÇ-{String(orc.numero).padStart(4, '0')}
            </span>
            {isVencido(orc) && <VencidoBadge />}
          </div>
          <div style={{ fontSize: 14, color: '#5C594F', marginBottom: 8 }}>{orc.nomeCliente}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={STATUS_LABEL[orc.status] as StatusBadgeLabel} size="sm" />
            <span style={{ fontSize: 13, color: '#A29E96' }}>{fmtData(orc.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3A372F' }}>{fmt(orc.total)}</span>
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
  const [searchFocus, setSearchFocus] = useState(false)
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>Orçamentos</h1>
          <p style={{ margin: '7px 0 0', fontSize: 14.5, color: '#A29E96' }}>Acompanhe e gerencie todos os seus orçamentos.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/orcamentos/novo')}>
          Novo Orçamento
        </Button>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: '#FCF0EC', border: '1px solid #F5C4B8', borderRadius: 10, color: '#C0492B', fontSize: 14, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#A29E96', fontSize: 14 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map(f => {
                const on = filtro === f.value
                return (
                  <button key={f.value} onClick={() => handleFiltroChange(f.value)} style={{
                    height: 34, padding: '0 14px', borderRadius: 999,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    border: `1.5px solid ${on ? '#2A9D8F' : '#EFEDE8'}`,
                    background: on ? '#2A9D8F' : '#fff',
                    color: on ? '#fff' : '#5C594F',
                    transition: 'all .14s',
                  }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#FAF8F5' }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff' }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Busca + Período */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Campo de busca */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por cliente ou número…"
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setSearchFocus(false)}
                  style={{
                    width: '100%', height: 44, padding: '0 16px 0 42px',
                    border: `1.5px solid ${searchFocus ? '#2A9D8F' : '#EFEDE8'}`,
                    borderRadius: 10, fontSize: 14, color: '#3A372F',
                    background: '#fff', outline: 'none', fontFamily: 'inherit',
                    boxShadow: searchFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                  }}
                />
              </div>

              {/* Dropdown de período */}
              <div ref={periodRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setPeriodOpen(o => !o)} style={{
                  height: 44, padding: '0 16px',
                  border: `1.5px solid ${periodActive || periodOpen ? '#2A9D8F' : '#EFEDE8'}`,
                  borderRadius: 10,
                  background: periodActive ? 'rgba(42,157,143,0.07)' : '#fff',
                  color: periodActive ? '#2A9D8F' : '#5C594F',
                  fontSize: 14, fontWeight: periodActive ? 600 : 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap',
                }}>
                  <Calendar size={16} style={{ color: '#2A9D8F' }} />
                  {periodLabel}
                  <span style={{ color: periodActive ? '#2A9D8F' : '#B7B4AD', fontSize: 12 }}>▾</span>
                </button>

                {periodOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 50, zIndex: 40,
                    width: 300, background: '#fff',
                    border: '1px solid #EFEDE8', borderRadius: 14,
                    boxShadow: '0 14px 36px -10px rgba(0,0,0,0.2)',
                    padding: 16, animation: 'pop .14s ease both',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A29E96', marginBottom: 10 }}>
                      Filtrar por data de criação
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                      {([['7 dias', 7], ['30 dias', 30], ['90 dias', 90]] as [string, number][]).map(([lbl, d]) => (
                        <button key={d} onClick={() => setPreset(d)} style={{
                          height: 30, padding: '0 12px', borderRadius: 999,
                          border: '1px solid #EFEDE8', background: '#FCFBF9',
                          color: '#5C594F', fontSize: 12.5, fontWeight: 600,
                          fontFamily: 'inherit', cursor: 'pointer',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,157,143,0.08)'; e.currentTarget.style.color = '#2A9D8F' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#FCFBF9'; e.currentTarget.style.color = '#5C594F' }}
                        >
                          Últimos {lbl}
                        </button>
                      ))}
                    </div>

                    {/* Inputs de data */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {([['De', dateFrom, setDateFrom, dateTo, ''], ['Até', dateTo, setDateTo, '', dateFrom]] as [string, string, (v: string) => void, string, string][]).map(([lbl, val, setter, max, min]) => (
                        <label key={lbl} style={{ display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5C594F', marginBottom: 5 }}>{lbl}</span>
                          <input
                            type="date"
                            value={val}
                            max={max || undefined}
                            min={min || undefined}
                            onChange={e => setter(e.target.value)}
                            style={{
                              width: '100%', height: 42, padding: '0 12px',
                              border: '1.5px solid #EFEDE8', borderRadius: 10,
                              fontSize: 13.5, color: '#3A372F', background: '#fff',
                              outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                      <button onClick={() => { setDateFrom(''); setDateTo('') }} disabled={!periodActive} style={{
                        flex: 1, height: 40, borderRadius: 10,
                        border: '1.5px solid #EFEDE8', background: '#fff',
                        color: periodActive ? '#5C594F' : '#C0BCB4',
                        fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                        cursor: periodActive ? 'pointer' : 'default',
                      }}>
                        Limpar
                      </button>
                      <button onClick={() => setPeriodOpen(false)} style={{
                        flex: 1.2, height: 40, borderRadius: 10,
                        border: 'none', background: '#2A9D8F', color: '#fff',
                        fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                      }}>
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filtroEmpty ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#A29E96', fontSize: 14 }}>
              {searchActive
                ? <>Nenhum orçamento encontrado para &ldquo;{query.trim()}&rdquo;.</>
                : <>Nenhum orçamento encontrado em &ldquo;{STATUS_LABEL[filtro as StatusOrcamento]}&rdquo;.</>
              }
            </div>
          ) : (
            <>
              {/* TABELA */}
              <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="q-head">
                  {['Número', 'Cliente', 'Total', 'Criação', 'Status', ''].map((h, k) => (
                    <div key={k} style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#B7B4AD' }}>
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
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#A29E96' }}>
                  {orcamentos.length} {orcamentos.length === 1 ? 'orçamento' : 'orçamentos'}
                </span>
                {hasMore && (
                  <button
                    onClick={handleCarregarMais}
                    disabled={loadingMore}
                    style={{
                      height: 36, padding: '0 18px', borderRadius: 8,
                      border: '1.5px solid #EFEDE8', background: '#fff',
                      color: '#5C594F', fontSize: 13.5, fontWeight: 600,
                      fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer',
                      opacity: loadingMore ? 0.6 : 1,
                    }}
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
