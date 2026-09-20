import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { Search, ChevronRight, Files, Box, Layers, Trash2, Plus, Check } from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { insumoService } from '../../services/insumoService'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import { empresaService } from '../../services/empresaService'
import CalculadoraPreco, { LinhaCalculadora } from '../../components/shared/CalculadoraPreco'
import Toast from '../../components/shared/Toast'
import { FracionavelBadge } from '../../components/ui/Badge'
import { tipoProdutoBadge } from '../../utils/badges'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { CatalogoResponse } from '../../types/catalogo'
import type { ItemCatalogoComponenteRequest, ItemCatalogoRequest, PreviewPrecoRequest, PreviewPrecoResponse } from '../../types/itemCatalogo'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'

const num = (s: string) =>
  parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const inputClass = (hasError?: boolean) => clsx(
  'h-[46px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150',
  hasError ? 'border-warning-alt shadow-[0_0_0_4px_rgba(224,92,58,0.10)]' : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
)

// ---------- Componente (Insumo XOR Produto-base, mesmo par de FichaTecnicaItem em Produto) ----------

interface ComponenteLinha {
  id: string
  nome: string
  marca: string
  un: string
  custo: number
  tipo: 'insumo' | 'produto' | 'customizacao'
  fracionavel: boolean
  qtd: number
}

// ---------- TipoBadge ----------

