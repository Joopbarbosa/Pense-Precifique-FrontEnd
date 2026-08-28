import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, ModalShell, Stepper } from '../../components/ui'
import {
  Phone, Search, Layers, Box, Trash2, SlidersHorizontal, Tag, AlertCircle, AlertTriangle,
  Calendar, Wallet, DollarSign, FileText, StickyNote, Filter, ShoppingCart, Plus, Check, Factory,
} from 'lucide-react'
import { clienteService } from '../../services/clienteService'
import { produtoService } from '../../services/produtoService'
import { orcamentoService } from '../../services/orcamentoService'
import { catalogoService } from '../../services/catalogoService'
import type { ClienteResponse } from '../../types/cliente'
import type { ProdutoResponse } from '../../types/produto'
import type {
  OrcamentoRequest, MetodoPagamento, ItemCatalogoBuscaResponse,
  SimularAlertasOrcamentoItemRequest, SimulacaoEstoqueProdutoResponse,
} from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import type { AlertaInsumo } from '../../types/producao'
import { METODOS_PAGAMENTO } from '../../constants'
import { EstoqueTags } from '../../components/ui/Badge'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'
import ModalVincularProducao from '../../components/orcamento/ModalVincularProducao'

const BRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

// Símbolo exibido na UI ('%' | 'R$') é conceito distinto do valor aceito pela API
// (enum TipoDesconto do backend, ver TipoDesconto.java) — nunca enviar o símbolo direto.
const TIPO_DESCONTO_API: Record<'%' | 'R$', 'PERCENTUAL' | 'VALOR'> = { '%': 'PERCENTUAL', 'R$': 'VALOR' }

