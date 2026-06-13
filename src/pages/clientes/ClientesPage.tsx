import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Input } from '../../components/ui'
import { Icons } from '../../components/ui/Icons'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'

interface Cliente {
  nome: string
  whats: string
  email: string
  obs: string
  orc: string | null
  data: string | null
  ativa?: boolean
}

const CLIENTES: Cliente[] = [
  { nome: 'Mariana Costa',    whats: '(11) 99999-0000', orc: '#0042', data: '04/06/2026', email: 'mariana.costa@gmail.com', obs: '' },
  { nome: 'Camila Rocha',     whats: '(11) 97777-2233', orc: '#0041', data: '02/06/2026', email: 'camila.rocha@gmail.com',  obs: 'Prefere retirar no ateliê aos sábados. Sempre pede embrulho de presente.' },
  { nome: 'Patrícia Mendes',  whats: '(21) 98888-5566', orc: '#0040', data: '28/05/2026', email: '', obs: '' },
  { nome: 'Juliana Ferreira', whats: '(11) 96666-4411', orc: null,    data: null,          email: '', obs: '', ativa: false },
]

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

function ClientRow({ cliente, index, rowZIndex, onEdit, onVerOrcamentos, onDesativar, onReativar }: {
  cliente: Cliente
  index: number
  rowZIndex: number
  onEdit: (c: Cliente) => void
  onVerOrcamentos: (c: Cliente) => void
  onDesativar: (c: Cliente) => void
  onReativar: (c: Cliente) => void
}) {
  const inativa = cliente.ativa === false

  const menuItems: ActionMenuItem[] = [
    { label: 'Editar',          icon: <Icons.edit />,    onClick: () => onEdit(cliente) },
    { label: 'Ver orçamentos',  icon: <Icons.list />,    onClick: () => onVerOrcamentos(cliente) },
    inativa
      ? { label: 'Reativar',  icon: <Icons.refresh />, onClick: () => onReativar(cliente), dividerBefore: true }
      : { label: 'Desativar', icon: <Icons.ban />,     onClick: () => onDesativar(cliente), danger: true, dividerBefore: true },
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
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = inativa ? '#F5F3EF' : '#FCFBF9' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = inativa ? '#FAF9F6' : 'transparent' }}
    >
      {/* Nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <Avatar nome={cliente.nome} inativa={inativa} />
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
          <span style={{ color: '#2A9D8F', display: 'flex' }}><Icons.phone /></span>
          {cliente.whats}
        </span>
      </div>

      {/* Último orçamento */}
      <div>
        <span className="cell-label">Último orçamento</span>
        {cliente.orc ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#5C594F' }}>
            <span style={{ fontWeight: 600, color: '#F97316' }}>{cliente.orc}</span>
            <span style={{ color: '#C9C5BD' }}>·</span>
            <span style={{ color: '#A29E96' }}>{cliente.data}</span>
          </span>
        ) : (
          <span style={{ fontSize: 13.5, color: '#B7B4AD', fontStyle: 'italic' }}>Nenhum orçamento ainda</span>
        )}
      </div>

      {/* Menu de ações */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function NovaClienteDrawer({ onClose, editData }: {
  onClose: () => void
  editData: Cliente | null
}) {
  const isEdit = !!editData
  const [form, setForm] = useState(editData ?? { nome: '', whats: '', email: '', obs: '', orc: null, data: null })

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(20,18,16,0.34)', animation: 'fadeIn .2s ease both',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', zIndex: 90, top: 0, right: 0,
        height: '100vh', width: 'min(440px, 100%)',
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 40px -12px rgba(0,0,0,0.22)',
        animation: 'slideInRight .3s cubic-bezier(.4,0,.2,1) both',
      }}>

        {/* Header teal */}
        <div style={{
          position: 'relative', overflow: 'hidden', padding: '24px 26px',
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
                {isEdit ? form.nome.trim().charAt(0).toUpperCase() || '?' : <Icons.user />}
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
              <Icons.x />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Campo Nome */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Icons.user width={14} height={14} /> Nome completo <span style={{ color: '#F97316' }}>*</span>
            </label>
            <Input label="" type="text" placeholder="Beatriz Santos" value={form.nome} onChange={(v) => setForm(f => ({ ...f, nome: v }))} />
          </div>

          {/* Campo WhatsApp */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Icons.phone /> WhatsApp <span style={{ color: '#F97316' }}>*</span>
            </label>
            <Input label="" type="tel" placeholder="(11) 99999-0000" value={form.whats}
              onChange={(v) => setForm(f => ({ ...f, whats: maskPhone(v) }))} />
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#A29E96' }}>Usado para enviar orçamentos diretamente.</p>
          </div>

          {/* Campo E-mail */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Icons.mail width={14} height={14} /> E-mail <span style={{ fontSize: 12, color: '#A29E96', fontWeight: 400 }}>opcional</span>
            </label>
            <Input label="" type="email" placeholder="beatriz@email.com" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} />
          </div>

          {/* Campo Observações */}
          <div>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7, display: 'block' }}>
              Observações
            </label>
            <textarea
              placeholder="Ex: Prefere entregas às sextas"
              value={form.obs}
              onChange={(e) => setForm(f => ({ ...f, obs: e.target.value }))}
              style={{
                width: '100%', minHeight: 86, padding: '12px 14px',
                border: '1.5px solid #EFEDE8', borderRadius: 10,
                fontSize: 15, color: '#3A372F', background: '#fff',
                outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onClose} fullWidth>Cancelar</Button>
          <Button variant="primary" onClick={onClose} fullWidth>
            {isEdit ? 'Salvar alterações' : 'Adicionar cliente'}
          </Button>
        </div>
      </div>
    </>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState(CLIENTES)
  const [query, setQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [editData, setEditData] = useState<Cliente | null>(null)
  const empty = clientes.length === 0

  const qLower = query.toLowerCase()
  const qDigits = query.replace(/\D/g, '')
  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(qLower) ||
    (qDigits.length > 0 && c.whats.replace(/\D/g, '').includes(qDigits))
  )

  const openNova = () => { setEditData(null); setDrawer(true) }
  const openEdit = (c: Cliente) => { setEditData(c); setDrawer(true) }

  return (
    <AppLayout active="clientes">

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>Minhas Clientes</h1>
          <p style={{ margin: '7px 0 0', fontSize: 14.5, color: '#A29E96', lineHeight: 1.5 }}>
            {empty
              ? 'Cuide do relacionamento com quem compra de você.'
              : <>Você tem <strong style={{ fontWeight: 600, color: '#6B6860' }}>{clientes.length} clientes</strong> na sua agenda.</>
            }
          </p>
        </div>
        <Button variant="primary" icon={<Icons.plus />} onClick={openNova}>
          Nova Cliente
        </Button>
      </div>

      {empty ? (
        <div style={{ marginTop: 26 }}>
          <EmptyState
            icon={<Icons.users />}
            title="Nenhuma cliente ainda"
            description="Cadastre sua primeira cliente para começar a criar orçamentos personalizados."
            action={{ label: 'Cadastrar primeira cliente', icon: <Icons.plus />, onClick: openNova }}
          />
        </div>
      ) : (
        <>
          {/* BUSCA */}
          <div style={{ position: 'relative', margin: '22px 0 18px', maxWidth: 440 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
              <Icons.search />
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
            {filtered.length > 0 ? (
              filtered.map((c, i) => (
                <ClientRow
                  key={c.nome} cliente={c} index={i} rowZIndex={filtered.length - i}
                  onEdit={openEdit}
                  onVerOrcamentos={() => {}}
                  onDesativar={(cli) => setClientes(prev => prev.map(x => x.nome === cli.nome ? { ...x, ativa: false } : x))}
                  onReativar={(cli) => setClientes(prev => prev.map(x => x.nome === cli.nome ? { ...x, ativa: true } : x))}
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
        </>
      )}

      {/* DRAWER */}
      {drawer && (
        <NovaClienteDrawer
          key={editData ? editData.nome : 'nova'}
          onClose={() => setDrawer(false)}
          editData={editData}
        />
      )}

    </AppLayout>
  )
}