function TipoBadge({ tipo }: { tipo: 'insumo' | 'produto' | 'customizacao' }) {
  if (tipo === 'produto' || tipo === 'customizacao') {
    const b = tipoProdutoBadge(tipo === 'produto' ? 'PRODUTO' : 'CUSTOMIZACAO')
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

// ---------- Filtro de tipo (checkbox multi-seleção, UC-NOVO-1 passo 2 — diferente do seletor único de Orçamento) ----------

const TIPOS_COMPONENTE: { v: 'produto' | 'customizacao' | 'insumo'; label: string }[] = [
  { v: 'produto', label: 'Produto' },
  { v: 'customizacao', label: 'Customização' },
  { v: 'insumo', label: 'Insumo' },
]

function FiltroTipoComponente({ ativos, onToggle }: { ativos: Set<'insumo' | 'produto' | 'customizacao'>; onToggle: (t: 'insumo' | 'produto' | 'customizacao') => void }) {
  return (
    <div className="mb-2.5 flex flex-wrap gap-[7px]">
      {TIPOS_COMPONENTE.map(({ v, label }) => {
        const on = ativos.has(v)
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            aria-pressed={on}
            className={clsx(
              'flex h-8 items-center gap-[6px] rounded-full border-[1.5px] px-3 font-[inherit] text-[12.5px] font-semibold transition-colors duration-150',
              on ? 'border-teal bg-teal/10 text-teal' : 'border-line bg-white text-muted hover:border-teal/40'
            )}
          >
            {on && <Check size={13} />}
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ---------- ComponenteSearch (Insumo + Produto + Customização, mesmo padrão de InsumoSearch em CadastrarProdutoPage.tsx) ----------

function ComponenteSearch({ onAdd, jaAdicionados }: { onAdd: (i: Omit<ComponenteLinha, 'qtd'>) => void; jaAdicionados: string[] }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [tiposAtivos, setTiposAtivos] = useState<Set<'insumo' | 'produto' | 'customizacao'>>(
    new Set(['insumo', 'produto', 'customizacao'])
  )
  const toggleTipo = (t: 'insumo' | 'produto' | 'customizacao') =>
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  const [insumos, setInsumos] = useState<Omit<ComponenteLinha, 'qtd'>[]>([])
  const [produtos, setProdutos] = useState<Omit<ComponenteLinha, 'qtd'>[]>([])
  const [customizacoes, setCustomizacoes] = useState<Omit<ComponenteLinha, 'qtd'>[]>([])
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [erroBusca, setErroBusca] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const debouncedQ = useDebouncedValue(q, q.trim() ? 300 : 0)
  useEffect(() => {
    if (!open || debouncedQ !== q) return
    const termo = debouncedQ.trim()
    const qLower = termo.toLowerCase()
    setLoadingBusca(true)
    setErroBusca(false)
    ;(async () => {
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
        const prodsFiltrados = prods.filter(p => p.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(p.id) && p.ativo)
        setProdutos(
          prodsFiltrados
            .filter(p => p.tipo === 'PRODUTO')
            .map(p => ({ id: p.id, nome: p.nome, marca: '', un: 'un', custo: p.precoCusto, tipo: 'produto' as const, fracionavel: p.fracionavel ?? true }))
        )
        setCustomizacoes(
          prodsFiltrados
            .filter(p => p.tipo === 'CUSTOMIZACAO')
            .map(p => ({ id: p.id, nome: p.nome, marca: '', un: 'un', custo: p.precoCusto, tipo: 'customizacao' as const, fracionavel: p.fracionavel ?? true }))
        )
      } catch {
        setInsumos([])
        setProdutos([])
        setCustomizacoes([])
        setErroBusca(true)
      } finally {
        setLoadingBusca(false)
      }
    })()
  }, [debouncedQ, open, q, jaAdicionados])

  const insumosVis = tiposAtivos.has('insumo') ? insumos : []
  const produtosVis = tiposAtivos.has('produto') ? produtos : []
  const customizacoesVis = tiposAtivos.has('customizacao') ? customizacoes : []
  const total = insumosVis.length + produtosVis.length + customizacoesVis.length

  const grupo = (titulo: string, itens: Omit<ComponenteLinha, 'qtd'>[]) => itens.length === 0 ? null : (
    <div key={titulo}>
      <div className="px-[11px] pb-[5px] pt-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-dim">{titulo}</div>
      {itens.map(i => (
        <button
          key={i.id}
          onClick={() => { onAdd(i); setQ(''); setOpen(false); setInsumos([]); setProdutos([]); setCustomizacoes([]) }}
          className="flex w-full items-center gap-[11px] rounded-[9px] border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
        >
          <span className={clsx(
            'grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg',
            i.tipo === 'produto' ? 'bg-teal/[0.12] text-teal'
              : i.tipo === 'customizacao' ? 'bg-[#2A9D8F]/[0.12] text-[#2A9D8F]'
              : 'bg-line-soft text-dim'
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
      <FiltroTipoComponente ativos={tiposAtivos} onToggle={toggleTipo} />
      <span className="pointer-events-none absolute left-3.5 top-[46px] flex -translate-y-1/2 text-muted">
        <Search size={18} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar insumo, produto ou customização..."
        className={clsx(inputClass(), 'pl-[42px]')}
      />
      {open && (
        <div className="absolute inset-x-0 top-[80px] z-30 max-h-80 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.2)]">
          {loadingBusca ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
          ) : erroBusca ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-danger-deep">Não foi possível buscar componentes. Tente novamente.</div>
          ) : tiposAtivos.size === 0 ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Selecione ao menos um tipo para buscar</div>
          ) : total === 0 ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum componente encontrado</div>
          ) : (
            <>
              {grupo('Insumos', insumosVis)}
              {grupo('Produtos', produtosVis)}
              {grupo('Customizações', customizacoesVis)}
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
  const [display, setDisplay] = useState(value.toLocaleString('pt-BR', { maximumFractionDigits: maxFrac }))

  return (
    <div className="relative">
      <input
        value={display}
        onChange={e => {
          const permitidos = fracionavel ? /[^\d.,]/g : /[^\d]/g
          const cleaned = e.target.value.replace(permitidos, '')
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

// ---------- Página principal ----------

export default function NovoItemCatalogoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const produtoIdParam = searchParams.get('produtoId')
  const catalogoIdParam = searchParams.get('catalogoId')
  const itemIdParam = searchParams.get('itemId')
  const isEdicao = !!itemIdParam

  const [catalogoId, setCatalogoId] = useState<string | null>(catalogoIdParam)
  const [catalogoInfo, setCatalogoInfo] = useState<CatalogoResponse | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [loadingContexto, setLoadingContexto] = useState(true)

  const [nome, setNome] = useState('')
  const [componentes, setComponentes] = useState<ComponenteLinha[]>([])
  const [tempoProducao, setTempoProducao] = useState('')
  const [margem, setMargem] = useState('0')
  const [modoMargem, setModoMargem] = useState<'padrao' | 'personalizar'>('padrao')
  const [margemPadrao, setMargemPadrao] = useState(0)

  const [precoVenda, setPrecoVenda] = useState('')
  const [precoSugerido, setPrecoSugerido] = useState<number | null>(null)
  const [previewDetalhe, setPreviewDetalhe] = useState<PreviewPrecoResponse | null>(null)
  const [precoEditadoManualmente, setPrecoEditadoManualmente] = useState(false)
  const [itemId, setItemId] = useState<string | null>(null)

  const [nomeErro, setNomeErro] = useState<string | null>(null)
  const [componentesErro, setComponentesErro] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [calculandoPreview, setCalculandoPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { toast, setToast } = useToast()

  // Contexto: catálogo (fixo via query param, ou lista para escolher) + produto pré-selecionado
  useEffect(() => {
    const tarefas: Promise<unknown>[] = []

    if (catalogoIdParam) {
      tarefas.push(
        catalogoService.buscarPorId(catalogoIdParam)
          .then(c => { setCatalogoInfo(c); setCatalogoId(c.id) })
          .catch(() => setErro('Não foi possível carregar o catálogo informado.'))
      )
    } else {
      tarefas.push(
        catalogoService.listar({ size: 100 })
          .then(data => setCatalogos(data.content))
          .catch(() => setErro('Não foi possível carregar a lista de catálogos.'))
      )
    }

    tarefas.push(
      empresaService.getConfiguracao()
        .then(cfg => { setMargemPadrao(cfg.margemPadrao ?? 0); if (!itemIdParam) setMargem((cfg.margemPadrao ?? 0).toString()) })
        .catch(() => {})
    )

    if (produtoIdParam) {
      tarefas.push(
        produtoService.buscarPorId(produtoIdParam)
          .then(p => setComponentes([{ id: p.id, nome: p.nome, marca: '', un: 'un', custo: p.precoCusto, tipo: p.tipo === 'CUSTOMIZACAO' ? 'customizacao' : 'produto', fracionavel: p.fracionavel ?? true, qtd: 1 }]))
          .catch(() => setErro('Não foi possível carregar o produto informado.'))
      )
    }

    if (itemIdParam && catalogoIdParam) {
      tarefas.push(
        itemCatalogoService.listar(catalogoIdParam)
          .then(async itens => {
            const item = itens.find(i => i.id === itemIdParam)
            if (!item) { setErro('Item não encontrado neste catálogo.'); return }

            setNome(item.nome)
            setItemId(item.id)
            setTempoProducao(item.tempoProducao.toString())
            setMargem((item.margemLucro ?? 0).toString())
            setModoMargem('personalizar')
            setPrecoSugerido(item.precoSugerido)
            setPrecoEditadoManualmente(item.override)
            setPrecoVenda(item.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

            // ItemCatalogoComponenteResponse não expõe `fracionável` do componente (achado desta
            // tarefa, registrado em decisoes-catalogo.md) — busca detalhe por componente só para
            // restringir corretamente o QtyInput na edição (mesmo custo/quantidade já vêm prontos).
            const linhas = await Promise.all(item.componentes.map(async (c): Promise<ComponenteLinha> => {
              if (c.insumoId) {
                const detalhe = await insumoService.buscarPorId(c.insumoId).catch(() => null)
                return { id: c.insumoId, nome: c.nomeInsumo ?? '', marca: '', un: detalhe?.unidadeMedida || 'un', custo: c.custoUnitario, tipo: 'insumo', fracionavel: detalhe?.fracionavel ?? true, qtd: c.quantidade }
              }
              const detalhe = await produtoService.buscarPorId(c.produtoBaseId!).catch(() => null)
              return {
                id: c.produtoBaseId!, nome: c.nomeProdutoBase ?? '', marca: '', un: 'un', custo: c.custoUnitario,
                tipo: c.tipoProdutoBase === 'CUSTOMIZACAO' ? 'customizacao' : 'produto',
                fracionavel: detalhe?.fracionavel ?? true, qtd: c.quantidade,
              }
            }))
            setComponentes(linhas)
          })
          .catch(() => setErro('Não foi possível carregar o item do catálogo.'))
      )
    }

    Promise.all(tarefas).finally(() => setLoadingContexto(false))
  }, [catalogoIdParam, produtoIdParam, itemIdParam])

  useEffect(() => {
    if (componentes.length > 0) setComponentesErro(null)
  }, [componentes])

  const buildComponentesRequest = useCallback((): ItemCatalogoComponenteRequest[] =>
    componentes.map(c => ({
      insumoId: c.tipo === 'insumo' ? c.id : undefined,
      produtoBaseId: c.tipo === 'produto' || c.tipo === 'customizacao' ? c.id : undefined,
      quantidade: c.qtd,
    })), [componentes])

  const buildRequest = useCallback((): ItemCatalogoRequest | null => {
    if (!nome.trim() || componentes.length === 0) return null
    return {
      nome: nome.trim(),
      componentes: buildComponentesRequest(),
      tempoProducao: Math.round(num(tempoProducao)) || 0,
      margemLucro: num(margem),
      precoVenda: precoEditadoManualmente && precoVenda ? num(precoVenda) : undefined,
    }
  }, [nome, componentes, tempoProducao, margem, precoVenda, precoEditadoManualmente, buildComponentesRequest])

  // Só simula (POST /itens/preview-preco), nunca cria/edita o ItemCatalogo real — mesmo padrão
  // já usado por esta tela antes da reforma (RN-NOVA-8).
  const atualizarPreview = useCallback(async () => {
    if (!catalogoId || componentes.length === 0) return

    const request: PreviewPrecoRequest = {
      componentes: buildComponentesRequest(),
      tempoProducao: Math.round(num(tempoProducao)) || 0,
      margemLucro: num(margem),
    }

    setCalculandoPreview(true)
    try {
      const resp = await itemCatalogoService.previewPreco(catalogoId, request)
      setPrecoSugerido(resp.precoSugerido)
      setPreviewDetalhe(resp)
      if (!precoEditadoManualmente) {
        setPrecoVenda(resp.precoSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      }
      setErro(null)
    } catch (err: any) {
      setErro(extractApiError(err, 'Não foi possível calcular o preço sugerido. Tente novamente.'))
    } finally {
      setCalculandoPreview(false)
    }
  }, [catalogoId, componentes, tempoProducao, margem, precoEditadoManualmente, buildComponentesRequest])

  useEffect(() => {
    if (loadingContexto) return
    const t = setTimeout(() => { atualizarPreview() }, 500)
    return () => clearTimeout(t)
  }, [loadingContexto, atualizarPreview])

  const addComponente = (c: Omit<ComponenteLinha, 'qtd'>) => setComponentes(cs => [...cs, { ...c, qtd: 1 }])
  const removeComponente = (id: string) => setComponentes(cs => cs.filter(c => c.id !== id))
  const setComponenteQtd = (id: string, v: string) => setComponentes(cs => cs.map(c => c.id === id ? { ...c, qtd: num(v) } : c))

  const cancelar = () => {
    navigate(catalogoId ? `/catalogos/${catalogoId}` : '/catalogos')
  }

  const salvar = async () => {
    setErro(null)
    setNomeErro(null)
    setComponentesErro(null)
    if (!catalogoId) { setErro('Selecione um catálogo.'); return }
    if (!nome.trim()) { setNomeErro('Informe o nome do item.'); return }
    if (componentes.length === 0) { setComponentesErro('Adicione ao menos um componente.'); return }
    const request = buildRequest()
    if (!request) return

    setSalvando(true)
    try {
      if (itemId) {
        await itemCatalogoService.editar(catalogoId, itemId, request)
      } else {
        await itemCatalogoService.adicionar(catalogoId, request)
      }
      navigate(`/catalogos/${catalogoId}`)
    } catch (err: any) {
      const msg = extractApiError(err, 'Erro ao salvar item do catálogo.')
      if (/custo calculado/i.test(msg)) {
        setToast(msg)
      }
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  if (loadingContexto) {
    return (
      <AppLayout active="catalogos" compact>
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-teal" />
          Carregando…
        </div>
      </AppLayout>
    )
  }

  const podeSalvar = !!nome.trim() && componentes.length > 0 && !!catalogoId
  const overrideAtivo = precoEditadoManualmente && precoSugerido != null && Math.abs(num(precoVenda) - precoSugerido) > 0.001
  const diffOverride = overrideAtivo && precoSugerido != null ? num(precoVenda) - precoSugerido : null

  return (
    <AppLayout active="catalogos" compact>

      {/* BREADCRUMB */}
      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span
          className="cursor-pointer font-medium transition-colors duration-150 hover:text-teal"
          onClick={() => navigate(catalogoId ? `/catalogos/${catalogoId}` : '/catalogos')}
        >{catalogoInfo ? catalogoInfo.nome : 'Catálogos'}</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="font-semibold text-body">{isEdicao ? 'Editar Item' : 'Novo Item'}</span>
      </div>

      {/* HEADER */}
      <div className="mb-[22px] flex items-center gap-[15px]">
        <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
          <Files size={26} />
        </span>
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-dark">
          {isEdicao ? 'Editar Item de Catálogo' : 'Novo Item de Catálogo'}
        </h1>
      </div>

      <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-[1040px]:grid-cols-1">

        {/* COLUNA ESQUERDA — formulário */}
        <div className="flex flex-col gap-[18px]">

          {/* Catálogo */}
          <div className="rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {catalogoInfo ? (
              <div className="flex items-center gap-2.5">
                <Files size={18} className="text-teal" />
                <span className="text-sm text-body">
                  Adicionando item ao catálogo <strong className="font-bold text-dark">{catalogoInfo.nome}</strong>
                </span>
              </div>
            ) : catalogos.length === 0 ? (
              <div className="text-sm text-body">
                Você ainda não tem nenhum catálogo.{' '}
                <span className="cursor-pointer font-semibold text-teal" onClick={() => navigate('/catalogos/novo')}>Criar catálogo</span>
              </div>
            ) : (
              <Field label="Catálogo" required size="md">
                <select
                  value={catalogoId ?? ''}
                  onChange={e => {
                    const c = catalogos.find(c => c.id === e.target.value) ?? null
                    setCatalogoId(c?.id ?? null)
                    setCatalogoInfo(null)
                  }}
                  className={clsx(inputClass(), 'cursor-pointer')}
                >
                  <option value="" disabled>Selecione um catálogo</option>
                  {catalogos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Nome do item */}
          <div className="rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <Field label="Nome do item" required size="md">
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Kit Presente Dia das Mães"
                className={inputClass(!!nomeErro)}
              />
              {nomeErro && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{nomeErro}</span>}
            </Field>
          </div>

          {/* Tempo de produção */}
          <div className="rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <Field label="Tempo de produção" required size="md">
              <div className="relative max-w-[200px]">
                <input
                  value={tempoProducao}
                  onChange={e => setTempoProducao(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="15"
                  className={clsx(inputClass(), 'pr-16')}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">minutos</span>
              </div>
              <span className="mt-1.5 block text-xs text-muted">Tempo para produzir este item, além dos componentes.</span>
            </Field>
          </div>

          {/* Componentes — composição livre de N insumos/produtos/customizações (RN-NOVA-1) */}
          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="px-[22px] pb-4 pt-5">
              <div className="mb-3.5 flex items-center gap-[9px]">
                <Layers size={18} className="text-teal" />
                <h3 className="m-0 whitespace-nowrap text-[15.5px] font-bold text-dark">Componentes do item</h3>
                <span className="text-xs font-medium text-muted">obrigatório, ao menos 1</span>
              </div>
              <ComponenteSearch onAdd={addComponente} jaAdicionados={componentes.map(c => c.id)} />
              {componentesErro && <span className="mt-2 block text-[12.5px] text-danger-deep">{componentesErro}</span>}
            </div>
            <div className="grid grid-cols-[1fr_132px_96px_44px] gap-3 border-t border-line bg-cream px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
              <span>Componente</span><span>Quantidade</span><span className="text-right">Custo</span><span></span>
            </div>
            {componentes.length === 0 ? (
              <div className="border-t border-line px-[22px] py-[34px] text-center text-[13.5px] text-muted">
                Nenhum componente ainda. Use a busca acima para adicionar.
              </div>
            ) : componentes.map((row) => (
              <div key={row.id} className="grid animate-row-in grid-cols-[1fr_132px_96px_44px] items-center gap-3 border-t border-line px-[22px] py-[13px]">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-[7px]">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{row.nome}</span>
                    <TipoBadge tipo={row.tipo} />
                    <FracionavelBadge fracionavel={row.fracionavel} variant="busca" />
                  </div>
                  <div className="text-xs text-muted">{moeda(row.custo)}/{row.un}</div>
                </div>
                <QtyInput value={row.qtd} un={row.un} fracionavel={row.fracionavel} onChange={v => setComponenteQtd(row.id, v)} />
                <div className="text-right text-sm font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(row.qtd * row.custo)}</div>
                <button
                  onClick={() => removeComponente(row.id)}
                  aria-label="Remover componente"
                  className="grid h-[34px] w-[34px] place-items-center justify-self-end rounded-[9px] border-none bg-transparent text-[#BDB9B1] hover:bg-danger-bg hover:text-danger-deep"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* AÇÕES */}
          {erro && (
            <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
              {erro}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-[11px]">
            <Button variant="ghost" onClick={cancelar} disabled={salvando}>Cancelar</Button>
            <Button variant="primary" onClick={salvar} disabled={salvando || !podeSalvar}>
              {salvando
                ? <span className="flex items-center gap-2"><span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{isEdicao ? 'Salvando…' : 'Adicionando…'}</span>
                : (isEdicao ? 'Salvar alterações' : 'Adicionar item ao catálogo')
              }
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA — preço */}
        <div className="sticky top-6 max-[1040px]:static">
          <CalculadoraPreco
            titulo="Preço do item"
            calculando={calculandoPreview}
            sugerido={precoSugerido}
            precoFinalLabel="Preço de venda"
            precoFinal={precoVenda}
            onPrecoFinalChange={v => { setPrecoVenda(v); setPrecoEditadoManualmente(true) }}
            overrideAtivo={overrideAtivo}
            diffOverride={diffOverride}
            disabledInput={componentes.length === 0}
          >
            {previewDetalhe && (
              <>
                <LinhaCalculadora label="Custo dos componentes" value={moeda(previewDetalhe.custoComponentes)} />
                <LinhaCalculadora label="Mão de obra" value={moeda(previewDetalhe.custoMaoDeObra)} sub={`${num(tempoProducao)} min`} />
                <div className="my-1 h-px bg-line" />
                <div className="flex items-baseline justify-between gap-2.5 py-2.5">
                  <span className="whitespace-nowrap text-[13.5px] font-semibold text-dark">Custo total</span>
                  <span className="text-[15px] font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(previewDetalhe.custoTotal)}</span>
                </div>
              </>
            )}

            <div className="mt-2 rounded-xl border border-line bg-cream p-3.5">
              <div className={clsx('flex gap-[3px] rounded-[9px] bg-line-soft p-[3px]', modoMargem === 'personalizar' ? 'mb-3' : 'mb-0')}>
                {([['padrao', `Margem padrão (${margemPadrao ?? 0}%)`], ['personalizar', 'Personalizar']] as [typeof modoMargem, string][]).map(([v, l]) => {
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
                  <div className="relative w-[92px]">
                    <input
                      value={margem}
                      onChange={e => setMargem(e.target.value.replace(/[^\d]/g, ''))}
                      inputMode="numeric"
                      className="h-10 w-full rounded-[9px] border-[1.5px] border-line bg-white pl-3 pr-[30px] text-right font-[inherit] text-[15px] font-semibold text-dark outline-none transition-[border-color,box-shadow] duration-150 [font-variant-numeric:tabular-nums] focus:border-teal focus:ring-[3px] focus:ring-teal/[0.12]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-dim">%</span>
                  </div>
                </div>
              )}
            </div>
          </CalculadoraPreco>
        </div>

      </div>

      <Toast message={toast} />

    </AppLayout>
  )
}
