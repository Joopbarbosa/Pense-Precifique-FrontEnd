import { useState, useEffect } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Input } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { Pencil, List, Ban, Phone, User, X, Mail, Plus, Users, Search } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import type { ClienteResponse, ClienteRequest } from '../../types/cliente'

// ---------- Avatar ----------

function Avatar({ nome, inativa }: { nome: string; inativa: boolean }) {
  return (
    <span className={clsx(
      'grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-full text-base font-bold',
      inativa ? 'bg-[#ECEAE5] text-dim opacity-70' : 'bg-teal/[0.13] text-teal'
    )}>
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
      className={clsx(
        'relative block cursor-pointer rounded-card border border-[#F0EEE9] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors duration-100',
        'mb-3 md:mb-0 md:grid md:grid-cols-[1.8fr_1.1fr_1.3fr_46px] md:items-center md:gap-4 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-line md:p-0 md:px-[18px] md:py-3.5 md:shadow-none',
        inativa ? 'bg-cream' : 'bg-white md:bg-transparent',
        'hover:bg-line'
      )}
      style={{
        zIndex: rowZIndex,
        animation: 'fadeUp .4s ease both',
        animationDelay: `${index * 0.05}s`,
      }}
      onClick={() => onEdit(cliente)}
    >
      {/* Nome */}
      <div className="flex min-w-0 items-center gap-[13px]">
        <Avatar nome={cliente.nome} inativa={inativa} />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {cliente.identificador && (
            <span className="flex-shrink-0 text-[12.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">
              {cliente.identificador}
            </span>
          )}
          <span className={clsx(
            'overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold',
            inativa ? 'text-[#AAA69E]' : 'text-dark'
          )}>
            {cliente.nome}
          </span>
          {inativa && (
            <span className="flex-shrink-0 whitespace-nowrap rounded-[6px] border border-[#F2D8CF] bg-[#FBEDE7] px-2 py-0.5 text-[11px] font-bold leading-[1.45] tracking-[0.01em] text-danger">
              Inativa
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="mt-2.5 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">WhatsApp</span>
        <span className="inline-flex items-center gap-[7px] text-sm text-body">
          {cliente.whatsapp ? (
            <>
              <span className="flex text-teal"><Phone size={16} /></span>
              {cliente.whatsapp}
            </>
          ) : (
            <span className="text-[13.5px] italic text-faint">Não informado</span>
          )}
        </span>
      </div>

      {/* Último orçamento — aguarda integração futura */}
      <div className="mt-2 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">Último orçamento</span>
        <span className="text-[13.5px] italic text-faint">Nenhum orçamento ainda</span>
      </div>

      {/* Menu de ações */}
      <div className="mt-2 flex justify-end md:mt-0" onClick={e => e.stopPropagation()}>
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
      <div onClick={onClose} className="fixed inset-0 z-[80] animate-fade-in bg-black/[0.34]" />

      <div
        className="fixed inset-y-0 right-0 z-[90] flex animate-[slideInRight_.3s_cubic-bezier(.4,0,.2,1)_both] flex-col bg-white shadow-[-12px_0_40px_-12px_rgba(0,0,0,0.22)]"
        style={{ left: 'max(0px, calc(100vw - 440px))' }}
      >

        {/* Header teal */}
        <div className="relative flex-shrink-0 overflow-hidden bg-[linear-gradient(150deg,#2A9D8F_0%,rgba(42,157,143,0.92)_70%,#1F7A6F_100%)] px-[26px] py-6 text-white">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-white/30 bg-white/[0.18] text-[17px] font-bold">
                {isEdit ? (form.nome.trim().charAt(0).toUpperCase() || '?') : <User size={18} />}
              </span>
              <div>
                <div className="text-lg font-bold tracking-[-0.01em]">
                  {isEdit ? 'Editar Cliente' : 'Nova Cliente'}
                </div>
                <div className="mt-px text-[12.5px] text-white/85">
                  {isEdit ? 'Atualize os dados da cliente' : 'Adicione à sua agenda'}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border-none bg-white/[0.16] text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body scrollável */}
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[26px] py-6">
          <div>
            <label className="mb-[7px] flex items-center gap-[7px] text-[13.5px] font-semibold text-body">
              <User size={14} /> Nome completo <span className="text-orange">*</span>
            </label>
            <Input label="" type="text" placeholder="Beatriz Santos" value={form.nome}
              onChange={(v) => setForm(f => ({ ...f, nome: v }))} />
            {fieldErrors.nome && (
              <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.nome}</span>
            )}
          </div>

          <div>
            <label className="mb-[7px] flex items-center gap-[7px] text-[13.5px] font-semibold text-body">
              <Phone size={16} /> WhatsApp
            </label>
            <Input label="" type="tel" placeholder="(11) 99999-0000" value={form.whatsapp}
              onChange={(v) => setForm(f => ({ ...f, whatsapp: maskPhone(v) }))} />
            {fieldErrors.whatsapp && (
              <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.whatsapp}</span>
            )}
            <p className="mt-1.5 mb-0 text-[12.5px] text-muted">Usado para enviar orçamentos diretamente.</p>
          </div>

          <div>
            <label className="mb-[7px] flex items-center gap-[7px] text-[13.5px] font-semibold text-body">
              <Mail size={14} /> E-mail <span className="text-xs font-normal text-muted">opcional</span>
            </label>
            <Input label="" type="email" placeholder="beatriz@email.com" value={form.email}
              onChange={(v) => setForm(f => ({ ...f, email: v }))} />
            {fieldErrors.email && (
              <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.email}</span>
            )}
          </div>

          <div>
            <label className="mb-[7px] block text-[13.5px] font-semibold text-body">
              Observações
            </label>
            <textarea
              placeholder="Ex: Prefere entregas às sextas"
              value={form.observacoes}
              onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="box-border min-h-[86px] w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[15px] leading-[1.5] text-dark outline-none"
            />
          </div>

          {erro && (
            <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">
              {erro}
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex flex-shrink-0 gap-2.5 border-t border-line bg-white px-6 py-4">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} fullWidth disabled={saving}>
            {saving
              ? <span className="flex items-center gap-2">
                  <Spinner size={15} trackColor="rgba(255,255,255,0.3)" />
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
  const {
    items: clientes,
    setItems: setClientes,
    hasMore: hasNext,
    loading,
    loadingMore,
    loadMore,
    query,
    setQuery,
  } = useDebounceSearch({
    fetcher: (page, size, q) => clienteService.listar(page, size, q),
    delay: 400,
  })
  const [drawer, setDrawer] = useState(false)
  const [editData, setEditData] = useState<ClienteResponse | null>(null)
  const { toast, setToast } = useToast()
  const [confirmInativar, setConfirmInativar] = useState<ClienteResponse | null>(null)

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
    <AppLayout active="clientes" compact>

      {/* TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Minhas Clientes</h1>
          <p className="mt-[7px] mb-0 text-[14.5px] leading-[1.5] text-muted">
            {loading
              ? 'Carregando clientes…'
              : empty
                ? 'Cuide do relacionamento com quem compra de você.'
                : <><strong className="font-semibold text-dim">{clientes.length}</strong> cliente{clientes.length !== 1 ? 's' : ''} na sua agenda{hasNext ? '+' : ''}.</>
            }
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openNova}>
          Nova Cliente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando…
        </div>
      ) : empty ? (
        <div className="mt-[26px]">
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
          <div className="relative my-[22px] mb-[18px] max-w-[440px]">
            <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
              <Search size={18} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp"
              className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </div>

          {/* TABELA */}
          <div className="rounded-none border-0 bg-transparent shadow-none md:rounded-card md:border md:border-[#F0EEE9] md:bg-white md:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {/* Cabeçalho */}
            <div className="hidden border-b border-line px-[18px] py-[13px] md:grid md:grid-cols-[1.8fr_1.1fr_1.3fr_46px] md:gap-4">
              {['Cliente', 'WhatsApp', 'Último orçamento', ''].map((h, k) => (
                <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
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
            <div className="mt-5 flex justify-center">
              <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore
                  ? <span className="flex items-center gap-2">
                      <Spinner size={15} color="#2A9D8F" trackColor="#EFEDE8" />
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
