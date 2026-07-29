import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import ActionMenu from '../../components/shared/ActionMenu'
import { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import {
  AlertCircle, Eye, Pencil, Power, ShoppingCart, Plus, X, Search, Trash2,
  ArrowRight, Layers, ArrowDown, Box, CheckCircle, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InsumoResponse } from '../../types/insumo'
import type { ImpactoAgregadoResponse } from '../../types/loteCompra'
import { insumoService } from '../../services/insumoService'
import { loteCompraService } from '../../services/loteCompraService'
import { useToast } from '../../hooks/useToast'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'

interface ItemCarrinho {
  insumo: InsumoResponse
  qtd: string
  preco: string
}

const FILTERS = ['Todos', 'Ativos', 'Inativos', 'Estoque baixo', 'Estoque negativo', 'Estoque positivo']

const isLow = (o: InsumoResponse) =>
  o.ativo && o.estoqueMinimo != null && o.estoqueAtual < o.estoqueMinimo

const isNegative = (o: InsumoResponse) => o.estoqueAtual < 0

const isPositive = (o: InsumoResponse) => o.estoqueAtual > 0

const num = (s: string) => parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2),
    maximumFractionDigits: dec != null ? dec : 3,
  })

function InsumoStatusBadge({ insumo, small = false }: { insumo: InsumoResponse; small?: boolean }) {
  const low = isLow(insumo)

  if (low) return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-warning-bg px-2.5 font-semibold text-warning',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      <AlertCircle size={13} /> Estoque baixo
    </span>
  )

  if (!insumo.ativo) return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] rounded-full bg-line-soft px-2.5 font-semibold text-subtle',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      Inativo
    </span>
  )

  return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] rounded-full bg-teal/10 px-2.5 font-semibold text-teal',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      Ativo
    </span>
  )
}

