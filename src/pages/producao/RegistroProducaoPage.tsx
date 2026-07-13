import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import {
  Minus, Plus, Box, ChevronDown, Check, AlertTriangle, Factory, X,
  AlertCircle, Layers, Pencil, ChevronRight, Eye, Ban, Search,
} from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { producaoService } from '../../services/producaoService'
import { produtoService } from '../../services/produtoService'
import { useToast } from '../../hooks/useToast'
import type { ProducaoResponse, ProducaoDetalheResponse, InsumoConsumidoResponse, LancarProducaoRequest } from '../../types/producao'
import type { ProdutoResponse, ProdutoDetalheResponse } from '../../types/produto'
import type { TipoProduto } from '../../types'

/* ── helpers ─────────────────────────────────────────────────── */

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const TIPO_LABELS: { label: string; value: TipoProduto }[] = [
  { label: 'Produto',      value: 'PRODUTO'      },
  { label: 'Produto Base', value: 'PRODUTO_BASE' },
  { label: 'Customização', value: 'CUSTOMIZACAO' },
]

/* ── Counter ─────────────────────────────────────────────────── */

function Counter({ value, setValue }: { value: number; setValue: (n: number) => void }) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => { setRaw(String(value)) }, [value])

  const btn = (icon: React.ReactNode, fn: () => void, disabled: boolean) => (
    <button
      onClick={fn}
      disabled={disabled}
      aria-label="ajustar"
      className={clsx(
        'grid h-11 w-11 flex-shrink-0 place-items-center rounded-[11px] border-[1.5px] border-line transition-colors duration-150',
        disabled ? 'cursor-default bg-[#F8F7F4] text-[#CFCBC3]' : 'cursor-pointer bg-white text-body hover:border-teal hover:text-teal'
      )}
    >{icon}</button>
  )
  return (
    <div className="flex items-center gap-3.5">
      {btn(<Minus size={17} />, () => setValue(Math.max(1, value - 1)), value <= 1)}
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          setRaw(v)
          const n = parseInt(v, 10)
          if (!isNaN(n) && n >= 1) setValue(n)
        }}
        onFocus={e => e.currentTarget.select()}
        onBlur={() => {
          const n = parseInt(raw, 10)
          const valid = !isNaN(n) && n >= 1 ? n : 1
          setValue(valid)
          setRaw(String(valid))
        }}
        className="h-11 w-[68px] rounded-lg border-[1.5px] border-line bg-white p-0 text-center font-[inherit] text-[22px] font-bold text-dark outline-none transition-colors duration-150 [font-variant-numeric:tabular-nums] focus:border-teal"
      />
      {btn(<Plus size={16} />, () => setValue(value + 1), false)}
    </div>
  )
}

/* ── ProdutoBuscador ─────────────────────────────────────────── */

function ProdutoBuscador({ tipoItem, value, onChange }: {
  tipoItem: TipoProduto
  value: ProdutoResponse | null
  onChange: (p: ProdutoResponse) => void
}) {
  const [busca, setBusca] = useState('')
  const [opts, setOpts] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const delay = busca ? 300 : 0
    const t = setTimeout(async () => {
      try {
        const res = await produtoService.listar(0, 20, tipoItem, busca || undefined)
        const ativos = res.content.filter(p => p.ativo)
        if (busca.trim()) {
          const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          const q = norm(busca.trim())
          setOpts(ativos.filter(p => norm(p.nome).includes(q)))
        } else {
          setOpts(ativos)
        }
      } catch {
        setOpts([])
      } finally {
        setLoading(false)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [busca, tipoItem, open])

  useEffect(() => {
    setBusca('')
    setOpen(false)
  }, [tipoItem])

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          'flex w-full cursor-pointer items-center gap-3 rounded-input border-[1.5px] bg-white px-3.5 py-3 text-left font-[inherit] transition-[border-color,box-shadow] duration-150',
          open ? 'border-teal shadow-[0_0_0_4px_rgba(42,157,143,0.12)]' : 'border-line'
        )}
      >
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
          <Box size={20} />
        </span>
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block text-[14.5px] font-semibold text-dark">{value.nome}</span>
              <span className="mt-px block text-[12.5px] text-muted">Clique para trocar</span>
            </>
          ) : (
            <span className="block text-[14.5px] font-normal text-muted">Selecione um produto...</span>
          )}
        </span>
        <span className="flex text-muted"><ChevronDown size={16} /></span>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 animate-pop overflow-hidden rounded-xl border border-line bg-white shadow-[0_14px_34px_-10px_rgba(0,0,0,0.2)]">
          <div className="border-b border-[#F4F2EE] px-2.5 py-2">
            <input
              ref={inputRef}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              className="h-[38px] w-full rounded-lg border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-none transition-colors duration-150 focus:border-teal"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1.5">
            {loading ? (
              <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
            ) : opts.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum produto encontrado</div>
            ) : opts.map(p => {
              const on = value?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { onChange(p); setOpen(false); setBusca('') }}
                  className={clsx(
                    'flex w-full cursor-pointer items-center gap-[11px] rounded-lg border-none px-[11px] py-2.5 text-left font-[inherit] transition-colors duration-100',
                    on ? 'bg-teal/[0.08]' : 'bg-transparent hover:bg-[#F7F5F1]'
                  )}
                >
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal"><Box size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-sm font-semibold', on ? 'text-teal' : 'text-dark')}>{p.nome}</span>
                    <span className="block text-xs text-muted">Estoque: {p.estoqueAtual}</span>
                  </span>
                  {on && <span className="flex text-teal"><Check size={14} /></span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── QuantidadeProduzidaInput ────────────────────────────────── */

function QuantidadeProduzidaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-[140px]">
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        placeholder="1"
        className="h-11 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-3.5 pr-10 text-right font-[inherit] text-lg font-bold text-dark outline-none transition-[border-color,box-shadow] duration-150 [font-variant-numeric:tabular-nums] focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A8A49C]">un</span>
    </div>
  )
}

