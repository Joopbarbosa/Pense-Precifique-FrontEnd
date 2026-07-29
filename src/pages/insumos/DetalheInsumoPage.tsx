import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { X, Minus, ChevronDown, AlertCircle, ArrowDown, Box, ChevronRight, Check, Pencil, History, Layers } from 'lucide-react'
import type { InsumoResponse, MovimentacaoInsumoResponse, ProdutoRelacionadoResponse, BaixaManualInsumoRequest } from '../../types/insumo'
import { insumoService } from '../../services/insumoService'
import { MOTIVOS_BAIXA_INSUMO } from '../../constants'
import { extractApiError } from '../../utils/apiError'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2),
    maximumFractionDigits: dec != null ? dec : 3,
  })

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR')

const TIPO_LABEL: Record<string, string> = {
  PRODUTO: 'Produto',
  PRODUTO_BASE: 'Produto base',
  CUSTOMIZACAO: 'Customização',
}

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function tituloMovimentacao(m: MovimentacaoInsumoResponse): { titulo: string; tipoDisplay: 'entrada' | 'saida' | 'estorno' } {
  if (m.motivo === 'ESTORNO_PRODUCAO') return { titulo: 'Estorno — Cancelamento Produção', tipoDisplay: 'estorno' }
  const labelsEntrada: Record<string, string> = { COMPRA: 'Compra' }
  const labelsSaida: Record<string, string> = { BAIXA_MANUAL: 'Baixa manual', PRODUCAO: 'Produção', ORCAMENTO: 'Orçamento' }
  if (m.tipo === 'ENTRADA') return { titulo: `Entrada — ${labelsEntrada[m.motivo] ?? m.motivo}`, tipoDisplay: 'entrada' }
  return { titulo: `Saída — ${labelsSaida[m.motivo] ?? m.motivo}`, tipoDisplay: 'saida' }
}

function refText(m: MovimentacaoInsumoResponse): string {
  const labels: Record<string, string> = { PRODUCAO: 'Produção', ORCAMENTO: 'Orçamento', LOTE_COMPRA: 'Compra' }
  if (m.referenciaTipo && m.referenciaId) return `${labels[m.referenciaTipo] ?? m.referenciaTipo} #${m.referenciaId.slice(0, 8)}`
  return ''
}

function ModalHead({ icon, tint, title, sub, onClose }: { icon: React.ReactNode; tint: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
      <div className="flex min-w-0 items-center gap-[13px]">
        <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl" style={{ background: hexA(tint, 0.12), color: tint }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[16.5px] font-bold tracking-[-0.01em] text-dark">{title}</div>
          {sub && <div className="mt-0.5 text-[12.5px] text-muted">{sub}</div>}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle hover:bg-line-deep"
      >
        <X size={20} />
      </button>
    </div>
  )
}

