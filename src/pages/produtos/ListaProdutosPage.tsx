import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Eye, Power, Pencil, Copy, Camera, Layers, Plus, Search, Box, ChevronRight } from 'lucide-react'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { tipoProdutoBadge } from '../../utils/badges'
import { produtoService } from '../../services/produtoService'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import type { ProdutoResponse } from '../../types/produto'

const CATS = ['Todos', 'Produto', 'Produto Base', 'Customização', 'Inativos']

const CAT_TO_TIPO: Record<string, string | undefined> = {
  'Todos': undefined,
  'Produto': 'PRODUTO',
  'Produto Base': 'PRODUTO_BASE',
  'Customização': 'CUSTOMIZACAO',
  'Inativos': undefined,
}

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ProductCard({ p, index, onVer, onEditar, onDuplicar, onDesativar, onReativar }: {
  p: ProdutoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDuplicar: () => void
  onDesativar: () => void
  onReativar: () => void
}) {
  const isCustom = p.tipo === 'CUSTOMIZACAO'
  const inativo = !p.ativo
  const semEstoque = p.estoqueAtual === 0
  const badge = tipoProdutoBadge(p.tipo)

  const menuItems: ActionMenuItem[] = inativo
    ? [
        { label: 'Ver detalhes', icon: <Eye size={18} />,   onClick: onVer },
        { label: 'Reativar',     icon: <Power size={16} />, onClick: onReativar, dividerBefore: true },
      ]
    : [
        { label: 'Ver detalhes', icon: <Eye size={18} />,    onClick: onVer },
        { label: 'Editar',       icon: <Pencil size={16} />, onClick: onEditar },
        { label: 'Duplicar',     icon: <Copy size={16} />,   onClick: onDuplicar },
        { label: 'Desativar',    icon: <Power size={16} />,  onClick: onDesativar, danger: true, dividerBefore: true },
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

export default function ListaProdutosPage() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('Todos')
  const isFirstCat = useRef(true)

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

  const desativar = async (id: string) => {
    try {
      await produtoService.inativar(id)
      setProdutos(prev => prev.filter(p => p.id !== id))
      setTotalElements(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCatChange = (c: string) => {
    if (c === cat) return
    setCat(c)
  }

  const counts = (c: string) => c === cat ? totalElements : 0

  return (
    <AppLayout active="produtos" compact>

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
                onDesativar={() => desativar(p.id)}
                onReativar={() => {}}
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

    </AppLayout>
  )
}