/* ── ConfirmEstoqueModal ─────────────────────────────────────── */

function ConfirmEstoqueModal({ mensagem, onCancel, onConfirm, confirming }: {
  mensagem: string
  onCancel: () => void
  onConfirm: () => void
  confirming: boolean
}) {
  return (
    <ConfirmacaoModal
      open
      onClose={onCancel}
      onConfirm={onConfirm}
      variant="danger"
      icon={<AlertTriangle size={22} />}
      title="Saldo insuficiente de insumo"
      width={460}
      confirmLabel="Continuar mesmo assim"
      confirmingLabel="Confirmando..."
      confirming={confirming}
      description={
        <>
          <span className="mb-2.5 block text-[12.5px] text-muted">O estoque do insumo pode ficar negativo.</span>
          <span className="mb-2 block text-[13.5px] text-danger-deep">{mensagem}</span>
          <span className="block text-[12.5px] text-muted">
            Deseja continuar mesmo assim? O sistema vai gravar a(s) produção(ões) e deixar o saldo negativo.
          </span>
        </>
      }
    />
  )
}

/* ── NovaProducaoModal ───────────────────────────────────────── */

interface ItemSessao {
  id: string
  produto: ProdutoResponse
  fracionavel: boolean
  quantidade: number | null
  lotes: number | null
  rendimento: number | null
  quantidadeFinal: number
}

function extrairMensagemErro(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao lançar produção.'
}

function itemSessaoParaRequest(item: ItemSessao, forcar: boolean): LancarProducaoRequest {
  return {
    produtoId: item.produto.id,
    quantidade: item.fracionavel ? item.quantidade ?? undefined : undefined,
    lotes: item.fracionavel ? undefined : item.lotes ?? undefined,
    confirmarEstoqueNegativo: forcar,
  }
}

function NovaProducaoModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (producoes: ProducaoDetalheResponse[]) => void
}) {
  const [tipoAtivo, setTipoAtivo] = useState<TipoProduto>('PRODUTO')
  const [produto, setProduto] = useState<ProdutoResponse | null>(null)
  const [produtoDetalhe, setProdutoDetalhe] = useState<ProdutoDetalheResponse | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [qtdInput, setQtdInput] = useState('1')
  const [previewInsumos, setPreviewInsumos] = useState<InsumoConsumidoResponse[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null)
  const [confirmEstoque, setConfirmEstoque] = useState(false)
  const [mensagemConfirmEstoque, setMensagemConfirmEstoque] = useState('')
  const [itensPendentes, setItensPendentes] = useState<LancarProducaoRequest[] | null>(null)
  const [sessao, setSessao] = useState<ItemSessao[]>([])

  const trocaTipo = (v: TipoProduto) => {
    setTipoAtivo(v)
    setProduto(null)
    setProdutoDetalhe(null)
    setPreviewInsumos(null)
    setErro(null)
  }

  const selecionaProduto = (p: ProdutoResponse) => {
    setProduto(p)
    setProdutoDetalhe(null)
    setQtdInput('1')
    setErro(null)
  }

  useEffect(() => {
    if (!produto) { setProdutoDetalhe(null); return }
    setLoadingDetalhe(true)
    produtoService.buscarPorId(produto.id)
      .then(setProdutoDetalhe)
      .catch(() => setProdutoDetalhe(null))
      .finally(() => setLoadingDetalhe(false))
  }, [produto])

  const fracionavel = !produtoDetalhe?.algumInsumoNaoFracionavel
  const rendimento = produtoDetalhe?.rendimento ?? null
  const lotesNum = parseInt(qtdInput, 10) || 0
  const quantidadeNum = parseFloat(qtdInput.replace(',', '.')) || 0
  const quantidadeFinal = fracionavel ? quantidadeNum : lotesNum * (rendimento ?? 0)
  const itemAtualValido = !!produto && !!produtoDetalhe && !loadingDetalhe && quantidadeFinal > 0

  useEffect(() => {
    if (!produto || !produtoDetalhe || quantidadeFinal <= 0) { setPreviewInsumos(null); return }
    setLoadingPreview(true)
    const t = setTimeout(async () => {
      try {
        const res = await producaoService.preview(produto.id, quantidadeFinal)
        setPreviewInsumos(res)
      } catch {
        setPreviewInsumos(null)
      } finally {
        setLoadingPreview(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [produto, produtoDetalhe, quantidadeFinal])

  const limparFormulario = () => {
    setProduto(null)
    setProdutoDetalhe(null)
    setQtdInput('1')
    setPreviewInsumos(null)
    setErro(null)
  }

  const handleAdicionar = () => {
    if (!produto || !produtoDetalhe || !itemAtualValido) return
    const novo: ItemSessao = {
      id: crypto.randomUUID(),
      produto,
      fracionavel,
      quantidade: fracionavel ? quantidadeNum : null,
      lotes: fracionavel ? null : lotesNum,
      rendimento,
      quantidadeFinal,
    }
    setSessao(prev => [...prev, novo])
    limparFormulario()
  }

  const handleRemoverSessao = (id: string) => {
    setSessao(prev => prev.filter(i => i.id !== id))
  }

  const handleEditarSessao = (item: ItemSessao) => {
    setSessao(prev => prev.filter(i => i.id !== item.id))
    setProduto(item.produto)
    setQtdInput(String(item.fracionavel ? item.quantidade ?? 1 : item.lotes ?? 1))
    setErro(null)
  }

  const construirListaFinal = (): LancarProducaoRequest[] => {
    const itens = sessao.map(i => itemSessaoParaRequest(i, false))
    if (itemAtualValido && produto) {
      itens.push({
        produtoId: produto.id,
        quantidade: fracionavel ? quantidadeNum : undefined,
        lotes: fracionavel ? undefined : lotesNum,
        confirmarEstoqueNegativo: false,
      })
    }
    return itens
  }

  const doLancarLote = async (itens: LancarProducaoRequest[]) => {
    setSubmitting(true)
    setErro(null)
    setErroBloqueio(null)
    try {
      const resultado = await producaoService.lancarLote({ producoes: itens })
      onSuccess(resultado)
    } catch (err: unknown) {
      const msg = extrairMensagemErro(err)
      if (msg.includes('não permite')) {
        setErroBloqueio(msg)
      } else if (msg.toLowerCase().includes('estoque insuficiente')) {
        setItensPendentes(itens)
        setMensagemConfirmEstoque(msg)
        setConfirmEstoque(true)
      } else {
        setErro(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmarClick = () => {
    const itens = construirListaFinal()
    if (itens.length === 0) return
    doLancarLote(itens)
  }

  const handleForcarConfirm = () => {
    if (!itensPendentes) return
    setConfirmEstoque(false)
    doLancarLote(itensPendentes.map(i => ({ ...i, confirmarEstoqueNegativo: true })))
  }

  const podeConfirmar = (sessao.length > 0 || itemAtualValido) && !submitting

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex animate-fade-in items-start justify-center overflow-y-auto bg-[rgba(20,18,16,0.4)] px-4 py-10 backdrop-blur-[1.5px]">
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="relative m-auto flex w-[min(680px,100%)] animate-scale-in flex-col rounded-[20px] bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)]">

        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-[13px]">
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl bg-orange/[0.12] text-orange">
              <Factory size={24} />
            </span>
            <div>
              <div className="text-[17px] font-bold tracking-[-0.01em] text-dark">Nova Produção</div>
              <div className="mt-0.5 text-[12.5px] text-muted">Produza antecipado e baixe os insumos do estoque.</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border-none bg-line-soft text-subtle transition-colors duration-150 hover:bg-line-deep"
          ><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-[22px]">
          <div>
            <span className="mb-2 block text-[13.5px] font-semibold text-body">Tipo do item produzido</span>
            <div className="flex gap-[3px] rounded-input bg-line-soft p-1">
              {TIPO_LABELS.map(({ label, value }) => {
                const on = tipoAtivo === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => trocaTipo(value)}
                    className={clsx(
                      'h-10 flex-1 whitespace-nowrap rounded-lg border-none px-1 font-[inherit] text-[12.5px] font-semibold transition-all duration-150',
                      on ? 'bg-white text-dark shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#8A8780]'
                    )}
                  >{label}</button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[13.5px] font-semibold text-body">
              {tipoAtivo === 'PRODUTO_BASE' ? 'Produto base a produzir' : tipoAtivo === 'CUSTOMIZACAO' ? 'Customização a produzir' : 'Produto a produzir'}
            </span>
            <ProdutoBuscador tipoItem={tipoAtivo} value={produto} onChange={selecionaProduto} />
          </div>

          {produto && loadingDetalhe ? (
            <div className="text-[13px] text-muted">Carregando dados do produto...</div>
          ) : (
            <div className="flex flex-col gap-3">
              {produtoDetalhe && (
                <div className={clsx('flex items-center gap-[7px] text-[12.5px] font-semibold', fracionavel ? 'text-teal' : 'text-[#6B6860]')}>
                  {fracionavel ? <Check size={13} /> : <AlertCircle size={13} />}
                  {fracionavel
                    ? 'Esta receita permite fracionamento'
                    : `Esta receita não permite fracionamento${rendimento != null ? ` — 1 receita = ${rendimento} unidades` : ''}`
                  }
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="block text-[13.5px] font-semibold text-body">
                    {fracionavel ? 'Quantidade produzida' : 'Quantas receitas você produziu?'}
                  </span>
                  {!fracionavel && rendimento != null && (
                    <span className="mt-0.5 block text-xs text-muted">1 receita = {rendimento} unidades</span>
                  )}
                </div>
                {fracionavel
                  ? <QuantidadeProduzidaInput value={qtdInput} onChange={setQtdInput} />
                  : <Counter value={lotesNum || 1} setValue={n => setQtdInput(String(n))} />
                }
              </div>

              {!fracionavel && rendimento == null && (
                <div className="flex items-center gap-2 text-[12.5px] text-danger">
                  <AlertCircle size={13} /> Este produto não tem rendimento definido — edite o produto antes de lançar produção.
                </div>
              )}

              {!fracionavel && rendimento != null && (
                <div className="flex items-center justify-between rounded-input border border-dashed border-teal/30 bg-teal/[0.06] px-3.5 py-2.5">
                  <span className="text-[13px] text-body">Quantidade final ({lotesNum} {lotesNum === 1 ? 'receita' : 'receitas'} × {rendimento} un)</span>
                  <span className="text-base font-bold text-teal [font-variant-numeric:tabular-nums]">{quantidadeFinal} unidades</span>
                </div>
              )}
            </div>
          )}

          {produto && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-teal/[0.22] bg-teal/[0.05]">
              <div className="flex items-center gap-[9px] border-b border-teal/[0.18] px-4 py-[13px]">
                <span className="flex text-teal"><Layers size={18} /></span>
                <span className="text-[13.5px] font-bold text-teal-deep">Insumos que serão consumidos para {quantidadeFinal} {quantidadeFinal === 1 ? 'unidade' : 'unidades'}</span>
              </div>
              {loadingPreview ? (
                <div className="px-4 py-4 text-center text-[13px] text-muted">Calculando consumo...</div>
              ) : previewInsumos && previewInsumos.length > 0 ? (
                <div>
                  {previewInsumos.map((ins, i) => (
                    <div key={ins.insumoId} className={clsx('flex animate-row-in items-center gap-3 px-4 py-3', i !== 0 && 'border-t border-teal/[0.12]')}>
                      <span className={clsx('grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-[7px]', ins.estoqueInsuficiente ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success')}>
                        {ins.estoqueInsuficiente ? <AlertCircle size={13} /> : <Check size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.8px] font-semibold text-dark">
                          {ins.nomeInsumo}{ins.marca ? ` (${ins.marca})` : ''}
                        </div>
                        {ins.estoqueAntes !== undefined && (
                          <div className="mt-px text-xs text-muted">
                            Disponível: <strong className={clsx('font-semibold', ins.estoqueInsuficiente ? 'text-danger' : 'text-body')}>{ins.estoqueAntes} {ins.unidadeMedida}</strong>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="whitespace-nowrap text-[14.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">{ins.quantidade} {ins.unidadeMedida}</div>
                        {ins.estoqueInsuficiente
                          ? <div className="mt-px flex items-center justify-end gap-[3px] text-[11px] font-bold text-danger"><AlertCircle size={11} /> Saldo insuficiente</div>
                          : <div className="mt-px text-[11px] font-semibold text-success">OK</div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : previewInsumos?.length === 0 ? (
                <div className="px-4 py-4 text-center text-[13px] text-muted">Sem insumos vinculados a este produto</div>
              ) : null}
            </div>
          )}

          {itemAtualValido && (
            <button
              type="button"
              onClick={handleAdicionar}
              className="flex h-[42px] items-center gap-2 self-start rounded-input border-[1.5px] border-orange bg-white px-4 font-[inherit] text-[13.5px] font-semibold text-orange transition-colors duration-100 hover:bg-orange/[0.08]"
            >
              <Plus size={16} /> Adicionar mais uma produção
            </button>
          )}

          {sessao.length > 0 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-line bg-[#FAF8F5]">
              <div className="flex items-center gap-[9px] border-b border-line px-4 py-[13px]">
                <span className="flex text-body"><Layers size={15} /></span>
                <span className="text-[13.5px] font-bold text-dark">Produções nesta sessão ({sessao.length})</span>
              </div>
              <div>
                {sessao.map((item, i) => (
                  <div key={item.id} className={clsx('flex items-center gap-3 px-4 py-3', i !== 0 && 'border-t border-line')}>
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
                      <Box size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.8px] font-semibold text-dark">{item.produto.nome}</div>
                      <div className="mt-px text-xs text-muted">
                        {item.fracionavel
                          ? `${item.quantidade} unidades`
                          : `${item.lotes} ${item.lotes === 1 ? 'receita' : 'receitas'} (${item.quantidadeFinal} unidades)`
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditarSessao(item)}
                      aria-label="Editar"
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border-none bg-transparent text-muted transition-colors duration-100 hover:bg-line hover:text-body"
                    ><Pencil size={15} /></button>
                    <button
                      type="button"
                      onClick={() => handleRemoverSessao(item.id)}
                      aria-label="Remover"
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border-none bg-transparent text-muted transition-colors duration-100 hover:bg-danger-bg hover:text-danger"
                    ><X size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {erroBloqueio && (
            <div className="flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
              <span className="mt-px flex flex-shrink-0 text-danger"><AlertCircle size={16} /></span>
              <p className="m-0 text-[13px] leading-[1.5] text-danger">{erroBloqueio}</p>
            </div>
          )}

          {erro && (
            <div className="flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
              <span className="mt-px flex flex-shrink-0 text-danger"><AlertCircle size={16} /></span>
              <p className="m-0 text-[13px] leading-[1.5] text-danger">{erro}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-[11px] border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <button
            onClick={handleConfirmarClick}
            disabled={!podeConfirmar}
            className={clsx(
              'flex h-[46px] items-center gap-2 whitespace-nowrap rounded-input border-none px-[22px] font-[inherit] text-sm font-semibold transition-all duration-150',
              podeConfirmar ? 'cursor-pointer bg-orange text-white shadow-[0_8px_18px_-8px_rgba(249,115,22,0.7)] hover:brightness-105' : 'cursor-default bg-[#E7E4DE] text-[#B0ACA4]'
            )}
          >
            <Factory size={17} />
            {submitting
              ? 'Lançando...'
              : sessao.length + (itemAtualValido ? 1 : 0) > 1
                ? `Confirmar ${sessao.length + (itemAtualValido ? 1 : 0)} produções`
                : 'Confirmar produção'
            }
          </button>
        </div>
      </div>

      {confirmEstoque && (
        <ConfirmEstoqueModal
          mensagem={mensagemConfirmEstoque}
          onCancel={() => setConfirmEstoque(false)}
          onConfirm={handleForcarConfirm}
          confirming={submitting}
        />
      )}
    </div>
  )
}

/* ── CancelarProducaoModal ───────────────────────────────────── */

function CancelarProducaoModal({ prod, onClose, onSuccess }: {
  prod: ProducaoResponse
  onClose: () => void
  onSuccess: () => void
}) {
  const [obs, setObs] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const podeConfirmar = obs.trim().length >= 50 && !submitting
  const invalido = obs.length > 0 && obs.length < 50

  const handleSubmit = async () => {
    setSubmitting(true)
    setErro(null)
    try {
      await producaoService.cancelar(prod.id, obs)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao cancelar produção.'
      setErro(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={handleSubmit}
      variant="danger"
      icon={<AlertCircle size={15} />}
      title={`Cancelar produção #${prod.numero}`}
      width={500}
      cancelLabel="Voltar"
      confirmLabel="Cancelar produção"
      confirmingLabel="Cancelando..."
      confirming={submitting}
      confirmDisabled={!podeConfirmar}
      description={
        <span className="block text-[12.5px] text-muted">Esta ação não pode ser desfeita.</span>
      }
    >
      <div className="mb-4 rounded-xl border border-[#F2D8CF] bg-danger-bg px-4 py-3.5">
        <div className="mb-2 text-[13.5px] font-bold text-danger-deep">Esta ação irá:</div>
        <ul className="m-0 pl-[18px] text-[13px] leading-[1.6] text-[#8A5A4C]">
          <li>Subtrair <strong className="font-bold">{prod.quantidade} unid.</strong> do estoque de <strong className="font-bold">{prod.nomeProduto}</strong></li>
          <li>Devolver ao estoque os insumos consumidos nesta produção</li>
          <li>Marcar a produção como <strong className="font-bold">Cancelada</strong> (não pode ser reativada)</li>
        </ul>
      </div>

      <label>
        <span className="mb-[7px] block text-[13px] font-semibold text-body">
          Motivo do cancelamento <span className="text-orange">*</span>
          <span className={clsx('ml-2 font-normal', obs.length >= 50 ? 'text-[#3E9D5A]' : 'text-muted')}>
            {obs.length}/50 caracteres mín.
          </span>
        </span>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          placeholder="Descreva o motivo do cancelamento (ex: quantidade registrada foi incorreta, era para ser outro produto)"
          rows={3}
          className={clsx(
            'w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-3 font-[inherit] text-[14.5px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:ring-4 focus:ring-teal/[0.12]',
            invalido ? 'border-[#F2B8A6]' : 'border-line focus:border-teal'
          )}
        />
        {invalido && (
          <div className="mt-1.5 flex items-center gap-[5px] text-[12.5px] text-danger">
            <AlertCircle size={13} /> Mínimo de 50 caracteres. Faltam {50 - obs.length}.
          </div>
        )}
      </label>

      {erro && (
        <div className="mt-4 flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
          <span className="mt-px flex flex-shrink-0 text-danger"><AlertCircle size={16} /></span>
          <p className="m-0 text-[13px] leading-[1.5] text-danger">{erro}</p>
        </div>
      )}
    </ConfirmacaoModal>
  )
}

/* ── ProducaoDetalhe ─────────────────────────────────────────── */

function ProducaoDetalhe({ prod, onBack }: { prod: ProducaoDetalheResponse; onBack: () => void }) {
  const cancelada = prod.status === 'CANCELADA'

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-input border-[1.5px] border-line bg-white py-0 pl-3 pr-4 font-[inherit] text-sm font-semibold text-body transition-colors duration-100 hover:bg-[#FAF8F5]"
        >
          <span className="flex rotate-180"><ChevronRight size={15} /></span> Voltar para Produção
        </button>
      </div>

      <div className="mb-[22px] flex flex-wrap items-center gap-[15px]">
        <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[15px] bg-orange/[0.12] text-orange">
          <Factory size={24} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-[25px] font-bold tracking-[-0.02em] text-dark">Produção #{prod.numero} — {fmtData(prod.dataProducao)}</h1>
            {cancelada && (
              <span className="inline-flex h-[27px] items-center rounded-full bg-[#FBEDE7] px-[11px] text-[12.5px] font-bold text-danger">
                Cancelada
              </span>
            )}
          </div>
          <p className="mb-0 mt-[5px] text-sm text-muted">
            {cancelada ? 'Esta produção foi cancelada e seus efeitos no estoque foram revertidos.' : 'Baixa de insumos registrada no estoque.'}
          </p>
        </div>
      </div>

      {cancelada && prod.observacaoCancelamento && (
        <div className="mb-[18px] flex gap-2.5 rounded-xl border border-[#F2D8CF] bg-danger-bg px-[15px] py-[13px]">
          <span className="mt-px flex-shrink-0 text-danger"><AlertCircle size={15} /></span>
          <p className="m-0 text-[12.8px] leading-[1.55] text-[#8A5A4C]">
            <strong className="font-bold">Motivo do cancelamento:</strong> {prod.observacaoCancelamento}
          </p>
        </div>
      )}

      <div className={clsx('mb-[18px] flex items-center gap-3.5 rounded-card border border-[#F0EEE9] bg-white px-5 py-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]', cancelada && 'opacity-65')}>
        <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-teal/10 text-teal">
          <Box size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className={clsx('text-base font-bold tracking-[-0.01em] text-dark', cancelada && 'line-through')}>{prod.nomeProduto}</div>
          <div className="mt-0.5 text-[13px] text-muted">Produzido em {fmtData(prod.dataProducao)}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={clsx('text-2xl font-bold leading-none [font-variant-numeric:tabular-nums]', cancelada ? 'text-muted line-through' : 'text-teal')}>{prod.quantidade}</div>
          <div className="mt-[3px] text-xs font-semibold text-muted">unidades produzidas</div>
        </div>
      </div>

      <div className={clsx('overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]', cancelada && 'opacity-65')}>
        <div className="flex items-center gap-[9px] border-b border-line px-[18px] py-3.5">
          <span className="flex text-teal"><Layers size={18} /></span>
          <h2 className="m-0 text-sm font-bold uppercase tracking-[0.03em] text-body">Insumos consumidos</h2>
        </div>
        {prod.insumosConsumidos.length === 0 ? (
          <div className="p-[18px] text-center text-[13px] text-muted">Nenhum insumo registrado</div>
        ) : prod.insumosConsumidos.map((row, i) => (
          <div key={row.insumoId} className={clsx('flex items-center justify-between gap-3 px-[18px] py-3.5', i !== 0 && 'border-t border-[#F4F2EE]')}>
            <div className="flex min-w-0 items-center gap-[11px]">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-line-soft text-[#9A968E]">
                <Box size={16} />
              </span>
              <span className={clsx('text-sm font-semibold text-dark', cancelada && 'line-through')}>
                {row.nomeInsumo}{row.marca ? ` (${row.marca})` : ''}
              </span>
            </div>
            <span className={clsx('whitespace-nowrap text-[14.5px] font-bold text-dark [font-variant-numeric:tabular-nums]', cancelada && 'line-through')}>
              {row.quantidade} {row.unidadeMedida}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── página principal ────────────────────────────────────────── */

export default function RegistroProducaoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()

  const [producoes, setProducoes] = useState<ProducaoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const { toast, setToast } = useToast()

  const [detalhe, setDetalhe] = useState<ProducaoDetalheResponse | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [cancelarProd, setCancelarProd] = useState<ProducaoResponse | null>(null)

  const carregarLista = useCallback(async (page: number, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const res = await producaoService.listar(page, 20)
      setProducoes(prev => reset ? res.content : [...prev, ...res.content])
      setHasNext(!res.last)
      setCurrentPage(page)
    } catch {
      // silent — erros de auth tratados pelo interceptor axios
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!id) { carregarLista(0, true) }
  }, [id, carregarLista])

  useEffect(() => {
    if (!id) { setDetalhe(null); return }
    setLoadingDetalhe(true)
    producaoService.buscarPorId(id)
      .then(d => setDetalhe(d))
      .catch(() => navigate('/producao'))
      .finally(() => setLoadingDetalhe(false))
  }, [id, navigate])

  const handleSuccess = (producoesNovas: ProducaoDetalheResponse[]) => {
    setModal(false)
    carregarLista(0, true)
    const identificadores = producoesNovas.map(p => p.identificador).join(', ')
    setToast(producoesNovas.length > 1
      ? `Produções ${identificadores} registradas com sucesso!`
      : `Produção ${identificadores} registrada com sucesso!`
    )
  }

  const handleCancelSuccess = () => {
    if (!cancelarProd) return
    setProducoes(prev => prev.map(p =>
      p.id === cancelarProd.id ? { ...p, status: 'CANCELADA' as const } : p
    ))
    setCancelarProd(null)
    setToast('Produção cancelada com sucesso.')
  }

  const filtrado = producoes.filter(h =>
    busca.trim() === '' || h.nomeProduto.toLowerCase().includes(busca.trim().toLowerCase())
  )

  const menuItems = (h: ProducaoResponse): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { label: 'Ver detalhes', icon: <Eye size={18} />, onClick: () => navigate(`/producao/${h.id}`) },
    ]
    if (h.status === 'ATIVA') {
      items.push({
        label: 'Cancelar produção',
        icon: <Ban size={16} />,
        onClick: () => setCancelarProd(h),
        danger: true,
        dividerBefore: true,
      })
    }
    return items
  }

  // Vista de detalhe
  if (id) {
    return (
      <AppLayout active="producao">
        {loadingDetalhe || !detalhe ? (
          <div className="py-12 text-center text-[15px] text-muted">
            {loadingDetalhe ? 'Carregando produção...' : ''}
          </div>
        ) : (
          <ProducaoDetalhe prod={detalhe} onBack={() => navigate('/producao')} />
        )}
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao">

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] max-w-[min(90vw,460px)] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] rounded-input bg-teal px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.02em] text-dark">Registro de Produção</h1>
          <p className="mb-0 mt-1.5 text-[14.5px] text-muted">Registre o que você produziu para dar baixa nos insumos e atualizar o estoque dos seus produtos.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex h-[46px] items-center gap-[9px] whitespace-nowrap rounded-input border-none bg-orange px-5 font-[inherit] text-[14.5px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(249,115,22,0.7)] transition-[filter] duration-150 hover:brightness-105"
        >
          <Plus size={16} /> Nova Produção
        </button>
      </div>

      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="group relative min-w-[200px] max-w-[380px] flex-[1_1_240px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-[#A8A49C] group-focus-within:text-teal">
            <Search size={18} />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por produto..."
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="flex text-[#A8A49C]"><Factory size={17} /></span>
        <h2 className="m-0 text-[14.5px] font-bold uppercase tracking-[0.03em] text-body">Histórico de produções</h2>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[15px] text-muted">Carregando...</div>
      ) : filtrado.length === 0 ? (
        <div className="py-12 text-center text-[15px] text-muted">
          {busca ? 'Nenhuma produção encontrada para essa busca.' : 'Nenhuma produção registrada ainda.'}
        </div>
      ) : (
        <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="hidden grid-cols-[82px_116px_1.3fr_96px_1.4fr_92px] gap-[18px] bg-[#FBFAF8] px-[22px] py-[13px] sm:grid">
            {['#', 'Data', 'Produto', 'Quantidade', 'Status', ''].map((h, k) => (
              <div key={k} className={clsx('text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]', k === 5 && 'text-right')}>{h}</div>
            ))}
          </div>

          {filtrado.map((h) => (
            <React.Fragment key={h.id}>
              <div
                className={clsx(
                  'hidden animate-fade-up cursor-pointer grid-cols-[82px_116px_1.3fr_96px_1.4fr_92px] items-center gap-[18px] border-t border-line px-[22px] py-4 transition-colors duration-100 hover:bg-line sm:grid',
                  h.status === 'CANCELADA' && 'opacity-65'
                )}
                onClick={() => navigate(`/producao/${h.id}`)}
              >
                <div className="text-[12.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{h.identificador}</div>
                <div className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{fmtData(h.dataProducao)}</div>
                <div className="flex min-w-0 items-center gap-[11px]">
                  <span className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
                    <Box size={20} />
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{h.nomeProduto}</span>
                </div>
                <div className="whitespace-nowrap text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">{h.quantidade} unid.</div>
                <div>
                  {h.status === 'CANCELADA'
                    ? <span className="inline-flex h-[22px] items-center rounded-full bg-[#FBEDE7] px-2 text-[11px] font-bold text-danger">Cancelada</span>
                    : <span className="inline-flex h-[22px] items-center rounded-full bg-success-bg px-2 text-[11px] font-bold text-success">Ativa</span>
                  }
                </div>
                <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                  <ActionMenu items={menuItems(h)} align="right" />
                </div>
              </div>

              <div
                className={clsx('block animate-fade-up cursor-pointer border-t border-line px-[18px] py-4 sm:hidden', h.status === 'CANCELADA' && 'opacity-65')}
                onClick={() => navigate(`/producao/${h.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
                      <Box size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{h.identificador}</div>
                      <span className="text-sm font-semibold text-dark">{h.nomeProduto}</span>
                      {h.status === 'CANCELADA' && (
                        <span className="ml-2 inline-flex h-5 items-center rounded-full bg-[#FBEDE7] px-[7px] text-[11px] font-bold text-danger">Cancelada</span>
                      )}
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-[13.5px] font-bold text-teal [font-variant-numeric:tabular-nums]">{h.quantidade} unid.</span>
                </div>
                <div className="mt-[11px] flex items-center justify-between">
                  <span className="text-xs text-muted [font-variant-numeric:tabular-nums]">{fmtData(h.dataProducao)}</span>
                  <div onClick={e => e.stopPropagation()}>
                    <ActionMenu items={menuItems(h)} align="right" />
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}

          {hasNext && !busca && (
            <div className="border-t border-line px-[18px] py-4 text-center">
              <button
                onClick={() => carregarLista(currentPage + 1, false)}
                disabled={loadingMore}
                className={clsx(
                  'h-10 rounded-input border-[1.5px] border-line bg-white px-5 font-[inherit] text-sm font-semibold text-body transition-colors duration-100',
                  loadingMore ? 'cursor-default' : 'cursor-pointer hover:bg-[#FAF8F5]'
                )}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      )}

      {modal && <NovaProducaoModal onClose={() => setModal(false)} onSuccess={handleSuccess} />}
      {cancelarProd && (
        <CancelarProducaoModal
          prod={cancelarProd}
          onClose={() => setCancelarProd(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </AppLayout>
  )
}
