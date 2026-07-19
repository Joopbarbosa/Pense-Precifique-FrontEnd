import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import { Plus, Search, Factory, AlertTriangle, Play, Pencil, Ban, PauseCircle, CheckCircle2, RotateCcw, Layers, Check } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { producaoService } from '../../services/producaoService'
import { getBadgeEstado } from '../../utils/badges'
import { useToast } from '../../hooks/useToast'
import type { ProducaoResumo, EstadoProducao } from '../../types/producao'
import IniciarProducaoModal from '../../components/producao/IniciarProducaoModal'
import TravarProducaoModal from '../../components/producao/TravarProducaoModal'
import RetormarProducaoModal from '../../components/producao/RetormarProducaoModal'
import FinalizarProducaoModal from '../../components/producao/FinalizarProducaoModal'
import CancelarProducaoModal from '../../components/producao/CancelarProducaoModal'
import AgruparProducoesModal from '../../components/producao/AgruparProducoesModal'

type TipoModal = 'iniciar' | 'travar' | 'retomar' | 'finalizar' | 'cancelar'

const ESTADOS_AGRUPAVEIS: EstadoProducao[] = ['AGUARDANDO_INICIO', 'EM_ANDAMENTO', 'TRAVADA']

function SelecaoCheckbox({ checked, disabled, onToggle }: { checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onToggle() }}
      className={clsx(
        'grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-colors duration-100',
        disabled
          ? 'cursor-not-allowed border-line bg-line-soft opacity-50'
          : checked
            ? 'cursor-pointer border-teal bg-teal text-white'
            : 'cursor-pointer border-line bg-white'
      )}
    >
      {checked && <Check size={14} />}
    </button>
  )
}

const FILTERS: { label: string; value: EstadoProducao | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Aguardando início', value: 'AGUARDANDO_INICIO' },
  { label: 'Em andamento', value: 'EM_ANDAMENTO' },
  { label: 'Travada', value: 'TRAVADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Não realizada', value: 'NAO_REALIZADA' },
]

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function AlertaIcones({ producao }: { producao: ProducaoResumo }) {
  if (producao.alertasInsumos.length === 0) return null
  const temBloqueio = producao.alertasInsumos.some(a => a.situacao === 'BLOQUEIO_FUTURO')
  const temAviso = producao.alertasInsumos.some(a => a.situacao === 'AVISO')
  if (!temBloqueio && !temAviso) return null

  return (
    <div className="flex items-center gap-1.5">
      {temBloqueio && <AlertTriangle size={16} className="text-danger" />}
      {temAviso && <AlertTriangle size={16} className="text-[#C8721F]" />}
    </div>
  )
}

function menuItemsParaEstado(
  producao: ProducaoResumo,
  navigate: (path: string) => void,
  onCancelar: (producao: ProducaoResumo) => void,
  abrirModal: (tipo: TipoModal, producaoId: string) => void
): ActionMenuItem[] {
  switch (producao.estado) {
    case 'AGUARDANDO_INICIO':
      return [
        { label: 'Iniciar', icon: <Play size={15} />, onClick: () => abrirModal('iniciar', producao.id) },
        { label: 'Editar', icon: <Pencil size={15} />, onClick: () => navigate(`/producao/${producao.id}/editar`) },
        { label: 'Cancelar', icon: <Ban size={15} />, onClick: () => onCancelar(producao), danger: true, dividerBefore: true },
      ]
    case 'EM_ANDAMENTO':
      return [
        { label: 'Travar', icon: <PauseCircle size={15} />, onClick: () => abrirModal('travar', producao.id) },
        { label: 'Finalizar', icon: <CheckCircle2 size={15} />, onClick: () => abrirModal('finalizar', producao.id) },
        { label: 'Cancelar', icon: <Ban size={15} />, onClick: () => onCancelar(producao), danger: true, dividerBefore: true },
      ]
    case 'TRAVADA':
      return [
        { label: 'Retomar', icon: <RotateCcw size={15} />, onClick: () => abrirModal('retomar', producao.id) },
        { label: 'Cancelar', icon: <Ban size={15} />, onClick: () => onCancelar(producao), danger: true, dividerBefore: true },
      ]
    default:
      return []
  }
}

