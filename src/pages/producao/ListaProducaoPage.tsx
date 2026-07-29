import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import { Plus, Search, Factory, AlertTriangle, Play, Pencil, Ban, PauseCircle, CheckCircle2, RotateCcw, Layers, Check, List, LayoutGrid, ArrowUp, ArrowDown, Calendar, Eye, EyeOff, Columns3 } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { producaoService } from '../../services/producaoService'
import { getBadgeEstado } from '../../utils/badges'
import { useToast } from '../../hooks/useToast'
import { isDivisaoResponse, isConfirmacaoEstoqueNegativoResponse } from '../../types/producao'
import type { ProducaoResumo, EstadoProducao, DivisaoResponse, AvisoEstoqueNegativo } from '../../types/producao'
import IniciarProducaoModal from '../../components/producao/IniciarProducaoModal'
import TravarProducaoModal from '../../components/producao/TravarProducaoModal'
import RetormarProducaoModal from '../../components/producao/RetormarProducaoModal'
import FinalizarProducaoModal from '../../components/producao/FinalizarProducaoModal'
import CancelarProducaoModal from '../../components/producao/CancelarProducaoModal'
import CancelarProducaoConsumoModal from '../../components/producao/CancelarProducaoConsumoModal'
import AgruparProducoesModal from '../../components/producao/AgruparProducoesModal'
import ModalDivisao from '../../components/producao/ModalDivisao'
import ConfirmarEstoqueNegativoModal from '../../components/producao/ConfirmarEstoqueNegativoModal'
import KanbanBoard from '../../components/kanban/KanbanBoard'
import type { KanbanColumn } from '../../components/kanban/KanbanBoard'

type TipoModal = 'iniciar' | 'travar' | 'retomar' | 'finalizar' | 'cancelar'
type ViewMode = 'lista' | 'kanban'

// Ordem e conjunto fixo por decisão de produto (substitui a fusão CANCELADA/NAO_REALIZADA do #159,
// ver contexto "Coluna própria NÃO_REALIZADA no Kanban"). NAO_REALIZADA é a única oculta por padrão
// — filtrada de `colunasKanban` em ListaProducaoPage, nunca removida daqui.
const KANBAN_COLUMNS_PRODUCAO: KanbanColumn[] = [
  { id: 'AGUARDANDO_INICIO', label: 'Aguardando início', headerStyle: { background: '#fffbeb', borderColor: '#fde68a' } },
  { id: 'EM_ANDAMENTO',      label: 'Em andamento',      headerStyle: { background: '#eff6ff', borderColor: '#bfdbfe' } },
  { id: 'TRAVADA',           label: 'Travada',           headerStyle: { background: '#fef2f2', borderColor: '#fecaca' } },
  { id: 'FINALIZADA',        label: 'Finalizada',        headerStyle: { background: '#f0fdf4', borderColor: '#bbf7d0' } },
  { id: 'CANCELADA',         label: 'Cancelada',         headerStyle: { background: '#f8fafc', borderColor: '#e2e8f0' } },
  { id: 'NAO_REALIZADA',     label: 'Não realizada',     headerStyle: { background: '#fafaf9', borderColor: '#e7e5e4' } },
]

type TransicaoKanban = { tipo: 'modal'; modal: TipoModal } | { tipo: 'navegar' } | { tipo: 'direto' }

const TRANSICOES_KANBAN: Record<string, Record<string, TransicaoKanban>> = {
  AGUARDANDO_INICIO: {
    EM_ANDAMENTO: { tipo: 'modal', modal: 'iniciar' },
    CANCELADA:    { tipo: 'modal', modal: 'cancelar' },
  },
  EM_ANDAMENTO: {
    TRAVADA:    { tipo: 'modal', modal: 'travar' },
    FINALIZADA: { tipo: 'modal', modal: 'finalizar' },
    CANCELADA:  { tipo: 'navegar' },
  },
  TRAVADA: {
    EM_ANDAMENTO: { tipo: 'direto' },
    CANCELADA:    { tipo: 'navegar' },
  },
}

