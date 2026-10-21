import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, StatusBadge, VencidoBadge } from '../../components/ui'
import { ExternalLink, Download, Plus, Filter, Search, Calendar } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import RetryCooldownModal from '../../components/shared/RetryCooldownModal'
import SortableHeader from '../../components/shared/SortableHeader'
import { orcamentoService } from '../../services/orcamentoService'
import type { OrcamentoResponse, StatusOrcamento } from '../../types/orcamento'
import { STATUS_LABEL } from '../../constants'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import { useEspelharNaUrl, useParamsIniciais } from '../../hooks/useEstadoNaUrl'
import { useAoMudar } from '../../hooks/useAoMudar'
import Paginacao from '../../components/shared/Paginacao'
import { useRetryCooldown } from '../../hooks/useRetryCooldown'
import { dispararDownloadBlob } from '../../utils/download'
import { dataLocalISO } from '../../utils/dataLocal'

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

// #255 — campo aninhado (cliente.nome) e simples (numero/total/createdAt) vão via ?sort= do
// backend (confirmado por curl no Passo 0); status ordena pelo ciclo de vida do pedido
// (RASCUNHO→ENVIADO→...→PAGO/CANCELADO), que não é a ordem alfabética do banco. Desde a #994
// (RN-NOVA-31) essa ordem também é do servidor (`cicloDeVida`), para valer em todas as páginas.
type SortField = 'numero' | 'cliente' | 'total' | 'createdAt' | 'status'