function ProducaoRow({ producao, onVerDetalhes, onCancelar, abrirModal, modoAgrupamento, selecionado, onToggleSelecao }: {
  producao: ProducaoResumo
  onVerDetalhes: () => void
  onCancelar: (producao: ProducaoResumo) => void
  abrirModal: (tipo: TipoModal, producaoId: string) => void
  modoAgrupamento: boolean
  selecionado: boolean
  onToggleSelecao: () => void
}) {
  const navigate = useNavigate()
  const badge = getBadgeEstado(producao.estado)
  const menuItems = menuItemsParaEstado(producao, navigate, onCancelar, abrirModal)
  const nomesProdutos = producao.produtos.map(p => p.nomeProduto).join(', ')
  const agrupavel = ESTADOS_AGRUPAVEIS.includes(producao.estado)

  return (
    <div
      className="hidden cursor-pointer grid-cols-[90px_1.6fr_1.1fr_1.1fr_50px_44px] items-center gap-3.5 border-b border-line px-[18px] py-3.5 transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid"
      onClick={onVerDetalhes}
    >
      <span className="text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">
        {producao.identificador}
      </span>

      <span className="line-clamp-2 overflow-hidden text-sm text-body">
        {nomesProdutos}
      </span>

      <span className="text-[13px] text-muted">
        {fmtData(producao.dataInicio)} – {fmtData(producao.dataTerminoPrevista)}
      </span>

      <span
        className="inline-flex h-7 w-fit items-center whitespace-nowrap rounded-full px-[11px] text-[12.5px] font-semibold"
        style={{ background: badge.bg, color: badge.fg }}
      >
        {badge.label}
      </span>

      <AlertaIcones producao={producao} />

      {modoAgrupamento ? (
        <SelecaoCheckbox checked={selecionado} disabled={!agrupavel} onToggle={onToggleSelecao} />
      ) : menuItems.length > 0 ? (
        <div onClick={e => e.stopPropagation()}>
          <ActionMenu items={menuItems} align="right" />
        </div>
      ) : <span />}
    </div>
  )
}