function ProducaoKanbanCard({ producao, isDragging, onClick }: { producao: ProducaoResumo; isDragging: boolean; onClick: () => void }) {
  const nomesProdutos = producao.produtos.map(p => p.nomeProduto).join(', ')
  const temBloqueio = producao.alertasInsumos.some(a => a.situacao === 'BLOQUEIO_FUTURO')
  const temAviso = producao.alertasInsumos.some(a => a.situacao === 'AVISO')

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-[10px] border border-line bg-[#FCFBF9] px-3 py-2.5 transition-shadow duration-100',
        isDragging ? 'shadow-[0_14px_28px_-10px_rgba(0,0,0,0.28)]' : 'shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-dark [font-variant-numeric:tabular-nums]">{producao.identificador}</span>
        {(temBloqueio || temAviso) && <AlertTriangle size={14} className={temBloqueio ? 'text-danger' : 'text-warning'} />}
      </div>
      <div className="line-clamp-2 text-[12.5px] leading-[1.4] text-body">{nomesProdutos}</div>
      <div className="mt-1.5 text-[11.5px] text-muted">{fmtData(producao.dataTerminoPrevista)}</div>
    </div>
  )
}

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

type SortField = 'dataInicio' | 'estado' | 'produto' | 'quantidade'

function SortableHeader({ label, field, activeField, dir, onSort }: {
  label: string
  field: SortField
  activeField: SortField | null
  dir: 'asc' | 'desc'
  onSort: (field: SortField) => void
}) {
  const ativo = activeField === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={clsx(
        'flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-[inherit] text-[11.5px] font-semibold uppercase tracking-[0.04em] transition-colors duration-100',
        ativo ? 'text-body' : 'text-faint hover:text-body'
      )}
    >
      {label}
      {ativo && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  )
}

