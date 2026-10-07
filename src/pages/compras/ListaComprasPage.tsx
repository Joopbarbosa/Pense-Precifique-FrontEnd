import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { History, ListChecks, PackagePlus, Plus, Save, ShoppingCart, Trash2 } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { FornecedorSelect } from '../../components/compra/Pickers'
import ModalAdicionarInsumos from '../../components/compra/ModalAdicionarInsumos'
import { formatarData, moeda, paraCampo, parseDecimal, qtd } from '../../components/compra/formato'
import { listaCompraService } from '../../services/compraService'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useModalErro } from '../../hooks/useModalErro'
import SortableHeader from '../../components/shared/SortableHeader'
import { StatusListaBadge } from '../../components/compra/StatusCompraBadge'
import { extractApiError } from '../../utils/apiError'
import type { CadastroRef, LinhaPreviaListaCompra, ListaCompraResponse } from '../../types/compra'

// V0.15.0 — Lista de compras (#546, RN-NOVA-12/13). A prévia (quantidade e fornecedor sugeridos)
// vem calculada do backend; a artesã ajusta e gera o retrato LST-N.
// #595/#596 (RN-NOVA-41) — abas "Listas geradas | Nova lista" (abre em Listas geradas), coluna Status e
// ordenação; "Salvar rascunho" guarda a lista sem gerar (LST-N, status Rascunho) e ela volta a ser
// editada aqui (?aba=nova&rascunho=<id>) até "Gerar lista".

type Aba = 'nova' | 'historico'

// `*Editado`: só o que a artesã mexeu sobrevive a um recálculo da prévia; o resto segue a sugestão nova.
type LinhaEditavel = LinhaPreviaListaCompra & {
  quantidadeTxt: string; fornecedorId: string | null; manual: boolean
  quantidadeEditada: boolean; fornecedorEditado: boolean
}

const inputBase = 'h-10 w-full rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus'

function Checkbox({ label, descricao, marcado, onChange }: { label: string; descricao: string; marcado: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-2.5 rounded-input border-[1.5px] px-3.5 py-3 transition-colors', marcado ? 'border-teal bg-teal/[0.06]' : 'border-line bg-white hover:bg-cream')}>
      <input type="checkbox" checked={marcado} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal" />
      <span>
        <span className="block text-[14px] font-semibold text-dark">{label}</span>
        <span className="block text-xs text-muted">{descricao}</span>
      </span>
    </label>
  )
}