const SORT_BACKEND_FIELD: Record<SortField, string> = {
  numero: 'numero',
  cliente: 'cliente.nome',
  total: 'total',
  createdAt: 'createdAt',
  status: 'cicloDeVida',
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
      className="hidden cursor-pointer grid-cols-[92px_1.4fr_1fr_1.1fr_1.2fr_44px] items-center gap-3.5 border-b border-line px-section py-3.5 transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid"
      onClick={onVerDetalhes}
    >
      <span className="text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">
        {orc.identificador}
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
      className="block cursor-pointer border-b border-line px-section py-4 sm:hidden"
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.05}s` }}
      onClick={onVerDetalhes}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-dark">
              {orc.identificador}
            </span>
            {isVencido(orc) && <VencidoBadge />}
          </div>
          <div className="mb-2 text-sm text-body">{orc.nomeCliente}</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={STATUS_LABEL[orc.status] as StatusBadgeLabel} size="sm" />
            <span className="text-[13px] text-muted">{fmtData(orc.createdAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
  // #994 — página, busca, status, período e ordenação ficam na URL: voltar de um orçamento reabre a lista como estava
  const inicial = useParamsIniciais()
  const [filtro, setFiltro] = useState<StatusOrcamento | ''>(() => FILTERS.find(f => f.value && f.value === inicial.texto('status'))?.value ?? '')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => inicial.texto('de'))
  const [dateTo, setDateTo] = useState(() => inicial.texto('ate'))
  const [appliedDateFrom, setAppliedDateFrom] = useState(() => inicial.texto('de'))
  const [appliedDateTo, setAppliedDateTo] = useState(() => inicial.texto('ate'))
  const periodRef = useRef<HTMLDivElement>(null)
  const downloadRetry = useRetryCooldown()

  // Default explícito por decisão de produto: a listagem deve abrir ordenada por Número, não
  // depender da ordem natural (não garantida) que o Postgres devolve sem ORDER BY.
  const [sortField, setSortField] = useState<SortField | null>(() => {
    const c = inicial.texto('ordem', 'numero') as SortField
    return c in SORT_BACKEND_FIELD ? c : 'numero'
  })
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => inicial.texto('dir', 'asc') === 'desc' ? 'desc' : 'asc')

  const sortParam = sortField ? `${SORT_BACKEND_FIELD[sortField]},${sortDir}` : undefined

  const {
    items: orcamentos,
    page,
    totalPages,
    ultima,
    totalElements,
    loading,
    irParaPagina,
    query,
    setQuery,
    reset,
    error,
  } = useDebounceSearch({
    fetcher: (page, size, q) => orcamentoService.listar(page, size, filtro || undefined, q, appliedDateFrom || undefined, appliedDateTo || undefined, sortParam),
    errorMessage: 'Não foi possível carregar os orçamentos.',
    buscaInicial: inicial.texto('busca'),
    paginaInicial: inicial.pagina(),
  })
  useEspelharNaUrl({ pagina: page + 1, busca: query, status: filtro, de: appliedDateFrom, ate: appliedDateTo, ordem: sortField, dir: sortDir },
    { pagina: 1, busca: '', status: '', de: '', ate: '', ordem: 'numero', dir: 'asc' })

  useAoMudar(`${filtro}|${appliedDateFrom}|${appliedDateTo}|${sortParam}`, reset)

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
  }

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Sem gate de preview aqui (RN-NOVA-2 não se aplica — não há preview nesta tela), mas com o
  // mesmo serviço centralizado + retry/cooldown (RN-NOVA-3) das outras 2 entradas. Guard explícito
  // contra cooldown porque ActionMenuItem não expõe estado "disabled" por item.
  const handleBaixarPdf = (orc: OrcamentoResponse) => {
    if (downloadRetry.executando || downloadRetry.cooldownRestante > 0) return
    downloadRetry.executar(async () => {
      const blob = await orcamentoService.baixarPdf(orc.id)
      dispararDownloadBlob(blob, `orcamento-${orc.numero}.pdf`)
    }, 'Erro ao baixar PDF do orçamento.')
  }

  const periodActive = !!(appliedDateFrom || appliedDateTo)
  const periodLabel = periodActive
    ? `${appliedDateFrom || '…'} – ${appliedDateTo || '…'}`
    : 'Período'

  const setPreset = (days: number) => {
    const today = new Date()
    const past = new Date(today)
    past.setDate(today.getDate() - days)
    setDateFrom(dataLocalISO(past))
    setDateTo(dataLocalISO(today))
  }

  const handleAplicarPeriodo = () => {
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setPeriodOpen(false)
  }

  const handleLimparPeriodo = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
  }

  const searchActive = query.trim().length > 0
  const globalEmpty = !loading && orcamentos.length === 0 && filtro === '' && !searchActive && !periodActive
  const filtroEmpty = !loading && orcamentos.length === 0 && (filtro !== '' || searchActive || periodActive)

  return (
    <AppLayout active="orcamentos" compact>

      {/* HEADER */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Orçamentos</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Acompanhe e gerencie todos os seus orçamentos.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/orcamentos/novo')}>
          Novo Orçamento
        </Button>
      </div>

      {error && (
        <div className="mb-section rounded-input border border-[#F5C4B8] bg-[#FCF0EC] px-section py-3.5 text-sm text-danger">
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
          <div className="mb-section flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => {
                const on = filtro === f.value
                return (
                  <button
                    key={f.value}
                    onClick={() => handleFiltroChange(f.value)}
                    className={clsx(
                      'h-[34px] cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream'
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
                  className="h-11 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-sm text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12"
                />
              </div>

              {/* Dropdown de período */}
              <div ref={periodRef} className="relative shrink-0">
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
                      {([['Hoje', 0], ['7 dias', 7], ['30 dias', 30], ['90 dias', 90]] as [string, number][]).map(([lbl, d]) => (
                        <button
                          key={d}
                          onClick={() => setPreset(d)}
                          className="h-[30px] cursor-pointer rounded-full border border-line bg-cream px-3 font-[inherit] text-[12.5px] font-semibold text-body transition-colors duration-100 hover:bg-teal/8 hover:text-teal"
                        >
                          {d === 0 ? lbl : `Últimos ${lbl}`}
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
                            className="h-[42px] w-full rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-[13.5px] text-dark outline-hidden"
                          />
                        </label>
                      ))}
                    </div>

                    {/* Ações */}
                    <div className="mt-4 flex gap-[9px]">
                      <button
                        onClick={handleLimparPeriodo}
                        disabled={!(dateFrom || dateTo || periodActive)}
                        className={clsx(
                          'h-10 flex-1 rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[13.5px] font-semibold',
                          (dateFrom || dateTo || periodActive) ? 'cursor-pointer text-body' : 'cursor-default text-[#C0BCB4]'
                        )}
                      >
                        Limpar
                      </button>
                      <button
                        onClick={handleAplicarPeriodo}
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
                : filtro
                  ? <>Nenhum orçamento encontrado em &ldquo;{STATUS_LABEL[filtro as StatusOrcamento]}&rdquo;.</>
                  : <>Nenhum orçamento encontrado no período selecionado.</>
              }
            </div>
          ) : (
            <>
              {/* TABELA */}
              <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="hidden grid-cols-[92px_1.4fr_1fr_1.1fr_1.2fr_44px] items-center gap-3.5 border-b border-line px-section py-[13px] sm:grid">
                  <SortableHeader label="Número" field="numero" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Cliente" field="cliente" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Total" field="total" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Criação" field="createdAt" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Status" field="status" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <div />
                </div>

                {orcamentos.map((o, i) => {
                  const onBaixarPdf = o.status !== 'CANCELADO'
                    ? () => handleBaixarPdf(o)
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

              <Paginacao pagina={page} totalPaginas={totalPages} ultima={ultima} carregando={loading} onMudar={irParaPagina}
                esquerda={<span data-testid="total-registros">{totalElements} {totalElements === 1 ? 'orçamento' : 'orçamentos'}</span>} />
            </>
          )}
        </>
      )}

      <RetryCooldownModal
        open={!!downloadRetry.erro}
        mensagem={downloadRetry.erro ?? ''}
        cooldownRestante={downloadRetry.cooldownRestante}
        executando={downloadRetry.executando}
        onTentarNovamente={downloadRetry.tentarNovamente}
        onClose={downloadRetry.dispensarErro}
      />

    </AppLayout>
  )
}