function AlertaIcones({ producao }: { producao: ProducaoResumo }) {
  if (producao.alertasInsumos.length === 0) return null
  const temBloqueio = producao.alertasInsumos.some(a => a.situacao === 'BLOQUEIO_FUTURO')
  const temAviso = producao.alertasInsumos.some(a => a.situacao === 'AVISO')
  if (!temBloqueio && !temAviso) return null

  return (
    <div className="flex items-center gap-1.5">
      {temBloqueio && <AlertTriangle size={16} className="text-danger" />}
      {temAviso && <AlertTriangle size={16} className="text-warning" />}
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
  const badge = getBadgeEstado(producao.estado, producao.historicoStatus)
  const menuItems = menuItemsParaEstado(producao, navigate, onCancelar, abrirModal)
  const nomesProdutos = producao.produtos.map(p => p.nomeProduto).join(', ')
  const agrupavel = ESTADOS_AGRUPAVEIS.includes(producao.estado)
  const quantidadeTotal = producao.produtos.reduce((soma, p) => soma + p.quantidade, 0)

  return (
    <div
      className="hidden cursor-pointer grid-cols-[90px_1.3fr_64px_1fr_1fr_50px_44px] items-center gap-3.5 border-b border-line px-[18px] py-3.5 transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid"
      onClick={onVerDetalhes}
    >
      <span className="text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">
        {producao.identificador}
      </span>

      <span className="line-clamp-2 overflow-hidden text-sm text-body">
        {nomesProdutos}
      </span>

      <span className="text-[13px] text-muted [font-variant-numeric:tabular-nums]">
        {quantidadeTotal}
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
  const badge = getBadgeEstado(producao.estado, producao.historicoStatus)
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
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dataInicioDe, setDataInicioDe] = useState('')
  const [dataInicioAte, setDataInicioAte] = useState('')

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
  const [barraSelecaoOculta, setBarraSelecaoOculta] = useState(false)
  const [modalCancelarConsumoId, setModalCancelarConsumoId] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('lista')
  // Controle de colunas visíveis do Kanban — diferente do filtro de estado (`filtro`) já
  // existente: este decide QUAIS colunas aparecem no board, não o que é buscado da API.
  // NAO_REALIZADA é a única coluna opcional (oculta por padrão, Cenário 199/200).
  const [mostrarColunaNaoRealizada, setMostrarColunaNaoRealizada] = useState(false)
  const [kanbanProducoes, setKanbanProducoes] = useState<ProducaoResumo[]>([])
  const [kanbanLoading, setKanbanLoading] = useState(false)
  const [kanbanError, setKanbanError] = useState<string | null>(null)
  const [divisaoResult, setDivisaoResult] = useState<DivisaoResponse | null>(null)
  const [avisoKanban, setAvisoKanban] = useState<{ producaoId: string; avisos: AvisoEstoqueNegativo[] } | null>(null)
  const [confirmandoAvisoKanban, setConfirmandoAvisoKanban] = useState(false)

  const carregar = useCallback(async (pg: number, estadoFiltro: EstadoProducao | '', q: string, sort: string | undefined, deIni: string, ateIni: string) => {
    try {
      const res = await producaoService.listar({
        busca: q.trim() || undefined,
        estado: estadoFiltro || undefined,
        dataInicioDe: deIni || undefined,
        dataInicioAte: ateIni || undefined,
        sort,
        page: pg,
        size: 20,
      })
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

  const sortParam = sortField ? `${sortField},${sortDir}` : undefined

  useEffect(() => {
    setLoading(true)
    const delay = query.trim() ? 300 : 0
    const t = setTimeout(() => {
      carregar(0, filtro, query, sortParam, dataInicioDe, dataInicioAte).finally(() => setLoading(false))
    }, delay)
    return () => clearTimeout(t)
  }, [filtro, query, sortParam, dataInicioDe, dataInicioAte, carregar])

  const carregarKanban = useCallback(async () => {
    setKanbanLoading(true)
    try {
      const res = await producaoService.listar({
        busca: query.trim() || undefined,
        estado: filtro || undefined,
        dataInicioDe: dataInicioDe || undefined,
        dataInicioAte: dataInicioAte || undefined,
        page: 0,
        size: 100,
      })
      setKanbanProducoes(res.content)
      setKanbanError(null)
    } catch {
      setKanbanError('Não foi possível carregar as produções.')
    } finally {
      setKanbanLoading(false)
    }
  }, [query, filtro, dataInicioDe, dataInicioAte])

  useEffect(() => {
    if (viewMode !== 'kanban') return
    const delay = query.trim() ? 300 : 0
    const t = setTimeout(() => { carregarKanban() }, delay)
    return () => clearTimeout(t)
  }, [viewMode, query, filtro, dataInicioDe, dataInicioAte, carregarKanban])

  const handleFiltroChange = (value: EstadoProducao | '') => {
    setFiltro(value)
    setProducoes([])
    setPage(0)
  }

  const handleDataInicioDeChange = (value: string) => {
    setDataInicioDe(value)
    setProducoes([])
    setPage(0)
  }

  const handleDataInicioAteChange = (value: string) => {
    setDataInicioAte(value)
    setProducoes([])
    setPage(0)
  }

  const handleLimparPeriodo = () => {
    setDataInicioDe('')
    setDataInicioAte('')
    setProducoes([])
    setPage(0)
  }

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setProducoes([])
    setPage(0)
  }

  const handleCarregarMais = async () => {
    setLoadingMore(true)
    await carregar(page + 1, filtro, query, sortParam, dataInicioDe, dataInicioAte)
    setLoadingMore(false)
  }

  const abrirModal = (tipo: TipoModal, producaoId: string) => setModal({ tipo, producaoId })
  const fecharModal = () => setModal(null)
  const handleSuccess = (mensagem: string) => {
    setToast(mensagem)
    setModal(null)
    if (viewMode === 'kanban') carregarKanban()
    else carregar(0, filtro, query, sortParam, dataInicioDe, dataInicioAte)
  }

  const handleFecharDivisao = () => {
    setDivisaoResult(null)
    handleSuccess('Produção dividida.')
  }

  const handleKanbanDrop = async (itemId: string, fromColumn: string, toColumn: string): Promise<boolean> => {
    const transicao = TRANSICOES_KANBAN[fromColumn]?.[toColumn]
    if (!transicao) return false

    if (transicao.tipo === 'modal') {
      abrirModal(transicao.modal, itemId)
      return true
    }
    if (transicao.tipo === 'navegar') {
      setModalCancelarConsumoId(itemId)
      return true
    }

    // tipo === 'direto': TRAVADA -> EM_ANDAMENTO via /retomar, sem modal
    try {
      const result = await producaoService.retomar(itemId)
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setAvisoKanban({ producaoId: itemId, avisos: result.avisos })
        return false
      }
      if (isDivisaoResponse(result)) {
        setDivisaoResult(result)
        return true
      }
      if (result.estado === 'EM_ANDAMENTO') {
        setToast('Produção retomada.')
        carregarKanban()
        return true
      }
      setToast('Insumos ainda bloqueantes — produção permanece travada.')
      return false
    } catch (err: any) {
      setToast(err.response?.data?.message || 'Erro ao retomar produção.')
      return false
    }
  }

  const fecharAvisoKanban = () => setAvisoKanban(null)
  const confirmarAvisoKanban = async () => {
    if (!avisoKanban) return
    setConfirmandoAvisoKanban(true)
    try {
      const result = await producaoService.retomar(avisoKanban.producaoId, {
        confirmarEstoqueNegativoInsumoIds: avisoKanban.avisos.map(a => a.componenteId),
      })
      setAvisoKanban(null)
      if (isDivisaoResponse(result)) {
        setDivisaoResult(result)
      } else if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setAvisoKanban({ producaoId: avisoKanban.producaoId, avisos: result.avisos })
      } else if (result.estado === 'EM_ANDAMENTO') {
        setToast('Produção retomada.')
        carregarKanban()
      } else {
        setToast('Insumos ainda bloqueantes — produção permanece travada.')
      }
    } catch (err: any) {
      setToast(err.response?.data?.message || 'Erro ao retomar produção.')
    } finally {
      setConfirmandoAvisoKanban(false)
    }
  }

  const handleCancelar = (producao: ProducaoResumo) => {
    if (producao.estado === 'AGUARDANDO_INICIO') {
      abrirModal('cancelar', producao.id)
    } else {
      setModalCancelarConsumoId(producao.id)
    }
  }

  const fecharModalCancelarConsumo = () => setModalCancelarConsumoId(null)
  const handleSuccessCancelarConsumo = (mensagem: string) => {
    setToast(mensagem)
    setModalCancelarConsumoId(null)
    if (viewMode === 'kanban') carregarKanban()
    else carregar(0, filtro, query, sortParam, dataInicioDe, dataInicioAte)
  }

  const encerrarSelecao = () => {
    setModoAgrupamento(false)
    setSelecionadas(new Set())
    setBarraSelecaoOculta(false)
  }

  const abrirModalAgrupar = () => {
    setBarraSelecaoOculta(true)
    setModalAgrupar(true)
  }

  const fecharModalAgrupar = () => {
    setModalAgrupar(false)
    setBarraSelecaoOculta(false)
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
    carregar(0, filtro, query, sortParam, dataInicioDe, dataInicioAte)
  }

  const producoesSelecionadas = producoes.filter(p => selecionadas.has(p.id))

  const searchActive = query.trim().length > 0
  const periodoAtivo = !!(dataInicioDe || dataInicioAte)
  const globalEmpty = !loading && producoes.length === 0 && filtro === '' && !searchActive && !periodoAtivo
  const filtroEmpty = !loading && producoes.length === 0 && (filtro !== '' || searchActive || periodoAtivo)

  // Filtrar pelo estado NAO_REALIZADA implica querer ver essas produções — evita o board vir
  // vazio sem explicação se a coluna ainda estiver oculta quando esse filtro é selecionado.
  const colunaNaoRealizadaVisivel = mostrarColunaNaoRealizada || filtro === 'NAO_REALIZADA'
  const colunasKanban = KANBAN_COLUMNS_PRODUCAO.filter(c => c.id !== 'NAO_REALIZADA' || colunaNaoRealizadaVisivel)

  return (
    <AppLayout active="producao" fullHeight={viewMode === 'kanban'}>
      <div className="mb-[22px] flex flex-shrink-0 flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Produções</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Acompanhe e gerencie o andamento das produções.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-[38px] rounded-lg border-[1.5px] border-line bg-white p-[3px]">
            <button
              onClick={() => setViewMode('lista')}
              className={clsx(
                'flex h-full cursor-pointer items-center gap-1.5 rounded-[6px] border-none px-3 font-[inherit] text-[13px] font-semibold transition-colors duration-150',
                viewMode === 'lista' ? 'bg-teal text-white' : 'bg-transparent text-body hover:bg-[#FAF8F5]'
              )}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'flex h-full cursor-pointer items-center gap-1.5 rounded-[6px] border-none px-3 font-[inherit] text-[13px] font-semibold transition-colors duration-150',
                viewMode === 'kanban' ? 'bg-teal text-white' : 'bg-transparent text-body hover:bg-[#FAF8F5]'
              )}
            >
              <LayoutGrid size={15} /> Kanban
            </button>
          </div>
          {viewMode === 'lista' && !modoAgrupamento && (
            <Button variant="ghost" icon={<Layers size={16} />} onClick={() => setModoAgrupamento(true)}>
              Agrupar
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/producao/nova')}>
            Nova Produção
          </Button>
        </div>
      </div>

      {viewMode === 'lista' && error && (
        <div className="mb-[18px] rounded-input border border-[#F5C4B8] bg-[#FCF0EC] px-[18px] py-3.5 text-sm text-danger">
          {error}
        </div>
      )}

      {viewMode === 'lista' && (loading ? (
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

            <div>
              <div className="mb-[7px] flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Calendar size={13} /> Data de início
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="date"
                  value={dataInicioDe}
                  max={dataInicioAte || undefined}
                  onChange={e => handleDataInicioDeChange(e.target.value)}
                  aria-label="Data de início — de"
                  className="h-11 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
                <span className="text-[13px] text-muted">até</span>
                <input
                  type="date"
                  value={dataInicioAte}
                  min={dataInicioDe || undefined}
                  onChange={e => handleDataInicioAteChange(e.target.value)}
                  aria-label="Data de início — até"
                  className="h-11 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
                {periodoAtivo && (
                  <button
                    type="button"
                    onClick={handleLimparPeriodo}
                    className="h-11 cursor-pointer whitespace-nowrap rounded-input border-none bg-transparent px-1 font-[inherit] text-[13px] font-semibold text-teal"
                  >
                    Limpar período
                  </button>
                )}
              </div>
            </div>
          </div>

          {filtroEmpty ? (
            <div className="py-12 text-center text-sm text-muted">
              {searchActive
                ? <>Nenhuma produção encontrada para &ldquo;{query.trim()}&rdquo;.</>
                : periodoAtivo
                  ? <>Nenhuma produção encontrada neste período.</>
                  : <>Nenhuma produção encontrada para este filtro.</>
              }
            </div>
          ) : (
            <>
              <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="hidden grid-cols-[90px_1.3fr_64px_1fr_1fr_50px_44px] items-center gap-3.5 border-b border-line px-[18px] py-[13px] sm:grid">
                  <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Produção</div>
                  <SortableHeader label="Produtos" field="produto" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Qtd." field="quantidade" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Datas" field="dataInicio" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <SortableHeader label="Estado" field="estado" activeField={sortField} dir={sortDir} onSort={handleSortClick} />
                  <div />
                  <div />
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
      ))}

      {viewMode === 'kanban' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-[18px] flex flex-shrink-0 flex-col gap-3.5">
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

            <div>
              <div className="mb-[7px] flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Columns3 size={13} /> Colunas do quadro
              </div>
              <button
                type="button"
                onClick={() => setMostrarColunaNaoRealizada(v => !v)}
                aria-pressed={colunaNaoRealizadaVisivel}
                aria-label={`${colunaNaoRealizadaVisivel ? 'Ocultar' : 'Mostrar'} coluna Não realizada no quadro`}
                disabled={filtro === 'NAO_REALIZADA'}
                title={filtro === 'NAO_REALIZADA' ? 'Coluna sempre visível enquanto o filtro "Não realizada" estiver ativo' : undefined}
                className={clsx(
                  'flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                  filtro === 'NAO_REALIZADA' && 'cursor-not-allowed opacity-70',
                  colunaNaoRealizadaVisivel ? 'border-teal bg-teal/[0.08] text-teal' : 'border-line bg-white text-muted hover:bg-[#FAF8F5]'
                )}
              >
                {colunaNaoRealizadaVisivel ? <Eye size={14} /> : <EyeOff size={14} />}
                Não realizada
              </button>
            </div>

            <div className="relative max-w-[420px]">
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

            <div>
              <div className="mb-[7px] flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Calendar size={13} /> Data de início
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="date"
                  value={dataInicioDe}
                  max={dataInicioAte || undefined}
                  onChange={e => handleDataInicioDeChange(e.target.value)}
                  aria-label="Data de início — de"
                  className="h-11 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
                <span className="text-[13px] text-muted">até</span>
                <input
                  type="date"
                  value={dataInicioAte}
                  min={dataInicioDe || undefined}
                  onChange={e => handleDataInicioAteChange(e.target.value)}
                  aria-label="Data de início — até"
                  className="h-11 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
                {periodoAtivo && (
                  <button
                    type="button"
                    onClick={handleLimparPeriodo}
                    className="h-11 cursor-pointer whitespace-nowrap rounded-input border-none bg-transparent px-1 font-[inherit] text-[13px] font-semibold text-teal"
                  >
                    Limpar período
                  </button>
                )}
              </div>
            </div>
          </div>

          {kanbanError && (
            <div className="mb-[18px] flex-shrink-0 rounded-input border border-[#F5C4B8] bg-[#FCF0EC] px-[18px] py-3.5 text-sm text-danger">
              {kanbanError}
            </div>
          )}

          {kanbanLoading ? (
            <div className="flex justify-center py-[60px] text-sm text-muted">
              Carregando…
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <KanbanBoard
                columns={colunasKanban}
                items={kanbanProducoes}
                getItemColumn={p => p.estado}
                renderCard={(p, isDragging) => (
                  <ProducaoKanbanCard producao={p} isDragging={isDragging} onClick={() => navigate(`/producao/${p.id}`)} />
                )}
                onDrop={handleKanbanDrop}
              />
            </div>
          )}
        </div>
      )}

      {modoAgrupamento && !barraSelecaoOculta && (
        <>
          <div className="h-20" />
          <div className="fixed inset-x-0 bottom-0 z-[150] flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-6 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <span className="text-sm font-semibold text-dark">
            {selecionadas.size} selecionada{selecionadas.size === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={encerrarSelecao}>Cancelar seleção</Button>
            <Button variant="primary" disabled={selecionadas.size < 2} onClick={abrirModalAgrupar}>
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
      {modalCancelarConsumoId && (
        <CancelarProducaoConsumoModal
          producaoId={modalCancelarConsumoId}
          onClose={fecharModalCancelarConsumo}
          onSuccess={handleSuccessCancelarConsumo}
        />
      )}
      {modalAgrupar && (
        <AgruparProducoesModal
          producoes={producoesSelecionadas}
          onClose={fecharModalAgrupar}
          onSuccess={handleSuccessAgrupar}
        />
      )}
      {divisaoResult && (
        <ModalDivisao
          producaoOriginal={divisaoResult.producaoOriginal}
          producaoA={divisaoResult.producaoA}
          producaoB={divisaoResult.producaoB}
          onClose={handleFecharDivisao}
        />
      )}
      {avisoKanban && (
        <ConfirmarEstoqueNegativoModal
          avisos={avisoKanban.avisos}
          confirming={confirmandoAvisoKanban}
          onClose={fecharAvisoKanban}
          onConfirm={confirmarAvisoKanban}
        />
      )}
    </AppLayout>
  )
}