function NovaLista({ rascunho }: { rascunho: ListaCompraResponse | null }) {
  const navigate = useNavigate()
  // Rascunho reaberto: os insumos dele entram como "à mão" e a quantidade/fornecedor salvos valem como editados.
  const [abaixoMinimo, setAbaixoMinimo] = useState(!rascunho)
  const [estoqueNegativo, setEstoqueNegativo] = useState(!rascunho)
  const [fornecedor, setFornecedor] = useState<CadastroRef | null>(null)
  const [manuais, setManuais] = useState<string[]>(() => rascunho?.itens.map(i => i.insumoId) ?? [])
  const [removidos, setRemovidos] = useState<string[]>([])
  const [linhas, setLinhas] = useState<LinhaEditavel[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erroPrevia, setErroPrevia] = useState<string | null>(null)
  const [gerando, setGerando] = useState<'rascunho' | 'gerar' | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const { modalErro, mostrarErro } = useModalErro()
  const linhasRef = useRef<LinhaEditavel[]>([])
  linhasRef.current = linhas
  const salvosDoRascunho = useRef(new Map((rascunho?.itens ?? []).map(i => [i.insumoId, i])))
  const seq = useRef(0)

  // Recalcula a prévia a cada mudança de filtro, preservando o que a artesã já ajustou na linha.
  const atualizarPrevia = useCallback(() => {
    const minhaSeq = ++seq.current
    setCarregando(true); setErroPrevia(null)
    listaCompraService.previa({ abaixoMinimo, estoqueNegativo, fornecedorId: fornecedor?.id, insumoIds: manuais })
      .then(r => {
        if (minhaSeq !== seq.current) return
        const anteriores = new Map(linhasRef.current.map(l => [l.insumo.id, l]))
        setLinhas(r.linhas.filter(l => !removidos.includes(l.insumo.id)).map(l => {
          const salvo = salvosDoRascunho.current.get(l.insumo.id)
          const ant = anteriores.get(l.insumo.id) ?? (salvo && {
            ...l, quantidadeTxt: paraCampo(salvo.quantidade), fornecedorId: salvo.fornecedorId, manual: true,
            quantidadeEditada: true, fornecedorEditado: true,
          })
          return {
            ...l,
            quantidadeTxt: ant?.quantidadeEditada ? ant.quantidadeTxt : paraCampo(l.quantidadeSugerida),
            fornecedorId: ant?.fornecedorEditado ? ant.fornecedorId : (l.fornecedorSugerido?.id ?? null),
            quantidadeEditada: !!ant?.quantidadeEditada,
            fornecedorEditado: !!ant?.fornecedorEditado,
            manual: manuais.includes(l.insumo.id),
          }
        }))
      })
      .catch(err => { if (minhaSeq === seq.current) setErroPrevia(extractApiError(err, 'Não foi possível montar a sugestão.')) })
      .finally(() => { if (minhaSeq === seq.current) setCarregando(false) })
  }, [abaixoMinimo, estoqueNegativo, fornecedor, manuais, removidos])

  useEffect(() => { atualizarPrevia() }, [atualizarPrevia])

  const alterar = (insumoId: string, patch: Partial<LinhaEditavel>) => setLinhas(prev => prev.map(l => l.insumo.id === insumoId ? { ...l, ...patch } : l))
  const remover = (insumoId: string) => {
    setManuais(prev => prev.filter(id => id !== insumoId))
    setRemovidos(prev => [...prev, insumoId])
  }
  const adicionarManuais = (ids: string[]) => {
    setRemovidos(prev => prev.filter(x => !ids.includes(x)))
    setManuais(prev => [...prev, ...ids.filter(id => !prev.includes(id))])
  }

  const corpo = () => ({ itens: linhas.map(l => ({ insumoId: l.insumo.id, quantidade: parseDecimal(l.quantidadeTxt), fornecedorId: l.fornecedorId })) })

  const gerar = async () => {
    setGerando('gerar')
    try {
      let lista: ListaCompraResponse
      if (rascunho) {
        await listaCompraService.atualizarRascunho(rascunho.id, corpo())
        lista = await listaCompraService.gerarRascunho(rascunho.id)
      } else {
        lista = await listaCompraService.gerar(corpo())
      }
      navigate(`/compras/lista/${lista.id}`, { state: { toast: `Lista ${lista.identificador} gerada.` } })
    } catch (err) {
      mostrarErro(err, 'Não foi possível gerar a lista.')
    } finally {
      setGerando(null)
    }
  }

  const salvarRascunho = async () => {
    setGerando('rascunho')
    try {
      const lista = rascunho ? await listaCompraService.atualizarRascunho(rascunho.id, corpo()) : await listaCompraService.salvarRascunho(corpo())
      navigate(`/compras/lista/${lista.id}`, { state: { toast: `Rascunho ${lista.identificador} salvo. Abra de novo para continuar e gerar a lista.` } })
    } catch (err) {
      mostrarErro(err, 'Não foi possível salvar o rascunho.')
    } finally {
      setGerando(null)
    }
  }

  const precoDoFornecedor = (l: LinhaEditavel) => l.fornecedores.find(f => f.fornecedor.id === l.fornecedorId)?.precoReferencia ?? null

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-[#F0EEE9] bg-white px-[22px] py-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="mb-3 text-[14px] font-bold text-dark">O que entra na lista</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Checkbox label="Estoque abaixo do mínimo" descricao="Insumos sem mínimo não entram" marcado={abaixoMinimo} onChange={setAbaixoMinimo} />
          <Checkbox label="Estoque negativo" descricao="Insumos com saldo abaixo de zero" marcado={estoqueNegativo} onChange={setEstoqueNegativo} />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">De um fornecedor</span>
            <FornecedorSelect size="sm" value={fornecedor} onChange={setFornecedor} placeholder="Qualquer fornecedor" />
          </div>
          {/* #570 — botão verde abre a escolha de vários insumos (substitui o campo "Escolher à mão"). */}
          <div className="flex flex-col">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Escolher à mão</span>
            <Button variant="secondary" size="sm" icon={<PackagePlus size={16} />} onClick={() => setEscolhendo(true)}>Adicionar insumos</Button>
          </div>
        </div>
        <p className="mb-0 mt-3 text-[12.5px] text-muted">
          Os dois filtros de estoque somam. Escolhendo um fornecedor, entram só os insumos vinculados a ele. Os insumos escolhidos à mão entram sempre.
        </p>
      </div>
      {escolhendo && (
        <ModalAdicionarInsumos jaNaLista={linhas.map(l => l.insumo.id)} onClose={() => setEscolhendo(false)}
          onAdicionar={ids => { adicionarManuais(ids); setEscolhendo(false) }} />
      )}

      <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="text-[13px] font-bold text-dark">Sugestão ({linhas.length} {linhas.length === 1 ? 'insumo' : 'insumos'})</span>
          {carregando && <span className="flex items-center gap-2 text-[12.5px] text-muted"><Spinner size={14} color="#2A9D8F" trackColor="#EFEDE8" /> Atualizando…</span>}
        </div>
        {erroPrevia ? (
          <div className="flex items-center justify-center gap-3 px-5 py-8 text-sm text-danger">{erroPrevia} <Button variant="ghost" size="sm" onClick={atualizarPrevia}>Tentar de novo</Button></div>
        ) : linhas.length === 0 && !carregando ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Nenhum insumo com estes filtros. Marque outro filtro ou adicione um insumo à mão.</div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.8fr_0.8fr_0.8fr_1fr_1.6fr_1fr_40px] gap-3 bg-cream px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim lg:grid">
              <span>Insumo</span><span>Estoque</span><span>Mínimo</span><span>Quantidade</span><span>Fornecedor</span><span>Preço ref.</span><span />
            </div>
            {linhas.map(l => {
              const preco = precoDoFornecedor(l)
              return (
                <div key={l.insumo.id} data-testid="linha-lista" className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line px-5 py-3 text-[13.5px] lg:grid-cols-[1.8fr_0.8fr_0.8fr_1fr_1.6fr_1fr_40px] lg:items-center">
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <span className="font-semibold text-dark">{l.insumo.nome}</span>
                    <span className="ml-2 text-[12px] text-muted">{l.insumo.identificador}</span>
                    {l.manual && <span className="ml-2 rounded-full bg-azul/10 px-2 py-0.5 text-[10.5px] font-bold text-azul">à mão</span>}
                  </div>
                  <div className={clsx('[font-variant-numeric:tabular-nums]', l.estoqueAtual < 0 ? 'font-semibold text-danger' : 'text-body')}>
                    <span className="mr-1 text-[11px] text-faint lg:hidden">Estoque</span>{qtd(l.estoqueAtual)} {l.insumo.unidade}
                  </div>
                  <div className="text-body [font-variant-numeric:tabular-nums]"><span className="mr-1 text-[11px] text-faint lg:hidden">Mínimo</span>{l.estoqueMinimo != null ? `${qtd(l.estoqueMinimo)} ${l.insumo.unidade}` : '—'}</div>
                  <div className="relative">
                    <input aria-label={`Quantidade de ${l.insumo.nome}`} inputMode="decimal" value={l.quantidadeTxt} placeholder="Informe"
                      onChange={e => alterar(l.insumo.id, { quantidadeTxt: e.target.value.replace(/[^\d.,]/g, ''), quantidadeEditada: true })}
                      className={clsx(inputBase, 'pr-10 [font-variant-numeric:tabular-nums]')} />
                    <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[12px] font-semibold text-muted">{l.insumo.unidade}</span>
                  </div>
                  <select aria-label={`Fornecedor de ${l.insumo.nome}`} value={l.fornecedorId ?? ''} onChange={e => alterar(l.insumo.id, { fornecedorId: e.target.value || null, fornecedorEditado: true })}
                    className={clsx(inputBase, 'col-span-2 lg:col-span-1')}>
                    <option value="">Sem fornecedor</option>
                    {l.fornecedorSugerido && !l.fornecedores.some(f => f.fornecedor.id === l.fornecedorSugerido!.id) && (
                      <option value={l.fornecedorSugerido.id}>{l.fornecedorSugerido.nome} (última compra)</option>
                    )}
                    {l.fornecedores.map(f => (
                      <option key={f.fornecedor.id} value={f.fornecedor.id}>{f.fornecedor.nome}{f.precoReferencia != null ? ` — ${moeda(f.precoReferencia)}` : ''}</option>
                    ))}
                  </select>
                  <div className="text-body [font-variant-numeric:tabular-nums]"><span className="mr-1 text-[11px] text-faint lg:hidden">Preço ref.</span>{preco != null ? `${moeda(preco)} / ${l.insumo.unidade}` : '—'}</div>
                  <div className="flex justify-end">
                    <button type="button" aria-label={`Tirar ${l.insumo.nome} da lista`} onClick={() => remover(l.insumo.id)}
                      className="grid h-9 w-9 place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-danger-bg hover:text-danger"><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            })}
          </>
        )}
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12.5px] text-muted">A lista gerada vira um retrato (LST-N): não muda depois, mesmo se o estoque mudar. O rascunho pode ser editado até ser gerado.</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Save size={16} />} onClick={salvarRascunho} disabled={!!gerando || linhas.length === 0}>
                {gerando === 'rascunho' ? 'Salvando…' : 'Salvar rascunho'}
              </Button>
              <Button variant="primary" icon={<ListChecks size={16} />} onClick={gerar} disabled={!!gerando}>{gerando === 'gerar' ? 'Gerando…' : 'Gerar lista'}</Button>
            </div>
          </div>
        </div>
      </div>
      {modalErro}
    </div>
  )
}

