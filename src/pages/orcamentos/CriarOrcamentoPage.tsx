import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, ModalShell } from '../../components/ui'
import {
  Phone, Search, Layers, Box, Trash2, SlidersHorizontal, Tag, AlertCircle, AlertTriangle,
  Calendar, Wallet, DollarSign, FileText, StickyNote, Filter, ShoppingCart, Plus,
} from 'lucide-react'
import { clienteService } from '../../services/clienteService'
import { produtoService } from '../../services/produtoService'
import { orcamentoService } from '../../services/orcamentoService'
import { catalogoService } from '../../services/catalogoService'
import { empresaService } from '../../services/empresaService'
import type { ClienteResponse } from '../../types/cliente'
import type { ProdutoResponse } from '../../types/produto'
import type { OrcamentoRequest, MetodoPagamento, ItemCatalogoBuscaResponse, AvisoEstoque } from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import { METODOS_PAGAMENTO } from '../../constants'

const BRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

interface Item {
  id: number
  nome: string
  qtd: number
  preco: number
  customs: { id: string; nome: string; valor: number; qtd: number }[]
  produtoId?: string
  produtoIdentificador?: string
  itemCatalogoId?: string
  catalogoNome?: string
  margemAplicada?: number
}

// ── QuoteCard ──────────────────────────────────────────────────────────────
function QuoteCard({ step, label, hint, children }: {
  step: string
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-teal/[0.12] text-[13.5px] font-bold text-teal">{step}</span>
        <div>
          <div className="text-[15.5px] font-bold text-dark">{label}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── ClienteSelect ──────────────────────────────────────────────────────
function ClienteSelect({ cliente, onSelect, onClear }: {
  cliente: ClienteResponse | null
  onSelect: (c: ClienteResponse) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ClienteResponse[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const load = async () => {
      try {
        const data = await clienteService.listar(0, 20, q)
        setResults(data.content)
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
        setResults([])
      }
    }
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [q])

  if (cliente) {
    return (
      <div className="px-5 pb-5 pt-3.5">
        <div className="flex items-center gap-3.5 rounded-xl border border-teal/20 bg-teal/[0.07] px-4 py-3.5">
          <span className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-full bg-teal/[0.15] text-lg font-bold text-teal">
            {cliente.nome.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15.5px] font-semibold text-dark">{cliente.nome}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-body">
              <Phone size={16} className="text-teal" /> {cliente.whatsapp || 'Sem telefone'}
            </div>
          </div>
          <button onClick={onClear} className="flex-shrink-0 cursor-pointer border-none bg-transparent px-2 py-1.5 text-[13px] font-semibold text-teal">
            Trocar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 pt-3.5">
      <div ref={wrapRef} className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
          <Search size={18} />
        </span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Selecionar cliente..."
          className="h-12 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
        {open && results.length > 0 && (
          <div className="absolute inset-x-0 top-[54px] z-30 max-h-[248px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
            {results.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); setQ('') }}
                className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-[#F7F5F1]"
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-teal/[0.12] font-bold text-teal">
                  {c.nome.charAt(0)}
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold text-dark">{c.nome}</div>
                  <div className="text-[12.5px] text-muted">{c.whatsapp || 'Sem telefone'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-shrink-0 items-center overflow-hidden rounded-input border border-line">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="grid h-[42px] w-[38px] place-items-center border-none bg-[#FCFBF9] text-lg text-body transition-colors duration-100 hover:bg-[#F1F0EC]"
      >−</button>
      <span className="w-[46px] border-x border-line text-center text-[15px] font-bold leading-[42px] text-dark [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="grid h-[42px] w-[38px] place-items-center border-none bg-[#FCFBF9] text-lg text-teal transition-colors duration-100 hover:bg-[#F1F0EC]"
      >+</button>
    </div>
  )
}

// ── ItemRow ────────────────────────────────────────────────────────────────
function ItemRow({ item, index, onQtd, onRemove, onOpenCustom }: {
  item: Item
  index: number
  onQtd: (id: number, v: number) => void
  onRemove: (id: number) => void
  onOpenCustom: (item: Item) => void
}) {
  const lineTotal = item.preco * item.qtd
  const origemLabel = item.itemCatalogoId
    ? item.catalogoNome
    : item.produtoId
      ? (item.produtoIdentificador ? `${item.produtoIdentificador} - Venda sem catálogo` : 'Venda sem catálogo')
      : null

  return (
    <div
      className={clsx('animate-fade-up px-5 py-4', index > 0 && 'border-t border-line')}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[160px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15.5px] font-semibold text-dark">{item.nome}</div>
            {origemLabel && (
              <span className={clsx(
                'inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold',
                item.itemCatalogoId ? 'bg-teal/10 text-teal' : 'bg-line-soft text-[#8A8780]'
              )}>
                {item.itemCatalogoId ? <Layers size={11} /> : <Box size={11} />}
                {origemLabel}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">{BRL(item.preco)} / unidade</div>
        </div>
        <Stepper value={item.qtd} onChange={v => onQtd(item.id, v)} />
        <div className="min-w-[108px] text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">Subtotal</div>
          <div className="text-[17px] font-bold text-dark [font-variant-numeric:tabular-nums]">{BRL(lineTotal)}</div>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[9px] border border-transparent bg-transparent text-faint transition-colors duration-100 hover:bg-[#FCF1ED] hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => onOpenCustom(item)}
          className={clsx(
            'inline-flex h-[34px] items-center gap-[7px] rounded-[9px] border px-3 font-[inherit] text-[13px] font-semibold',
            item.customs.length ? 'border-orange/40 bg-orange/[0.08] text-[#A35A26]' : 'border-line bg-[#FCFBF9] text-body'
          )}
        >
          <SlidersHorizontal size={15} /> Customizações{item.customs.length ? ` (${item.customs.length})` : ''}
        </button>
        {item.customs.map((c, k) => (
          <span key={k} className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-white px-[11px] text-[12.5px] text-[#6B6860]">
            <Tag size={17} className="text-orange" />
            {c.nome} <strong className="font-semibold text-[#A35A26]">+{BRL(c.valor)}/un</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── ModalCustomizacoes ─────────────────────────────────────────────────────
function ModalCustomizacoes({ item, onClose, onConfirm }: {
  item: Item
  onClose: () => void
  onConfirm: (id: number, customs: { id: string; nome: string; valor: number; qtd: number }[]) => void
}) {
  const [busca, setBusca] = useState('')
  const [selecionadas, setSelecionadas] = useState<{ id: string; nome: string; valor: number; qtd: number }[]>(
    item.customs.map(c => ({ ...c, qtd: c.qtd ?? 1 }))
  )
  const [customizacoes, setCustomizacoes] = useState<{ id: string; nome: string; valor: number }[]>([])
  const [loadingCustom, setLoadingCustom] = useState(true)
  const [errorCustom, setErrorCustom] = useState(false)

  useEffect(() => {
    setLoadingCustom(true)
    setErrorCustom(false)
    produtoService.listar(0, 100, 'CUSTOMIZACAO')
      .then(data => {
        setCustomizacoes(data.content.map(p => ({
          id: p.id,
          nome: p.nome,
          valor: p.precoVenda ?? 0,
        })))
      })
      .catch(() => setErrorCustom(true))
      .finally(() => setLoadingCustom(false))
  }, [])

  const filtradas = customizacoes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const toggle = (c: { id: string; nome: string; valor: number }) => {
    setSelecionadas(prev =>
      prev.find(x => x.id === c.id)
        ? prev.filter(x => x.id !== c.id)
        : [...prev, { ...c, qtd: 1 }]
    )
  }

  const setQtd = (id: string, qtd: number) => {
    setSelecionadas(prev =>
      prev.map(x => x.id === id ? { ...x, qtd: Math.max(1, qtd) } : x)
    )
  }

  const extraTotal = selecionadas.reduce((s, c) => s + c.valor * c.qtd, 0)

  return (
    <ModalShell
      open
      onClose={onClose}
      title={item.nome}
      subtitle="Customizações"
      icon={<SlidersHorizontal size={20} />}
      iconBg="rgba(249,115,22,0.10)"
      iconColor="#F97316"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(item.id, selecionadas)}>
            Confirmar {selecionadas.length > 0 ? `(${selecionadas.length})` : ''}
          </Button>
        </>
      }
    >
      {/* Campo de busca */}
      <div className="relative mb-3.5">
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
          <Search size={16} />
        </span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar customização..."
          className="h-[42px] w-full rounded-input border-[1.5px] border-line bg-white pl-9 pr-3.5 font-[inherit] text-sm text-dark outline-none transition-colors duration-150 focus:border-teal"
        />
      </div>

      {/* Lista de customizações */}
      <div className="flex flex-col gap-2">
        {loadingCustom ? (
          <div className="p-8 text-center text-sm text-muted">
            Carregando customizações...
          </div>
        ) : errorCustom ? (
          <div className="p-6 text-center text-sm text-danger">
            Falha ao carregar customizações. Tente novamente.
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            {busca ? 'Nenhuma customização encontrada.' : 'Nenhuma customização cadastrada.'}
          </div>
        ) : filtradas.map(c => {
          const sel = selecionadas.find(x => x.id === c.id)
          const on = !!sel

          return (
            <div key={c.id} className={clsx(
              'overflow-hidden rounded-[11px] border-[1.5px] transition-all duration-150',
              on ? 'border-orange/40 bg-orange/[0.07]' : 'border-line bg-[#FCFBF9]'
            )}>
              {/* Linha principal */}
              <button
                onClick={() => toggle(c)}
                className="flex w-full items-center justify-between border-none bg-transparent px-3.5 py-3 font-[inherit]"
              >
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    'grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
                    on ? 'border-orange bg-orange' : 'border-[#D4D0C8] bg-transparent'
                  )}>
                    {on && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 4.2 4.2L19 7"/></svg>}
                  </span>
                  <span className="text-[14.5px] font-semibold text-dark">{c.nome}</span>
                </div>
                <span className={clsx('text-sm font-semibold', on ? 'text-orange' : 'text-[#6B6860]')}>
                  +{BRL(c.valor)}/un
                </span>
              </button>

              {/* Linha de quantidade */}
              {on && (
                <div className="flex animate-[fadeUp_.2s_ease_both] items-center justify-between gap-3 px-3.5 pb-3">
                  <span className="text-[13px] text-muted">Quantidade</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-line">
                    <button onClick={() => setQtd(c.id, (sel?.qtd ?? 1) - 1)} className="grid h-[34px] w-8 place-items-center border-none bg-[#FAF8F5] text-base text-body">−</button>
                    <span className="w-9 border-x border-line text-center text-sm font-bold leading-[34px] text-dark">
                      {sel?.qtd ?? 1}
                    </span>
                    <button onClick={() => setQtd(c.id, (sel?.qtd ?? 1) + 1)} className="grid h-[34px] w-8 place-items-center border-none bg-[#FAF8F5] text-base text-teal">+</button>
                  </div>
                  <span className="min-w-[72px] text-right text-[13.5px] font-semibold text-orange">
                    = {BRL(c.valor * (sel?.qtd ?? 1))}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rodapé de totais */}
      {selecionadas.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-input border border-orange/20 bg-orange/[0.08] px-[15px] py-3">
          <span className="text-[13.5px] font-semibold text-[#A35A26]">
            {selecionadas.length} customização{selecionadas.length > 1 ? 'ões' : ''} selecionada{selecionadas.length > 1 ? 's' : ''}
          </span>
          <span className="text-[15px] font-bold text-orange">+{BRL(extraTotal)}</span>
        </div>
      )}
    </ModalShell>
  )
}

// ── PrazoSection ───────────────────────────────────────────────────────────
function PrazoSection({
  prazoDias, setPrazoDias,
  inicioImediato, setInicioImediato,
  dataInicioEstimada, setDataInicioEstimada,
  error,
}: {
  prazoDias: string
  setPrazoDias: (v: string) => void
  inicioImediato: boolean
  setInicioImediato: (v: boolean) => void
  dataInicioEstimada: string
  setDataInicioEstimada: (v: string) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-4">

      {/* Campo de dias */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={prazoDias}
          onChange={e => setPrazoDias(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="10"
          className={clsx(
            'h-[46px] w-[100px] rounded-input border-[1.5px] px-3.5 text-center font-[inherit] text-lg font-bold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
            error ? 'border-danger' : 'border-line'
          )}
        />
        <span className="text-[15px] font-medium text-body">dias úteis</span>
      </div>
      {error && (
        <div className="flex items-center gap-[5px] text-[13px] text-danger">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Checkbox início */}
      <button
        type="button"
        onClick={() => setInicioImediato(!inicioImediato)}
        className={clsx(
          'flex items-start gap-2.5 rounded-xl border-[1.5px] px-[15px] py-[13px] text-left font-[inherit] transition-all duration-150',
          inicioImediato ? 'border-teal/30 bg-teal/[0.06]' : 'border-line bg-[#FCFBF9]'
        )}
      >
        <span className={clsx(
          'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
          inicioImediato ? 'border-teal bg-teal' : 'border-[#D4D0C8] bg-transparent'
        )}>
          {inicioImediato && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 12.5 4.2 4.2L19 7"/>
            </svg>
          )}
        </span>
        <div>
          <div className="text-[14.5px] font-semibold text-dark">Início assim que aprovado</div>
          <div className="mt-0.5 text-[12.5px] text-muted">A produção começa logo após a aprovação do cliente.</div>
        </div>
      </button>

      {/* Data estimada */}
      {!inicioImediato && (
        <div className="animate-[fadeUp_.2s_ease_both]">
          <label className="block">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <Calendar size={16} className="text-teal" /> Data estimada de início
            </span>
            <input
              type="date"
              value={dataInicioEstimada}
              onChange={e => setDataInicioEstimada(e.target.value)}
              className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </label>
          <p className="mb-0 mt-1.5 text-[12.5px] text-muted">
            Informe quando você estima começar a produção deste pedido.
          </p>
        </div>
      )}

    </div>
  )
}

// ── PagamentoSection ───────────────────────────────────────────────────────
function PagamentoSection({
  metodoPagamento, setMetodoPagamento,
  metodoPagamentoObs, setMetodoPagamentoObs,
  ativo, setAtivo,
  tipo, setTipo,
  valor, setValor,
  sinalAplicado, restante,
}: {
  metodoPagamento: string
  setMetodoPagamento: (v: string) => void
  metodoPagamentoObs: string
  setMetodoPagamentoObs: (v: string) => void
  ativo: boolean
  setAtivo: (v: boolean) => void
  tipo: '%' | 'R$'
  setTipo: (v: '%' | 'R$') => void
  valor: string
  setValor: (v: string) => void
  sinalAplicado: number
  restante: number
}) {
  const obsCharCount = metodoPagamentoObs.length
  const obsInvalido = obsCharCount > 0 && obsCharCount < 50
  return (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-4">

      {/* MÉTODO DE PAGAMENTO */}
      <div>
        <div className="mb-3.5 flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
            <Wallet size={18} />
          </span>
          <div>
            <div className="text-[14.5px] font-semibold text-dark">Método de pagamento</div>
            <div className="mt-px text-[12.5px] text-muted">Como a cliente vai pagar.</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {METODOS_PAGAMENTO.map(m => {
            const on = metodoPagamento === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMetodoPagamento(m.id)}
                className={clsx(
                  'h-[38px] whitespace-nowrap rounded-full border-[1.5px] px-4 font-[inherit] text-[13.5px] font-semibold transition-all duration-150',
                  on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-[#FAF8F5]'
                )}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {metodoPagamento === 'OUTRO' && (
          <div className="mt-3 animate-[fadeUp_.2s_ease_both]">
            <label className="block">
              <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
                <span>Descreva o método de pagamento <span className="text-orange">*</span></span>
                <span className={clsx('font-normal', obsCharCount >= 50 ? 'text-[#3E9D5A]' : 'text-muted')}>
                  {obsCharCount}/50 caracteres mín.
                </span>
              </span>
              <textarea
                value={metodoPagamentoObs}
                onChange={e => setMetodoPagamentoObs(e.target.value)}
                placeholder="Ex: cheque à vista, transferência internacional..."
                rows={3}
                className={clsx(
                  'w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                  obsInvalido ? 'border-[#F2B8A6]' : 'border-line'
                )}
              />
              {obsInvalido && (
                <div className="mt-1.5 flex items-center gap-[5px] text-[13px] text-danger">
                  <AlertCircle size={13} />
                  Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* DIVISOR */}
      <div className="h-px bg-line" />

      {/* SINAL */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
              <DollarSign size={22} />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-dark">Cobrar entrada (sinal)?</div>
              <div className="mt-px text-[12.5px] text-muted">Garante o início da produção.</div>
            </div>
          </div>
          <div className="flex flex-shrink-0 overflow-hidden rounded-input border border-line">
            {(['Não', 'Sim'] as const).map((lbl, i) => {
              const val = i === 1
              const on = ativo === val
              return (
                <button
                  key={lbl}
                  onClick={() => setAtivo(val)}
                  className={clsx(
                    'h-10 w-[60px] border-none font-[inherit] text-sm font-semibold transition-colors duration-150',
                    on ? (val ? 'bg-teal text-white' : 'bg-line-soft text-body') : 'bg-white text-[#A8A49C]'
                  )}
                >{lbl}</button>
              )
            })}
          </div>
        </div>

        {ativo && (
          <div className="mt-4 animate-[fadeUp_.25s_ease_both]">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex flex-shrink-0 overflow-hidden rounded-[9px] border border-line">
                {(['%', 'R$'] as const).map(tp => (
                  <button
                    key={tp}
                    onClick={() => setTipo(tp)}
                    className={clsx(
                      'h-[46px] w-[46px] border-none font-[inherit] text-sm font-semibold',
                      tipo === tp ? 'bg-teal text-white' : 'bg-white text-[#8A8780]'
                    )}
                  >{tp}</button>
                ))}
              </div>
              <input
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                inputMode="decimal"
                placeholder={tipo === '%' ? '50' : '0,00'}
                className="h-[46px] min-w-0 flex-1 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-input border border-dashed border-teal/[0.35] bg-teal/[0.06] px-3.5 py-2.5">
                <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-teal">
                  <Wallet size={15} /> Sinal solicitado
                </span>
                <span className="text-[15px] font-bold text-teal [font-variant-numeric:tabular-nums]">
                  {BRL(sinalAplicado)}
                </span>
              </div>
              <div className="flex justify-between px-0.5 text-[13.5px] text-body">
                <span>Restante após sinal</span>
                <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">
                  {BRL(restante)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary ────────────────────────────────────────────────────────────────
function Summary({ subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit, loading }: {
  subtotal: number
  descTipo: '%' | 'R$'
  descValor: string
  setDescTipo: (v: '%' | 'R$') => void
  setDescValor: (v: string) => void
  descontoAplicado: number
  total: number
  validade: string
  setValidade: (v: string) => void
  obs: string
  setObs: (v: string) => void
  sinalAtivo: boolean
  sinalAplicado: number
  restante: number
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <div className="overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
          <FileText size={20} />
        </span>
        <h2 className="m-0 text-[15.5px] font-bold text-dark">Resumo do orçamento</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-5 py-[18px]">
        <div className="flex justify-between text-[14.5px] text-body">
          <span>Subtotal</span>
          <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(subtotal)}</span>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[14.5px] text-body">Desconto</span>
            <span className="text-[14.5px] font-semibold text-danger [font-variant-numeric:tabular-nums]">− {BRL(descontoAplicado)}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-shrink-0 overflow-hidden rounded-[9px] border border-line">
              {(['%', 'R$'] as const).map(tp => (
                <button
                  key={tp}
                  onClick={() => setDescTipo(tp)}
                  className={clsx(
                    'h-[42px] w-[42px] border-none font-[inherit] text-[13.5px] font-semibold',
                    descTipo === tp ? 'bg-teal text-white' : 'bg-white text-[#8A8780]'
                  )}
                >{tp}</button>
              ))}
            </div>
            <input
              value={descValor}
              onChange={e => setDescValor(e.target.value.replace(/[^\d.,]/g, ''))}
              inputMode="decimal" placeholder="0"
              className="h-[42px] min-w-0 flex-1 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between rounded-xl border border-teal/[0.18] bg-teal/[0.08] px-4 py-3.5">
          <span className="text-[15px] font-semibold text-dark">Total</span>
          <span className="text-[26px] font-bold tracking-[-0.01em] text-teal [font-variant-numeric:tabular-nums]">{BRL(total)}</span>
        </div>

        {sinalAtivo && (
          <div className="-mt-0.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between rounded-input border border-dashed border-teal/[0.35] bg-teal/[0.06] px-3.5 py-2.5">
              <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-teal">
                <Wallet size={15} /> Sinal solicitado
              </span>
              <span className="text-[15px] font-bold text-teal [font-variant-numeric:tabular-nums]">{BRL(sinalAplicado)}</span>
            </div>
            <div className="flex justify-between px-0.5 text-[13.5px] text-body">
              <span>Restante após sinal</span>
              <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(restante)}</span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-[7px] whitespace-nowrap text-[13px] font-semibold text-body">
            <Calendar size={16} className="text-teal" /> Validade do orçamento
          </span>
          <input
            type="date" value={validade}
            onChange={e => setValidade(e.target.value)}
            className="h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-[7px] text-[13px] font-semibold text-body">
            <StickyNote size={15} /> Observações
          </span>
          <textarea
            value={obs} onChange={e => setObs(e.target.value)}
            rows={2} placeholder="Ex: Entrega combinada para 15/06"
            className="min-h-[64px] w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </label>

        <Button variant="primary" fullWidth size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? 'Criando orçamento...' : 'Criar orçamento'}
        </Button>
      </div>
    </div>
  )
}

// ── ModoToggle ─────────────────────────────────────────────────────────────
function ModoToggle({ modo, onChange }: { modo: 'tudo' | 'catalogo'; onChange: (m: 'tudo' | 'catalogo') => void }) {
  return (
    <div className="inline-flex flex-shrink-0 overflow-hidden rounded-input border border-line">
      {([['tudo', 'Tudo'], ['catalogo', 'Catálogo']] as const).map(([val, label]) => {
        const on = modo === val
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={clsx(
              'h-[38px] whitespace-nowrap border-none px-4 font-[inherit] text-[13.5px] font-semibold transition-colors duration-150',
              on ? 'bg-teal text-white' : 'bg-white text-body'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── ItemSearch ─────────────────────────────────────────────────────────────
function ItemSearch({ open, onClose, modo, catalogos, catalogoFiltro, onSelectCatalogoFiltro, onSelectCatalogoItem, onSelectProdutoAvulso }: {
  open: boolean
  onClose: () => void
  modo: 'tudo' | 'catalogo'
  catalogos: CatalogoResponse[]
  catalogoFiltro: string
  onSelectCatalogoFiltro: (id: string) => void
  onSelectCatalogoItem: (item: ItemCatalogoBuscaResponse) => void
  onSelectProdutoAvulso: (produto: ProdutoResponse) => void
}) {
  const [q, setQ] = useState('')
  const [itensCatalogo, setItensCatalogo] = useState<ItemCatalogoBuscaResponse[]>([])
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setQ('')
      setItensCatalogo([])
      setProdutos([])
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const tarefas: Promise<void>[] = [
          orcamentoService.buscarItensCatalogo(catalogoFiltro || undefined).then(data => {
            if (!cancelled) setItensCatalogo(data)
          }).catch(() => { if (!cancelled) setItensCatalogo([]) }),
        ]
        if (modo === 'tudo') {
          tarefas.push(
            produtoService.listar(0, 20, 'PRODUTO', q || undefined).then(data => {
              if (!cancelled) setProdutos(data.content)
            }).catch(() => { if (!cancelled) setProdutos([]) })
          )
        } else {
          if (!cancelled) setProdutos([])
        }
        await Promise.all(tarefas)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = setTimeout(load, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [q, open, modo, catalogoFiltro])

  if (!open) return null

  const qLower = q.trim().toLowerCase()
  const itensCatalogoFiltrados = qLower
    ? itensCatalogo.filter(i => i.nomeProduto.toLowerCase().includes(qLower))
    : itensCatalogo
  const semResultado = itensCatalogoFiltrados.length === 0 && produtos.length === 0 && !loading

  return (
    <div ref={wrapRef} className="absolute inset-x-5 top-[62px] z-30 max-h-[360px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
      <div className="sticky top-0 z-10 flex gap-1.5 bg-white px-1.5 pt-1.5">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={modo === 'catalogo' ? 'Buscar item de catálogo...' : 'Buscar produto ou item de catálogo...'}
          className="h-[38px] min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-[#FCFBF9] px-3 font-[inherit] text-sm text-dark outline-none"
        />
        {modo === 'catalogo' && catalogos.length > 0 && (
          <div className="relative flex-shrink-0">
            <select
              value={catalogoFiltro}
              onChange={e => onSelectCatalogoFiltro(e.target.value)}
              className="h-[38px] max-w-[150px] cursor-pointer rounded-[9px] border-[1.5px] border-line bg-[#FCFBF9] py-0 pl-8 pr-[30px] font-[inherit] text-[13px] text-dark outline-none"
            >
              <option value="">Todos catálogos</option>
              {catalogos.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
              <Filter size={14} />
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5">
        {itensCatalogoFiltrados.length > 0 && (
          <div>
            {modo === 'tudo' && (
              <div className="px-[11px] pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">
                Itens de catálogo
              </div>
            )}
            {itensCatalogoFiltrados.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelectCatalogoItem(item); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-[#F7F5F1]"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                  <Layers size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{item.nomeProduto}</div>
                  <div className="text-xs text-muted">{BRL(item.precoVenda)} · {item.catalogoNome}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {modo === 'tudo' && produtos.length > 0 && (
          <div>
            <div className="px-[11px] pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A8A49C]">
              Produtos avulsos
            </div>
            {produtos.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelectProdutoAvulso(p); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-[#F7F5F1]"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-line-soft text-[#8A8780]">
                  <Box size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{p.nome}</div>
                  <div className="text-xs text-muted">Avulso · margem editável</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {semResultado && (
          <div className="p-5 text-center text-sm text-muted">
            {modo === 'catalogo'
              ? 'Nenhum item de catálogo encontrado. Cadastre um item de catálogo primeiro.'
              : 'Nenhum resultado encontrado.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ModalMargemAvulso ──────────────────────────────────────────────────────
function ModalMargemAvulso({ produto, margemPadrao, onClose, onConfirm }: {
  produto: ProdutoResponse
  margemPadrao: number
  onClose: () => void
  onConfirm: (margemAplicada: number, precoUnitario: number) => void
}) {
  const [margem, setMargem] = useState(margemPadrao.toString())
  const [precoSugerido, setPrecoSugerido] = useState<number | null>(null)
  const [precoFinal, setPrecoFinal] = useState('')
  const [precoFinalEditado, setPrecoFinalEditado] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const margemNum = parseFloat(margem.replace(',', '.'))
    if (!Number.isFinite(margemNum) || margemNum < 0) return
    setCalculando(true)
    setErro(null)
    const timer = setTimeout(() => {
      produtoService.buscarPrecoSugerido(produto.id, margemNum)
        .then(resp => {
          setPrecoSugerido(resp.precoSugerido)
          if (!precoFinalEditado) {
            setPrecoFinal(resp.precoSugerido.toFixed(2).replace('.', ','))
          }
        })
        .catch(() => setErro('Não foi possível calcular o preço sugerido.'))
        .finally(() => setCalculando(false))
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [margem, produto.id])

  const precoFinalNum = parseFloat(precoFinal.replace(',', '.')) || 0
  const podeConfirmar = precoFinalNum > 0 && !calculando

  return (
    <ModalShell
      open
      onClose={onClose}
      title={produto.nome}
      subtitle="Adicionar produto avulso"
      icon={<Box size={20} />}
      iconBg="rgba(42,157,143,0.10)"
      iconColor="#2A9D8F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!podeConfirmar} onClick={() => onConfirm(parseFloat(margem.replace(',', '.')) || 0, precoFinalNum)}>
            Adicionar ao orçamento
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Margem (%)</span>
          <input
            value={margem}
            onChange={e => setMargem(e.target.value.replace(/[^\d.,]/g, ''))}
            inputMode="decimal"
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none"
          />
        </label>

        <div className="rounded-xl border border-teal/20 bg-teal/[0.08] px-4 py-3.5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#1F7A6F]">Preço sugerido</div>
          <div className="mt-0.5 text-2xl font-bold text-teal">
            {calculando ? 'Calculando…' : precoSugerido != null ? BRL(precoSugerido) : '—'}
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-[5px] text-[13px] text-danger">
            <AlertCircle size={13} /> {erro}
          </div>
        )}

        <label className="block">
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Preço final</span>
          <input
            value={precoFinal}
            onChange={e => { setPrecoFinal(e.target.value.replace(/[^\d.,]/g, '')); setPrecoFinalEditado(true) }}
            inputMode="decimal"
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none"
          />
        </label>
      </div>
    </ModalShell>
  )
}

// ── CriarOrcamentoPage ─────────────────────────────────────────────────────
export default function CriarOrcamentoPage() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [modalItem, setModalItem] = useState<Item | null>(null)
  const [descTipo, setDescTipo] = useState<'%' | 'R$'>('%')
  const [descValor, setDescValor] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState('PIX')
  const [metodoPagamentoObs, setMetodoPagamentoObs] = useState('')
  const [prazoDias, setPrazoDias] = useState('')
  const [prazoDiasError, setPrazoDiasError] = useState('')
  const [inicioImediato, setInicioImediato] = useState(true)
  const [dataInicioEstimada, setDataInicioEstimada] = useState('')
  const [sinalAtivo, setSinalAtivo] = useState(false)
  const [sinalTipo, setSinalTipo] = useState<'%' | 'R$'>('%')
  const [sinalValor, setSinalValor] = useState('')
  const [validade, setValidade] = useState('')
  const [obs, setObs] = useState('')
  const [productOpen, setProductOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modoItens, setModoItens] = useState<'tudo' | 'catalogo'>('tudo')
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [catalogoFiltro, setCatalogoFiltro] = useState('')
  const [margemPadrao, setMargemPadrao] = useState(0)
  const [produtoAvulsoModal, setProdutoAvulsoModal] = useState<ProdutoResponse | null>(null)
  const [avisoEstoque, setAvisoEstoque] = useState<{ orcamentoId: string; avisos: AvisoEstoque[] } | null>(null)
  const prodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    catalogoService.listar().then(setCatalogos).catch(() => setCatalogos([]))
    empresaService.getConfiguracao().then(cfg => setMargemPadrao(cfg.margemPadrao ?? 0)).catch(() => {})
  }, [])

  const subtotal = items.reduce((s, it) => s + it.preco * it.qtd + it.customs.reduce((cs, c) => cs + c.valor * c.qtd * it.qtd, 0), 0)
  const descNum = parseFloat(descValor.replace(',', '.')) || 0
  const descontoAplicado = descTipo === '%' ? subtotal * descNum / 100 : Math.min(descNum, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)
  const sinalNum = parseFloat(sinalValor.replace(',', '.')) || 0
  const sinalAplicado = sinalAtivo ? (sinalTipo === '%' ? total * sinalNum / 100 : Math.min(sinalNum, total)) : 0
  const restante = Math.max(0, total - sinalAplicado)

  const handleAddCatalogoItem = (item: ItemCatalogoBuscaResponse) => {
    setItems(arr => [...arr, {
      id: Date.now(),
      nome: item.nomeProduto,
      qtd: 1,
      preco: item.precoVenda,
      customs: [],
      itemCatalogoId: item.id,
      catalogoNome: item.catalogoNome,
    }])
    setProductOpen(false)
  }

  const handleSelectProdutoAvulso = (produto: ProdutoResponse) => {
    setProdutoAvulsoModal(produto)
    setProductOpen(false)
  }

  const handleConfirmAvulso = (margemAplicada: number, precoUnitario: number) => {
    if (!produtoAvulsoModal) return
    setItems(arr => [...arr, {
      id: Date.now(),
      nome: produtoAvulsoModal.nome,
      qtd: 1,
      preco: precoUnitario,
      customs: [],
      produtoId: produtoAvulsoModal.id,
      produtoIdentificador: produtoAvulsoModal.identificador,
      margemAplicada,
    }])
    setProdutoAvulsoModal(null)
  }

  const handleSubmit = async () => {
    setPrazoDiasError('')

    if (!cliente) {
      alert('Selecione um cliente')
      return
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um produto')
      return
    }

    const prazoDiasNum = parseInt(prazoDias)
    if (!prazoDiasNum || prazoDiasNum < 1) {
      setPrazoDiasError('Prazo obrigatório, mínimo 1 dia')
      return
    }

    if (!inicioImediato && !dataInicioEstimada) {
      alert('Informe a data estimada de início')
      return
    }

    if (metodoPagamento === 'OUTRO' && metodoPagamentoObs.length < 50) {
      alert('Descreva o método de pagamento com ao menos 50 caracteres')
      return
    }

    const payload: OrcamentoRequest = {
      clienteId: cliente.id,
      itens: items.map(it => ({
        ...(it.itemCatalogoId
          ? { itemCatalogoId: it.itemCatalogoId }
          : { produtoId: it.produtoId, margemAplicada: it.margemAplicada, precoUnitario: it.preco }),
        quantidade: it.qtd,
        customizacoes: it.customs.map(c => ({
          produtoId: c.id,
          quantidade: c.qtd,
        })),
      })),
      metodoPagamento: metodoPagamento as MetodoPagamento,
      metodoPagamentoObs: metodoPagamento === 'OUTRO' ? metodoPagamentoObs : undefined,
      prazoProducaoDias: prazoDiasNum,
      inicioAssimQueAprovado: inicioImediato,
      dataInicioEstimada: !inicioImediato ? dataInicioEstimada : undefined,
      sinalAtivo,
      percentualSinal: sinalAtivo && sinalTipo === '%' ? sinalNum : undefined,
      valorSinal: sinalAtivo && sinalTipo === 'R$' ? sinalNum : undefined,
      tipoDesconto: descNum > 0 ? descTipo : undefined,
      descontoValor: descNum > 0 ? descNum : undefined,
      observacoes: obs || undefined,
      dataValidade: validade ? `${validade}T00:00:00` : undefined,
    }

    setLoading(true)
    try {
      const result = await orcamentoService.criar(payload)
      if (result.avisosEstoque && result.avisosEstoque.length > 0) {
        setAvisoEstoque({ orcamentoId: result.id, avisos: result.avisosEstoque })
      } else {
        navigate(`/orcamentos/${result.id}`)
      }
    } catch (err) {
      console.error('Erro ao criar orçamento:', err)
      alert('Erro ao criar orçamento')
    } finally {
      setLoading(false)
    }
  }

  const summaryProps = { subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit: handleSubmit, loading }

  if (avisoEstoque) {
    return (
      <AppLayout active="orcamentos">
        <div className="mx-auto max-w-[640px] rounded-card border border-orange/30 bg-orange/[0.06] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <span className="mb-3.5 inline-grid h-14 w-14 place-items-center rounded-full bg-orange/[0.14] text-[#A35A26]">
            <AlertTriangle size={22} />
          </span>
          <div className="text-[16px] font-bold text-dark">Orçamento criado com aviso de estoque</div>
          <p className="mb-0 mt-1.5 text-[13.5px] text-muted">
            Alguns produtos deste orçamento podem não ter estoque suficiente no momento da produção:
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {avisoEstoque.avisos.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-input border border-orange/30 bg-white px-3.5 py-3 text-[13.5px] text-[#A35A26]">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{a.mensagem}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button variant="primary" onClick={() => navigate(`/orcamentos/${avisoEstoque.orcamentoId}`)}>
              Ver orçamento
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="orcamentos">

      {/* Header */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-[5px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal">
            Orçamentos
          </div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">
            Novo Orçamento
          </h1>
        </div>
      </div>

      {/* Layout duas colunas */}
      <div className="grid grid-cols-[1fr_348px] items-start gap-[22px] max-[860px]:grid-cols-1">

        {/* Coluna esquerda */}
        <div className="flex min-w-0 flex-col gap-[18px]">

          {/* Seção 1: Cliente */}
          <QuoteCard step="1" label="Cliente" hint="Quem vai receber este orçamento?">
            <ClienteSelect cliente={cliente} onSelect={setCliente} onClear={() => setCliente(null)} />
          </QuoteCard>

          {/* Seção 2: Itens */}
          <QuoteCard step="2" label="Itens do orçamento" hint="Produtos e quantidades do pedido.">
            <div className="px-5 pt-3.5">
              <ModoToggle modo={modoItens} onChange={m => { setModoItens(m); setCatalogoFiltro('') }} />
            </div>
            <div className="mt-3.5">
              {items.length === 0 ? (
                <div className="mx-5 mb-5 mt-1 rounded-[14px] border-[1.5px] border-dashed border-line bg-[#FCFBF9] px-6 py-10 text-center">
                  <span className="mb-3.5 inline-grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
                    <ShoppingCart size={17} />
                  </span>
                  <div className="text-[15.5px] font-semibold text-dark">Nenhum produto adicionado</div>
                  <p className="mb-0 mt-1.5 text-[13.5px] text-muted">Comece pelo botão abaixo.</p>
                </div>
              ) : (
                items.map((it, i) => (
                  <ItemRow
                    key={it.id} item={it} index={i}
                    onQtd={(id, v) => setItems(arr => arr.map(x => x.id === id ? { ...x, qtd: v } : x))}
                    onRemove={id => setItems(arr => arr.filter(x => x.id !== id))}
                    onOpenCustom={setModalItem}
                  />
                ))
              )}

              {/* Botão adicionar produto */}
              <div ref={prodRef} className={clsx('relative px-5 pb-5 pt-3.5', items.length && 'border-t border-line')}>
                <button
                  onClick={() => setProductOpen(o => !o)}
                  className="flex h-12 w-full items-center justify-center gap-[9px] rounded-input border-[1.5px] border-dashed border-teal/50 bg-teal/[0.05] font-[inherit] text-[14.5px] font-semibold text-teal transition-colors duration-150 hover:bg-teal/10"
                >
                  <Plus size={16} /> Adicionar item
                </button>
                <ItemSearch
                  open={productOpen}
                  onClose={() => setProductOpen(false)}
                  modo={modoItens}
                  catalogos={catalogos}
                  catalogoFiltro={catalogoFiltro}
                  onSelectCatalogoFiltro={setCatalogoFiltro}
                  onSelectCatalogoItem={handleAddCatalogoItem}
                  onSelectProdutoAvulso={handleSelectProdutoAvulso}
                />
              </div>
            </div>
          </QuoteCard>

          {/* Seção 3: Prazo de produção */}
          <QuoteCard step="3" label="Prazo de produção" hint="Quantos dias úteis para finalizar este pedido.">
            <PrazoSection
              prazoDias={prazoDias} setPrazoDias={setPrazoDias}
              inicioImediato={inicioImediato} setInicioImediato={setInicioImediato}
              dataInicioEstimada={dataInicioEstimada} setDataInicioEstimada={setDataInicioEstimada}
              error={prazoDiasError}
            />
          </QuoteCard>

          {/* Seção 4: Pagamento */}
          <QuoteCard step="4" label="Condições de pagamento" hint="Quer pedir um sinal (entrada) para começar?">
            <PagamentoSection
              metodoPagamento={metodoPagamento}
              setMetodoPagamento={setMetodoPagamento}
              metodoPagamentoObs={metodoPagamentoObs}
              setMetodoPagamentoObs={setMetodoPagamentoObs}
              ativo={sinalAtivo} setAtivo={setSinalAtivo}
              tipo={sinalTipo} setTipo={setSinalTipo}
              valor={sinalValor} setValor={setSinalValor}
              sinalAplicado={sinalAplicado} restante={restante}
            />
          </QuoteCard>

          {/* Resumo inline mobile */}
          <div className="hidden max-[860px]:block">
            <Summary {...summaryProps} />
          </div>
        </div>

        {/* Coluna direita */}
        <div className="sticky top-6 max-[860px]:hidden">
          <Summary {...summaryProps} />
        </div>
      </div>

      {/* Barra mobile */}
      <div className="sticky bottom-0 z-30 hidden items-center justify-between gap-4 border-t border-line bg-white px-5 py-3.5 max-[860px]:flex">
        <div>
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">Total</div>
          <div className="text-[22px] font-bold leading-[1.1] text-teal [font-variant-numeric:tabular-nums]">{BRL(total)}</div>
        </div>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? 'Criando...' : 'Criar orçamento'}
        </Button>
      </div>

      {/* Modal customizações */}
      {modalItem && (
        <ModalCustomizacoes
          item={modalItem}
          onClose={() => setModalItem(null)}
          onConfirm={(id, customs) => {
            setItems(arr => arr.map(x => x.id === id ? { ...x, customs } : x))
            setModalItem(null)
          }}
        />
      )}

      {/* Modal margem produto avulso */}
      {produtoAvulsoModal && (
        <ModalMargemAvulso
          produto={produtoAvulsoModal}
          margemPadrao={margemPadrao}
          onClose={() => setProdutoAvulsoModal(null)}
          onConfirm={handleConfirmAvulso}
        />
      )}

    </AppLayout>
  )
}
