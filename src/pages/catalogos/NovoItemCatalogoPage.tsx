import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { Search, ChevronRight, Files, X, Box, SlidersHorizontal, Trash2, Calculator, Info } from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import type { CatalogoResponse } from '../../types/catalogo'
import type { ItemCatalogoRequest, PreviewPrecoRequest } from '../../types/itemCatalogo'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'

const num = (s: string) =>
  parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SEM_EXCLUSOES: string[] = []

interface ProdutoSelecionado {
  id: string
  nome: string
  precoCusto: number
  ativo: boolean
}

interface CustomizacaoItem {
  produtoId: string
  nome: string
  precoCusto: number
  quantidade: string
}

const inputClass = (hasError?: boolean) => clsx(
  'h-[46px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150',
  hasError ? 'border-warning-alt shadow-[0_0_0_4px_rgba(224,92,58,0.10)]' : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
)

// ---------- ProdutoSearch (busca de produtos tipo PRODUTO ou CUSTOMIZACAO) ----------

function ProdutoSearch({ tipo, placeholder, jaAdicionados, onSelect }: {
  tipo: 'PRODUTO' | 'CUSTOMIZACAO'; placeholder: string; jaAdicionados: string[]
  onSelect: (p: { id: string; nome: string; precoCusto: number; ativo: boolean }) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [resultados, setResultados] = useState<{ id: string; nome: string; precoCusto: number; ativo: boolean }[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) { setResultados([]); return }
    const qLower = q.trim().toLowerCase()
    const timer = setTimeout(async () => {
      try {
        const data = await produtoService.listar(0, 20, tipo, q)
        setResultados(
          data.content
            .filter(p => p.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(p.id))
            .map(p => ({ id: p.id, nome: p.nome, precoCusto: p.precoCusto ?? 0, ativo: p.ativo }))
        )
      } catch {
        // silent
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [q, tipo, jaAdicionados])

  return (
    <div ref={ref} className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted group-focus-within:text-teal">
        <Search size={16} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={clsx(inputClass(), 'pl-10')}
      />
      {open && resultados.length > 0 && (
        <div className="absolute inset-x-0 top-[50px] z-30 max-h-[280px] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.2)]">
          {resultados.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setQ(''); setOpen(false); setResultados([]) }}
              className="flex w-full items-center justify-between gap-[11px] rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{p.nome}</span>
              <span className="flex-shrink-0 text-xs text-muted">{moeda(p.precoCusto)} custo</span>
            </button>
          ))}
        </div>
      )}
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

  const [produto, setProduto] = useState<ProdutoSelecionado | null>(null)
  const [customizacoes, setCustomizacoes] = useState<CustomizacaoItem[]>([])
  const [quantidade, setQuantidade] = useState('1')
  const [quantidadeErro, setQuantidadeErro] = useState<string | null>(null)

  const [precoVenda, setPrecoVenda] = useState('')
  const [precoSugerido, setPrecoSugerido] = useState<number | null>(null)
  // true só quando o preço exibido reflete um ajuste manual real (edição do usuário
  // ou item carregado já com override) — evita sobrescrever o preço "por inércia" a cada
  // preview e também é a única fonte de verdade de "override" agora que o preview não
  // persiste nada e não devolve esse flag (ele é sempre derivado, ver `overrideAtivo` abaixo).
  const [precoEditadoManualmente, setPrecoEditadoManualmente] = useState(false)
  const [itemId, setItemId] = useState<string | null>(null)

  const [produtoErro, setProdutoErro] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [calculandoPreview, setCalculandoPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { toast, setToast } = useToast()

  const produtoBloqueadoRef = useRef<string | null>(null)

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

    if (produtoIdParam) {
      tarefas.push(
        produtoService.buscarPorId(produtoIdParam)
          .then(p => setProduto({ id: p.id, nome: p.nome, precoCusto: p.precoCusto, ativo: p.ativo }))
          .catch(() => setErro('Não foi possível carregar o produto informado.'))
      )
    }

    if (itemIdParam && catalogoIdParam) {
      tarefas.push(
        itemCatalogoService.listar(catalogoIdParam)
          .then(async itens => {
            const item = itens.find(i => i.id === itemIdParam)
            if (!item) { setErro('Item não encontrado neste catálogo.'); return }

            const produtoDet = await produtoService.buscarPorId(item.produtoId)
            setProduto({ id: produtoDet.id, nome: produtoDet.nome, precoCusto: produtoDet.precoCusto, ativo: produtoDet.ativo })
            setQuantidade(item.quantidadePacote.toString())
            setItemId(item.id)
            setPrecoSugerido(item.precoSugerido)
            setPrecoEditadoManualmente(item.override)
            setPrecoVenda(item.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

            if (item.customizacoesAnexadas.length > 0) {
              const custs = await Promise.all(item.customizacoesAnexadas.map(async c => {
                const p = await produtoService.buscarPorId(c.produtoId)
                return { produtoId: c.produtoId, nome: c.produtoNome, precoCusto: p.precoCusto, quantidade: c.quantidade.toString() }
              }))
              setCustomizacoes(custs)
            }
          })
          .catch(() => setErro('Não foi possível carregar o item do catálogo.'))
      )
    }

    Promise.all(tarefas).finally(() => setLoadingContexto(false))
  }, [catalogoIdParam, produtoIdParam, itemIdParam])

  useEffect(() => {
    const qtd = parseInt(quantidade, 10)
    if (quantidade.trim() !== '' && (!Number.isFinite(qtd) || qtd < 1)) {
      setQuantidadeErro('A quantidade do pacote deve ser um número inteiro maior ou igual a 1.')
    } else {
      setQuantidadeErro(null)
    }
  }, [quantidade])

  const buildRequest = useCallback((): ItemCatalogoRequest | null => {
    if (!produto) return null
    const qtd = parseInt(quantidade, 10)
    if (!Number.isFinite(qtd) || qtd < 1) return null
    return {
      produtoId: produto.id,
      quantidadePacote: qtd,
      precoVenda: precoEditadoManualmente && precoVenda ? num(precoVenda) : undefined,
      customizacoesAnexadas: customizacoes.map(c => ({ produtoId: c.produtoId, quantidade: num(c.quantidade) || 0 })),
    }
  }, [produto, quantidade, precoVenda, precoEditadoManualmente, customizacoes])

  // RN-NOVA-8 — só simula (POST /itens/preview-preco), nunca cria/edita o ItemCatalogo real.
  // Único ponto que persiste é `salvar()`, mais abaixo.
  const atualizarPreview = useCallback(async () => {
    if (!catalogoId || !produto) return
    const qtd = parseInt(quantidade, 10)
    if (!Number.isFinite(qtd) || qtd < 1) return

    const request: PreviewPrecoRequest = {
      produtoId: produto.id,
      quantidadePacote: qtd,
      customizacoesAnexadas: customizacoes.map(c => ({ produtoId: c.produtoId, quantidade: num(c.quantidade) || 0 })),
    }
    if (produtoBloqueadoRef.current === request.produtoId) return

    setCalculandoPreview(true)
    try {
      const resp = await itemCatalogoService.previewPreco(catalogoId, request)
      setPrecoSugerido(resp.precoSugerido)
      // Sem override ativo, o preço de venda acompanha o sugerido ao vivo; com override,
      // o valor digitado pela usuária é preservado (preview não devolve precoVenda/override).
      if (!precoEditadoManualmente) {
        setPrecoVenda(resp.precoSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      }
      setProdutoErro(null)
      setErro(null)
    } catch (err: any) {
      const msg = extractApiError(err, 'Não foi possível calcular o preço sugerido. Tente novamente.')
      if (/custo calculado/i.test(msg)) {
        produtoBloqueadoRef.current = request.produtoId
        setProdutoErro(msg)
        setToast(msg)
      } else {
        setErro(msg)
      }
    } finally {
      setCalculandoPreview(false)
    }
  }, [catalogoId, produto, quantidade, customizacoes, precoEditadoManualmente, setToast])

  useEffect(() => {
    if (loadingContexto) return
    const t = setTimeout(() => { atualizarPreview() }, 500)
    return () => clearTimeout(t)
  }, [loadingContexto, atualizarPreview])

  const jaAdicionadosCustom = customizacoes.map(c => c.produtoId)

  const addCustomizacao = (p: { id: string; nome: string; precoCusto: number }) => {
    setCustomizacoes(cs => [...cs, { produtoId: p.id, nome: p.nome, precoCusto: p.precoCusto, quantidade: '1' }])
  }
  const removeCustomizacao = (produtoId: string) => {
    setCustomizacoes(cs => cs.filter(c => c.produtoId !== produtoId))
  }
  const setCustomizacaoQtd = (produtoId: string, v: string) => {
    setCustomizacoes(cs => cs.map(c => c.produtoId === produtoId ? { ...c, quantidade: v.replace(/[^\d,]/g, '') } : c))
  }

  // RN-NOVA-8 — preview nunca persiste nada, então não há mais o que desfazer aqui.
  const cancelar = () => {
    navigate(catalogoId ? `/catalogos/${catalogoId}` : '/catalogos')
  }

  const salvar = async () => {
    setErro(null)
    if (!catalogoId) { setErro('Selecione um catálogo.'); return }
    if (!produto) { setErro('Selecione um produto.'); return }
    const request = buildRequest()
    if (!request) {
      setQuantidadeErro('A quantidade do pacote deve ser um número inteiro maior ou igual a 1.')
      return
    }

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
        produtoBloqueadoRef.current = request.produtoId
        setProdutoErro(msg)
      } else {
        setErro(msg)
      }
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

  const podeSalvar = !!produto && !!catalogoId && !quantidadeErro && !produtoErro
  // Derivado localmente — o preview não devolve um flag de override (ver `atualizarPreview`).
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
                    <option key={c.id} value={c.id}>{c.nome} ({c.margem}% de margem)</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Produto */}
          <div className="rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <Field label="Produto" required size="md">
              {produto ? (
                <div className="flex items-center justify-between gap-2.5 rounded-input border-[1.5px] border-line bg-cream px-3.5 py-[11px]">
                  <div className="min-w-0">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{produto.nome}</div>
                    <div className="text-xs text-muted">{moeda(produto.precoCusto)} de custo</div>
                  </div>
                  <button
                    onClick={() => { setProduto(null); produtoBloqueadoRef.current = null; setProdutoErro(null) }}
                    aria-label="Trocar produto"
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border-none bg-transparent text-[#BDB9B1]"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <ProdutoSearch tipo="PRODUTO" placeholder="Buscar produto..." jaAdicionados={SEM_EXCLUSOES} onSelect={p => { setProduto(p); produtoBloqueadoRef.current = null; setProdutoErro(null) }} />
              )}
              {produtoErro && <span className="mt-2 block text-[12.5px] text-danger-deep">{produtoErro}</span>}
            </Field>
          </div>

          {/* Quantidade do pacote */}
          <div className="rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <Field label="Quantidade do pacote" required hint="Quantas unidades do produto compõem este item do catálogo." size="md">
              <div className="relative max-w-[160px]">
                <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                  <Box size={16} />
                </span>
                <input
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="1"
                  className={clsx(inputClass(!!quantidadeErro), 'pl-10')}
                />
              </div>
              {quantidadeErro && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{quantidadeErro}</span>}
            </Field>
          </div>

          {/* Customizações anexadas */}
          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="px-6 pb-4 pt-5">
              <div className="mb-1 flex items-center gap-[9px]">
                <SlidersHorizontal size={16} className="text-orange" />
                <h3 className="m-0 text-[15.5px] font-bold text-dark">Customizações anexadas</h3>
                <span className="text-xs font-medium text-muted">(opcional)</span>
              </div>
              <p className="mb-3.5 mt-0 text-[12.5px] text-muted">Extras opcionais que somam ao custo e ao preço sugerido deste item.</p>
              <ProdutoSearch tipo="CUSTOMIZACAO" placeholder="Buscar customização..." jaAdicionados={jaAdicionadosCustom} onSelect={addCustomizacao} />
            </div>
            {customizacoes.length > 0 && (
              <div>
                <div className="grid grid-cols-[1fr_110px_40px] gap-3 border-t border-line bg-cream px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                  <span>Customização</span><span>Quantidade</span><span />
                </div>
                {customizacoes.map(c => (
                  <div key={c.produtoId} className="grid grid-cols-[1fr_110px_40px] items-center gap-3 border-t border-line px-6 py-3">
                    <div className="min-w-0">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{c.nome}</div>
                      <div className="text-xs text-muted">{moeda(c.precoCusto)}/un</div>
                    </div>
                    <input
                      value={c.quantidade}
                      onChange={e => setCustomizacaoQtd(c.produtoId, e.target.value)}
                      inputMode="decimal"
                      className={clsx(inputClass(), 'h-[38px] text-[13.5px]')}
                    />
                    <button
                      onClick={() => removeCustomizacao(c.produtoId)}
                      aria-label="Remover customização"
                      className="grid h-8 w-8 place-items-center justify-self-end rounded-lg border-none bg-transparent text-[#BDB9B1] transition-colors duration-100 hover:bg-danger-bg hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <div className="overflow-hidden rounded-card border-[1.5px] border-teal/30 bg-white shadow-[0_8px_26px_-12px_rgba(42,157,143,0.4)]">
            <div className="flex items-center gap-[11px] border-b border-teal/[0.18] bg-[linear-gradient(135deg,rgba(42,157,143,0.12),rgba(42,157,143,0.04))] px-5 py-4">
              <span className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-white text-teal shadow-[0_3px_10px_-3px_rgba(42,157,143,0.4)]">
                <Calculator size={20} />
              </span>
              <div className="min-w-0">
                <div className="whitespace-nowrap text-[15px] font-bold tracking-[-0.01em] text-[#1F7A6F]">Preço do item</div>
                <div className="mt-px flex items-center gap-1 text-[11.5px] text-teal">
                  {calculandoPreview ? 'Calculando…' : 'Calculado pela API'}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2.5">
              <div className="rounded-2xl border-[1.5px] border-teal/[0.28] bg-[linear-gradient(135deg,rgba(42,157,143,0.14),rgba(42,157,143,0.05))] px-[18px] py-4">
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#1F7A6F]">Preço sugerido</div>
                <div className="mt-0.5 text-[28px] font-bold tracking-[-0.02em] text-teal [font-variant-numeric:tabular-nums]">
                  {precoSugerido != null ? moeda(precoSugerido) : '—'}
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-[7px] block text-[13px] font-semibold text-body">Preço de venda</span>
                <div className="relative">
                  <span className={clsx(
                    'pointer-events-none absolute inset-y-0 left-0 grid w-[46px] place-items-center rounded-l-input border-r text-[15px] font-bold',
                    overrideAtivo ? 'border-orange/30 bg-orange/[0.08] text-orange' : 'border-line bg-cream text-dim'
                  )}>R$</span>
                  <input
                    value={precoVenda}
                    onChange={e => {
                      setPrecoVenda(e.target.value.replace(/[^\d.,]/g, ''))
                      setPrecoEditadoManualmente(true)
                    }}
                    inputMode="decimal"
                    disabled={!produto}
                    className={clsx(
                      'h-[50px] w-full rounded-input border-[1.5px] pl-[58px] pr-3.5 font-[inherit] text-[19px] font-bold outline-none [font-variant-numeric:tabular-nums]',
                      overrideAtivo ? 'border-orange text-orange' : 'border-line text-dark',
                      produto ? 'bg-white' : 'bg-cream'
                    )}
                  />
                </div>
              </div>

              {diffOverride != null && (
                <div className="mt-3 flex gap-2 rounded-[11px] border border-[#F6E4CE] bg-[#FFF8F0] px-[13px] py-[11px]">
                  <Info size={15} className="mt-px flex-shrink-0 text-warning" />
                  <p className="m-0 text-[12.3px] leading-[1.5] text-[#7A5A33]">
                    Você ajustou o preço manualmente (<strong className="font-bold">{diffOverride > 0 ? '+' : '−'}{moeda(Math.abs(diffOverride))}</strong> {diffOverride > 0 ? 'acima' : 'abaixo'} do sugerido).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

    </AppLayout>
  )
}
