import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import {
  X, Minus, ChevronDown, AlertCircle, Layers, Box, ChevronRight,
  Check, Pencil, Factory, History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { tipoProdutoBadge } from '../../utils/badges'
import type { ProdutoDetalheResponse, MovimentacaoProdutoResponse, BaixaManualProdutoRequest } from '../../types/produto'
import { MOTIVOS_BAIXA_PRODUTO, MOTIVO_LABEL } from '../../constants'
import { extractApiError } from '../../utils/apiError'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: dec ?? 2, maximumFractionDigits: dec ?? 2 })

const fmtData = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

type MovKind = 'entrada' | 'saida' | 'estorno'

function resolveKind(mov: MovimentacaoProdutoResponse): MovKind {
  if (mov.estornada) return 'estorno'
  if (mov.tipo === 'ENTRADA') return 'entrada'
  return 'saida'
}

const MOV_STYLE: Record<MovKind, { textClass: string; bgClass: string; icon: LucideIcon; size: number }> = {
  entrada:  { textClass: 'text-success', bgClass: 'bg-success-bg', icon: Factory,     size: 16 },
  saida:    { textClass: 'text-danger',  bgClass: 'bg-danger-bg',  icon: Minus,       size: 17 },
  estorno:  { textClass: 'text-danger',  bgClass: 'bg-danger-bg',  icon: AlertCircle, size: 15 },
}