type CampoLista = 'numero' | 'geradaEm' | 'quantidadeItens' | 'status'
const COLUNAS_LISTA: { campo: CampoLista; label: string }[] = [
  { campo: 'numero', label: 'Lista' },
  { campo: 'geradaEm', label: 'Gerada em' },
  { campo: 'quantidadeItens', label: 'Insumos' },
  { campo: 'status', label: 'Status' },
]
const GRADE_LISTA = 'grid-cols-[1fr_1.2fr_1fr_1.3fr]'

function Historico() {
  const navigate = useNavigate()
  const [ordem, setOrdem] = useState<{ campo: CampoLista; dir: 'asc' | 'desc' }>({ campo: 'numero', dir: 'desc' })
  const fetcher = useCallback((page: number, size: number) => listaCompraService.historico(page, size, `${ordem.campo},${ordem.dir}`), [ordem])
  const { items, hasMore, loading, loadingMore, error, loadMore, reset } = usePaginatedList({ fetcher, errorMessage: 'Não foi possível carregar as listas.' })
  useEffect(() => { reset() }, [reset])
  const ordenar = (campo: CampoLista) => setOrdem(o => o.campo === campo
    ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    : { campo, dir: campo === 'status' ? 'asc' : 'desc' })

  if (loading) return <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
  if (error) return <div role="alert" className="flex items-center justify-between rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">{error}<Button variant="ghost" size="sm" onClick={reset}>Tentar de novo</Button></div>
  if (items.length === 0) return <EmptyState icon={<History size={20} />} title="Nenhuma lista ainda" description="As listas que você gerar ou salvar como rascunho ficam aqui para consultar e baixar em PDF." />

  return (
    <>
      <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className={`grid ${GRADE_LISTA} gap-4 border-b border-line bg-cream px-5 py-2.5`}>
          {COLUNAS_LISTA.map(c => <SortableHeader key={c.campo} label={c.label} field={c.campo} activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />)}
        </div>
        {items.map(l => (
          <div key={l.id} data-testid="linha-historico-lista" onClick={() => navigate(`/compras/lista/${l.id}`)}
            className={`grid cursor-pointer ${GRADE_LISTA} items-center gap-4 border-t border-line px-5 py-3 text-[13.5px] first:border-t-0 hover:bg-cream`}>
            <span className="font-bold text-dark">{l.identificador}</span>
            <span className="text-body">{l.geradaEm ? formatarData(l.geradaEm) : <span className="italic text-faint">Salva em {formatarData(l.createdAt)}</span>}</span>
            <span className="text-muted">{l.quantidadeItens} {l.quantidadeItens === 1 ? 'insumo' : 'insumos'}</span>
            <span><StatusListaBadge status={l.status} size="sm" /></span>
          </div>
        ))}
      </div>
      {hasMore && <div className="mt-4 flex justify-center"><Button variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</Button></div>}
    </>
  )
}

