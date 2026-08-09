import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Eye, Power, Pencil, Copy, Camera, Layers, Plus, Search, Box, ChevronRight, AlertCircle, Trash2, Repeat } from 'lucide-react'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ModalShell from '../../components/ui/ModalShell'
import Spinner from '../../components/ui/Spinner'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { tipoProdutoBadge } from '../../utils/badges'
import { produtoService } from '../../services/produtoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'
import type { ProdutoResponse, ComponenteVinculadoResponse, AcaoResolucaoVinculo, TipoVinculoProduto, ResolverVinculosProdutoRequest } from '../../types/produto'

const CATS = ['Todos', 'Produto', 'Customização', 'Inativos']

const CAT_TO_TIPO: Record<string, string | undefined> = {
  'Todos': undefined,
  'Produto': 'PRODUTO',
  'Customização': 'CUSTOMIZACAO',
  'Inativos': undefined,
}

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface VinculoCatalogoUI {
  vinculoId: string
  tipo: Extract<TipoVinculoProduto, 'ITEM_CATALOGO_PRINCIPAL' | 'CUSTOMIZACAO_ANEXADA'>
  catalogoNome: string
  catalogoIdentificador: string
}

/** #237 — catalogosVinculados só traz o catálogo (união item principal + customização); o vinculoId
 * por item vem de itemCatalogoService.listar (mesmo endpoint que DetalheCatalogoPage já usa). */
async function carregarVinculosCatalogo(produtoId: string): Promise<VinculoCatalogoUI[]> {
  const catalogos = await produtoService.catalogosVinculados(produtoId)
  const listas = await Promise.all(
    catalogos.map(c => itemCatalogoService.listar(c.id).then(itens => ({ catalogo: c, itens })))
  )
  const vinculos: VinculoCatalogoUI[] = []
  for (const { catalogo, itens } of listas) {
    for (const item of itens) {
      if (item.produtoId === produtoId) {
        vinculos.push({
          vinculoId: item.id,
          tipo: 'ITEM_CATALOGO_PRINCIPAL',
          catalogoNome: catalogo.nome,
          catalogoIdentificador: catalogo.identificador,
        })
      }
      for (const cz of item.customizacoesAnexadas) {
        if (cz.produtoId === produtoId) {
          vinculos.push({
            vinculoId: cz.id,
            tipo: 'CUSTOMIZACAO_ANEXADA',
            catalogoNome: catalogo.nome,
            catalogoIdentificador: catalogo.identificador,
          })
        }
      }
    }
  }
  return vinculos
}