function MovTitulo(mov: MovimentacaoProdutoResponse) {
  const kind = resolveKind(mov)
  if (kind === 'estorno') return `Cancelamento — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
  if (mov.tipo === 'ENTRADA') return `Entrada — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
  return `Saída — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
}

function HistTipo({ mov }: { mov: MovimentacaoProdutoResponse }) {
  const kind = resolveKind(mov)
  const m = MOV_STYLE[kind]
  const Ic = m.icon
  return (
    <div className="flex min-w-0 items-center gap-[11px]">
      <span className={clsx('grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[9px]', m.bgClass, m.textClass)}>
        <Ic size={m.size} />
      </span>
      <span className="text-[13.8px] font-semibold text-dark">{MovTitulo(mov)}</span>
    </div>
  )
}

function ReferenciaCell({ mov }: { mov: MovimentacaoProdutoResponse }) {
  if (mov.motivo !== 'ORCAMENTO' || !mov.catalogoReferencia) {
    return <span className="text-[#D8D4CC]">—</span>
  }
  const isCatalogo = mov.catalogoReferencia.startsWith('CTG-')
  const Ic = isCatalogo ? Layers : Box
  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-1">
      <span
        title={mov.catalogoReferencia}
        className={clsx(
          'inline-flex h-[22px] max-w-full min-w-0 items-center gap-[5px] rounded-full px-2.5 text-[11.5px] font-semibold',
          isCatalogo ? 'bg-teal/10 text-teal' : 'bg-line-soft text-[#8A8780]'
        )}
      >
        <Ic size={11} className="flex-shrink-0" />
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {mov.catalogoReferencia}
        </span>
      </span>
      {mov.precoVendido != null && (
        <span className="text-xs font-semibold text-body [font-variant-numeric:tabular-nums]">
          {moeda(mov.precoVendido)}
        </span>
      )}
    </div>
  )
}

const HIST_COLS = 'grid-cols-[110px_1fr_88px_minmax(120px,180px)_1fr]'

function BaixaProdutoModal({ produtoId, nomeProduto, onClose, onSuccess }: {
  produtoId: string
  nomeProduto: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState<BaixaManualProdutoRequest['motivo']>('PERDA')
  const [motivoLabel, setMotivoLabel] = useState('Perda')
  const [obs, setObs] = useState('')
  const [selOpen, setSelOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const selRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const qtdNum = parseFloat((qtd || '0').replace(/\./g, '').replace(',', '.')) || 0
  const podeRegistrar = qtdNum > 0 && obs.trim().length >= 30 && !salvando

  const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'

  const registrar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await produtoService.baixaManual(produtoId, {
        quantidade: qtdNum,
        motivo,
        observacao: obs.trim(),
      })
      onSuccess()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao registrar baixa.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-[1.5px]">
      <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-[min(500px,100%)] animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]">

        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-[13px]">
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl bg-orange/[0.12] text-orange">
              <Minus size={17} />
            </span>
            <div className="min-w-0">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold tracking-[-0.01em] text-dark">
                Baixa manual — {nomeProduto}
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">Registra uma saída fora de produção.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle hover:bg-line-deep">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-[22px]">
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Quantidade a subtrair *</span>
              <div className="relative">
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  placeholder="1"
                  className={clsx(inputBase, 'pr-20')}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#A8A49C]">unidades</span>
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
                    {MOTIVOS_BAIXA_PRODUTO.map(m => (
                      <button
                        key={m.api}
                        type="button"
                        onClick={() => { setMotivo(m.api as BaixaManualProdutoRequest['motivo']); setMotivoLabel(m.label); setSelOpen(false) }}
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
              placeholder="Descreva o motivo da baixa em detalhes (ex: 2 unidades ficaram com manchas durante o transporte da gráfica até o estúdio e não podem ser vendidas)"
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

          {erro && (
            <div className="rounded-[9px] border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-2.5 text-[13px] text-danger-deep">
              {erro}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-[11px] border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="secondary" icon={<Minus size={17} />} disabled={!podeRegistrar} onClick={registrar}>
            {salvando ? 'Registrando…' : 'Registrar baixa'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DetalheProdutoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [produto, setProduto] = useState<ProdutoDetalheResponse | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProdutoResponse[]>([])
  const [movPage, setMovPage] = useState(0)
  const [movHasNext, setMovHasNext] = useState(false)
  const [movLoadingMore, setMovLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'historico' | 'ficha'>('historico')
  const [modal, setModal] = useState<'baixa' | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      produtoService.buscarPorId(id),
      produtoService.listarMovimentacoes(id, 0),
    ])
      .then(([prod, movs]) => {
        setProduto(prod)
        setMovimentacoes(movs.content)
        setMovHasNext(!movs.last)
        setMovPage(0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const carregarMaisMovs = () => {
    if (!id) return
    const nextPage = movPage + 1
    setMovLoadingMore(true)
    produtoService.listarMovimentacoes(id, nextPage)
      .then(data => {
        setMovimentacoes(prev => [...prev, ...data.content])
        setMovHasNext(!data.last)
        setMovPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setMovLoadingMore(false))
  }

  const handleBaixaSuccess = () => {
    setModal(null)
    if (!id) return
    Promise.all([
      produtoService.buscarPorId(id),
      produtoService.listarMovimentacoes(id, 0),
    ]).then(([prod, movs]) => {
      setProduto(prod)
      setMovimentacoes(movs.content)
      setMovHasNext(!movs.last)
      setMovPage(0)
    }).catch(console.error)
  }

  if (loading || !produto) {
    return (
      <AppLayout active="produtos" compact>
        <div className="flex items-center gap-2.5 py-[60px] text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando produto…
        </div>
      </AppLayout>
    )
  }

  const badge = tipoProdutoBadge(produto.tipo)
  const tipoLabel = badge.label

  const isCustom = produto.tipo === 'CUSTOMIZACAO'
  const isProdutoBase = produto.tipo === 'PRODUTO_BASE'

  const precoCustoTotal = produto.fichaTecnica.reduce((s, i) => s + i.custoTotal, 0)

  const cells = [
    { k: 'Tipo', v: tipoLabel },
    ...(!isProdutoBase ? [{ k: 'Estoque atual', v: `${produto.estoqueAtual} unidades`, big: true, danger: produto.estoqueAtual === 0 }] : []),
    ...(produto.estoqueMinimo != null ? [{ k: 'Estoque mínimo', v: `${produto.estoqueMinimo} unidades` }] : []),
    { k: 'Preço de custo', v: moeda(produto.precoCusto), accent: true, hint: 'calculado pela ficha técnica' },
    ...(produto.precoVenda != null ? [{ k: isCustom ? 'Valor adicional' : 'Preço de venda', v: isCustom ? '+ ' + moeda(produto.precoVenda) : moeda(produto.precoVenda), price: true }] : []),
    ...(produto.rendimento != null ? [{ k: 'Rendimento', v: `${produto.rendimento} unidades` }] : []),
    ...(produto.custoTotalLote != null ? [{ k: 'Custo Total do lote', v: moeda(produto.custoTotalLote), blue: true }] : []),
    ...(produto.custoUnitario != null ? [{ k: 'Custo Unitário', v: moeda(produto.custoUnitario), blue: true }] : []),
  ]

  const ABAS = [
    { id: 'historico' as const, label: 'Histórico de movimentações', icon: History, size: 17 },
    { id: 'ficha'     as const, label: 'Ficha técnica',              icon: Layers,  size: 18 },
  ]

  return (
    <AppLayout active="produtos" compact>

      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/produtos')}>
          Produtos
        </span>
        <ChevronRight size={15} className="text-[#CFCBC3]" />
        <span className="whitespace-nowrap font-semibold text-body">{produto.nome}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-[18px]">
        <div className="flex min-w-0 items-center gap-[15px]">
          <span className="grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
            <Box size={26} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              {produto.identificador && (
                <span className="flex-shrink-0 text-[13px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{produto.identificador}</span>
              )}
              <h1 className="m-0 whitespace-nowrap text-[25px] font-bold tracking-[-0.02em] text-dark">{produto.nome}</h1>
              <span
                className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-[11px] text-[12.5px] font-bold tracking-[0.01em]"
                style={{ background: badge.bg, color: badge.fg }}
              >
                {tipoLabel}
              </span>
              <span className={clsx(
                'inline-flex h-[27px] items-center gap-1.5 rounded-full px-[11px] text-[12.5px] font-semibold',
                produto.ativo ? 'bg-success-bg text-success' : 'bg-line-soft text-subtle'
              )}>
                {produto.ativo && <span className="h-1.5 w-1.5 rounded-full bg-[#34A56F]" />}
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </span>
              {produto.permitirEstoqueNegativo ? (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-teal/[0.12] px-[11px] text-[12.5px] font-semibold text-teal">
                  <Check size={13} /> Permite estoque negativo
                </span>
              ) : (
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-[#EF4444]/[0.12] px-[11px] text-[12.5px] font-semibold text-[#EF4444]">
                  <X size={13} /> Bloqueia estoque negativo
                </span>
              )}
              {produto.algumInsumoNaoFracionavel && (
                <span className="inline-flex h-[27px] items-center rounded-full bg-line px-[11px] text-[12.5px] font-semibold text-[#6B6860]">
                  Receita não fracionável
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted">
              Atualizado em <strong className="font-semibold text-body">{fmtData(produto.updatedAt)}</strong>
            </div>
          </div>
        </div>
        <Button variant="ghost" icon={<Pencil size={16} />} onClick={() => navigate(`/produtos/${id}/editar`)}>
          Editar
        </Button>
      </div>

      <div className="animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px bg-line">
          {cells.map((c, i) => (
            <div key={i} className="bg-white px-5 py-[18px]">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">{c.k}</div>
              <div className={clsx(
                'mt-[7px] [font-variant-numeric:tabular-nums]',
                (c as any).big ? 'text-[28px] tracking-[-0.02em]' : 'text-base',
                ((c as any).accent || (c as any).price || (c as any).blue) && 'text-lg',
                ((c as any).big || (c as any).accent || (c as any).price || (c as any).blue) ? 'font-bold' : 'font-semibold',
                (c as any).danger ? 'text-danger' : (c as any).blue ? 'text-azul' : (c as any).accent ? 'text-teal' : 'text-dark'
              )}>{c.v}</div>
              {(c as any).hint && <div className="mt-[3px] text-[11.5px] font-medium text-[#A8A49C]">{(c as any).hint}</div>}
            </div>
          ))}
        </div>
        {!isProdutoBase && (
          <div className="flex flex-wrap gap-[11px] border-t border-line px-5 py-4">
            <Button variant="primary" icon={<Factory size={20} />} onClick={() => navigate('/producao')}>
              Registrar produção
            </Button>
            <Button variant="ghost" icon={<Minus size={17} />} onClick={() => setModal('baixa')}>
              Baixa manual
            </Button>
          </div>
        )}
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
                on ? 'font-semibold text-teal' : 'font-medium text-[#8A8780] hover:text-body'
              )}
            >
              <span className={clsx('flex', on ? 'text-teal' : 'text-[#B0ACA4]')}><a.icon size={a.size} /></span>
              {a.label}
              {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        {aba === 'historico' ? (
          <>
            <div className={clsx('hidden gap-4 bg-cream px-5 py-[13px] md:grid', HIST_COLS)}>
              {['Data', 'Movimentação', 'Quantidade', 'Referência', 'Observação'].map((h, k) => (
                <div key={k} className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">{h}</div>
              ))}
            </div>
            {movimentacoes.length === 0 ? (
              <div className="border-t border-line px-5 py-[34px] text-center text-[13.5px] text-muted">
                Nenhuma movimentação registrada ainda.
              </div>
            ) : movimentacoes.map((mov) => {
              const kind = resolveKind(mov)
              const pos = mov.tipo === 'ENTRADA'
              const deltaClass = kind === 'estorno' ? 'text-danger' : (pos ? 'text-success' : 'text-danger')
              const deltaT = (pos ? '+ ' : '− ') + mov.quantidade + ' un'
              const isEstorno = mov.estornada
              const riscado = isEstorno

              return (
                <React.Fragment key={mov.id}>
                  <div className={clsx(
                    'hidden animate-fade-up items-center gap-4 border-t border-line px-5 py-[15px] md:grid',
                    HIST_COLS,
                    riscado && 'opacity-60',
                    isEstorno && 'bg-danger-bg'
                  )}>
                    <div className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{fmtData(mov.createdAt)}</div>
                    <div className={riscado ? 'line-through' : undefined}>
                      <HistTipo mov={mov} />
                    </div>
                    <div className={clsx('whitespace-nowrap text-sm font-bold [font-variant-numeric:tabular-nums]', deltaClass, riscado && 'line-through')}>{deltaT}</div>
                    <div className="min-w-0">
                      <ReferenciaCell mov={mov} />
                    </div>
                    <div className={clsx(
                      'overflow-hidden text-ellipsis whitespace-normal text-[13px]',
                      isEstorno ? 'italic text-danger-deep' : 'text-muted'
                    )}>
                      {mov.observacao || (mov.referenciaId ? `Ref: ${mov.referenciaId}` : '—')}
                    </div>
                  </div>
                  <div className={clsx(
                    'block animate-fade-up border-t border-line px-[18px] py-[15px] md:hidden',
                    riscado && 'opacity-60',
                    isEstorno && 'bg-danger-bg'
                  )}>
                    <div className={clsx('flex items-center justify-between gap-3', riscado && 'line-through')}>
                      <HistTipo mov={mov} />
                      <span className={clsx('whitespace-nowrap text-sm font-bold [font-variant-numeric:tabular-nums]', deltaClass)}>{deltaT}</span>
                    </div>
                    {mov.motivo === 'ORCAMENTO' && mov.catalogoReferencia && (
                      <div className="mt-[9px]">
                        <ReferenciaCell mov={mov} />
                      </div>
                    )}
                    <div className={clsx(
                      'mt-[9px] flex flex-wrap items-center gap-2 text-[12.5px]',
                      isEstorno ? 'italic text-danger-deep' : 'text-muted'
                    )}>
                      <span className="[font-variant-numeric:tabular-nums]">{fmtData(mov.createdAt)}</span>
                      {mov.observacao && <><span className="text-[#D8D4CC]">·</span><span>{mov.observacao}</span></>}
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </>
        ) : (
          // ABA FICHA TÉCNICA
          produto.fichaTecnica.length === 0 ? (
            <div className="px-5 py-[34px] text-center text-[13.5px] text-muted">
              Nenhum componente cadastrado na ficha técnica.
            </div>
          ) : (
            <>
              {produto.fichaTecnica.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.produtoBaseId ? `/produtos/${item.produtoBaseId}` : `/insumos/${item.insumoId}`)}
                  className={clsx(
                    'flex animate-fade-up cursor-pointer items-center gap-3.5 px-5 py-4 transition-colors duration-100 hover:bg-line',
                    idx > 0 && 'border-t border-line'
                  )}
                >
                  <span className={clsx(
                    'grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px]',
                    item.produtoBaseId ? 'bg-teal/[0.12] text-teal' : 'bg-line-soft text-[#9A968E]'
                  )}>
                    <Box size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-[9px]">
                      <span className="whitespace-nowrap text-[14.5px] font-semibold text-dark">
                        {item.nomeInsumo || item.nomeProdutoBase}
                      </span>
                      <span className={clsx(
                        'whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold',
                        item.produtoBaseId ? 'bg-teal/10 text-teal' : 'bg-line-soft text-subtle'
                      )}>
                        {item.produtoBaseId ? 'Produto Base' : 'Insumo'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {item.marcaInsumo ? item.marcaInsumo + ' · ' : ''}{item.quantidade} {item.unidadeMedida || 'un'}
                    </div>
                  </div>
                  <span className="flex-shrink-0 whitespace-nowrap text-[14.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">
                    {moeda(item.custoTotal)}
                  </span>
                </div>
              ))}
              <div className="flex justify-end border-t border-line px-5 py-3.5">
                <span className="text-[13px] font-semibold text-body">
                  Total: <span className="text-[15px] text-teal">{moeda(precoCustoTotal)}</span>
                </span>
              </div>
            </>
          )
        )}
      </div>

      {aba === 'historico' && (
        <div className="mt-[13px] flex flex-col items-center gap-2.5">
          <div className="w-full text-right text-[12.5px] text-muted">
            {movimentacoes.length} movimentaç{movimentacoes.length === 1 ? 'ão' : 'ões'}
          </div>
          {movHasNext && (
            <button
              onClick={carregarMaisMovs}
              disabled={movLoadingMore}
              className={clsx(
                'inline-flex h-[42px] items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-5 font-[inherit] text-[13.5px] font-semibold text-teal transition-colors duration-100',
                movLoadingMore ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-teal/[0.06]'
              )}
            >
              {movLoadingMore
                ? <><Spinner size={15} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</>
                : <>Carregar mais <ChevronRight size={15} className="rotate-90" /></>
              }
            </button>
          )}
        </div>
      )}

      {modal === 'baixa' && id && (
        <BaixaProdutoModal
          produtoId={id}
          nomeProduto={produto.nome}
          onClose={() => setModal(null)}
          onSuccess={handleBaixaSuccess}
        />
      )}

    </AppLayout>
  )
}