function BaixaModal({ insumoId, unidade, onClose, onSuccess }: {
  insumoId: string
  unidade: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState<BaixaManualInsumoRequest['motivo']>('PERDA')
  const [motivoLabel, setMotivoLabel] = useState('Perda')
  const [obs, setObs] = useState('')
  const [selOpen, setSelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selRef = useRef<HTMLDivElement>(null)

  const podeRegistrar = qtd.trim() !== '' && parseFloat(qtd.replace(',', '.')) > 0 && obs.trim().length >= 30

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await insumoService.baixaManual(insumoId, {
        quantidade: parseFloat(qtd.replace(',', '.')),
        motivo,
        observacao: obs.trim(),
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(extractApiError(err, 'Erro ao registrar baixa. Tente novamente.'))
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-[1.5px]">
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-[min(500px,100%)] animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]">

        <ModalHead icon={<Minus size={17} />} tint="#C8721F" title="Baixa manual" sub="Registra uma saída fora de produção." onClose={onClose} />

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-[22px]">
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Quantidade *</span>
              <div className="relative">
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  placeholder="3"
                  className={clsx(inputBase, 'pr-[62px]')}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">
                  {unidade}
                </span>
              </div>
            </label>
            <label>
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Motivo *</span>
              <div ref={selRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSelOpen(o => !o)}
                  className={clsx(
                    inputBase,
                    'flex cursor-pointer items-center justify-between text-left',
                    selOpen && 'border-teal ring-4 ring-teal/[0.12]'
                  )}
                >
                  {motivoLabel}<span className="flex text-muted"><ChevronDown size={16} /></span>
                </button>
                {selOpen && (
                  <div className="absolute inset-x-0 top-[52px] z-30 animate-pop rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
                    {MOTIVOS_BAIXA_INSUMO.map(m => (
                      <button
                        key={m.api}
                        type="button"
                        onClick={() => { setMotivo(m.api as BaixaManualInsumoRequest['motivo']); setMotivoLabel(m.label); setSelOpen(false) }}
                        className={clsx(
                          'w-full rounded-lg border-none px-[11px] py-2.5 text-left font-[inherit] text-sm',
                          m.api === motivo ? 'bg-teal/[0.08] font-semibold text-teal' : 'font-medium text-dark hover:bg-cream'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
          <label>
            <span className="mb-[7px] block text-[13px] font-semibold text-body">
              Observação <span className="text-orange">*</span>
              <span className={clsx('ml-2 font-normal', obs.length >= 30 ? 'text-[#3E9D5A]' : 'text-muted')}>
                {obs.length}/30 caracteres mín.
              </span>
            </span>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Descreva o motivo da baixa em detalhes (ex: 3 folhas ficaram manchadas durante o transporte e não podem ser usadas)"
              rows={3}
              className={clsx(
                'h-auto w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-3 font-[inherit] text-[14.5px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150',
                obs.length > 0 && obs.length < 30
                  ? 'border-[#F2B8A6]'
                  : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
              )}
            />
            {obs.length > 0 && obs.length < 30 && (
              <div className="mt-1.5 flex items-center gap-[5px] text-[12.5px] text-danger">
                <AlertCircle size={13} /> Mínimo de 30 caracteres. Faltam {30 - obs.length}.
              </div>
            )}
          </label>
          {error && (
            <p className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-[11px] border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" icon={<Minus size={17} />} disabled={!podeRegistrar || loading} onClick={handleSubmit}>
            {loading ? 'Registrando…' : 'Registrar baixa'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function HistTipo({ tipo, titulo }: { tipo: 'entrada' | 'saida' | 'estorno'; titulo: string }) {
  const isEntrada = tipo === 'entrada'
  return (
    <div className="flex min-w-0 items-center gap-[11px]">
      <span className={clsx(
        'grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[9px]',
        isEntrada ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
      )}>
        {tipo === 'estorno'
          ? <AlertCircle size={15} />
          : <ArrowDown size={14} className={isEntrada ? 'rotate-180' : undefined} />}
      </span>
      <span className="text-[13.8px] font-semibold text-dark">{titulo}</span>
    </div>
  )
}

function HistRows({ movimentacoes, unidade }: { movimentacoes: MovimentacaoInsumoResponse[]; unidade: string }) {
  return (
    <>
      {movimentacoes.map(m => {
        const { titulo, tipoDisplay } = tituloMovimentacao(m)
        const positivo = m.tipo === 'ENTRADA'
        const isEstorno = tipoDisplay === 'estorno'
        const deltaClass = positivo && !isEstorno ? 'text-success' : 'text-danger'
        const deltaT = (positivo ? '+ ' : '− ') + m.quantidade + ` ${unidade}`
        const riscado = m.estornada
        const ref = refText(m)

        return (
          <React.Fragment key={m.id}>
            {/* desktop row */}
            <div className={clsx(
              'hidden grid-cols-[116px_1fr_110px_84px_1fr] items-center gap-4 border-t border-line px-5 py-[15px] animate-fade-up md:grid',
              riscado && 'opacity-60',
              isEstorno && 'bg-danger-bg'
            )}>
              <div className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{formatDate(m.createdAt)}</div>
              <div className={riscado ? 'line-through' : undefined}>
                <HistTipo tipo={tipoDisplay} titulo={titulo} />
              </div>
              <div className={clsx('whitespace-nowrap text-sm font-bold [font-variant-numeric:tabular-nums]', deltaClass, riscado && 'line-through')}>
                {deltaT}
              </div>
              <div className={clsx('text-[13.5px] text-dark [font-variant-numeric:tabular-nums]', riscado && 'line-through')}>—</div>
              <div className={clsx(
                'text-[13px]',
                isEstorno ? 'whitespace-normal italic text-danger-deep' : 'overflow-hidden text-ellipsis whitespace-nowrap text-muted'
              )}>
                {ref}
              </div>
            </div>
            {m.observacao && (
              <div className="hidden -mt-[15px] px-5 pb-[15px] md:block">
                <div className="pl-[132px] text-[12.5px] italic leading-[1.5] text-muted">
                  "{m.observacao}"
                </div>
              </div>
            )}
            {/* mobile card */}
            <div className={clsx(
              'block animate-fade-up border-t border-line px-[18px] py-[15px] md:hidden',
              riscado && 'opacity-60',
              isEstorno && 'bg-danger-bg'
            )}>
              <div className={clsx('flex items-center justify-between gap-3', riscado && 'line-through')}>
                <HistTipo tipo={tipoDisplay} titulo={titulo} />
                <span className={clsx('whitespace-nowrap text-sm font-bold [font-variant-numeric:tabular-nums]', deltaClass)}>
                  {deltaT}
                </span>
              </div>
              <div className={clsx(
                'mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px]',
                isEstorno ? 'italic text-danger-deep' : 'text-muted'
              )}>
                <span className="[font-variant-numeric:tabular-nums]">{formatDate(m.createdAt)}</span>
                {ref && <><span className="text-[#D8D4CC]">·</span><span>{ref}</span></>}
              </div>
              {m.observacao && (
                <div className="mt-2 text-[12.5px] italic leading-[1.5] text-muted">
                  "{m.observacao}"
                </div>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

function FichasList({ produtos, loading, onSelect }: { produtos: ProdutoRelacionadoResponse[]; loading: boolean; onSelect: (produtoId: string) => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 px-5 py-8 text-sm text-muted">
        <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" />
        Carregando fichas técnicas…
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-muted">
        Nenhuma ficha técnica usa este insumo ainda.
      </div>
    )
  }

  return (
    <div>
      {produtos.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="flex w-full animate-fade-up items-center gap-3.5 border-0 border-t border-line bg-transparent px-5 py-4 text-left font-[inherit] hover:bg-cream"
        >
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
            <Box size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {p.identificador && (
                <span className="flex-shrink-0 text-[12.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{p.identificador}</span>
              )}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-dark">{p.nome}</span>
            </div>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-line-soft px-2.5 py-1 text-[11.5px] font-semibold text-subtle">
            {TIPO_LABEL[p.tipo] ?? p.tipo}
          </span>
          <span className="flex flex-shrink-0 text-dim">
            <ChevronRight size={15} />
          </span>
        </button>
      ))}
    </div>
  )
}

export default function DetalheInsumoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [modal, setModal] = useState<'baixa' | null>(null)
  const [aba, setAba] = useState<'historico' | 'fichas'>('historico')
  const [insumo, setInsumo] = useState<InsumoResponse | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoInsumoResponse[]>([])
  const [histPage, setHistPage] = useState(0)
  const [histHasNext, setHistHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMoreHist, setLoadingMoreHist] = useState(false)
  const [produtosRelacionados, setProdutosRelacionados] = useState<ProdutoRelacionadoResponse[]>([])
  const [loadingFichas, setLoadingFichas] = useState(false)

  const ABAS = [
    { id: 'historico' as const, label: 'Histórico de movimentações', icon: History, size: 17 },
    { id: 'fichas' as const,    label: 'Fichas técnicas que usam este insumo', icon: Layers, size: 18 },
  ]

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      insumoService.buscarPorId(id),
      insumoService.listarMovimentacoes(id, 0),
    ]).then(([ins, hist]) => {
      setInsumo(ins)
      setMovimentacoes(hist.content)
      setHistHasNext(!hist.last)
      setHistPage(0)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (aba !== 'fichas' || !id) return
    setLoadingFichas(true)
    insumoService.listarProdutosRelacionados(id)
      .then(setProdutosRelacionados)
      .catch(console.error)
      .finally(() => setLoadingFichas(false))
  }, [aba, id])

  const carregarMaisHistorico = () => {
    if (!id) return
    const nextPage = histPage + 1
    setLoadingMoreHist(true)
    insumoService.listarMovimentacoes(id, nextPage)
      .then(hist => {
        setMovimentacoes(prev => [...prev, ...hist.content])
        setHistHasNext(!hist.last)
        setHistPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setLoadingMoreHist(false))
  }

  const recarregarAposBaixa = () => {
    if (!id) return
    Promise.all([
      insumoService.buscarPorId(id),
      insumoService.listarMovimentacoes(id, 0),
    ]).then(([ins, hist]) => {
      setInsumo(ins)
      setMovimentacoes(hist.content)
      setHistHasNext(!hist.last)
      setHistPage(0)
    }).catch(console.error)
  }

  if (loading || !insumo) {
    return (
      <AppLayout active="insumos" compact>
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando insumo…
        </div>
      </AppLayout>
    )
  }

  const isLow = insumo.estoqueMinimo != null && insumo.estoqueAtual < insumo.estoqueMinimo

  return (
    <AppLayout active="insumos" compact>

      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/insumos')}>
          Insumos
        </span>
        <ChevronRight size={15} className="text-dim" />
        <span className="whitespace-nowrap font-semibold text-body">{insumo.nome}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-[18px]">
        <div className="flex min-w-0 items-center gap-[15px]">
          <span className="grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
            <Box size={26} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {insumo.identificador && (
                <span className="flex-shrink-0 text-[13px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{insumo.identificador}</span>
              )}
              <h1 className="m-0 text-[25px] font-bold tracking-[-0.02em] text-dark">{insumo.nome}</h1>
              {insumo.ativo ? (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-success-bg px-[11px] text-[12.5px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34A56F]" /> Ativo
                </span>
              ) : (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-line-soft px-[11px] text-[12.5px] font-semibold text-subtle">
                  Inativo
                </span>
              )}
              {insumo.permitirEstoqueNegativo ? (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-teal/[0.12] px-[11px] text-[12.5px] font-semibold text-teal">
                  <Check size={13} /> Permite estoque negativo
                </span>
              ) : (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-[#EF4444]/[0.12] px-[11px] text-[12.5px] font-semibold text-[#EF4444]">
                  <X size={13} /> Bloqueia estoque negativo
                </span>
              )}
              {insumo.fracionavel ? (
                <span className="inline-flex h-[27px] items-center rounded-full bg-teal/10 px-[11px] text-[12.5px] font-semibold text-teal">
                  Fracionável
                </span>
              ) : (
                <span className="inline-flex h-[27px] items-center rounded-full bg-dim/10 px-[11px] text-[12.5px] font-semibold text-dim">
                  Não fracionável
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted">
              Marca: <strong className="font-semibold text-body">{insumo.marca || '—'}</strong>
            </div>
          </div>
        </div>
        <Button variant="ghost" icon={<Pencil size={16} />} onClick={() => navigate(`/insumos/${id}/editar`)}>
          Editar
        </Button>
      </div>

      <div className="animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px bg-line">
          {[
            { k: 'Unidade de medida',    v: insumo.unidadeMedida },
            { k: 'Saldo atual',          v: `${insumo.estoqueAtual} ${insumo.unidadeMedida}`, big: true, warn: isLow },
            { k: 'Estoque mínimo',       v: insumo.estoqueMinimo != null ? `${insumo.estoqueMinimo} ${insumo.unidadeMedida}` : '—' },
            { k: 'Custo unitário atual', v: `${moeda(insumo.custoUnitario, 2)} / ${insumo.unidadeMedida}`, accent: true },
          ].map((c, i) => (
            <div key={i} className="bg-white px-5 py-[18px]">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{c.k}</div>
              <div className={clsx(
                'mt-[7px] [font-variant-numeric:tabular-nums]',
                c.big ? 'text-[28px] font-bold tracking-[-0.02em]' : c.accent ? 'text-lg font-bold' : 'text-base font-semibold',
                c.warn ? 'text-warning' : (c.big || c.accent) ? 'text-teal' : 'text-dark'
              )}>
                {c.v}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-[11px] border-t border-line px-5 py-4">
          <Button variant="ghost" icon={<Minus size={17} />} onClick={() => setModal('baixa')}>
            Baixa manual
          </Button>
        </div>
      </div>

      <div className="mt-[26px] flex gap-1 overflow-x-auto border-b-[1.5px] border-line">
        {ABAS.map(a => {
          const on = aba === a.id
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={clsx(
                'relative flex items-center gap-2 whitespace-nowrap border-none bg-transparent px-4 py-3 font-[inherit] text-sm transition-colors duration-150',
                on ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body'
              )}
            >
              <span className={clsx('flex', on ? 'text-teal' : 'text-dim')}><a.icon size={a.size} /></span>
              {a.label}
              {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        {aba === 'historico' ? (
          <>
            <div className="hidden grid-cols-[116px_1fr_110px_84px_1fr] gap-4 bg-cream px-5 py-[13px] md:grid">
              {['Data', 'Movimentação', 'Quantidade', 'Custo unit.', 'Referência'].map((h, k) => (
                <div key={k} className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">{h}</div>
              ))}
            </div>
            {movimentacoes.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                Nenhuma movimentação registrada ainda.
              </div>
            ) : (
              <HistRows movimentacoes={movimentacoes} unidade={insumo.unidadeMedida} />
            )}
          </>
        ) : (
          <FichasList produtos={produtosRelacionados} loading={loadingFichas} onSelect={produtoId => navigate(`/produtos/${produtoId}`)} />
        )}
      </div>

      {aba === 'historico' && (
        <div className="mt-[13px] flex flex-col items-center gap-3">
          <div className="w-full text-right text-[12.5px] text-muted">
            {movimentacoes.length} movimentações
          </div>
          {histHasNext && (
            <button
              onClick={carregarMaisHistorico}
              disabled={loadingMoreHist}
              className={clsx(
                'inline-flex h-11 items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-6 font-[inherit] text-sm font-semibold text-teal transition-colors duration-100',
                loadingMoreHist ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-teal/[0.06]'
              )}
            >
              {loadingMoreHist
                ? <><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</>
                : <>Carregar mais <ChevronRight size={15} className="rotate-90" /></>
              }
            </button>
          )}
        </div>
      )}

      {modal === 'baixa' && (
        <BaixaModal
          insumoId={id!}
          unidade={insumo.unidadeMedida}
          onClose={() => setModal(null)}
          onSuccess={recarregarAposBaixa}
        />
      )}

    </AppLayout>
  )
}