// #218 (RN-NOVA-8/9) — monta o corpo de POST /orcamentos/simular-alertas a partir dos itens em
// construção na tela; XOR itemCatalogoId/produtoId, mesmo critério de handleSubmit.
function toSimularItens(itens: Item[]): SimularAlertasOrcamentoItemRequest[] {
  return itens.map(it => it.itemCatalogoId
    ? { itemCatalogoId: it.itemCatalogoId, quantidade: it.qtd }
    : { produtoId: it.produtoId, quantidade: it.qtd })
}

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
  algumInsumoNaoFracionavel: boolean
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
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
  const [maxHeight, setMaxHeight] = useState<number>()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // OpenProject #243 — paridade com ItemSearch (ORC-030): busca dispara ao focar o campo, mesmo
  // sem digitar nada, trazendo a listagem completa (paginada, backend já correto).
  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const data = await clienteService.listar(0, 20, q.trim() || undefined)
        setResults(data.content)
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
        setResults([])
      }
    }
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [q, open])

  // OpenProject #243 — mesma técnica de ItemSearch (ORC-030): altura do painel calculada a partir
  // da posição real da 8ª linha, em vez de um max-height fixo (era max-h-[248px], cabiam só ~4).
  // offsetTop/offsetHeight (não getBoundingClientRect) — imune ao scale(0.92→1) do animate-pop,
  // que distorce a medição por clientRect durante o useLayoutEffect (ver ItemSearch).
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    el.scrollTop = 0
    const linhas = el.querySelectorAll<HTMLElement>('[data-search-row]')
    if (linhas.length <= 8) {
      setMaxHeight(undefined)
      return
    }
    const oitava = linhas[7]
    setMaxHeight(Math.ceil(oitava.offsetTop + oitava.offsetHeight + 6))
  }, [results])

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
          <div
            ref={panelRef}
            style={maxHeight != null ? { maxHeight } : undefined}
            className="absolute inset-x-0 top-[54px] z-30 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]"
          >
            {results.map(c => (
              <button
                key={c.id}
                data-search-row
                onClick={() => { onSelect(c); setOpen(false); setQ('') }}
                className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
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

// ── ItemRow ────────────────────────────────────────────────────────────────
function ItemRow({ item, index, simulacao, onQtd, onRemove, onOpenCustom }: {
  item: Item
  index: number
  simulacao?: SimulacaoEstoqueProdutoResponse
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
  // RN-NOVA-11 (revisada) — estoque exibido sempre vem da simulação mais recente (nunca o
  // snapshot congelado no momento da adição); valores monetários (preço, margem) continuam
  // congelados. Aviso inline aparece sempre que a situação não é SUFICIENTE, independente de
  // permitirEstoqueNegativo — a adição/criação do orçamento nunca bloqueia, só a trava real vive
  // no avanço para Finalizado (RN-059, backend).
  const estoqueExibido = simulacao?.estoqueAtual ?? item.estoqueAtual
  const estoqueInsuficiente = simulacao != null && simulacao.situacao !== 'SUFICIENTE'

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
                item.itemCatalogoId ? 'bg-teal/10 text-teal' : 'bg-line-soft text-dim'
              )}>
                {item.itemCatalogoId ? <Layers size={11} /> : <Box size={11} />}
                {origemLabel}
              </span>
            )}
            {estoqueInsuficiente && (
              <span className="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full bg-orange/10 px-[9px] text-[11.5px] font-semibold text-orange">
                <AlertTriangle size={11} />
                Estoque insuficiente
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">{BRL(item.preco)} / unidade</div>
          <EstoqueTags
            className="mt-1.5"
            fracionavel={false}
            showFracionavel={false}
            permitirEstoqueNegativo={item.permitirEstoqueNegativo}
            estoqueAtual={estoqueExibido}
            variant="busca"
          />
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
            item.customs.length ? 'border-orange/40 bg-orange/[0.08] text-warning-alt' : 'border-line bg-cream text-body'
          )}
        >
          <SlidersHorizontal size={15} /> Customizações{item.customs.length ? ` (${item.customs.length})` : ''}
        </button>
        {item.customs.map((c, k) => (
          <span key={k} className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-white px-[11px] text-[12.5px] text-dim">
            <Tag size={17} className="text-orange" />
            {c.nome} <strong className="font-semibold text-warning-alt">+{BRL(c.valor)}/un</strong>
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
  const [customizacoes, setCustomizacoes] = useState<{
    id: string; nome: string; valor: number
    algumInsumoNaoFracionavel: boolean; permitirEstoqueNegativo: boolean; estoqueAtual: number
  }[]>([])
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
          algumInsumoNaoFracionavel: p.algumInsumoNaoFracionavel ?? false,
          permitirEstoqueNegativo: p.permitirEstoqueNegativo,
          estoqueAtual: p.estoqueAtual,
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

      {/* Lista de customizações — RN-NOVA-7: até 8 itens visíveis por vez, resto via rolagem.
          Altura calibrada para a linha de 72px + gap-2 (8px), medida via Playwright: 8*72 + 7*8 = 632px.
          `flex-shrink-0` em cada linha é obrigatório: sem ele, um flex-col com max-height/overflow-y-auto
          encolhe os itens para caber em vez de habilitar rolagem (gotcha clássico de flexbox). */}
      <div className="flex max-h-[632px] flex-col gap-2 overflow-y-auto">
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
              'flex-shrink-0 overflow-hidden rounded-[11px] border-[1.5px] transition-all duration-150',
              on ? 'border-orange/40 bg-orange/[0.07]' : 'border-line bg-cream'
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
                    {on && <Check width={12} height={12} stroke="#fff" strokeWidth={3} />}
                  </span>
                  <div>
                    <span className="text-[14.5px] font-semibold text-dark">{c.nome}</span>
                    <EstoqueTags
                      className="mt-1"
                      fracionavel={false}
                      showFracionavel={false}
                      permitirEstoqueNegativo={c.permitirEstoqueNegativo}
                      estoqueAtual={c.estoqueAtual}
                      variant="busca"
                    />
                  </div>
                </div>
                <span className={clsx('text-sm font-semibold', on ? 'text-orange' : 'text-dim')}>
                  +{BRL(c.valor)}/un
                </span>
              </button>

              {/* Linha de quantidade */}
              {on && (
                <div className="flex animate-[fadeUp_.2s_ease_both] items-center justify-between gap-3 px-3.5 pb-3">
                  <span className="text-[13px] text-muted">Quantidade</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-line">
                    <button onClick={() => setQtd(c.id, (sel?.qtd ?? 1) - 1)} className="grid h-[34px] w-8 place-items-center border-none bg-cream text-base text-body">−</button>
                    <span className="w-9 border-x border-line text-center text-sm font-bold leading-[34px] text-dark">
                      {sel?.qtd ?? 1}
                    </span>
                    <button onClick={() => setQtd(c.id, (sel?.qtd ?? 1) + 1)} className="grid h-[34px] w-8 place-items-center border-none bg-cream text-base text-teal">+</button>
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
          <span className="text-[13.5px] font-semibold text-warning-alt">
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
  temPrazoProducao, setTemPrazoProducao,
  prazoDias, setPrazoDias,
  inicioImediato, setInicioImediato,
  dataInicioEstimada, setDataInicioEstimada,
  error,
}: {
  temPrazoProducao: boolean
  setTemPrazoProducao: (v: boolean) => void
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

      {/* Toggle Vai ter prazo de produção? */}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
            <Calendar size={18} />
          </span>
          <div>
            <div className="text-[14.5px] font-semibold text-dark">Vai ter prazo de produção?</div>
            <div className="mt-px text-[12.5px] text-muted">Define se este pedido tem data prevista de entrega.</div>
          </div>
        </div>
        <div className="flex flex-shrink-0 overflow-hidden rounded-input border border-line">
          {(['Não', 'Sim'] as const).map((lbl, i) => {
            const val = i === 1
            const on = temPrazoProducao === val
            return (
              <button
                key={lbl}
                onClick={() => setTemPrazoProducao(val)}
                className={clsx(
                  'h-10 w-[60px] border-none font-[inherit] text-sm font-semibold transition-colors duration-150',
                  on ? (val ? 'bg-teal text-white' : 'bg-line-soft text-body') : 'bg-white text-dim'
                )}
              >{lbl}</button>
            )
          })}
        </div>
      </div>

      {temPrazoProducao && (
        <div className="flex flex-col gap-4 animate-[fadeUp_.2s_ease_both]">

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
              inicioImediato ? 'border-teal/30 bg-teal/[0.06]' : 'border-line bg-cream'
            )}
          >
            <span className={clsx(
              'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
              inicioImediato ? 'border-teal bg-teal' : 'border-[#D4D0C8] bg-transparent'
            )}>
              {inicioImediato && <Check width={12} height={12} stroke="#fff" strokeWidth={3} />}
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
  error,
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
  error?: string
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
                  on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream'
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
                <span className={clsx('font-normal', obsCharCount >= 50 ? 'text-success' : 'text-muted')}>
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
                    on ? (val ? 'bg-teal text-white' : 'bg-line-soft text-body') : 'bg-white text-dim'
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
                      tipo === tp ? 'bg-teal text-white' : 'bg-white text-dim'
                    )}
                  >{tp}</button>
                ))}
              </div>
              <input
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                inputMode="decimal"
                min={0}
                placeholder={tipo === '%' ? '50' : '0,00'}
                className={clsx(
                  'h-[46px] min-w-0 flex-1 rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                  error ? 'border-danger' : 'border-line'
                )}
              />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-[5px] text-[13px] text-danger">
                <AlertCircle size={13} />
                {error}
              </div>
            )}
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
                    descTipo === tp ? 'bg-teal text-white' : 'bg-white text-dim'
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
function ModoToggle({ modo, onChange }: { modo: 'tudo' | 'catalogo' | 'produto'; onChange: (m: 'tudo' | 'catalogo' | 'produto') => void }) {
  return (
    <div className="inline-flex flex-shrink-0 overflow-hidden rounded-input border border-line">
      {([['tudo', 'Tudo'], ['catalogo', 'Catálogo'], ['produto', 'Produto']] as const).map(([val, label]) => {
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
  modo: 'tudo' | 'catalogo' | 'produto'
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
  const [maxHeight, setMaxHeight] = useState<number>()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // ORC-030 — até 8 itens visíveis por vez, resto acessível via rolagem. Altura calculada a partir
  // da posição real da 8ª linha (medida via ref, não um px fixo assumido): cobre de uma vez tanto
  // o caso de 2 rótulos de categoria coexistindo (modo "Tudo" com catálogo + avulso) quanto o caso
  // de badges de estoque quebrando para 2 linhas (nomes longos) — os dois fazem a linha crescer de
  // forma que um valor fixo em px não acompanha. Sem isso: bug original de #242, o painel só
  // orçava espaço para 1 rótulo de categoria, cortando o 8º item quando os dois apareciam juntos.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.scrollTop = 0
    const linhas = el.querySelectorAll<HTMLElement>('[data-search-row]')
    if (linhas.length <= 8) {
      setMaxHeight(undefined)
      return
    }
    // offsetTop/offsetHeight (não getBoundingClientRect) — o painel entra com animate-pop
    // (scale(0.92)→1); medir via clientRect durante o useLayoutEffect (síncrono, antes do
    // primeiro paint) captura o box ainda na escala inicial da animação, subestimando a altura
    // necessária. offsetTop/offsetHeight refletem o layout box "real", imune a transform.
    const oitava = linhas[7]
    setMaxHeight(Math.ceil(oitava.offsetTop + oitava.offsetHeight + 6))
  }, [itensCatalogo, produtos])

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
        const tarefas: Promise<void>[] = []
        if (modo !== 'produto') {
          tarefas.push(
            orcamentoService.buscarItensCatalogo(catalogoFiltro || undefined, q || undefined).then(data => {
              if (!cancelled) setItensCatalogo(data)
            }).catch(() => { if (!cancelled) setItensCatalogo([]) })
          )
        } else if (!cancelled) {
          setItensCatalogo([])
        }
        if (modo === 'tudo' || modo === 'produto') {
          tarefas.push(
            produtoService.listar(0, 20, 'PRODUTO', q || undefined, modo === 'produto').then(data => {
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

  const semResultado = itensCatalogo.length === 0 && produtos.length === 0 && !loading

  return (
    <div
      ref={wrapRef}
      style={maxHeight != null ? { maxHeight } : undefined}
      className="absolute inset-x-5 top-[62px] z-30 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]"
    >
      <div className="sticky top-0 z-10 flex gap-1.5 bg-white px-1.5 pt-1.5">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={
            modo === 'catalogo' ? 'Buscar item de catálogo...' :
            modo === 'produto' ? 'Buscar produto...' :
            'Buscar produto ou item de catálogo...'
          }
          className="h-[38px] min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-cream px-3 font-[inherit] text-sm text-dark outline-none"
        />
        {modo === 'catalogo' && catalogos.length > 0 && (
          <div className="relative flex-shrink-0">
            <select
              value={catalogoFiltro}
              onChange={e => onSelectCatalogoFiltro(e.target.value)}
              className="h-[38px] max-w-[150px] cursor-pointer rounded-[9px] border-[1.5px] border-line bg-cream py-0 pl-8 pr-[30px] font-[inherit] text-[13px] text-dark outline-none"
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
        {itensCatalogo.length > 0 && (
          <div>
            {modo === 'tudo' && (
              <div className="px-[11px] pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                Itens de catálogo
              </div>
            )}
            {itensCatalogo.map(item => (
              <button
                key={item.id}
                data-search-row
                onClick={() => { onSelectCatalogoItem(item); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                  <Layers size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{item.nomeProduto}</div>
                  <div className="text-xs text-muted">{BRL(item.precoVenda)} · {item.catalogoNome}</div>
                  <EstoqueTags
                    className="mt-1"
                    fracionavel={false}
                    showFracionavel={false}
                    permitirEstoqueNegativo={item.permitirEstoqueNegativo}
                    estoqueAtual={item.estoqueAtual}
                    variant="busca"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
        {produtos.length > 0 && (
          <div>
            {modo === 'tudo' && (
              <div className="px-[11px] pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                Produtos
              </div>
            )}
            {produtos.map(p => (
              <button
                key={p.id}
                data-search-row
                onClick={() => { onSelectProdutoAvulso(p); onClose(); setQ('') }}
                className="flex w-full items-center gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] text-sm font-medium text-dark transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-line-soft text-dim">
                  <Box size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-dark">{p.nome}</div>
                  <div className="text-xs text-muted">{BRL(p.precoVenda ?? 0)} / unidade</div>
                  <EstoqueTags
                    className="mt-1"
                    fracionavel={false}
                    showFracionavel={false}
                    permitirEstoqueNegativo={p.permitirEstoqueNegativo}
                    estoqueAtual={p.estoqueAtual}
                    variant="busca"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
        {semResultado && (
          <div className="p-5 text-center text-sm text-muted">
            {modo === 'catalogo'
              ? 'Nenhum item de catálogo encontrado. Cadastre um item de catálogo primeiro.'
              : modo === 'produto'
                ? 'Nenhum produto fora de catálogo encontrado.'
                : 'Nenhum resultado encontrado.'}
          </div>
        )}
      </div>
    </div>
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
  const [temPrazoProducao, setTemPrazoProducao] = useState(true)
  const [prazoDias, setPrazoDias] = useState('')
  const [prazoDiasError, setPrazoDiasError] = useState('')
  const [inicioImediato, setInicioImediato] = useState(true)
  const [dataInicioEstimada, setDataInicioEstimada] = useState('')
  const [sinalAtivo, setSinalAtivo] = useState(false)
  const [sinalTipo, setSinalTipo] = useState<'%' | 'R$'>('%')
  const [sinalValor, setSinalValor] = useState('')
  const [sinalError, setSinalError] = useState('')
  const [validade, setValidade] = useState('')
  const [obs, setObs] = useState('')
  const [productOpen, setProductOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modoItens, setModoItens] = useState<'tudo' | 'catalogo' | 'produto'>('tudo')
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [catalogoFiltro, setCatalogoFiltro] = useState('')
  // #218 (RN-NOVA-8/9/11) — última simulação de estoque conhecida por produtoId (não por item da
  // lista: o backend acumula quantidade quando o mesmo produto aparece em mais de um item).
  const [simulacoes, setSimulacoes] = useState<Record<string, SimulacaoEstoqueProdutoResponse>>({})
  const [pendentesAvanco, setPendentesAvanco] = useState<SimulacaoEstoqueProdutoResponse[] | null>(null)
  // RN-NOVA-11 (revisada, checkpoint em lote) — seleção de itens por checkbox na modal de
  // checkpoint, para acionar "Criar produção" uma única vez cobrindo todos os selecionados.
  const [selecionadosProducao, setSelecionadosProducao] = useState<Set<string>>(new Set())
  // RN-ORC-VINC-02 ponto 1 (P-F004) — sub-modal de "vincular a produção existente", embutida no
  // mesmo checkpoint acima. orcamentoCriadoId != null indica que o orçamento já foi persistido como
  // efeito da pré-visualização do vínculo (ver handleSimularVinculo).
  const [modalVincular, setModalVincular] = useState(false)
  const [orcamentoCriadoId, setOrcamentoCriadoId] = useState<string | null>(null)
  const [confirmandoVinculo, setConfirmandoVinculo] = useState(false)
  const { toast, setToast } = useToast()
  const prodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    catalogoService.listar({ size: 100 }).then(data => setCatalogos(data.content)).catch(() => setCatalogos([]))
  }, [])

  // RN-NOVA-11 — reconsulta estoque sempre que a lista de itens muda (adicionar/remover/alterar
  // quantidade), para que `EstoqueTags`/aviso inline nunca fiquem presos ao snapshot da adição.
  const itensAssinatura = items.map(it => `${it.id}:${it.qtd}`).join(',')
  useEffect(() => {
    if (items.length === 0) {
      setSimulacoes({})
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      orcamentoService.simularEstoque(toSimularItens(items))
        .then(data => {
          if (cancelled) return
          setSimulacoes(Object.fromEntries(data.map(d => [d.produtoId, d])))
        })
        .catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensAssinatura])

  const subtotal = items.reduce((s, it) => s + it.preco * it.qtd + it.customs.reduce((cs, c) => cs + c.valor * c.qtd * it.qtd, 0), 0)
  const descNum = parseFloat(descValor.replace(',', '.')) || 0
  const descontoAplicado = descTipo === '%' ? subtotal * descNum / 100 : Math.min(descNum, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)
  const sinalNum = parseFloat(sinalValor.replace(',', '.')) || 0
  const sinalAplicado = sinalAtivo ? (sinalTipo === '%' ? total * sinalNum / 100 : Math.min(sinalNum, total)) : 0
  const restante = Math.max(0, total - sinalAplicado)

  // RN-NOVA-11 (revisada) — adicionar item nunca bloqueia, independente de
  // permitirEstoqueNegativo; o estoque exibido (EstoqueTags/aviso inline) vem sempre da simulação
  // ao vivo do efeito de debounce acima, nunca de uma checagem síncrona no momento da adição.
  const handleAddCatalogoItem = (item: ItemCatalogoBuscaResponse) => {
    setItems(arr => [...arr, {
      id: Date.now(),
      nome: item.nomeProduto,
      qtd: 1,
      preco: item.precoVenda,
      customs: [],
      itemCatalogoId: item.id,
      produtoId: item.produtoId,
      catalogoNome: item.catalogoNome,
      algumInsumoNaoFracionavel: item.algumInsumoNaoFracionavel,
      permitirEstoqueNegativo: item.permitirEstoqueNegativo,
      estoqueAtual: item.estoqueAtual,
    }])
    setProductOpen(false)
  }

  // P-F005/#251 — preço vem direto do cadastro do produto (RN-054 revisada, 2026-08-16):
  // nenhum item, catálogo ou avulso, pergunta margem/preço dentro do orçamento.
  const handleSelectProdutoAvulso = (produto: ProdutoResponse) => {
    setItems(arr => [...arr, {
      id: Date.now(),
      nome: produto.nome,
      qtd: 1,
      preco: produto.precoVenda ?? 0,
      customs: [],
      produtoId: produto.id,
      produtoIdentificador: produto.identificador,
      algumInsumoNaoFracionavel: produto.algumInsumoNaoFracionavel ?? false,
      permitirEstoqueNegativo: produto.permitirEstoqueNegativo,
      estoqueAtual: produto.estoqueAtual,
    }])
    setProductOpen(false)
  }

  // RN-NOVA-11 (revisada) — itens do orçamento em construção com estoque insuficiente
  // (qualquer situação != SUFICIENTE, independente de permitirEstoqueNegativo — a criação nunca
  // bloqueia), deduplicados por produtoId. Reaproveita `simulacoes` já obtido pelo efeito de
  // estoque vivo — nenhuma chamada nova ao backend só para montar o checkpoint.
  const calcularItensPendentesAvanco = (): SimulacaoEstoqueProdutoResponse[] => {
    const vistos = new Set<string>()
    const pendentes: SimulacaoEstoqueProdutoResponse[] = []
    for (const it of items) {
      if (!it.produtoId || vistos.has(it.produtoId)) continue
      const sim = simulacoes[it.produtoId]
      if (sim && sim.situacao !== 'SUFICIENTE') {
        vistos.add(it.produtoId)
        pendentes.push(sim)
      }
    }
    return pendentes
  }

  const handleSubmit = () => {
    setPrazoDiasError('')
    setSinalError('')

    if (!cliente) {
      alert('Selecione um cliente')
      return
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um produto')
      return
    }

    if (temPrazoProducao) {
      const prazoDiasNum = parseInt(prazoDias)
      if (!prazoDiasNum || prazoDiasNum < 1) {
        setPrazoDiasError('Prazo obrigatório, mínimo 1 dia')
        return
      }

      if (!inicioImediato && !dataInicioEstimada) {
        alert('Informe a data estimada de início')
        return
      }
    }

    if (sinalAtivo && sinalNum <= 0) {
      setSinalError('Informe um valor de sinal maior que zero')
      return
    }

    if (metodoPagamento === 'OUTRO' && metodoPagamentoObs.length < 50) {
      alert('Descreva o método de pagamento com ao menos 50 caracteres')
      return
    }

    const pendentes = calcularItensPendentesAvanco()
    if (pendentes.length > 0) {
      setSelecionadosProducao(new Set())
      setPendentesAvanco(pendentes)
      return
    }

    criarOrcamento()
  }

  // Extraído de criarOrcamento (RN-ORC-VINC-02, P-F004) — reaproveitado também pelo fluxo de
  // vincular produção embutido, que precisa criar o orçamento de verdade (obter um id real) antes
  // de poder chamar simular-vincular-producao/vincular-producao (ambos escopados a /orcamentos/{id}).
  const montarPayload = (): OrcamentoRequest => {
    const prazoDiasNum = parseInt(prazoDias)
    return {
      clienteId: cliente!.id,
      itens: items.map(it => ({
        ...(it.itemCatalogoId
          ? { itemCatalogoId: it.itemCatalogoId }
          : { produtoId: it.produtoId, precoUnitario: it.preco }),
        quantidade: it.qtd,
        customizacoes: it.customs.map(c => ({
          produtoId: c.id,
          quantidade: c.qtd,
        })),
      })),
      metodoPagamento: metodoPagamento as MetodoPagamento,
      metodoPagamentoObs: metodoPagamento === 'OUTRO' ? metodoPagamentoObs : undefined,
      temPrazoProducao,
      prazoProducaoDias: temPrazoProducao ? prazoDiasNum : undefined,
      inicioAssimQueAprovado: temPrazoProducao ? inicioImediato : true,
      dataInicioEstimada: temPrazoProducao && !inicioImediato ? dataInicioEstimada : undefined,
      sinalAtivo,
      percentualSinal: sinalAtivo && sinalTipo === '%' ? sinalNum : undefined,
      valorSinal: sinalAtivo && sinalTipo === 'R$' ? sinalNum : undefined,
      tipoDesconto: descNum > 0 ? TIPO_DESCONTO_API[descTipo] : undefined,
      descontoValor: descNum > 0 ? descNum : undefined,
      observacoes: obs || undefined,
      dataValidade: validade ? `${validade}T00:00:00` : undefined,
    }
  }

  const criarOrcamento = async () => {
    if (!cliente) return
    setLoading(true)
    try {
      // RN-NOVA-11 (revisada) — criação nunca é bloqueada por estoque insuficiente; o checkpoint
      // acima (pendentesAvanco) já cumpriu o papel de aviso antes deste POST. `avisosEstoque` na
      // resposta não tem mais consumidor nesta tela (a modal pós-criação foi removida).
      const result = await orcamentoService.criar(montarPayload())
      navigate(`/orcamentos/${result.id}`)
    } catch (err) {
      console.error('Erro ao criar orçamento:', err)
      setToast(extractApiError(err, 'Erro ao criar orçamento. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  // RN-ORC-VINC-02 ponto 1 (P-F004) — orçamento ainda não existe neste checkpoint; ao escolher
  // vincular a uma produção existente, o orçamento é criado (uma única vez, id guardado em
  // orcamentoCriadoId) na primeira simulação, para então usar os endpoints reais de
  // simular-vincular-producao/vincular-producao. Continua "embutido" (sem trocar de tela) — só a
  // persistência acontece um pouco antes da confirmação final, não é uma escolha de UX, é
  // consequência de os dois endpoints serem escopados a /orcamentos/{id}.
  const handleSimularVinculo = async (producaoId: string): Promise<AlertaInsumo[]> => {
    let orcId = orcamentoCriadoId
    if (!orcId) {
      const created = await orcamentoService.criar(montarPayload())
      orcId = created.id
      setOrcamentoCriadoId(orcId)
    }
    return orcamentoService.simularVincularProducao(orcId, producaoId)
  }

  const handleConfirmarVinculo = async (producaoId: string) => {
    if (!orcamentoCriadoId) return
    setConfirmandoVinculo(true)
    try {
      await orcamentoService.vincularProducao(orcamentoCriadoId, producaoId)
    } catch (err) {
      console.error('Erro ao vincular produção ao orçamento recém-criado:', err)
    } finally {
      setConfirmandoVinculo(false)
      navigate(`/orcamentos/${orcamentoCriadoId}`)
    }
  }

  // Uma vez que o orçamento já foi criado como efeito da pré-visualização acima, não faz sentido
  // continuar no formulário de criação (evita duplicar orçamento se a artesã clicar em "Criar
  // orçamento" de novo) — fechar a modal navega direto para o orçamento já existente.
  const handleFecharModalVincular = () => {
    if (orcamentoCriadoId) {
      navigate(`/orcamentos/${orcamentoCriadoId}`)
      return
    }
    setModalVincular(false)
  }

  const summaryProps = { subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit: handleSubmit, loading }

  return (
    <AppLayout active="orcamentos" compact>

      {/* TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

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
                <div className="mx-5 mb-5 mt-1 rounded-[14px] border-[1.5px] border-dashed border-line bg-cream px-6 py-10 text-center">
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
                    simulacao={it.produtoId ? simulacoes[it.produtoId] : undefined}
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
              temPrazoProducao={temPrazoProducao} setTemPrazoProducao={setTemPrazoProducao}
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
              error={sinalError}
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


      {/* Modal de checkpoint único de aviso de estoque (RN-NOVA-11 revisada, OpenProject #246/#245)
          — ponto único de aviso ao clicar "Criar orçamento". Nunca bloqueia a criação, independente
          de permitirEstoqueNegativo (a única trava real de negócio é o avanço para Finalizado,
          backend). Cada item tem um checkbox; "Criar produção" cobre os selecionados numa única
          ação (RN-NOVA-5), sem exigir seleção para prosseguir com "Continuar mesmo assim". A modal
          "Orçamento criado com aviso de estoque" (pós-criação) foi removida — este checkpoint já
          cumpre o papel de aviso antes da criação. */}
      {pendentesAvanco && !modalVincular && (
        <ModalShell
          open
          onClose={() => setPendentesAvanco(null)}
          title="Itens com estoque insuficiente"
          subtitle="Aviso antes de criar o orçamento"
          icon={<AlertTriangle size={20} />}
          iconBg="rgba(249,115,22,0.14)"
          iconColor="#A35A26"
          width={560}
          footer={
            <div className="flex w-full flex-col gap-2.5">
              <div className="flex justify-between gap-2.5">
                <Button variant="secondary" onClick={() => setModalVincular(true)}>
                  <Factory size={14} /> Vincular produção existente
                </Button>
                <Button
                  variant="secondary"
                  disabled={selecionadosProducao.size === 0}
                  onClick={() => {
                    const produtos = pendentesAvanco
                      .filter(p => selecionadosProducao.has(p.produtoId))
                      .map(p => ({
                        produtoId: p.produtoId,
                        nome: p.nomeProduto,
                        quantidade: Math.max(0, Math.ceil(p.quantidadeNecessaria - p.estoqueAtual)),
                      }))
                    navigate('/producao/nova', { state: { produtos } })
                  }}
                >
                  <Factory size={14} /> Criar produção{selecionadosProducao.size > 0 ? ` (${selecionadosProducao.size})` : ''}
                </Button>
              </div>
              <div className="flex justify-between gap-2.5">
                <Button variant="ghost" onClick={() => setPendentesAvanco(null)}>Revisar itens</Button>
                <Button variant="primary" onClick={() => { setPendentesAvanco(null); criarOrcamento() }}>
                  Continuar mesmo assim
                </Button>
              </div>
            </div>
          }
        >
          <p className="m-0 mb-3.5 text-[13.5px] text-muted">
            Estes itens vão ficar com estoque negativo se o orçamento for criado assim. Você pode
            continuar mesmo assim, vincular a uma produção que já está aguardando início, ou
            selecionar itens para criar uma produção agora, cobrindo a diferença.
          </p>
          <div className="flex flex-col gap-2">
            {pendentesAvanco.map(p => {
              const falta = Math.max(0, Math.ceil(p.quantidadeNecessaria - p.estoqueAtual))
              const selecionado = selecionadosProducao.has(p.produtoId)
              return (
                <label
                  key={p.produtoId}
                  className="flex flex-wrap items-center gap-2.5 rounded-input border border-orange/30 bg-orange/[0.06] px-3.5 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={() => setSelecionadosProducao(prev => {
                      const next = new Set(prev)
                      if (next.has(p.produtoId)) next.delete(p.produtoId)
                      else next.add(p.produtoId)
                      return next
                    })}
                    className="h-4 w-4 flex-shrink-0 accent-orange"
                  />
                  <AlertTriangle size={16} className="flex-shrink-0 text-orange" />
                  <span className="flex-1 text-[13px] leading-[1.4] text-warning-alt">
                    <strong className="font-semibold">{p.nomeProduto}</strong> — disponível {p.estoqueAtual}, necessário {p.quantidadeNecessaria} (faltam {falta} un.)
                  </span>
                </label>
              )
            })}
          </div>
        </ModalShell>
      )}

      {modalVincular && pendentesAvanco && (
        <ModalVincularProducao
          onClose={handleFecharModalVincular}
          jaVinculadasIds={[]}
          onSimular={handleSimularVinculo}
          onConfirmar={handleConfirmarVinculo}
          confirmando={confirmandoVinculo}
          onCriarNova={
            orcamentoCriadoId
              ? undefined
              : () => {
                  const produtos = pendentesAvanco.map(p => ({
                    produtoId: p.produtoId,
                    nome: p.nomeProduto,
                    quantidade: Math.max(0, Math.ceil(p.quantidadeNecessaria - p.estoqueAtual)),
                  }))
                  navigate('/producao/nova', { state: { produtos } })
                }
          }
        />
      )}

    </AppLayout>
  )
}
