import { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Input } from '../../components/ui'
import { Pencil, List, Ban, Phone, User, X, Mail, Plus, Users, Search } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import type { ClienteResponse, ClienteRequest } from '../../types/cliente'

// ---------- Avatar ----------

function Avatar({ nome, inativa }: { nome: string; inativa: boolean }) {
  return (
    <span style={{
      flexShrink: 0, width: 42, height: 42, borderRadius: '50%',
      display: 'grid', placeItems: 'center',
      background: inativa ? '#ECEAE5' : 'rgba(42,157,143,0.13)',
      color: inativa ? '#9A968E' : '#2A9D8F',
      fontWeight: 700, fontSize: 16,
      opacity: inativa ? 0.7 : 1,
    }}>
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// ---------- ClientRow ----------

function ClientRow({ cliente, index, rowZIndex, onEdit, onDesativar }: {
  cliente: ClienteResponse
  index: number
  rowZIndex: number
  onEdit: (c: ClienteResponse) => void
  onDesativar: (c: ClienteResponse) => void
}) {
  const inativa = !cliente.ativa

  const menuItems: ActionMenuItem[] = [
    { label: 'Editar',         icon: <Pencil size={16} />, onClick: () => onEdit(cliente) },
    { label: 'Ver orçamentos', icon: <List size={16} />,   onClick: () => {} },
    { label: 'Desativar',      icon: <Ban size={16} />,    onClick: () => onDesativar(cliente), danger: true, dividerBefore: true },
  ]

  return (
    <div
      className="client-row"
      style={{
        position: 'relative',
        zIndex: rowZIndex,
        padding: '14px 18px',
        borderBottom: '1px solid #EFEDE8',
        background: inativa ? '#FAF9F6' : 'transparent',
        transition: 'background .12s',
        animation: `fadeUp .4s ease both`,
        animationDelay: `${index * 0.05}s`,
        cursor: 'pointer',
      }}
      onClick={() => onEdit(cliente)}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#EFEDE8' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = inativa ? '#FAF9F6' : 'transparent' }}
    >
      {/* Nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <Avatar nome={cliente.nome} inativa={inativa} />
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {cliente.identificador && (
            <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>
              {cliente.identificador}
            </span>
          )}
          <span style={{
            fontSize: 15, fontWeight: 600,
            color: inativa ? '#AAA69E' : '#3A372F',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {cliente.nome}
          </span>
          {inativa && (
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.01em',
              color: '#C0492B', background: '#FBEDE7', border: '1px solid #F2D8CF',
              borderRadius: 6, padding: '2px 8px', lineHeight: 1.45,
            }}>
              Inativa
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <span className="cell-label">WhatsApp</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, color: '#5C594F' }}>
          {cliente.whatsapp ? (
            <>
              <span style={{ color: '#2A9D8F', display: 'flex' }}><Phone size={16} /></span>
              {cliente.whatsapp}
            </>
          ) : (
            <span style={{ fontSize: 13.5, color: '#B7B4AD', fontStyle: 'italic' }}>Não informado</span>
          )}
        </span>
      </div>

      {/* Último orçamento — aguarda integração futura */}
      <div>
        <span className="cell-label">Último orçamento</span>
        <span style={{ fontSize: 13.5, color: '#B7B4AD', fontStyle: 'italic' }}>Nenhum orçamento ainda</span>
      </div>

      {/* Menu de ações */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

// ---------- NovaClienteDrawer ----------

function NovaClienteDrawer({ onClose, editData, onSuccess }: {
  onClose: () => void
  editData: ClienteResponse | null
  onSuccess: (c: ClienteResponse) => void
}) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    nome: editData?.nome ?? '',
    whatsapp: editData?.whatsapp ?? '',
    email: editData?.email ?? '',
    observacoes: editData?.observacoes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    document.body.classList.add('drawer-open')
    return () => document.body.classList.remove('drawer-open')
  }, [])

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  const handleSave = async () => {
    setSaving(true)
    setErro(null)
    setFieldErrors({})
    try {
      const req: ClienteRequest = {
        nome: form.nome.trim(),
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        observacoes: form.observacoes || undefined,
      }
      const result = isEdit
        ? await clienteService.editar(editData!.id, req)
        : await clienteService.cadastrar(req)
      onSuccess(result)
      onClose()
    } catch (err: any) {
      const data = err.response?.data
      const fe: Record<string, string> = data?.fieldErrors ?? {}
      setFieldErrors(fe)
      setErro(data?.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(20,18,16,0.34)', animation: 'fadeIn .2s ease both',
      }} />

      <div style={{
        position: 'fixed', zIndex: 90,
        top: 0, right: 0, bottom: 0,
        left: 'max(0px, calc(100vw - 440px))',
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 40px -12px rgba(0,0,0,0.22)',
        animation: 'slideInRight .3s cubic-bezier(.4,0,.2,1) both',
      }}>

        {/* Header teal */}
        <div style={{
          flexShrink: 0, position: 'relative', overflow: 'hidden', padding: '24px 26px',
          background: 'linear-gradient(150deg, #2A9D8F 0%, rgba(42,157,143,0.92) 70%, #1F7A6F 100%)',
          color: '#fff',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12,
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 700, fontSize: 17,
              }}>
                {isEdit ? (form.nome.trim().charAt(0).toUpperCase() || '?') : <User size={18} />}
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {isEdit ? 'Editar Cliente' : 'Nova Cliente'}
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                  {isEdit ? 'Atualize os dados da cliente' : 'Adicione à sua agenda'}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 9, border: 'none',
              background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <User size={14} /> Nome completo <span style={{ color: '#F97316' }}>*</span>
            </label>
            <Input label="" type="text" placeholder="Beatriz Santos" value={form.nome}
              onChange={(v) => setForm(f => ({ ...f, nome: v }))} />
            {fieldErrors.nome && (
              <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.nome}</span>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Phone size={16} /> WhatsApp
            </label>
            <Input label="" type="tel" placeholder="(11) 99999-0000" value={form.whatsapp}
              onChange={(v) => setForm(f => ({ ...f, whatsapp: maskPhone(v) }))} />
            {fieldErrors.whatsapp && (
              <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.whatsapp}</span>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#A29E96' }}>Usado para enviar orçamentos diretamente.</p>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Mail size={14} /> E-mail <span style={{ fontSize: 12, color: '#A29E96', fontWeight: 400 }}>opcional</span>
            </label>
            <Input label="" type="email" placeholder="beatriz@email.com" value={form.email}
              onChange={(v) => setForm(f => ({ ...f, email: v }))} />
            {fieldErrors.email && (
              <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.email}</span>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7, display: 'block' }}>
              Observações
            </label>
            <textarea
              placeholder="Ex: Prefere entregas às sextas"
              value={form.observacoes}
              onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
              style={{
                width: '100%', minHeight: 86, padding: '12px 14px',
                border: '1.5px solid #EFEDE8', borderRadius: 10,
                fontSize: 15, color: '#3A372F', background: '#fff',
                outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {erro && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5 }}>
              {erro}
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div style={{
          flexShrink: 0, padding: '16px 24px',
          borderTop: '1px solid #EFEDE8',
          display: 'flex', gap: 10, background: '#fff',
        }}>
          <Button variant="ghost" onClick={onClose} fullWidth disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} fullWidth disabled={saving}>
            {saving
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                  {isEdit ? 'Salvando…' : 'Adicionando…'}
                </span>
              : (isEdit ? 'Salvar alterações' : 'Adicionar cliente')
            }
          </Button>
        </div>

      </div>
    </>
  )
}

// ---------- ClientesPage ----------

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [query, setQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [editData, setEditData] = useState<ClienteResponse | null>(null)
  const { toast, setToast } = useToast()
  const [confirmInativar, setConfirmInativar] = useState<ClienteResponse | null>(null)
  const isFirstRender = useRef(true)

  const loadPage = useCallback(async (pageNum: number, nome: string, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const res = await clienteService.listar(pageNum, 20, nome || undefined)
      setClientes(prev => reset ? res.content : [...prev, ...res.content])
      setHasNext(!res.last)
      setPage(pageNum)
    } catch {
      // silent — auth errors handled by axios interceptor
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Mount + search debounce (RN-034)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      loadPage(0, '', true)
      return
    }
    const t = setTimeout(() => loadPage(0, query, true), 400)
    return () => clearTimeout(t)
  }, [query, loadPage])

  const handleSuccess = (cliente: ClienteResponse) => {
    const exists = clientes.some(c => c.id === cliente.id)
    setClientes(prev =>
      exists
        ? prev.map(c => c.id === cliente.id ? cliente : c)
        : [cliente, ...prev]
    )
    setToast(exists ? 'Cliente atualizada com sucesso!' : 'Cliente cadastrada com sucesso!')
  }

  const handleInativar = async () => {
    if (!confirmInativar) return
    try {
      await clienteService.inativar(confirmInativar.id)
      setClientes(prev => prev.filter(c => c.id !== confirmInativar.id))
      setToast('Cliente inativada.')
    } catch {
      setToast('Erro ao inativar. Tente novamente.')
    } finally {
      setConfirmInativar(null)
    }
  }

  const openNova = () => { setEditData(null); setDrawer(true) }
  const openEdit = (c: ClienteResponse) => { setEditData(c); setDrawer(true) }

  const empty = clientes.length === 0 && !loading

  return (
    <AppLayout active="clientes">

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '12px 20px', borderRadius: 10, background: '#2A9D8F', color: '#fff',
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px -8px rgba(42,157,143,0.6)',
          animation: 'fadeUp .25s ease both', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>Minhas Clientes</h1>
          <p style={{ margin: '7px 0 0', fontSize: 14.5, color: '#A29E96', lineHeight: 1.5 }}>
            {loading
              ? 'Carregando clientes…'
              : empty
                ? 'Cuide do relacionamento com quem compra de você.'
                : <><strong style={{ fontWeight: 600, color: '#6B6860' }}>{clientes.length}</strong> cliente{clientes.length !== 1 ? 's' : ''} na sua agenda{hasNext ? '+' : ''}.</>
            }
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openNova}>
          Nova Cliente
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando…
        </div>
      ) : empty ? (
        <div style={{ marginTop: 26 }}>
          <EmptyState
            icon={<Users size={20} />}
            title="Nenhuma cliente ainda"
            description="Cadastre sua primeira cliente para começar a criar orçamentos personalizados."
            action={{ label: 'Cadastrar primeira cliente', icon: <Plus size={16} />, onClick: openNova }}
          />
        </div>
      ) : (
        <>
          {/* BUSCA */}
          <div style={{ position: 'relative', margin: '22px 0 18px', maxWidth: 440 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
              <Search size={18} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              style={{
                width: '100%', height: 46, padding: '0 16px 0 42px',
                border: `1.5px solid ${searchFocus ? '#2A9D8F' : '#EFEDE8'}`,
                borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                boxShadow: searchFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'border-color .15s, box-shadow .15s',
              }}
            />
          </div>

          {/* TABELA */}
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {/* Cabeçalho */}
            <div className="client-head" style={{ padding: '13px 18px', borderBottom: '1px solid #EFEDE8' }}>
              {['Cliente', 'WhatsApp', 'Último orçamento', ''].map((h, k) => (
                <div key={k} style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#B7B4AD' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Linhas */}
            {clientes.length > 0 ? (
              clientes.map((c, i) => (
                <ClientRow
                  key={c.id}
                  cliente={c}
                  index={i}
                  rowZIndex={clientes.length - i}
                  onEdit={openEdit}
                  onDesativar={(cli) => setConfirmInativar(cli)}
                />
              ))
            ) : (
              <EmptyState
                compact
                title={`Nenhuma cliente encontrada para "${query}"`}
                description="Ajuste o termo de busca."
              />
            )}
          </div>

          {/* CARREGAR MAIS */}
          {hasNext && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <Button variant="ghost" onClick={() => loadPage(page + 1, query, false)} disabled={loadingMore}>
                {loadingMore
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 15, height: 15, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                      Carregando…
                    </span>
                  : 'Carregar mais'
                }
              </Button>
            </div>
          )}
        </>
      )}

      {/* DRAWER */}
      {drawer && (
        <NovaClienteDrawer
          key={editData ? editData.id : 'nova'}
          onClose={() => setDrawer(false)}
          editData={editData}
          onSuccess={handleSuccess}
        />
      )}

      {/* MODAL: confirmar inativação */}
      <ConfirmacaoModal
        open={!!confirmInativar}
        onClose={() => setConfirmInativar(null)}
        onConfirm={handleInativar}
        variant="danger"
        title={`Inativar "${confirmInativar?.nome}"?`}
        icon={<Ban size={16} />}
        width={420}
        confirmLabel="Inativar cliente"
        description="A cliente será removida da listagem. Esta ação não pode ser desfeita por aqui."
      />

    </AppLayout>
  )
}