function ProducaoCard({ producao, index, onVerDetalhes, onCancelar, abrirModal, modoAgrupamento, selecionado, onToggleSelecao }: {
  producao: ProducaoResumo
  index: number
  onVerDetalhes: () => void
  onCancelar: (producao: ProducaoResumo) => void
  abrirModal: (tipo: TipoModal, producaoId: string) => void
  modoAgrupamento: boolean
  selecionado: boolean
  onToggleSelecao: () => void
}) {
  const navigate = useNavigate()
  const badge = getBadgeEstado(producao.estado)
  const menuItems = menuItemsParaEstado(producao, navigate, onCancelar, abrirModal)
  const nomesProdutos = producao.produtos.map(p => p.nomeProduto).join(', ')
  const agrupavel = ESTADOS_AGRUPAVEIS.includes(producao.estado)

  return (
    <div
      className="block cursor-pointer border-b border-line px-[18px] py-4 sm:hidden"
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.05}s` }}
      onClick={onVerDetalhes}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-dark">{producao.identificador}</span>
            <AlertaIcones producao={producao} />
          </div>
          <div className="line-clamp-2 mb-2 text-sm text-body">{nomesProdutos}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
            <span className="text-[12.5px] text-muted">
              {fmtData(producao.dataInicio)} – {fmtData(producao.dataTerminoPrevista)}
            </span>
          </div>
        </div>
        {modoAgrupamento ? (
          <div className="flex-shrink-0">
            <SelecaoCheckbox checked={selecionado} disabled={!agrupavel} onToggle={onToggleSelecao} />
          </div>
        ) : menuItems.length > 0 && (
          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
            <ActionMenu items={menuItems} align="right" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ListaProducaoPage() {
  const navigate = useNavigate()
  const { toast, setToast } = useToast()
  const [filtro, setFiltro] = useState<EstadoProducao | ''>('')
  const [query, setQuery] = useState('')

  const [producoes, setProducoes] = useState<ProducaoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ tipo: TipoModal; producaoId: string } | null>(null)
  const [modoAgrupamento, setModoAgrupamento] = useState(false)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [modalAgrupar, setModalAgrupar] = useState(false)

  const carregar = useCallback(async (pg: number, estadoFiltro: EstadoProducao | '', q: string) => {
    try {
      const res = await producaoService.listar({ busca: q.trim() || undefined, estado: estadoFiltro || undefined, page: pg, size: 20 })
      if (pg === 0) {
        setProducoes(res.content)
      } else {
        setProducoes(prev => [...prev, ...res.content])
      }
      setHasMore(!res.last)
      setPage(pg)
      setError(null)
    } catch {
      setError('Não foi possível carregar as produções.')
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

  const handleFiltroChange = (value: EstadoProducao | '') => {
    setFiltro(value)
    setProducoes([])
    setPage(0)
  }

  const handleCarregarMais = async () => {
    setLoadingMore(true)
    await carregar(page + 1, filtro, query)
    setLoadingMore(false)
  }

  const abrirModal = (tipo: TipoModal, producaoId: string) => setModal({ tipo, producaoId })
  const fecharModal = () => setModal(null)
  const handleSuccess = (mensagem: string) => {
    setToast(mensagem)
    setModal(null)
    carregar(0, filtro, query)
  }

  const handleCancelar = (producao: ProducaoResumo) => {
    if (producao.estado === 'AGUARDANDO_INICIO') {
      abrirModal('cancelar', producao.id)
    } else {
      navigate(`/producao/${producao.id}/cancelar`)
    }
  }

  const encerrarSelecao = () => {
    setModoAgrupamento(false)
    setSelecionadas(new Set())
  }

  const toggleSelecao = (id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSuccessAgrupar = (mensagem: string) => {
    setToast(mensagem)
    setModalAgrupar(false)
    encerrarSelecao()
    carregar(0, filtro, query)
  }

  const producoesSelecionadas = producoes.filter(p => selecionadas.has(p.id))

  const searchActive = query.trim().length > 0
  const globalEmpty = !loading && producoes.length === 0 && filtro === '' && !searchActive
  const filtroEmpty = !loading && producoes.length === 0 && (filtro !== '' || searchActive)

  return (
    <AppLayout active="producao">
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Produções</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Acompanhe e gerencie o andamento das produções.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {!modoAgrupamento && (
            <Button variant="ghost" icon={<Layers size={16} />} onClick={() => setModoAgrupamento(true)}>
              Agrupar
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/producao/nova')}>
            Nova Produção
          </Button>
        </div>
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
          icon={<Factory size={20} />}
          title="Nenhuma produção cadastrada"
          description="Crie sua primeira produção para começar a acompanhar o andamento dos pedidos."
          action={{ label: 'Criar produção', icon: <Plus size={16} />, onClick: () => navigate('/producao/nova') }}
        />
      ) : (
        <>
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

            <div className="relative min-w-[200px] max-w-[420px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por produto…"
                className="h-11 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </div>
          </div>

          {filtroEmpty ? (
            <div className="py-12 text-center text-sm text-muted">
              {searchActive
                ? <>Nenhuma produção encontrada para &ldquo;{query.trim()}&rdquo;.</>
                : <>Nenhuma produção encontrada para este filtro.</>
              }
            </div>
          ) : (
            <>
              <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="hidden grid-cols-[90px_1.6fr_1.1fr_1.1fr_50px_44px] items-center gap-3.5 border-b border-line px-[18px] py-[13px] sm:grid">
                  {['Produção', 'Produtos', 'Datas', 'Estado', '', ''].map((h, k) => (
                    <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
                      {h}
                    </div>
                  ))}
                </div>

                {producoes.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <ProducaoRow
                      producao={p}
                      onVerDetalhes={() => navigate(`/producao/${p.id}`)}
                      onCancelar={handleCancelar}
                      abrirModal={abrirModal}
                      modoAgrupamento={modoAgrupamento}
                      selecionado={selecionadas.has(p.id)}
                      onToggleSelecao={() => toggleSelecao(p.id)}
                    />
                    <ProducaoCard
                      producao={p}
                      index={i}
                      onVerDetalhes={() => navigate(`/producao/${p.id}`)}
                      onCancelar={handleCancelar}
                      abrirModal={abrirModal}
                      modoAgrupamento={modoAgrupamento}
                      selecionado={selecionadas.has(p.id)}
                      onToggleSelecao={() => toggleSelecao(p.id)}
                    />
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-3.5 flex items-center justify-between">
                <span className="text-[12.5px] text-muted">
                  {producoes.length} {producoes.length === 1 ? 'produção' : 'produções'}
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

      {modoAgrupamento && (
        <>
          <div className="h-20" />
          <div className="fixed inset-x-0 bottom-0 z-[150] flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-6 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <span className="text-sm font-semibold text-dark">
            {selecionadas.size} selecionada{selecionadas.size === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={encerrarSelecao}>Cancelar seleção</Button>
            <Button variant="primary" disabled={selecionadas.size < 2} onClick={() => setModalAgrupar(true)}>
              Agrupar selecionadas
            </Button>
          </div>
        </div>
        </>
      )}

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      {modal?.tipo === 'iniciar' && (
        <IniciarProducaoModal producaoId={modal.producaoId} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal?.tipo === 'travar' && (
        <TravarProducaoModal producaoId={modal.producaoId} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal?.tipo === 'retomar' && (
        <RetormarProducaoModal producaoId={modal.producaoId} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal?.tipo === 'finalizar' && (
        <FinalizarProducaoModal producaoId={modal.producaoId} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal?.tipo === 'cancelar' && (
        <CancelarProducaoModal producaoId={modal.producaoId} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modalAgrupar && (
        <AgruparProducoesModal
          producoes={producoesSelecionadas}
          onClose={() => setModalAgrupar(false)}
          onSuccess={handleSuccessAgrupar}
        />
      )}
    </AppLayout>
  )
}
