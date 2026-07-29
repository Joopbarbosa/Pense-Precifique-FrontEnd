import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { Pencil, Trash2, Box, Info, ChevronRight, Files, Plus } from 'lucide-react'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import type { CatalogoResponse } from '../../types/catalogo'
import type { ItemCatalogoResponse } from '../../types/itemCatalogo'
import { extractApiError } from '../../utils/apiError'

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ItemRow({ item, onClick, onEditar, onRemover }: {
  item: ItemCatalogoResponse
  onClick: () => void
  onEditar: () => void
  onRemover: () => void
}) {
  const menuItems: ActionMenuItem[] = [
    { label: 'Editar',  icon: <Pencil size={16} />, onClick: onEditar },
    { label: 'Remover', icon: <Trash2 size={16} />, onClick: onRemover, danger: true, dividerBefore: true },
  ]

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3.5 border-t border-line px-5 py-4 transition-colors duration-100 hover:bg-line"
    >
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
        <Box size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[14.5px] font-semibold text-dark">{item.produtoNome}</span>
          {item.override && (() => {
            const diff = item.precoVenda - item.precoSugerido
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11px] font-bold text-warning">
                <Info size={12} />
                {diff > 0 ? '+' : '−'}{moeda(Math.abs(diff))} {diff > 0 ? 'acima' : 'abaixo'} do sugerido
              </span>
            )
          })()}
          {item.bloqueadoParaVenda && (
            <span className="rounded-full bg-danger-bg px-2.5 py-0.5 text-[11px] font-bold text-danger">
              Bloqueado para venda
            </span>
          )}
        </div>
        <div className="mt-[3px] text-[12.5px] text-muted">
          {item.quantidadePacote} un/pacote
        </div>
        {item.customizacoesAnexadas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.customizacoesAnexadas.map(c => (
              <span key={c.produtoId} className="rounded-full bg-line-soft px-2.5 py-[3px] text-[11.5px] font-medium text-subtle">
                + {c.produtoNome} × {c.quantidade}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2.5" onClick={e => e.stopPropagation()}>
        <span className="whitespace-nowrap text-[15px] font-bold text-dark [font-variant-numeric:tabular-nums]">
          {moeda(item.precoVenda)}
        </span>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

export default function DetalheCatalogoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [catalogo, setCatalogo] = useState<CatalogoResponse | null>(null)
  const [itens, setItens] = useState<ItemCatalogoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)

  const [itemParaRemover, setItemParaRemover] = useState<ItemCatalogoResponse | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(() => {
    if (!id) return
    setLoading(true)
    setErroCarregar(null)
    Promise.all([
      catalogoService.buscarPorId(id),
      itemCatalogoService.listar(id),
    ])
      .then(([c, its]) => {
        setCatalogo(c)
        setItens(its)
      })
      .catch(() => setErroCarregar('Não foi possível carregar o catálogo. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleRemoverConfirm = async () => {
    if (!catalogo || !itemParaRemover) return
    setErroAcao(null)
    setProcessando(true)
    try {
      await itemCatalogoService.remover(catalogo.id, itemParaRemover.id)
      setItens(prev => prev.filter(i => i.id !== itemParaRemover.id))
      setCatalogo(prev => prev ? { ...prev, quantidadeItens: Math.max(0, prev.quantidadeItens - 1) } : prev)
      setItemParaRemover(null)
    } catch (err: any) {
      setErroAcao(extractApiError(err, 'Erro ao remover item. Tente novamente.'))
    } finally {
      setProcessando(false)
    }
  }

  if (loading || (!catalogo && !erroCarregar)) {
    return (
      <AppLayout active="catalogos" compact>
        <div className="flex items-center gap-2.5 py-[60px] text-sm text-muted">
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-teal" />
          Carregando catálogo…
        </div>
      </AppLayout>
    )
  }

  if (erroCarregar || !catalogo) {
    return (
      <AppLayout active="catalogos" compact>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          <span>{erroCarregar}</span>
          <Button variant="ghost" onClick={carregar}>Tentar novamente</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="catalogos" compact>

      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span
          className="cursor-pointer font-medium transition-colors duration-150 hover:text-teal"
          onClick={() => navigate('/catalogos')}
        >Catálogos</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="whitespace-nowrap font-semibold text-body">{catalogo.nome}</span>
      </div>

      <div className="mb-5 flex items-start justify-between gap-[18px]">
        <div className="flex min-w-0 flex-1 items-center gap-[15px]">
          <span className="grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
            <Files size={26} />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex-shrink-0 text-[13px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{catalogo.identificador}</span>
              <h1 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[25px] font-bold tracking-[-0.02em] text-dark">{catalogo.nome}</h1>
              <span className={clsx(
                'inline-flex h-[27px] flex-shrink-0 items-center gap-1.5 rounded-full px-[11px] text-[12.5px] font-semibold',
                catalogo.ativo ? 'bg-success-bg text-success' : 'bg-line-soft text-subtle'
              )}>
                {catalogo.ativo && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                {catalogo.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted">
              Margem de <strong className="font-semibold text-body">{catalogo.margem}%</strong>
            </div>
          </div>
        </div>
      </div>

      {erroAcao && (
        <div className="mb-4 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          {erroAcao}
        </div>
      )}

      <div className="animate-fade-up rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px bg-line">
          {[
            { k: 'Margem de lucro', v: `${catalogo.margem}%`, accent: true },
            { k: 'Itens no catálogo', v: `${catalogo.quantidadeItens}`, big: true },
          ].map((c, i) => (
            <div key={i} className="bg-white px-5 py-[18px]">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{c.k}</div>
              <div className={clsx(
                'mt-[7px] [font-variant-numeric:tabular-nums]',
                c.big ? 'text-[28px] font-bold tracking-[-0.02em]' : c.accent ? 'text-lg font-bold' : 'text-base font-semibold',
                c.accent ? 'text-teal' : 'text-dark'
              )}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 mt-[26px] flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[17px] font-bold text-dark">Itens do catálogo</h2>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)}>
          Adicionar item
        </Button>
      </div>

      <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        {itens.length === 0 ? (
          <EmptyState
            icon={<Box size={20} />}
            title="Nenhum item neste catálogo ainda"
            description="Adicione produtos para compor este catálogo com a margem definida."
            action={{ label: 'Adicionar item', icon: <Plus size={16} />, onClick: () => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}`) }}
          />
        ) : (
          itens.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onClick={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)}
              onEditar={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)}
              onRemover={() => setItemParaRemover(item)}
            />
          ))
        )}
      </div>

      <ConfirmacaoModal
        open={!!itemParaRemover}
        onClose={() => setItemParaRemover(null)}
        onConfirm={handleRemoverConfirm}
        variant="danger"
        title={`Remover "${itemParaRemover?.produtoNome}"?`}
        icon={<Trash2 size={16} />}
        width={440}
        confirmLabel="Remover item"
        confirmingLabel="Removendo…"
        confirming={processando}
        description="Este item será removido do catálogo. Esta ação não pode ser desfeita."
      />

    </AppLayout>
  )
}
