import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ModalShell from '../../components/ui/ModalShell'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { Icons } from '../../components/ui/Icons'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import type { CatalogoResponse } from '../../types/catalogo'
import type { ItemCatalogoResponse } from '../../types/itemCatalogo'

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const inputBase = (active: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', height: 46, padding: '0 14px',
  border: `1.5px solid ${hasError ? '#E05C3A' : active ? '#2A9D8F' : '#EFEDE8'}`,
  borderRadius: 10, fontSize: 14.5, color: '#3A372F',
  background: '#fff', outline: 'none', fontFamily: 'inherit',
  boxShadow: hasError ? '0 0 0 4px rgba(224,92,58,0.10)' : active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
  transition: 'border-color .15s, box-shadow .15s',
})

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

function EditarCatalogoModal({ catalogo, onClose, onSuccess }: {
  catalogo: CatalogoResponse
  onClose: () => void
  onSuccess: (atualizado: CatalogoResponse) => void
}) {
  const [nome, setNome] = useState(catalogo.nome)
  const [margem, setMargem] = useState(catalogo.margem.toString())
  const [focus, setFocus] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const salvar = async () => {
    setErro('')
    setFieldErrors({})
    setSalvando(true)
    try {
      const atualizado = await catalogoService.editar(catalogo.id, { nome: nome.trim(), margem: num(margem) })
      onSuccess(atualizado)
    } catch (err: any) {
      const data = err.response?.data
      const msg: string | undefined = data?.message
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (msg && /margem/i.test(msg)) {
        fe.margem = msg
        setFieldErrors(fe)
      } else if (msg && /nome/i.test(msg)) {
        fe.nome = msg
        setFieldErrors(fe)
      } else {
        setFieldErrors(fe)
        setErro(msg || 'Erro ao salvar catálogo. Tente novamente.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Editar catálogo"
      subtitle={catalogo.identificador}
      icon={<Icons.fileStack />}
      iconBg="rgba(42,157,143,0.10)"
      iconColor="#2A9D8F"
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="primary" icon={<Icons.save />} disabled={salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          <span style={fieldLabel}>Nome do catálogo *</span>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onFocus={() => setFocus('nome')}
            onBlur={() => setFocus(null)}
            style={inputBase(focus === 'nome', !!fieldErrors.nome)}
          />
          {fieldErrors.nome && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.nome}</span>}
        </label>
        <label>
          <span style={fieldLabel}>Margem de lucro *</span>
          <div style={{ position: 'relative' }}>
            <input
              value={margem}
              onChange={e => setMargem(e.target.value.replace(/[^\d.,]/g, ''))}
              onFocus={() => setFocus('margem')}
              onBlur={() => setFocus(null)}
              inputMode="decimal"
              style={{ ...inputBase(focus === 'margem', !!fieldErrors.margem), paddingRight: 40 }}
            />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>%</span>
          </div>
          {fieldErrors.margem && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.margem}</span>}
          <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 6 }}>Itens sem preço ajustado manualmente recalculam automaticamente.</span>
        </label>
        {erro && (
          <p style={{ margin: 0, fontSize: 13.5, color: '#C0392B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
            {erro}
          </p>
        )}
      </div>
    </ModalShell>
  )
}

function ItemRow({ item, onEditar, onRemover }: {
  item: ItemCatalogoResponse
  onEditar: () => void
  onRemover: () => void
}) {
  const menuItems: ActionMenuItem[] = [
    { label: 'Editar',  icon: <Icons.edit />,  onClick: onEditar },
    { label: 'Remover', icon: <Icons.trash />, onClick: onRemover, danger: true, dividerBefore: true },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderTop: '1px solid #EFEDE8' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
        <Icons.box width={20} height={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{item.produtoNome}</span>
          {item.override && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C8721F', background: '#FFF1E8', padding: '2px 9px', borderRadius: 999 }}>
              Override
            </span>
          )}
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
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
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

  const [modal, setModal] = useState<'editar' | 'desativar' | null>(null)
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

  const recarregarItens = useCallback(() => {
    if (!id) return
    itemCatalogoService.listar(id).then(setItens).catch(() => {})
  }, [id])

  const handleEditarSucesso = (atualizado: CatalogoResponse) => {
    setCatalogo(atualizado)
    setModal(null)
    recarregarItens()
  }

  const handleDuplicar = async () => {
    if (!catalogo) return
    setErroAcao(null)
    setProcessando(true)
    try {
      const novo = await catalogoService.duplicar(catalogo.id)
      navigate(`/catalogos/${novo.id}`)
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao duplicar catálogo. Tente novamente.')
      setProcessando(false)
    }
  }

  const handleReativar = async () => {
    if (!catalogo) return
    setErroAcao(null)
    setProcessando(true)
    try {
      const atualizado = await catalogoService.reativar(catalogo.id)
      setCatalogo(atualizado)
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao reativar catálogo. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const handleDesativarConfirm = async () => {
    if (!catalogo) return
    setErroAcao(null)
    setProcessando(true)
    try {
      const atualizado = await catalogoService.desativar(catalogo.id)
      setCatalogo(atualizado)
      setModal(null)
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao desativar catálogo. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

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

  const menuItems: ActionMenuItem[] = catalogo.ativo
    ? [
        { label: 'Editar',    icon: <Icons.edit />,  onClick: () => setModal('editar') },
        { label: 'Duplicar',  icon: <Icons.copy />,  onClick: handleDuplicar },
        { label: 'Desativar', icon: <Icons.power />, onClick: () => setModal('desativar'), danger: true, dividerBefore: true },
      ]
    : [
        { label: 'Editar',   icon: <Icons.edit />,  onClick: () => setModal('editar') },
        { label: 'Duplicar', icon: <Icons.copy />,  onClick: handleDuplicar },
        { label: 'Reativar', icon: <Icons.power />, onClick: handleReativar, dividerBefore: true },
      ]

  return (
    <AppLayout active="catalogos">

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/catalogos')}
          onMouseEnter={e => (e.currentTarget.style.color = '#2A9D8F')}
          onMouseLeave={e => (e.currentTarget.style.color = '#A29E96')}
        >Catálogos</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{catalogo.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0, flex: '1 1 auto' }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.fileStack width={26} height={26} />
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
        <div style={{ flexShrink: 0 }}>
          <ActionMenu items={menuItems} align="right" />
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
        <Button variant="primary" icon={<Icons.plus />} onClick={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)}>
          Adicionar item
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {itens.length === 0 ? (
          <EmptyState
            icon={<Icons.box />}
            title="Nenhum item neste catálogo ainda"
            description="Adicione produtos para compor este catálogo com a margem definida."
            action={{ label: 'Adicionar item', icon: <Icons.plus />, onClick: () => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}`) }}
          />
        ) : (
          itens.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onEditar={() => navigate(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)}
              onRemover={() => setItemParaRemover(item)}
            />
          ))
        )}
      </div>

      {modal === 'editar' && (
        <EditarCatalogoModal
          catalogo={catalogo}
          onClose={() => setModal(null)}
          onSuccess={handleEditarSucesso}
        />
      )}

      <ModalShell
        open={modal === 'desativar'}
        onClose={() => setModal(null)}
        title={`Desativar "${catalogo.nome}"?`}
        icon={<Icons.power />}
        iconBg="rgba(192,73,43,0.10)"
        iconColor="#C0492B"
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)} disabled={processando}>Cancelar</Button>
            <Button variant="danger" onClick={handleDesativarConfirm} disabled={processando}>
              {processando ? 'Desativando…' : 'Desativar catálogo'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: '#5C594F', lineHeight: 1.6 }}>
          Todos os itens deste catálogo ficam bloqueados para venda enquanto ele estiver inativo. Nada é excluído e você pode reativar quando quiser.
        </p>
      </ModalShell>

      <ModalShell
        open={!!itemParaRemover}
        onClose={() => setItemParaRemover(null)}
        title={`Remover "${itemParaRemover?.produtoNome}"?`}
        icon={<Icons.trash />}
        iconBg="rgba(192,73,43,0.10)"
        iconColor="#C0492B"
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setItemParaRemover(null)} disabled={processando}>Cancelar</Button>
            <Button variant="danger" onClick={handleRemoverConfirm} disabled={processando}>
              {processando ? 'Removendo…' : 'Remover item'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: '#5C594F', lineHeight: 1.6 }}>
          Este item será removido do catálogo. Esta ação não pode ser desfeita.
        </p>
      </ModalShell>

    </AppLayout>
  )
}