/** Carrega o rascunho (?rascunho=<id>) antes de montar a Nova lista. */
function NovaListaOuRascunho({ rascunhoId }: { rascunhoId: string | null }) {
  const [rascunho, setRascunho] = useState<ListaCompraResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    if (!rascunhoId) return
    setRascunho(null); setErro(null)
    listaCompraService.buscar(rascunhoId).then(l => {
      if (l.status !== 'RASCUNHO') setErro(`A lista ${l.identificador} já foi gerada e não pode mais ser editada.`)
      else setRascunho(l)
    }).catch(err => setErro(extractApiError(err, 'Não foi possível abrir o rascunho.')))
  }, [rascunhoId])
  if (!rascunhoId) return <NovaLista rascunho={null} />
  if (erro) return <div role="alert" className="rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">{erro}</div>
  if (!rascunho) return <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Abrindo rascunho…</div>
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-input border border-azul/20 bg-azul/5 px-4 py-2.5 text-[13.5px] text-body">
        Editando o rascunho <strong className="text-dark">{rascunho.identificador}</strong>. Salve para continuar depois ou gere a lista.
      </div>
      <NovaLista key={rascunho.id} rascunho={rascunho} />
    </div>
  )
}

export default function ListaComprasPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const aba: Aba = params.get('aba') === 'nova' ? 'nova' : 'historico'
  const ABAS: { id: Aba; label: string; icon: typeof Plus }[] = [
    { id: 'historico', label: 'Listas geradas', icon: History },
    { id: 'nova', label: 'Nova lista', icon: Plus },
  ]
  return (
    <AppLayout active="compras" compact>
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Lista de compras</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">O que falta no estoque, quanto comprar e de quem sai mais barato.</p>
        </div>
        <Button variant="secondary" icon={<ShoppingCart size={16} />} onClick={() => navigate('/compras')}>Minhas compras</Button>
      </div>
      <div className="mb-4 flex gap-1 border-b-[1.5px] border-line" role="tablist">
        {ABAS.map(a => {
          const on = aba === a.id
          return (
            <button key={a.id} role="tab" aria-selected={on} onClick={() => setParams(a.id === 'historico' ? {} : { aba: a.id }, { replace: true })}
              className={clsx('relative flex items-center gap-2 border-none bg-transparent px-4 py-3 font-[inherit] text-sm', on ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body')}>
              <a.icon size={16} /> {a.label}
              {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
            </button>
          )
        })}
      </div>
      {aba === 'nova' ? <NovaListaOuRascunho rascunhoId={params.get('rascunho')} /> : <Historico />}
    </AppLayout>
  )
}
