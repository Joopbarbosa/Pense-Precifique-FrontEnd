import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { FracionavelBadge } from '../../components/ui/Badge'
import {
  ArrowRight, Box, Plus, Search, Layers, Trash2,
  Check, AlertTriangle, ChevronRight, Pencil, FileText,
} from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { empresaService } from '../../services/empresaService'
import { tipoProdutoBadge } from '../../utils/badges'
import { tentarConverterFracao } from '../../utils/quantidade'
import CalculadoraPreco, { LinhaCalculadora } from '../../components/shared/CalculadoraPreco'
import type { ProdutoRequest, TipoProduto } from '../../types/produto'

const num = (s: string) => {
  const fracao = tentarConverterFracao(s)
  if (fracao !== null) return fracao
  return parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0
}

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TIPO_LABEL_TO_API: Record<string, TipoProduto> = {
  'Produto':      'PRODUTO',
  'Customização': 'CUSTOMIZACAO',
}

const TIPO_API_TO_LABEL: Record<string, string> = {
  'PRODUTO':      'Produto',
  'CUSTOMIZACAO': 'Customização',
}

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'

interface ItemDb {
  id: string
  nome: string
  marca: string
  un: string
  custo: number
  tipo: 'insumo' | 'produto'
  fracionavel: boolean
}

interface FichaItem extends ItemDb {
  qtd: number
}

// ---------- TextInput ----------

function TextInput({ value, onChange, placeholder, suffix, prefix, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  suffix?: string; prefix?: string; inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center rounded-l-input border-r border-line bg-cream text-sm font-semibold text-dim">
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={clsx(inputBase, prefix ? 'pl-14' : 'pl-3.5', suffix ? 'pr-16' : 'pr-3.5')}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">
          {suffix}
        </span>
      )}
    </div>
  )
}

// ---------- TipoSelector ----------

const TIPOS = [
  { v: 'Produto',      desc: 'Produto final para criar seu catálogo' },
  { v: 'Customização', desc: 'Extra opcional adicionado no orçamento' },
]

function TipoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
      {TIPOS.map(tp => {
        const on = value === tp.v
        return (
          <button
            key={tp.v}
            type="button"
            onClick={() => onChange(tp.v)}
            className={clsx(
              'flex flex-col gap-1.5 rounded-input border-[1.5px] px-3.5 py-[13px] text-left font-[inherit] transition-[border-color,box-shadow] duration-150',
              on
                ? 'border-teal bg-teal/[0.06] shadow-[0_0_0_3px_rgba(42,157,143,0.12)]'
                : 'border-line bg-white hover:border-[#DCD8D0]'
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={clsx('whitespace-nowrap text-sm font-bold', on ? 'text-[#1F7A6F]' : 'text-dark')}>{tp.v}</span>
              <span className={clsx(
                'grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full border-[1.5px]',
                on ? 'border-teal bg-teal' : 'border-dim bg-white'
              )}>
                {on && <Check size={11} strokeWidth={3} className="text-white" />}
              </span>
            </span>
            <span className="text-xs leading-[1.4] text-muted">{tp.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- DescTextarea ----------

function DescTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      placeholder="Conte os detalhes que tornam esse produto especial..."
      className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14.5px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
    />
  )
}

// ---------- DadosBasicos ----------

function DadosBasicos({ st, set, onNext, nomeErro, permitirEstoqueNegativo, setPermitirEstoqueNegativo, estoqueNegativoErro }: {
  st: any; set: (k: string, v: any) => void; onNext: () => void; nomeErro?: string
  permitirEstoqueNegativo: boolean; setPermitirEstoqueNegativo: (v: boolean) => void; estoqueNegativoErro?: string
}) {
  return (
    <div className="max-w-[760px] animate-fade-up rounded-card border border-[#F0EEE9] bg-white px-[30px] py-7 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-2 gap-x-6 gap-y-[22px]">
        <div className="col-span-2">
          <Field label="Nome do produto" required size="md">
            <TextInput value={st.nome} onChange={v => set('nome', v)} placeholder="Ex: Kit Convite Casamento" />
            {nomeErro && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{nomeErro}</span>}
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Tipo do produto" required group size="md">
            <TipoSelector value={st.tipo} onChange={v => set('tipo', v)} />
          </Field>
        </div>
        <Field label="Tempo de produção" required size="md">
          <TextInput value={st.tempo} onChange={v => set('tempo', v.replace(/[^\d]/g, ''))} placeholder="45" suffix="minutos" inputMode="numeric" />
          <span className="mt-1.5 block text-xs text-muted">Tempo para produzir o lote inteiro, não a unidade.</span>
        </Field>
        <div className="col-span-2">
          <ConfiguracoesEstoque permitir={permitirEstoqueNegativo} setPermitir={setPermitirEstoqueNegativo} erro={estoqueNegativoErro} />
        </div>
        <div className="col-span-2">
          <Field label="Descrição" opt size="md">
            <DescTextarea value={st.descricao} onChange={v => set('descricao', v)} />
          </Field>
        </div>
      </div>
      <div className="mt-7 flex justify-end border-t border-line pt-[22px]">
        <Button variant="primary" iconRight={<ArrowRight size={17} />} onClick={onNext}>
          Próximo: Ficha Técnica
        </Button>
      </div>
    </div>
  )
}

// ---------- TipoBadge ----------

function TipoBadge({ tipo }: { tipo: 'insumo' | 'produto' }) {
  if (tipo === 'produto') {
    const b = tipoProdutoBadge('PRODUTO')
    return (
      <span
        className="inline-flex h-[18px] items-center whitespace-nowrap rounded-full px-[7px] text-[10.5px] font-semibold tracking-[0.01em]"
        style={{ background: b.bg, color: b.fg }}
      >
        {b.label}
      </span>
    )
  }
  return (
    <span className="inline-flex h-[18px] items-center whitespace-nowrap rounded-full bg-line-soft px-[7px] text-[10.5px] font-semibold tracking-[0.01em] text-subtle">
      Insumo
    </span>
  )
}

// ---------- InsumoSearch (com API real + debounce) ----------

function InsumoSearch({ onAdd, jaAdicionados }: { onAdd: (i: ItemDb) => void; jaAdicionados: string[] }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [insumos, setInsumos] = useState<ItemDb[]>([])
  const [produtos, setProdutos] = useState<ItemDb[]>([])
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [erroBusca, setErroBusca] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    const termo = q.trim()
    const qLower = termo.toLowerCase()
    setLoadingBusca(true)
    setErroBusca(false)
    const delay = termo ? 300 : 0
    const timer = setTimeout(async () => {
      try {
        const [ins, prods] = await Promise.all([
          produtoService.buscarInsumos(termo),
          produtoService.buscarProdutosComponente(termo),
        ])
        setInsumos(
          ins
            .filter(i => i.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(i.id))
            .map(i => ({ id: i.id, nome: i.nome, marca: i.marca || '', un: i.unidadeMedida || 'un', custo: i.custoUnitario ?? 0, tipo: 'insumo' as const, fracionavel: i.fracionavel ?? true }))
        )
        setProdutos(
          prods
            .filter(p => p.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(p.id))
            .map(p => ({ id: p.id, nome: p.nome, marca: '', un: 'un', custo: p.precoCusto, tipo: 'produto' as const, fracionavel: true }))
        )
      } catch {
        setInsumos([])
        setProdutos([])
        setErroBusca(true)
      } finally {
        setLoadingBusca(false)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [q, open, jaAdicionados])

  const total = insumos.length + produtos.length

  const grupo = (titulo: string, itens: ItemDb[]) => itens.length === 0 ? null : (
    <div key={titulo}>
      <div className="px-[11px] pb-[5px] pt-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-dim">{titulo}</div>
      {itens.map(i => (
        <button
          key={i.id}
          onClick={() => { onAdd(i); setQ(''); setOpen(false); setInsumos([]); setProdutos([]) }}
          className="flex w-full items-center gap-[11px] rounded-[9px] border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
        >
          <span className={clsx(
            'grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg',
            i.tipo === 'produto' ? 'bg-teal/[0.12] text-teal' : 'bg-line-soft text-dim'
          )}>
            <Box size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-[7px]">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{i.nome}</span>
              <TipoBadge tipo={i.tipo} />
            </span>
            <span className="block text-xs text-muted">{i.marca}{i.marca ? ' · ' : ''}{moeda(i.custo)} / {i.un}</span>
          </span>
          <Plus size={16} className="flex-shrink-0 text-teal" />
        </button>
      ))}
    </div>
  )

  return (
    <div ref={ref} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
        <Search size={18} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar insumo ou produto..."
        className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
      />
      {open && (
        <div className="absolute inset-x-0 top-[50px] z-30 max-h-80 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.2)]">
          {loadingBusca ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
          ) : erroBusca ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-danger-deep">Não foi possível buscar componentes. Tente novamente.</div>
          ) : total === 0 ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum componente encontrado</div>
          ) : (
            <>
              {grupo('Insumos', insumos)}
              {grupo('Produtos', produtos)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- QtyInput ----------

function QtyInput({ value, un, fracionavel, onChange }: { value: number; un: string; fracionavel: boolean; onChange: (v: string) => void }) {
  const maxFrac = fracionavel ? 2 : 0
  // Estado local é a fonte da verdade do texto digitado — não resincroniza a partir de `value` a
  // cada keystroke (o round-trip qtd -> num() -> toLocaleString() truncava "0,25" para "025"/"0"
  // em insumo não-fracionável). `ficha` só popula este componente uma vez (no add ou no load de
  // edição, antes do primeiro mount), então o valor inicial do useState já cobre os dois casos.
  const [display, setDisplay] = useState(value.toLocaleString('pt-BR', { maximumFractionDigits: maxFrac }))

  return (
    <div className="relative">
      <input
        value={display}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^\d.,/]/g, '')
          setDisplay(cleaned)
          onChange(cleaned)
        }}
        inputMode={fracionavel ? 'decimal' : 'numeric'}
        className="h-10 w-full rounded-lg border-[1.5px] border-line bg-white pl-[11px] pr-[38px] font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 [font-variant-numeric:tabular-nums] focus:border-teal focus:ring-[3px] focus:ring-teal/[0.12]"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold text-dim">{un}</span>
    </div>
  )
}

// ---------- FichaTecnica ----------

function FichaTecnica({ ficha, setFicha, rendimento, setRendimento, rendimentoErro, mostrarBotaoCatalogo, salvandoCatalogo, botaoCatalogoDisabled, onCriarCatalogo }: {
  ficha: FichaItem[]; setFicha: React.Dispatch<React.SetStateAction<FichaItem[]>>
  rendimento: string; setRendimento: (v: string) => void; rendimentoErro?: string
  mostrarBotaoCatalogo: boolean; salvandoCatalogo: boolean; botaoCatalogoDisabled: boolean; onCriarCatalogo: () => void
}) {
  const add = (i: ItemDb) => setFicha(f => [...f, { ...i, qtd: 1 }])
  const remove = (idx: number) => setFicha(f => f.filter((_, k) => k !== idx))
  const setQtd = (idx: number, v: string) => setFicha(f => f.map((row, k) => k === idx ? { ...row, qtd: num(v) } : row))

  // RN-051 — só insumos diretos (não produtos-componente) contam para o travamento de quantidade em Produção.
  const algumInsumoNaoFracionavel = ficha.some(item => item.tipo === 'insumo' && !item.fracionavel)

  return (
    <div className="animate-fade-up">
      <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="px-[22px] pb-4 pt-5">
          <div className="mb-3.5 flex items-center gap-[9px]">
            <Layers size={18} className="text-teal" />
            <h3 className="m-0 whitespace-nowrap text-[15.5px] font-bold text-dark">Componentes do produto</h3>
            {ficha.length > 0 && (
              <FracionavelBadge
                fracionavel={!algumInsumoNaoFracionavel}
                labelFracionavel="Produto fracionável"
                labelNaoFracionavel="Produto não fracionável"
              />
            )}
          </div>
          <InsumoSearch onAdd={add} jaAdicionados={ficha.map(f => f.id)} />
        </div>
        <div className="grid grid-cols-[1fr_132px_96px_44px] gap-3 border-t border-line bg-cream px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
          <span>Componente</span><span>Quantidade</span><span className="text-right">Custo</span><span></span>
        </div>
        {ficha.length === 0 ? (
          <div className="border-t border-line px-[22px] py-[34px] text-center text-[13.5px] text-muted">
            Nenhum componente ainda. Use a busca acima para adicionar.
          </div>
        ) : ficha.map((row, idx) => (
          <div key={`${row.id}-${idx}`} className="grid animate-row-in grid-cols-[1fr_132px_96px_44px] items-center gap-3 border-t border-line px-[22px] py-[13px]">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-[7px]">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{row.nome}</span>
                <TipoBadge tipo={row.tipo} />
              </div>
              <div className="text-xs text-muted">{row.marca}{row.marca ? ' · ' : ''}{moeda(row.custo)}/{row.un}</div>
            </div>
            <QtyInput value={row.qtd} un={row.un} fracionavel={row.fracionavel} onChange={v => setQtd(idx, v)} />
            <div className="text-right text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(row.qtd * row.custo)}</div>
            <button
              onClick={() => remove(idx)}
              aria-label="Remover componente"
              className="grid h-[34px] w-[34px] place-items-center justify-self-end rounded-[9px] border-none bg-transparent text-[#BDB9B1] hover:bg-danger-bg hover:text-danger-deep"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="border-t border-line px-[22px] py-[18px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mb-2 block text-[13.5px] font-semibold text-body">
                Rendimento<span className="ml-[3px] text-orange">*</span>
              </span>
              <div className="max-w-[200px]">
                <TextInput value={rendimento} onChange={v => setRendimento(v.replace(/[^\d,]/g, ''))} placeholder="1" suffix="un" inputMode="decimal" />
              </div>
              <span className="mt-1.5 block text-xs text-muted">Quantidade de unidades que este lote produz.</span>
              {rendimentoErro && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{rendimentoErro}</span>}
            </div>
            {mostrarBotaoCatalogo && (
              <Button variant="primary" iconRight={!salvandoCatalogo ? <ArrowRight size={17} /> : undefined} onClick={onCriarCatalogo} disabled={botaoCatalogoDisabled}>
                {salvandoCatalogo
                  ? <span className="flex items-center gap-2"><Spinner size={16} trackColor="rgba(255,255,255,0.3)" />Criando…</span>
                  : 'Criar produto catálogo'
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- MargemInput ----------

function MargemInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-[92px]">
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
        inputMode="numeric"
        className="h-10 w-full rounded-[9px] border-[1.5px] border-line bg-white pl-3 pr-[30px] text-right font-[inherit] text-[15px] font-semibold text-dark outline-none transition-[border-color,box-shadow] duration-150 [font-variant-numeric:tabular-nums] focus:border-teal focus:ring-[3px] focus:ring-teal/[0.12]"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-dim">%</span>
    </div>
  )
}

// ---------- Calculadora ----------

function Calculadora({ ficha, tempo, rendimento, margem, setMargem, modoMargem, setModoMargem, precoFinal, setPrecoFinal, mostrarPrecoMargem, mensagemSemPreco, valorHora, margemPadrao, custoTotalLote, custoUnitario }: {
  ficha: FichaItem[]; tempo: string; rendimento: string
  margem: string; setMargem: (v: string) => void
  modoMargem: string; setModoMargem: (v: string) => void
  precoFinal: string; setPrecoFinal: (v: string) => void
  mostrarPrecoMargem: boolean
  mensagemSemPreco: string
  valorHora: number
  margemPadrao: number
  custoTotalLote: number | null; custoUnitario: number | null
}) {
  const custoInsumos = ficha.reduce((s, r) => s + r.qtd * r.custo, 0)
  const maoObra = (num(tempo) / 60) * (valorHora ?? 0)
  const subtotal = custoInsumos + maoObra
  const rendimentoNum = num(rendimento)
  const custoUnitarioAoVivo = rendimentoNum > 0 ? subtotal / rendimentoNum : 0
  const lucro = custoUnitarioAoVivo * (num(margem) / 100)
  const sugerido = custoUnitarioAoVivo + lucro
  const pf = num(precoFinal)
  const diff = pf - sugerido
  const manual = mostrarPrecoMargem && Math.abs(diff) > 0.005

  return (
    <div className="static lg:sticky lg:top-6">
      <CalculadoraPreco
        titulo="Calculadora de Custo"
        mostrarSugerido={mostrarPrecoMargem}
        mensagemSemPreco={mensagemSemPreco}
        sugerido={sugerido}
        precoFinalLabel="Preço final de venda"
        precoFinal={precoFinal}
        onPrecoFinalChange={setPrecoFinal}
        overrideAtivo={manual}
        diffOverride={manual ? diff : null}
      >
        <LinhaCalculadora label="Custo dos insumos" value={moeda(custoInsumos)} />
        <LinhaCalculadora label="Mão de obra" value={moeda(maoObra)} sub={`${num(tempo)} min × ${moeda(valorHora ?? 0)}/h`} />
        <div className="my-1 h-px bg-line" />
        <div className="flex items-baseline justify-between gap-2.5 py-2.5">
          <span className="whitespace-nowrap text-[13.5px] font-semibold text-dark">Custo Total da Receita</span>
          <span className="text-[15px] font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(subtotal)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2.5 py-2.5">
          <span className="whitespace-nowrap text-[13.5px] font-semibold text-dark">Custo unitário</span>
          <span className="text-[15px] font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(custoUnitarioAoVivo)}</span>
        </div>

        {(custoTotalLote != null || custoUnitario != null) && (
          <div className="mb-2 mt-1.5 rounded-[10px] border border-azul/20 bg-azul/[0.07] px-4 py-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-azul">Valores salvos</div>
            {custoTotalLote != null && (
              <div className="flex justify-between gap-2.5 py-[3px] text-[13.5px]">
                <span className="text-body">Custo Total do lote</span>
                <span className="font-bold text-azul [font-variant-numeric:tabular-nums]">{moeda(custoTotalLote)}</span>
              </div>
            )}
            {custoUnitario != null && (
              <div className="flex justify-between gap-2.5 py-[3px] text-[13.5px]">
                <span className="text-body">Custo Unitário</span>
                <span className="font-bold text-azul [font-variant-numeric:tabular-nums]">{moeda(custoUnitario)}</span>
              </div>
            )}
          </div>
        )}

        {mostrarPrecoMargem && (
          <>
            <div className="mt-2 rounded-xl border border-line bg-cream p-3.5">
              <div className={clsx('flex gap-[3px] rounded-[9px] bg-line-soft p-[3px]', modoMargem === 'personalizar' ? 'mb-3' : 'mb-0')}>
                {([['padrao', `Margem padrão (${margemPadrao ?? 0}%)`], ['personalizar', 'Personalizar']] as [string, string][]).map(([v, l]) => {
                  const on = modoMargem === v
                  return (
                    <button
                      key={v}
                      onClick={() => { setModoMargem(v); if (v === 'padrao') setMargem((margemPadrao ?? 0).toString()) }}
                      className={clsx(
                        'h-[34px] flex-1 whitespace-nowrap rounded-[7px] border-none font-[inherit] text-xs font-semibold',
                        on ? 'bg-white text-dark shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-dim'
                      )}
                    >{l}</button>
                  )
                })}
              </div>
              {modoMargem === 'personalizar' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-body">Margem de lucro</span>
                  <MargemInput value={margem} onChange={setMargem} />
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-2.5 pb-1 pt-3">
              <span className="text-[13px] text-body">Lucro ({num(margem)}%)</span>
              <span className="text-sm font-bold text-success [font-variant-numeric:tabular-nums]">+ {moeda(lucro)}</span>
            </div>
          </>
        )}
      </CalculadoraPreco>
    </div>
  )
}

// ---------- ConfiguracoesEstoque ----------

function ConfiguracoesEstoque({ permitir, setPermitir, erro }: { permitir: boolean; setPermitir: (v: boolean) => void; erro?: string }) {
  return (
    <div>
      <span className="mb-2 block text-[13.5px] font-semibold text-body">Configurações de estoque</span>
      <label onClick={() => setPermitir(!permitir)} className="flex cursor-pointer items-start gap-3">
        <span className={clsx(
          'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-colors duration-150',
          permitir ? 'border-teal bg-teal' : 'border-line bg-white'
        )}>
          {permitir && <Check size={14} className="text-white" />}
        </span>
        <span>
          <span className="block text-[14.5px] font-semibold text-dark">Permitir estoque negativo</span>
          <span className="mt-[3px] block text-[12.5px] leading-[1.5] text-muted">
            Se desmarcado, operações que levariam ao estoque negativo serão bloqueadas.
          </span>
        </span>
      </label>
      {erro && (
        <div className="mt-[18px] flex items-center gap-[15px] rounded-2xl border border-[#FECACA] bg-danger-bg-soft px-5 py-[18px]">
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-white text-[#DC2626] shadow-[0_4px_12px_-4px_rgba(220,38,38,0.25)]">
            <AlertTriangle size={20} />
          </span>
          <p className="m-0 text-[13.5px] font-normal leading-[1.5] text-[#DC2626]">{erro}</p>
        </div>
      )}
    </div>
  )
}

// ---------- Página principal ----------

export default function CadastrarProdutoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id
  const [aba, setAba] = useState<'dados' | 'ficha'>('dados')
  const [dados, setDados] = useState({ nome: '', tipo: 'Produto', descricao: '', tempo: '' })
  const setD = (k: string, v: any) => setDados(d => ({ ...d, [k]: v }))
  const [ficha, setFicha] = useState<FichaItem[]>([])
  const [rendimento, setRendimento] = useState('1')
  const [custoTotalLote, setCustoTotalLote] = useState<number | null>(null)
  const [custoUnitario, setCustoUnitario] = useState<number | null>(null)
  const [margem, setMargem] = useState('0')
  const [modoMargem, setModoMargem] = useState('padrao')
  const [precoFinal, setPrecoFinal] = useState('')
  const [precoFinalManual, setPrecoFinalManual] = useState(false)
  const [salvando, setSalvando] = useState<'padrao' | 'catalogo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [valorHora, setValorHora] = useState(0)
  const [margemPadrao, setMargemPadrao] = useState(0)
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(true)
  const [estoqueAtualExistente, setEstoqueAtualExistente] = useState<number | null>(null)

  // Estoque já negativo não pode ter "permitir estoque negativo" desmarcado sem regularizar antes.
  const bloqueioEstoqueNegativo = editando && !permitirEstoqueNegativo && (estoqueAtualExistente ?? 0) < 0
  const estoqueNegativoErro = bloqueioEstoqueNegativo
    ? 'Não é possível desmarcar "Permitir estoque negativo" pois este produto está com estoque negativo. Regularize o estoque antes de desmarcar esta opção.'
    : undefined

  const rendimentoInvalido = !rendimento.trim() || num(rendimento) <= 0
  const rendimentoErroInline = rendimentoInvalido ? 'Rendimento deve ser maior que zero.' : undefined

  const isCustomizacao = dados.tipo === 'Customização'
  const isProduto = dados.tipo === 'Produto'
  // Ambos os tipos restantes (PRODUTO e CUSTOMIZACAO) têm preço de venda com override — RN-038a/PDT-001, #210+231+234.
  const mostrarPrecoMargem = isCustomizacao || isProduto

  // Mesma fórmula da Calculadora — mantém o preço final espelhando o sugerido enquanto não houver override manual.
  const custoInsumosCalc = ficha.reduce((s, r) => s + r.qtd * r.custo, 0)
  const maoObraCalc = (num(dados.tempo) / 60) * (valorHora ?? 0)
  const rendimentoNumCalc = num(rendimento)
  const custoUnitarioCalc = rendimentoNumCalc > 0 ? (custoInsumosCalc + maoObraCalc) / rendimentoNumCalc : 0
  const sugeridoCalc = custoUnitarioCalc * (1 + num(margem) / 100)

  // Buscar configuração de precificação real
  useEffect(() => {
    empresaService.getConfiguracao()
      .then(cfg => {
        const vh = cfg.valorHora ?? 0
        const mp = cfg.margemPadrao ?? 0
        setValorHora(vh)
        setMargemPadrao(mp)
        if (!editando) setMargem(mp.toString())
      })
      .catch(() => {})
  }, [editando])

  // Preço final nasce espelhando o sugerido ao vivo — para de acompanhar assim que a artesã edita manualmente (override, RN-038a/PDT-001).
  useEffect(() => {
    if (!mostrarPrecoMargem || editando || precoFinalManual) return
    setPrecoFinal(sugeridoCalc > 0 ? sugeridoCalc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
  }, [mostrarPrecoMargem, editando, precoFinalManual, sugeridoCalc])

  // Carregar dados na edição
  useEffect(() => {
    if (!editando || !id) return
    produtoService.buscarPorId(id)
      .then(produto => {
        setDados({
          nome: produto.nome,
          tipo: TIPO_API_TO_LABEL[produto.tipo] || 'Produto',
          descricao: produto.descricao || '',
          tempo: produto.tempoProducao.toString(),
        })
        const fichaItems: FichaItem[] = produto.fichaTecnica.map(item => ({
          id: item.insumoId || item.produtoBaseId || '',
          nome: item.nomeInsumo || item.nomeProdutoBase || '',
          marca: item.marcaInsumo || '',
          un: item.unidadeMedida || 'un',
          custo: item.custoUnitario,
          tipo: item.insumoId ? 'insumo' : 'produto',
          fracionavel: item.fracionavelInsumo ?? true,
          qtd: item.quantidade,
        }))
        setFicha(fichaItems)
        setRendimento(produto.rendimento != null ? produto.rendimento.toString() : '')
        setCustoTotalLote(produto.custoTotalLote ?? null)
        setCustoUnitario(produto.custoUnitario ?? null)
        setPermitirEstoqueNegativo(produto.permitirEstoqueNegativo)
        setEstoqueAtualExistente(produto.estoqueAtual)
        if (produto.precoVenda != null) {
          setPrecoFinal(produto.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
          setPrecoFinalManual(true)
          setModoMargem('personalizar')
        }
      })
      .catch(console.error)
  }, [editando, id])

  const salvar = async (destino: 'padrao' | 'catalogo' = 'padrao') => {
    setErro(null)
    setFieldErrors({})

    if (bloqueioEstoqueNegativo) return

    if (rendimentoInvalido) {
      setFieldErrors({ rendimento: rendimentoErroInline! })
      return
    }
    const rendimentoNum = num(rendimento)

    const tipoApi = TIPO_LABEL_TO_API[dados.tipo]
    const precoVendaNum = mostrarPrecoMargem ? (num(precoFinal) || undefined) : undefined

    const request: ProdutoRequest = {
      nome: dados.nome.trim(),
      tipo: tipoApi,
      descricao: dados.descricao.trim() || undefined,
      tempoProducao: Math.round(num(dados.tempo)) || 1,
      precoVenda: precoVendaNum,
      rendimento: rendimentoNum,
      permitirEstoqueNegativo,
      fichaTecnica: ficha.map(item => ({
        insumoId: item.tipo === 'insumo' ? item.id : undefined,
        produtoBaseId: item.tipo === 'produto' ? item.id : undefined,
        quantidade: item.qtd,
      })),
    }

    setSalvando(destino)
    try {
      const result = editando && id
        ? await produtoService.editar(id, request)
        : await produtoService.cadastrar(request)

      if (mostrarPrecoMargem && result.precoVenda != null) {
        setPrecoFinal(result.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        setPrecoFinalManual(true)
      }

      if (destino === 'catalogo') {
        navigate(`/catalogos/itens/novo?produtoId=${result.id}`)
      } else if (editando) {
        navigate(`/produtos/${id}`)
      } else {
        navigate('/produtos')
      }
    } catch (err: any) {
      const data = err.response?.data
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (data?.message && /rendimento/i.test(data.message)) {
        fe.rendimento = data.message
        setFieldErrors(fe)
      } else {
        setFieldErrors(fe)
        setErro(data?.message || 'Erro ao salvar produto. Verifique os campos obrigatórios.')
      }
    } finally {
      setSalvando(null)
    }
  }

  const ABAS = [
    { id: 'dados' as const, label: 'Dados básicos',  icon: FileText },
    { id: 'ficha' as const, label: 'Ficha Técnica',  icon: Layers },
  ]

  return (
    <AppLayout active="produtos" compact>

      {/* BREADCRUMB */}
      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/produtos')}>
          Produtos
        </span>
        <ChevronRight size={15} className="text-dim" />
        <span className="whitespace-nowrap font-semibold text-body">
          {editando ? dados.nome || 'Editar Produto' : 'Novo Produto'}
        </span>
      </div>

      {/* HEADER */}
      <div className="mb-[22px] flex items-center gap-[15px]">
        <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
          {editando ? <Pencil size={26} /> : <Box size={26} />}
        </span>
        <h1 className="m-0 whitespace-nowrap text-[26px] font-bold tracking-[-0.02em] text-dark">
          {editando ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      {/* ABAS */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b-[1.5px] border-line">
        {ABAS.map((a, i) => {
          const on = aba === a.id
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={clsx(
                'relative flex items-center gap-[9px] whitespace-nowrap border-none bg-transparent px-[18px] py-3 font-[inherit] text-[14.5px] transition-colors duration-150',
                on ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body'
              )}
            >
              <span className={clsx(
                'grid h-6 w-6 place-items-center rounded-[7px] text-xs font-bold',
                on ? 'bg-teal/[0.12] text-teal' : 'bg-line-soft text-dim'
              )}>
                {i + 1}
              </span>
              {a.label}
              {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO */}
      {aba === 'dados' && (
        <DadosBasicos
          st={dados} set={setD} onNext={() => setAba('ficha')} nomeErro={fieldErrors.nome}
          permitirEstoqueNegativo={permitirEstoqueNegativo} setPermitirEstoqueNegativo={setPermitirEstoqueNegativo} estoqueNegativoErro={estoqueNegativoErro}
        />
      )}
      {aba === 'ficha' && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <FichaTecnica
            ficha={ficha} setFicha={setFicha}
            rendimento={rendimento} setRendimento={setRendimento} rendimentoErro={fieldErrors.rendimento || rendimentoErroInline}
            mostrarBotaoCatalogo={isProduto} salvandoCatalogo={salvando === 'catalogo'}
            botaoCatalogoDisabled={!!salvando || bloqueioEstoqueNegativo || rendimentoInvalido} onCriarCatalogo={() => salvar('catalogo')}
          />
          <Calculadora
            ficha={ficha} tempo={dados.tempo} rendimento={rendimento}
            margem={margem} setMargem={setMargem}
            modoMargem={modoMargem} setModoMargem={setModoMargem}
            precoFinal={precoFinal} setPrecoFinal={(v: string) => { setPrecoFinalManual(true); setPrecoFinal(v) }}
            mostrarPrecoMargem={mostrarPrecoMargem}
            mensagemSemPreco="Produto não tem preço de venda direto — defina o preço ao criar o item de Catálogo."
            valorHora={valorHora}
            margemPadrao={margemPadrao}
            custoTotalLote={custoTotalLote} custoUnitario={custoUnitario}
          />
        </div>
      )}

      {/* AÇÕES GLOBAIS */}
      {aba !== 'dados' && (
        <div className="mt-[26px]">
          {(erro || estoqueNegativoErro || Object.keys(fieldErrors).length > 0) && (
            <div className="mb-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
              <div>{erro}</div>
              {estoqueNegativoErro && <div>{estoqueNegativoErro}</div>}
              {Object.keys(fieldErrors).length > 0 && (
                <ul className={clsx('pl-[18px]', (erro || estoqueNegativoErro) ? 'mt-1.5' : 'mt-0')}>
                  {Object.entries(fieldErrors).map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-[11px]">
            <Button variant="ghost" onClick={() => navigate(editando ? `/produtos/${id}` : '/produtos')} disabled={!!salvando}>
              Cancelar
            </Button>
            <Button variant={isProduto ? 'secondary' : 'primary'} onClick={() => salvar('padrao')} disabled={!!salvando || bloqueioEstoqueNegativo || rendimentoInvalido}>
              {salvando === 'padrao'
                ? <span className="flex items-center gap-2"><Spinner size={16} trackColor="rgba(255,255,255,0.3)" />{editando ? 'Salvando…' : 'Cadastrando…'}</span>
                : (editando ? 'Salvar alterações' : 'Salvar produto')
              }
            </Button>
          </div>
        </div>
      )}

    </AppLayout>
  )
}
