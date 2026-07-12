import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderTop: '1px solid #EFEDE8', cursor: 'pointer', transition: 'background .12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#EFEDE8')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
        <Box size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{item.produtoNome}</span>
          {item.override && (() => {
            const diff = item.precoVenda - item.precoSugerido
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#C8721F', background: '#FFF1E8', padding: '2px 9px', borderRadius: 999 }}>
                <Info size={12} />
                {diff > 0 ? '+' : '−'}{moeda(Math.abs(diff))} {diff > 0 ? 'acima' : 'abaixo'} do sugerido
              </span>
            )
          })()}
          {item.bloqueadoParaVenda && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C0492B', background: '#FBEDE9', padding: '2px 9px', borderRadius: 999 }}>
              Bloqueado para venda
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 3 }}>
          {item.quantidadePacote} un/pacote
        </div>
        {item.customizacoesAnexadas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {item.customizacoesAnexadas.map(c => (
              <span key={c.produtoId} style={{ fontSize: 11.5, fontWeight: 500, color: '#7C786F', background: '#F1F0EC', padding: '3px 9px', borderRadius: 999 }}>
                + {c.produtoNome} × {c.quantidade}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
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
      setErroAcao(err.response?.data?.message || 'Erro ao remover item. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  if (loading || (!catalogo && !erroCarregar)) {
    return (
      <AppLayout active="catalogos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '60px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando catálogo…
        </div>
      </AppLayout>
    )
  }

  if (erroCarregar || !catalogo) {
    return (
      <AppLayout active="catalogos">
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>{erroCarregar}</span>
          <Button variant="ghost" onClick={carregar}>Tentar novamente</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="catalogos">

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/catalogos')}
          onMouseEnter={e => (e.currentTarget.style.color = '#2A9D8F')}
          onMouseLeave={e => (e.currentTarget.style.color = '#A29E96')}
        >Catálogos</span>
        <ChevronRight size={15} style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{catalogo.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0, flex: '1 1 auto' }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Files size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>{catalogo.identificador}</span>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{catalogo.nome}</h1>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: catalogo.ativo ? '#E8F5EE' : '#F1F0EC', color: catalogo.ativo ? '#1F8A5B' : '#7C786F', fontSize: 12.5, fontWeight: 600 }}>
                {catalogo.ativo && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A56F' }} />}
                {catalogo.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#A29E96', marginTop: 4 }}>
              Margem de <strong style={{ color: '#5C594F', fontWeight: 600 }}>{catalogo.margem}%</strong>
            </div>
          </div>
        </div>
      </div>

      {erroAcao && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5 }}>
          {erroAcao}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#EFEDE8' }}>
          {[
            { k: 'Margem de lucro', v: `${catalogo.margem}%`, accent: true },
            { k: 'Itens no catálogo', v: `${catalogo.quantidadeItens}`, big: true },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', padding: '18px 20px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{c.k}</div>
              <div style={{
                marginTop: 7, fontVariantNumeric: 'tabular-nums',
                fontSize: c.big ? 28 : c.accent ? 18 : 16,
                fontWeight: c.big || c.accent ? 700 : 600,
                letterSpacing: c.big ? '-0.02em' : '0',
                color: c.accent ? '#2A9D8F' : '#3A372F',
              }}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 26, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#3A372F' }}>Itens do catálogo</h2>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)}>
          Adicionar item
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