function ProductCard({ p, index, onVer, onEditar, onDuplicar, onDesativar, onReativar, onExcluir }: {
  p: ProdutoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDuplicar: () => void
  onDesativar: () => void
  onReativar: () => void
  onExcluir: () => void
}) {
  const isCustom = p.tipo === 'CUSTOMIZACAO'
  const inativo = !p.ativo
  const semEstoque = p.estoqueAtual === 0
  const badge = tipoProdutoBadge(p.tipo)

  const menuItems: ActionMenuItem[] = inativo
    ? [
        { label: 'Ver detalhes', icon: <Eye size={18} />,   onClick: onVer },
        { label: 'Reativar',     icon: <Power size={16} />, onClick: onReativar, dividerBefore: true },
        { label: 'Excluir',      icon: <Trash2 size={16} />, onClick: onExcluir, danger: true },
      ]
    : [
        { label: 'Ver detalhes', icon: <Eye size={18} />,    onClick: onVer },
        { label: 'Editar',       icon: <Pencil size={16} />, onClick: onEditar },
        { label: 'Duplicar',     icon: <Copy size={16} />,   onClick: onDuplicar },
        { label: 'Desativar',    icon: <Power size={16} />,  onClick: onDesativar, dividerBefore: true },
        { label: 'Excluir',      icon: <Trash2 size={16} />, onClick: onExcluir, danger: true },
      ]

  return (
    <div
      className={clsx(
        'group flex cursor-pointer flex-col overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-card transition-[box-shadow,transform,background] duration-150 hover:-translate-y-[3px] hover:bg-line hover:shadow-[0_10px_26px_-10px_rgba(0,0,0,0.18)]',
        inativo ? 'opacity-70' : 'animate-fade-up'
      )}
      style={inativo ? undefined : { animationDelay: `${index * 0.05}s` }}
      onClick={onVer}
    >
      {/* FOTO */}
      <div className="relative">
        <div className="relative aspect-square w-full overflow-hidden bg-[linear-gradient(135deg,#F6F4F0,#EEEBE5)]">
          <div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,transparent,transparent_13px,rgba(0,0,0,0.018)_13px,rgba(0,0,0,0.018)_26px)]" />
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#C2BEB5]">
            <Camera size={22} />
            <span className="text-[11.5px] font-semibold tracking-[0.02em]">Sem foto</span>
          </div>
        </div>
        {inativo && (
          <div className="pointer-events-none absolute inset-0 bg-[#787670]/20" />
        )}
        <div className="absolute right-2.5 top-2.5" onClick={e => e.stopPropagation()}>
          <ActionMenu items={menuItems} align="right" />
        </div>
        <div className="absolute left-2.5 top-2.5">
          {inativo ? (
            <span className="inline-flex h-[25px] items-center whitespace-nowrap rounded-full border border-[#F2D8CF] bg-[#FBEDE7] px-[11px] text-[11.5px] font-bold tracking-[0.01em] text-danger shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
              Inativo
            </span>
          ) : (
            <span
              className="inline-flex h-[25px] items-center whitespace-nowrap rounded-full px-[11px] text-[11.5px] font-bold tracking-[0.01em] shadow-[0_1px_4px_rgba(0,0,0,0.10)] backdrop-blur-[4px]"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* CORPO */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-[15px]">
        {p.identificador && (
          <div className="mb-[3px] text-xs font-semibold text-muted [font-variant-numeric:tabular-nums]">
            {p.identificador}
          </div>
        )}
        <h3 className="m-0 text-[15.5px] font-semibold leading-[1.3] tracking-[-0.01em] text-dark">
          {p.nome}
        </h3>
        <div className="mt-3.5 flex items-end justify-between gap-2.5 border-t border-cream pt-3.5">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-dim">
              {isCustom ? 'Valor adicional' : 'Preço de venda'}
            </div>
            <div className={clsx('mt-[3px] text-xl font-bold tracking-[-0.01em] [font-variant-numeric:tabular-nums]', isCustom ? 'text-teal' : 'text-dark')}>
              {p.precoVenda != null
                ? (isCustom ? '+ ' + BRL(p.precoVenda) : BRL(p.precoVenda))
                : <span className="text-[15px] text-[#C2BEB5]">—</span>
              }
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-dim">
              Estoque
            </div>
            {isCustom ? (
              <div className="mt-[7px] text-[15px] font-semibold text-[#C2BEB5]">—</div>
            ) : (
              <div className={clsx(
                'mt-[5px] inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold [font-variant-numeric:tabular-nums]',
                semEstoque ? 'bg-line-soft text-dim' : 'bg-teal/10 text-teal'
              )} style={{ height: 26 }}>
                <Layers size={14} /> {p.estoqueAtual} un
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SeletorProdutoSubstituto({ label, tipoFiltro, produtoAtualId, selecionado, onSelect }: {
  label: string
  tipoFiltro: 'PRODUTO' | 'CUSTOMIZACAO'
  produtoAtualId: string
  selecionado: ProdutoResponse | null
  onSelect: (produto: ProdutoResponse | null) => void
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ProdutoResponse[]>([])
  const [open, setOpen] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!open) return
    setCarregando(true)
    const delay = busca.trim() ? 300 : 0
    const timer = setTimeout(() => {
      produtoService.listar(0, 20, tipoFiltro, busca.trim())
        .then(data => setResultados(data.content))
        .catch(() => setResultados([]))
        .finally(() => setCarregando(false))
    }, delay)
    return () => clearTimeout(timer)
  }, [busca, open, tipoFiltro])

  const disponiveis = resultados.filter(p => p.ativo && p.id !== produtoAtualId)

  return (
    <div className="rounded-xl border border-line bg-cream px-4 py-3.5">
      <div className="mb-2.5 text-[13px] font-semibold text-dark">{label}</div>

      {selecionado ? (
        <div className="flex items-center justify-between gap-2 rounded-[9px] border-[1.5px] border-teal/40 bg-teal/5 px-3 py-2.5">
          <span className="text-[13.5px] font-semibold text-dark">{selecionado.nome}</span>
          <button onClick={() => onSelect(null)} className="flex border-none bg-transparent text-faint hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
            <Search size={14} />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar produto substituto…"
            className="h-[40px] w-full rounded-[9px] border-[1.5px] border-line bg-white pl-8 pr-3 font-[inherit] text-[13px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
          {open && (
            <div className="absolute inset-x-0 top-[44px] z-20 max-h-[220px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
              {carregando ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
              ) : disponiveis.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum produto encontrado</div>
              ) : disponiveis.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => onSelect(p)}
                  className="flex w-full items-center justify-between gap-2.5 rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
                >
                  <span className="text-[13.5px] font-semibold text-dark">{p.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ListaVinculosInformativa({ itens }: { itens: { key: string; titulo: string; subtitulo?: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {itens.map((it, i) => (
        <div key={it.key} className={clsx('flex items-center gap-3 px-3.5 py-3', i > 0 && 'border-t border-line')}>
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
            <Box size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-dark">{it.titulo}</div>
            {it.subtitulo && <div className="text-[11.5px] text-muted">{it.subtitulo}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function SecaoVinculo({ titulo, resumo, acao, onAcaoChange, labelRemover, labelSubstituir, children }: {
  titulo: string
  resumo: string
  acao: AcaoResolucaoVinculo
  onAcaoChange: (acao: AcaoResolucaoVinculo) => void
  labelRemover: string
  labelSubstituir: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line">
      <div className="border-b border-line bg-cream px-4 py-3">
        <div className="text-[13px] font-bold text-dark">{titulo}</div>
        <div className="text-[11.5px] text-muted">{resumo}</div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAcaoChange('REMOVER_VINCULOS')}
            className={clsx(
              'flex-1 whitespace-nowrap rounded-[9px] border-[1.5px] px-3 py-2.5 text-left font-[inherit] text-[12.5px] font-semibold transition-colors duration-100',
              acao === 'REMOVER_VINCULOS' ? 'border-danger bg-danger-bg text-danger' : 'border-line bg-white text-body hover:bg-cream'
            )}
          >
            {labelRemover}
          </button>
          <button
            type="button"
            onClick={() => onAcaoChange('SUBSTITUIR')}
            className={clsx(
              'flex-1 whitespace-nowrap rounded-[9px] border-[1.5px] px-3 py-2.5 text-left font-[inherit] text-[12.5px] font-semibold transition-colors duration-100',
              acao === 'SUBSTITUIR' ? 'border-teal bg-teal/5 text-teal' : 'border-line bg-white text-body hover:bg-cream'
            )}
          >
            {labelSubstituir}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ProdutoResolverVinculosModal({ produto, operacao, catalogoVinculos, componenteVinculos, loading, onClose, onSuccess, onError }: {
  produto: ProdutoResponse
  operacao: 'INATIVAR' | 'EXCLUIR'
  catalogoVinculos: VinculoCatalogoUI[]
  componenteVinculos: ComponenteVinculadoResponse[]
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (mensagem: string) => void
}) {
  const [acaoCatalogo, setAcaoCatalogo] = useState<AcaoResolucaoVinculo>('REMOVER_VINCULOS')
  const [acaoComponente, setAcaoComponente] = useState<AcaoResolucaoVinculo>('REMOVER_VINCULOS')
  const [substitutosCatalogo, setSubstitutosCatalogo] = useState<Record<string, ProdutoResponse | null>>({})
  const [substitutosComponente, setSubstitutosComponente] = useState<Record<string, ProdutoResponse | null>>({})
  const [processando, setProcessando] = useState(false)

  const temCatalogo = catalogoVinculos.length > 0
  const temComponente = componenteVinculos.length > 0

  const podeConfirmar = !loading && !processando &&
    (!temCatalogo || acaoCatalogo === 'REMOVER_VINCULOS' || catalogoVinculos.every(v => substitutosCatalogo[v.vinculoId])) &&
    (!temComponente || acaoComponente === 'REMOVER_VINCULOS' || componenteVinculos.every(v => substitutosComponente[v.vinculoId]))

  const executar = async () => {
    setProcessando(true)
    try {
      const request: ResolverVinculosProdutoRequest = { operacao }
      if (temCatalogo) {
        request.catalogo = {
          acao: acaoCatalogo,
          substituicoes: acaoCatalogo === 'SUBSTITUIR'
            ? catalogoVinculos.map(v => ({ tipo: v.tipo, vinculoId: v.vinculoId, novoProdutoId: substitutosCatalogo[v.vinculoId]!.id }))
            : undefined,
        }
      }
      if (temComponente) {
        request.componente = {
          acao: acaoComponente,
          substituicoes: acaoComponente === 'SUBSTITUIR'
            ? componenteVinculos.map(v => ({ vinculoId: v.vinculoId, novoProdutoId: substitutosComponente[v.vinculoId]!.id }))
            : undefined,
        }
      }
      await produtoService.resolverVinculos(produto.id, request)
      onSuccess()
    } catch (err) {
      console.error(err)
      onError(extractApiError(err, 'Erro ao resolver vínculos. Tente novamente.'))
    } finally {
      setProcessando(false)
    }
  }

  const tituloAcao = operacao === 'INATIVAR' ? 'inativar' : 'excluir'

  return (
    <ModalShell
      open
      onClose={onClose}
      title={`Não foi possível ${tituloAcao}`}
      subtitle={produto.nome}
      icon={<AlertCircle size={17} />}
      iconBg="rgba(192,73,43,0.10)"
      iconColor="#C0492B"
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={processando}>Cancelar</Button>
          <Button variant="primary" icon={processando ? undefined : <Repeat size={16} />} onClick={executar} disabled={!podeConfirmar}>
            {processando
              ? <span className="flex items-center gap-2"><Spinner size={16} trackColor="rgba(255,255,255,0.3)" /> Aplicando…</span>
              : 'Confirmar'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2.5 px-5 py-8 text-sm text-muted">
          <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando vínculos…
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm leading-[1.6] text-body">
            Este produto está vinculado. Escolha como resolver cada vínculo antes de continuar.
          </p>

          {temCatalogo && (
            <SecaoVinculo
              titulo="Vínculo de catálogo"
              resumo={`${catalogoVinculos.length} ${catalogoVinculos.length === 1 ? 'vínculo' : 'vínculos'}`}
              acao={acaoCatalogo}
              onAcaoChange={setAcaoCatalogo}
              labelRemover="Remover produto dos catálogos vinculados"
              labelSubstituir="Substituir produto no catálogo"
            >
              {acaoCatalogo === 'REMOVER_VINCULOS' ? (
                <ListaVinculosInformativa itens={catalogoVinculos.map(v => ({
                  key: v.vinculoId,
                  titulo: v.catalogoNome,
                  subtitulo: v.tipo === 'ITEM_CATALOGO_PRINCIPAL' ? 'Item principal' : 'Customização anexada',
                }))} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {catalogoVinculos.map(v => (
                    <SeletorProdutoSubstituto
                      key={v.vinculoId}
                      label={`${v.catalogoNome} · ${v.tipo === 'ITEM_CATALOGO_PRINCIPAL' ? 'Item principal' : 'Customização anexada'}`}
                      tipoFiltro={v.tipo === 'CUSTOMIZACAO_ANEXADA' ? 'CUSTOMIZACAO' : 'PRODUTO'}
                      produtoAtualId={produto.id}
                      selecionado={substitutosCatalogo[v.vinculoId] ?? null}
                      onSelect={p => setSubstitutosCatalogo(prev => ({ ...prev, [v.vinculoId]: p }))}
                    />
                  ))}
                </div>
              )}
            </SecaoVinculo>
          )}

          {temComponente && (
            <SecaoVinculo
              titulo="Vínculo de componente"
              resumo={`${componenteVinculos.length} ${componenteVinculos.length === 1 ? 'produto' : 'produtos'}`}
              acao={acaoComponente}
              onAcaoChange={setAcaoComponente}
              labelRemover="Remover produto da ficha técnica de quem o usa como componente"
              labelSubstituir="Substituir componente"
            >
              {acaoComponente === 'REMOVER_VINCULOS' ? (
                <ListaVinculosInformativa itens={componenteVinculos.map(v => ({
                  key: v.vinculoId,
                  titulo: v.produtoNome,
                  subtitulo: v.produtoIdentificador,
                }))} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {componenteVinculos.map(v => (
                    <SeletorProdutoSubstituto
                      key={v.vinculoId}
                      label={`${v.produtoIdentificador ? v.produtoIdentificador + ' · ' : ''}${v.produtoNome}`}
                      tipoFiltro="PRODUTO"
                      produtoAtualId={produto.id}
                      selecionado={substitutosComponente[v.vinculoId] ?? null}
                      onSelect={p => setSubstitutosComponente(prev => ({ ...prev, [v.vinculoId]: p }))}
                    />
                  ))}
                </div>
              )}
            </SecaoVinculo>
          )}
        </div>
      )}
    </ModalShell>
  )
}

export default function ListaProdutosPage() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('Todos')
  const isFirstCat = useRef(true)
  const [confirmAcao, setConfirmAcao] = useState<{ tipo: 'desativar' | 'excluir'; produto: ProdutoResponse } | null>(null)
  const [processandoAcao, setProcessandoAcao] = useState(false)
  const [bloqueio, setBloqueio] = useState<{
    produto: ProdutoResponse
    operacao: 'INATIVAR' | 'EXCLUIR'
    catalogoVinculos: VinculoCatalogoUI[]
    componenteVinculos: ComponenteVinculadoResponse[]
    loading: boolean
  } | null>(null)
  const { toast, setToast } = useToast()

  const {
    items: produtos,
    setItems: setProdutos,
    hasMore: hasNext,
    totalElements,
    setTotalElements,
    loading,
    loadingMore,
    loadMore: carregarMais,
    query: busca,
    setQuery: setBusca,
    reset,
  } = useDebounceSearch({
    fetcher: (page, size, q) => produtoService.listar(page, size, CAT_TO_TIPO[cat], q),
  })

  useEffect(() => {
    if (isFirstCat.current) { isFirstCat.current = false; return }
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat])

  const handleReativar = async (produto: ProdutoResponse) => {
    try {
      await produtoService.reativar(produto.id)
      setProdutos(prev => prev.map(x => x.id === produto.id ? { ...x, ativo: true } : x))
      setToast('Produto reativado.')
    } catch (err) {
      console.error(err)
      setToast(extractApiError(err, 'Erro ao reativar. Tente novamente.'))
    }
  }

  const handleConfirmarAcao = async () => {
    if (!confirmAcao) return
    const { tipo, produto } = confirmAcao
    setProcessandoAcao(true)
    try {
      if (tipo === 'desativar') {
        await produtoService.inativar(produto.id)
        setProdutos(prev => prev.map(x => x.id === produto.id ? { ...x, ativo: false } : x))
        setToast('Produto inativado.')
      } else {
        await produtoService.excluir(produto.id)
        setProdutos(prev => prev.filter(x => x.id !== produto.id))
        setTotalElements(prev => Math.max(0, prev - 1))
        setToast('Produto excluído.')
      }
      setConfirmAcao(null)
    } catch (err: any) {
      const mensagem = err?.response?.data?.message as string | undefined
      if (err?.response?.status === 400 && mensagem?.includes('vinculado')) {
        setConfirmAcao(null)
        const operacao = tipo === 'desativar' ? 'INATIVAR' : 'EXCLUIR'
        setBloqueio({ produto, operacao, catalogoVinculos: [], componenteVinculos: [], loading: true })
        try {
          const [catalogoVinculos, componenteVinculos] = await Promise.all([
            carregarVinculosCatalogo(produto.id),
            produtoService.componentesVinculados(produto.id),
          ])
          setBloqueio({ produto, operacao, catalogoVinculos, componenteVinculos, loading: false })
        } catch (err2) {
          console.error(err2)
          setBloqueio(null)
          setToast('Erro ao verificar vínculos. Tente novamente.')
        }
      } else {
        console.error(err)
        setToast(extractApiError(err, tipo === 'desativar' ? 'Erro ao desativar. Tente novamente.' : 'Erro ao excluir. Tente novamente.'))
        setConfirmAcao(null)
      }
    } finally {
      setProcessandoAcao(false)
    }
  }

  const handleCatChange = (c: string) => {
    if (c === cat) return
    setCat(c)
  }

  const counts = (c: string) => c === cat ? totalElements : 0

  return (
    <AppLayout active="produtos" compact>

      {/* TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.02em] text-dark">Meus Produtos</h1>
          <p className="mt-1.5 mb-0 text-[14.5px] text-muted">O coração do seu negócio — tudo o que você cria e vende.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/produtos/novo')}>
          Novo Produto
        </Button>
      </div>

      {/* BUSCA */}
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
        <div className="relative max-w-[420px] flex-[1_1_260px] min-w-[220px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
            <Search size={18} />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </div>
      </div>

      {/* CHIPS DE CATEGORIA */}
      <div className="mb-6 flex flex-wrap gap-[9px] overflow-x-auto">
        {CATS.map(c => {
          const active = cat === c
          return (
            <button
              key={c}
              onClick={() => handleCatChange(c)}
              className={clsx(
                'inline-flex h-9 items-center gap-[7px] whitespace-nowrap rounded-full border-[1.5px] px-[15px] font-[inherit] text-[13.5px] font-semibold transition-all duration-150',
                active
                  ? 'border-transparent bg-orange text-white shadow-[0_6px_14px_-7px_rgba(249,115,22,0.8)]'
                  : 'border-line bg-white text-body hover:border-[#DEDBD4] hover:bg-cream'
              )}
            >
              {c}
              <span className={clsx(
                'rounded-full px-[7px] py-px text-[11.5px] font-bold opacity-85',
                active ? 'bg-white/25 text-white' : 'bg-[#F1F0EC] text-dim'
              )}>
                {counts(c)}
              </span>
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando produtos…
        </div>
      ) : produtos.length === 0 ? (
        <EmptyState
          icon={<Box size={20} />}
          title={busca.trim() ? 'Nenhum produto encontrado' : cat === 'Inativos' ? 'Nenhum produto inativo' : 'Seu catálogo começa aqui'}
          description={busca.trim() ? 'Nenhum produto encontrado para essa busca.' : cat === 'Inativos' ? 'Nenhum produto inativo no momento.' : 'Você ainda não cadastrou produtos. Comece criando seu primeiro!'}
          action={!busca.trim() && cat !== 'Inativos' ? { label: 'Criar primeiro produto', icon: <Plus size={16} />, onClick: () => navigate('/produtos/novo') } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 max-[860px]:gap-3.5 max-[520px]:grid-cols-1">
            {produtos.map((p, i) => (
              <ProductCard
                key={p.id}
                p={p}
                index={i}
                onVer={() => navigate(`/produtos/${p.id}`)}
                onEditar={() => navigate(`/produtos/${p.id}/editar`)}
                onDuplicar={() => {}}
                onDesativar={() => setConfirmAcao({ tipo: 'desativar', produto: p })}
                onReativar={() => handleReativar(p)}
                onExcluir={() => setConfirmAcao({ tipo: 'excluir', produto: p })}
              />
            ))}
          </div>

          {/* Contador + Carregar mais */}
          <div className="mt-[18px] flex flex-col items-center gap-3">
            <div className="w-full self-end text-right text-[13px] text-muted">
              {produtos.length} de {totalElements} {totalElements === 1 ? 'produto' : 'produtos'}
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

      {/* MODAL: confirmar inativação (reversível) */}
      <ConfirmacaoModal
        open={confirmAcao?.tipo === 'desativar'}
        onClose={() => setConfirmAcao(null)}
        onConfirm={handleConfirmarAcao}
        variant="danger"
        title={`Desativar "${confirmAcao?.produto.nome}"?`}
        icon={<Power size={16} />}
        width={420}
        confirmLabel="Desativar produto"
        confirmingLabel="Desativando…"
        confirming={processandoAcao}
        description="O produto ficará inativo e não poderá ser usado em novos catálogos ou fichas técnicas. Você pode reativá-lo quando quiser."
      />

      {/* MODAL: confirmar exclusão (permanente) */}
      <ConfirmacaoModal
        open={confirmAcao?.tipo === 'excluir'}
        onClose={() => setConfirmAcao(null)}
        onConfirm={handleConfirmarAcao}
        variant="danger"
        title={`Excluir "${confirmAcao?.produto.nome}" permanentemente?`}
        icon={<Trash2 size={16} />}
        width={420}
        confirmLabel="Excluir produto"
        confirmingLabel="Excluindo…"
        confirming={processandoAcao}
        description='Esta ação exclui o produto definitivamente e não pode ser desfeita. Se quiser apenas suspender o uso dele, use "Desativar".'
      />

      {/* MODAL: bloqueio ao desativar/excluir produto vinculado — resolução por bloco (catálogo/componente) */}
      {bloqueio && (
        <ProdutoResolverVinculosModal
          produto={bloqueio.produto}
          operacao={bloqueio.operacao}
          catalogoVinculos={bloqueio.catalogoVinculos}
          componenteVinculos={bloqueio.componenteVinculos}
          loading={bloqueio.loading}
          onClose={() => setBloqueio(null)}
          onSuccess={() => {
            const { produto, operacao } = bloqueio
            if (operacao === 'INATIVAR') {
              setProdutos(prev => prev.map(x => x.id === produto.id ? { ...x, ativo: false } : x))
              setToast('Produto inativado.')
            } else {
              setProdutos(prev => prev.filter(x => x.id !== produto.id))
              setTotalElements(prev => Math.max(0, prev - 1))
              setToast('Produto excluído.')
            }
            setBloqueio(null)
          }}
          onError={mensagem => setToast(mensagem)}
        />
      )}

    </AppLayout>
  )
}