function InsumoRow({ insumo, index, onVer, onEditar, onDesativar }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDesativar: () => void
}) {
  const low = isLow(insumo)

  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <Eye size={18} />,    onClick: onVer },
    { label: 'Editar',       icon: <Pencil size={16} />, onClick: onEditar },
    { label: 'Desativar',    icon: <Power size={16} />,  onClick: onDesativar, danger: true, dividerBefore: true },
  ]

  return (
    <div
      className={clsx(
        'hidden cursor-pointer grid-cols-[0.7fr_2fr_0.55fr_0.85fr_0.8fr_1fr_1fr_40px] items-center gap-3 border-b border-line px-[18px] py-[13px] transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid',
        !insumo.ativo && 'opacity-65'
      )}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
      onClick={onVer}
      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
    >
      <div className="text-[13.5px] font-semibold text-body [font-variant-numeric:tabular-nums]">
        {insumo.identificador}
      </div>

      <div className="min-w-0">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-dark">
          {insumo.nome}
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted">{insumo.marca}</div>
      </div>

      <div className="text-[13.5px] text-body">{insumo.unidadeMedida}</div>

      <div className={clsx('text-sm font-semibold [font-variant-numeric:tabular-nums]', low ? 'text-warning' : 'text-dark')}>
        {insumo.estoqueAtual}
        {low && <span className="ml-[5px] text-[11px] text-[#E8973A]">⚠</span>}
      </div>

      <div className="text-[13.5px] text-muted [font-variant-numeric:tabular-nums]">
        {insumo.estoqueMinimo ?? '—'}
      </div>

      <div className="text-[13.5px] font-semibold text-body [font-variant-numeric:tabular-nums]">
        {moeda(insumo.custoUnitario, 2)}/{insumo.unidadeMedida}
      </div>

      <div><InsumoStatusBadge insumo={insumo} /></div>

      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function InsumoCard({ insumo, index, onVer, onEditar, onDesativar }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDesativar: () => void
}) {
  const low = isLow(insumo)

  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <Eye size={18} />,    onClick: onVer },
    { label: 'Editar',       icon: <Pencil size={16} />, onClick: onEditar },
    { label: 'Desativar',    icon: <Power size={16} />,  onClick: onDesativar, danger: true, dividerBefore: true },
  ]

  return (
    <div
      className={clsx('block cursor-pointer border-b border-line px-[18px] py-4 sm:hidden', !insumo.ativo && 'opacity-65')}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
      onClick={onVer}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">{insumo.identificador}</div>
          <div className="mt-0.5 text-[14.5px] font-semibold text-dark">{insumo.nome}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{insumo.marca}</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <InsumoStatusBadge insumo={insumo} small />
            <span className="flex items-center gap-1 text-[12.5px] text-body">
              Estoque: <strong className={clsx('font-semibold', low ? 'text-warning' : 'text-dark')}>{insumo.estoqueAtual} {insumo.unidadeMedida}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Custo</div>
            <div className="text-sm font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(insumo.custoUnitario, 2)}/{insumo.unidadeMedida}</div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <ActionMenu items={menuItems} align="right" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CompraLoteModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (impacto: ImpactoAgregadoResponse) => void
}) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<InsumoResponse[]>([])
  const [openList, setOpenList] = useState(false)
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)
  const buscaInputRef = useRef<HTMLInputElement>(null)

  const focarBusca = () => {
    buscaInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    buscaInputRef.current?.focus()
  }

  useEffect(() => {
    if (!openList) return
    setLoadingBusca(true)
    const delay = busca.trim() ? 300 : 0
    const timer = setTimeout(() => {
      insumoService.buscarParaCarrinho(busca.trim())
        .then(data => setResultadosBusca(data))
        .catch(() => setResultadosBusca([]))
        .finally(() => setLoadingBusca(false))
    }, delay)
    return () => clearTimeout(timer)
  }, [busca, openList])

  const disponiveis = resultadosBusca.filter(i =>
    i.ativo && !itens.find(it => it.insumo.id === i.id)
  )

  const addItem = (insumo: InsumoResponse) => {
    setItens(prev => [...prev, { insumo, qtd: '', preco: '' }])
    setBusca('')
    setOpenList(false)
    setResultadosBusca([])
  }

  const updateItem = (id: string, field: 'qtd' | 'preco', value: string) => {
    setItens(prev => prev.map(it =>
      it.insumo.id === id ? { ...it, [field]: value.replace(/[^\d.,]/g, '') } : it
    ))
  }

  const removeItem = (id: string) => setItens(prev => prev.filter(it => it.insumo.id !== id))

  const podeConfirmar = itens.length > 0 && itens.every(it => num(it.qtd) > 0 && num(it.preco) > 0)

  const confirmar = async () => {
    setLoadingConfirm(true)
    try {
      const response = await loteCompraService.registrar({
        itens: itens.map(it => ({
          insumoId: it.insumo.id,
          quantidadeComprada: num(it.qtd),
          precoTotalPago: num(it.preco),
        })),
      })
      onSuccess(response)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingConfirm(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-[1.5px]">
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-[min(620px,100%)] animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]">

        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-[13px]">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-orange/[0.12] text-orange">
              <ShoppingCart size={17} />
            </span>
            <div>
              <div className="text-[16.5px] font-bold tracking-[-0.01em] text-dark">Registrar compras</div>
              <div className="mt-0.5 text-[12.5px] text-muted">Adicione os insumos que você comprou.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          <div className="relative">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                <Search size={16} />
              </span>
              <input
                ref={buscaInputRef}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onFocus={() => setOpenList(true)}
                onBlur={() => setTimeout(() => setOpenList(false), 150)}
                placeholder="Buscar insumo para adicionar…"
                className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-10 pr-3.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </div>
            {openList && (
              <div className="absolute inset-x-0 top-[50px] z-20 max-h-[300px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
                {loadingBusca ? (
                  <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
                ) : disponiveis.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum insumo encontrado</div>
                ) : disponiveis.map(i => (
                  <button
                    key={i.id}
                    onMouseDown={() => addItem(i)}
                    className="flex w-full items-center justify-between gap-2.5 rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-[#F7F5F1]"
                  >
                    <span className="text-[13.5px] font-semibold text-dark">
                      {i.nome}{i.marca ? <span className="font-normal text-muted"> · {i.marca}</span> : null}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted">{i.unidadeMedida}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {itens.length === 0 ? (
            <div className="mt-4 rounded-xl border-[1.5px] border-dashed border-line px-7 py-7 text-center text-[13.5px] text-muted">
              Nenhum insumo adicionado ainda. Use a busca acima.
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              {itens.map(it => {
                const q = num(it.qtd)
                const p = num(it.preco)
                const novoCusto = q > 0 ? p / q : null

                return (
                  <div key={it.insumo.id} className="rounded-xl border border-line bg-[#FCFBF9] px-4 py-3.5">
                    <div className="mb-2.5 flex items-center justify-between gap-2.5">
                      <span className="text-sm font-semibold text-dark">{it.insumo.nome}</span>
                      <button onClick={() => removeItem(it.insumo.id)} className="flex border-none bg-transparent text-faint hover:text-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative flex-[1_1_110px]">
                        <input
                          value={it.qtd}
                          onChange={e => updateItem(it.insumo.id, 'qtd', e.target.value)}
                          inputMode="decimal"
                          placeholder="Qtd"
                          className="h-[42px] w-full rounded-[9px] border-[1.5px] border-line pl-3 pr-[50px] font-[inherit] text-sm text-dark outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-[#A8A49C]">
                          {it.insumo.unidadeMedida}
                        </span>
                      </div>
                      <div className="relative flex-[1_1_130px]">
                        <span className="absolute inset-y-0 left-0 grid w-[38px] place-items-center rounded-l-[9px] border-r border-line bg-[#FAF8F5] text-[13px] font-semibold text-[#6B6860]">
                          R$
                        </span>
                        <input
                          value={it.preco}
                          onChange={e => updateItem(it.insumo.id, 'preco', e.target.value)}
                          inputMode="decimal"
                          placeholder="0,00"
                          className="h-[42px] w-full rounded-[9px] border-[1.5px] border-line pl-[46px] pr-3 font-[inherit] text-sm text-dark outline-none"
                        />
                      </div>
                      <div className="flex-[1_1_130px] text-right">
                        {novoCusto != null ? (
                          <span className="text-[13px] font-bold text-teal">
                            {moeda(novoCusto)} /{it.insumo.unidadeMedida}
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-muted">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={focarBusca}
                className="flex h-11 items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed border-[#C9C5BC] bg-transparent font-[inherit] text-[13.5px] font-semibold text-body transition-colors duration-100 hover:border-teal hover:bg-[#FAF8F5]"
              >
                <Plus size={16} /> Adicionar mais um insumo
              </button>
            </div>
          )}

        </div>

        <div className="flex flex-wrap justify-end gap-[11px] border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={loadingConfirm}>Cancelar</Button>
          <Button variant="primary" disabled={!podeConfirmar || loadingConfirm} iconRight={loadingConfirm ? undefined : <ArrowRight size={17} />} onClick={confirmar}>
            {loadingConfirm
              ? <span className="flex items-center gap-2"><Spinner size={16} trackColor="rgba(255,255,255,0.3)" /> Registrando…</span>
              : `Confirmar${itens.length > 0 ? ` (${itens.length})` : ''} e ver impacto`
            }
          </Button>
        </div>
      </div>
    </div>
  )
}

function ImpactoLoteModal({ impacto, onClose }: {
  impacto: ImpactoAgregadoResponse
  onClose: () => void
}) {
  const { insumosAtualizados } = impacto

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-[1.5px]">
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-[min(560px,100%)] animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]">

        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-[13px]">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-teal/[0.12] text-teal">
              <Layers size={18} />
            </span>
            <div>
              <div className="text-[16.5px] font-bold tracking-[-0.01em] text-dark">Compra registrada!</div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {insumosAtualizados.length} {insumosAtualizados.length === 1 ? 'insumo atualizado' : 'insumos atualizados'}.
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="overflow-hidden rounded-[14px] border border-line">
            <div className="grid grid-cols-[1fr_auto] gap-3 bg-[#FBFAF8] px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">
              <span>Insumo</span><span className="text-right">Custo unitário</span>
            </div>
            {insumosAtualizados.map((item) => {
              const subiu = item.custoUnitarioNovo > item.custoUnitarioAnterior
              const igual = item.custoUnitarioNovo === item.custoUnitarioAnterior
              return (
                <div key={item.insumoId} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-dark">{item.nomeInsumo}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted">
                      +{item.quantidadeAdicionada} {item.unidadeMedida}
                      {item.marca ? ` · ${item.marca}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-[9px] [font-variant-numeric:tabular-nums]">
                    <span className={clsx('text-[13.5px] text-muted', !igual && 'line-through')}>
                      {moeda(item.custoUnitarioAnterior, 2)}
                    </span>
                    {!igual && (
                      <>
                        <ArrowRight size={17} className="text-[#A8A49C]" />
                        <span className={clsx('inline-flex items-center gap-1 text-[14.5px] font-bold', subiu ? 'text-danger' : 'text-success')}>
                          {subiu
                            ? <ArrowDown size={14} className="rotate-180" />
                            : <ArrowDown size={14} />
                          }
                          {moeda(item.custoUnitarioNovo, 2)}
                        </span>
                      </>
                    )}
                    {igual && (
                      <span className="text-[14.5px] font-bold text-dark">
                        {moeda(item.custoUnitarioNovo, 2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end border-t border-line px-6 py-4">
          <Button variant="primary" onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </div>
  )
}

export default function ListaInsumosPage() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState('Todos')
  const [modalCompra, setModalCompra] = useState(false)
  const [impactoLote, setImpactoLote] = useState<ImpactoAgregadoResponse | null>(null)
  const [confirmDesativar, setConfirmDesativar] = useState<InsumoResponse | null>(null)
  const [desativando, setDesativando] = useState(false)
  const { toast, setToast } = useToast()

  const {
    items: insumos,
    setItems: setInsumos,
    hasMore: hasNext,
    loading,
    loadingMore,
    loadMore: carregarMais,
    query,
    setQuery,
    reset: carregar,
  } = useDebounceSearch({
    fetcher: (page, size, q) => insumoService.listar(page, size, q),
  })

  const handleQueryChange = (novaQuery: string) => {
    setQuery(novaQuery)
  }

  const handleDesativar = async () => {
    if (!confirmDesativar) return
    setDesativando(true)
    try {
      await insumoService.inativar(confirmDesativar.id)
      setInsumos(prev => prev.filter(x => x.id !== confirmDesativar.id))
      setToast('Insumo desativado.')
    } catch (err) {
      console.error(err)
      setToast('Erro ao desativar. Tente novamente.')
    } finally {
      setDesativando(false)
      setConfirmDesativar(null)
    }
  }

  const handleCompraSuccess = (impacto: ImpactoAgregadoResponse) => {
    setModalCompra(false)
    setImpactoLote(impacto)
  }

  const handleImpactoClose = () => {
    setImpactoLote(null)
    carregar()
  }

  let lista = insumos
  if (filtro === 'Ativos')            lista = lista.filter(o => o.ativo)
  if (filtro === 'Inativos')          lista = lista.filter(o => !o.ativo)
  if (filtro === 'Estoque baixo')     lista = lista.filter(isLow)
  if (filtro === 'Estoque negativo')  lista = lista.filter(isNegative)
  if (filtro === 'Estoque positivo')  lista = lista.filter(isPositive)

  const lowCount = insumos.filter(isLow).length
  const negativeCount = insumos.filter(isNegative).length
  const positiveCount = insumos.filter(isPositive).length
  const empty = !loading && insumos.length === 0

  const chipConfig: Record<string, {
    icon: LucideIcon
    textClass: string
    activeClass: string
    badgeBgClass: string
    badgeTextClass: string
    count: number
  }> = {
    'Estoque baixo':    { icon: AlertCircle, textClass: 'text-warning', activeClass: 'border-warning bg-warning', badgeBgClass: 'bg-warning-bg', badgeTextClass: 'text-warning', count: lowCount },
    'Estoque negativo': { icon: AlertCircle, textClass: 'text-danger',  activeClass: 'border-danger bg-danger',   badgeBgClass: 'bg-danger-bg',  badgeTextClass: 'text-danger',  count: negativeCount },
    'Estoque positivo': { icon: CheckCircle, textClass: 'text-success', activeClass: 'border-success bg-success', badgeBgClass: 'bg-success-bg', badgeTextClass: 'text-success', count: positiveCount },
  }

  return (
    <AppLayout active="insumos" compact>

      {/* TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Meus Insumos</h1>
          <p className="mt-[7px] mb-0 text-[14.5px] text-muted">
            A base de toda precificação justa começa aqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" icon={<ShoppingCart size={17} />} onClick={() => setModalCompra(true)}>
            Registrar compras
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/insumos/novo')}>
            Novo Insumo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando insumos…
        </div>
      ) : empty ? (
        <EmptyState
          icon={<Box size={20} />}
          title="Nenhum insumo cadastrado ainda"
          description="Cadastre o primeiro para começar a montar suas fichas técnicas."
          action={{ label: 'Cadastrar primeiro insumo', icon: <Plus size={16} />, onClick: () => navigate('/insumos/novo') }}
        />
      ) : (
        <>
          <div className="mb-[18px] flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => {
                const on = filtro === f
                const chip = chipConfig[f]
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={clsx(
                      'inline-flex h-[34px] items-center gap-[7px] rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on
                        ? chip ? clsx(chip.activeClass, 'text-white') : 'border-teal bg-teal text-white'
                        : 'border-line bg-white text-body hover:bg-[#FAF8F5]'
                    )}
                  >
                    {chip && (
                      <span className={clsx('flex', on ? 'text-white' : chip.textClass)}>
                        <chip.icon size={14} />
                      </span>
                    )}
                    {f}
                    {chip && chip.count > 0 && (
                      <span className={clsx(
                        'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[11px] font-bold',
                        on ? 'bg-white/[0.28] text-white' : clsx(chip.badgeBgClass, chip.badgeTextClass)
                      )}>
                        {chip.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="relative max-w-[440px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Buscar por nome ou marca…"
                className="h-11 w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </div>
          </div>

          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="hidden grid-cols-[0.7fr_2fr_0.55fr_0.85fr_0.8fr_1fr_1fr_40px] gap-3 border-b border-line px-[18px] py-[13px] sm:grid">
              {['Identificador', 'Insumo', 'Unidade', 'Estoque atual', 'Estoque mín.', 'Custo unitário', 'Status', ''].map((h, k) => (
                <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">
                  {h}
                </div>
              ))}
            </div>

            {lista.length === 0 ? (
              <EmptyState compact title="Nenhum insumo encontrado" description="Ajuste os filtros ou a busca." />
            ) : lista.map((o, i) => (
              <React.Fragment key={o.id}>
                <InsumoRow
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onDesativar={() => setConfirmDesativar(o)}
                />
                <InsumoCard
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onDesativar={() => setConfirmDesativar(o)}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3.5 flex flex-col items-center gap-3">
            <div className="w-full text-right text-[12.5px] text-muted">
              {lista.length} {lista.length === 1 ? 'insumo' : 'insumos'}
            </div>
            {hasNext && (
              <button
                onClick={carregarMais}
                disabled={loadingMore}
                className={clsx(
                  'inline-flex h-11 items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-6 font-[inherit] text-sm font-semibold text-teal transition-colors duration-100',
                  loadingMore ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-teal/[0.06]'
                )}
              >
                {loadingMore
                  ? <><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</>
                  : <>Carregar mais <ChevronRight size={15} className="rotate-90" /></>
                }
              </button>
            )}
          </div>
        </>
      )}

      {modalCompra && (
        <CompraLoteModal
          onClose={() => setModalCompra(false)}
          onSuccess={handleCompraSuccess}
        />
      )}
      {impactoLote && (
        <ImpactoLoteModal impacto={impactoLote} onClose={handleImpactoClose} />
      )}

      {/* MODAL: confirmar desativação */}
      <ConfirmacaoModal
        open={!!confirmDesativar}
        onClose={() => setConfirmDesativar(null)}
        onConfirm={handleDesativar}
        variant="danger"
        title={`Desativar "${confirmDesativar?.nome}"?`}
        icon={<Power size={16} />}
        width={420}
        confirmLabel="Desativar insumo"
        confirmingLabel="Desativando…"
        confirming={desativando}
        description="O insumo ficará inativo e não poderá ser usado em novas fichas técnicas. Esta ação não pode ser desfeita por aqui."
      />

    </AppLayout>
  )
}
