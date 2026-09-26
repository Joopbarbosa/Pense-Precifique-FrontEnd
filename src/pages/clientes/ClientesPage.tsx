import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Field, SegmentedControl, Tag, TextArea } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { Pencil, Ban, Power, Phone, User, X, Plus, Users, Search, Check, Mail } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import { extractApiError } from '../../utils/apiError'
import { mascararDocumento, ROTULO_DOCUMENTO } from '../../utils/documento'
import type { ClienteContagensResponse, ClienteFiltros, ClienteResponse, ClienteRequest, TipoPessoa } from '../../types/cliente'

// V0.15.0 (#537, #536, #538) — cadastro único "Clientes e Fornecedores" (RN-NOVA-1/2/17). A rota e
// o service continuam `clientes` (DT-NOVA-1); só a interface muda de nome.

const inputBase = 'h-12 w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus'

type FiltroId = 'todos' | 'clientes' | 'fornecedores' | 'inativos'

// Filtro server-side (mesmo padrão de ListaInsumosPage/#336): "Todos" = ativos dos dois papéis.
const FILTROS: { id: FiltroId; label: string; filtros: ClienteFiltros; contagem: keyof ClienteContagensResponse }[] = [
  { id: 'todos',        label: 'Todos',        filtros: {},                      contagem: 'ativos' },
  { id: 'clientes',     label: 'Clientes',     filtros: { papel: 'CLIENTE' },    contagem: 'clientes' },
  { id: 'fornecedores', label: 'Fornecedores', filtros: { papel: 'FORNECEDOR' }, contagem: 'fornecedores' },
  { id: 'inativos',     label: 'Inativos',     filtros: { ativo: false },        contagem: 'inativos' },
]

const TIPOS_PESSOA = [
  { value: 'FISICA' as TipoPessoa,      label: 'Física' },
  { value: 'JURIDICA' as TipoPessoa,    label: 'Jurídica' },
  { value: 'ESTRANGEIRO' as TipoPessoa, label: 'Estrangeiro' },
] as const

const PLACEHOLDER_DOCUMENTO: Record<TipoPessoa, string> = {
  FISICA: '000.000.000-00',
  JURIDICA: '00.000.000/0000-00',
  ESTRANGEIRO: 'Passaporte ou outro documento',
}

/** Celular (11 dígitos) → (00) 00000-0000; fixo (10) → (00) 0000-0000. */
const mascararTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ---------- Avatar ----------

function Avatar({ nome, inativa }: { nome: string; inativa: boolean }) {
  return (
    <span className={clsx(
      'grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-full text-base font-bold',
      inativa ? 'bg-line-deep text-dim opacity-70' : 'bg-teal/[0.13] text-teal'
    )}>
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function PapelTags({ cliente }: { cliente: Pick<ClienteResponse, 'ehCliente' | 'ehFornecedor'> }) {
  return (
    <>
      {cliente.ehCliente && <Tag tone="green" size="sm">Cliente</Tag>}
      {cliente.ehFornecedor && <Tag tone="orange" size="sm">Fornecedor</Tag>}
    </>
  )
}

// ---------- CadastroRow ----------

function CadastroRow({ cliente, index, rowZIndex, onEdit, onInativar, onReativar }: {
  cliente: ClienteResponse
  index: number
  rowZIndex: number
  onEdit: (c: ClienteResponse) => void
  onInativar: (c: ClienteResponse) => void
  onReativar: (c: ClienteResponse) => void
}) {
  const inativa = !cliente.ativa
  const contato = cliente.whatsapp || cliente.telefone

  const menuItems: ActionMenuItem[] = [
    { label: 'Editar', icon: <Pencil size={16} />, onClick: () => onEdit(cliente) },
    inativa
      ? { label: 'Reativar', icon: <Power size={16} />, onClick: () => onReativar(cliente), dividerBefore: true }
      : { label: 'Inativar', icon: <Ban size={16} />,   onClick: () => onInativar(cliente), danger: true, dividerBefore: true },
  ]

  return (
    <div
      data-testid="cadastro-row"
      className={clsx(
        'relative block cursor-pointer rounded-card border border-[#F0EEE9] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors duration-100',
        'mb-3 md:mb-0 md:grid md:grid-cols-[2fr_1.2fr_1.2fr_46px] md:items-center md:gap-4 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-line md:p-0 md:px-[18px] md:py-3.5 md:shadow-none',
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
      {/* Nome + papéis */}
      <div className="flex min-w-0 items-center gap-[13px]">
        <Avatar nome={cliente.nome} inativa={inativa} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {cliente.identificador && (
              <span className="flex-shrink-0 text-[12.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">
                {cliente.identificador}
              </span>
            )}
            <span className={clsx(
              'overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold',
              inativa ? 'text-dim' : 'text-dark'
            )}>
              {cliente.nome}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PapelTags cliente={cliente} />
            {inativa && (
              <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-danger-bg px-[9px] text-[11.5px] font-semibold text-danger">
                Inativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="mt-2.5 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">Contato</span>
        <span className="inline-flex min-w-0 items-center gap-[7px] text-sm text-body">
          {contato ? (
            <><span className="flex text-teal"><Phone size={16} /></span>{contato}</>
          ) : cliente.email ? (
            <><span className="flex text-teal"><Mail size={16} /></span><span className="truncate">{cliente.email}</span></>
          ) : (
            <span className="text-[13.5px] italic text-faint">Não informado</span>
          )}
        </span>
      </div>

      {/* Documento */}
      <div className="mt-2 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">CPF/CNPJ</span>
        {cliente.documento ? (
          <span className="text-sm text-body [font-variant-numeric:tabular-nums]">
            {mascararDocumento(cliente.documento, cliente.tipoPessoa)}
          </span>
        ) : (
          <span className="text-[13.5px] italic text-faint">Não informado</span>
        )}
      </div>

      {/* Menu de ações */}
      <div className="mt-2 flex justify-end md:mt-0" onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

// ---------- CadastroDrawer ----------

function PapelOpcao({ label, descricao, marcado, onClick }: { label: string; descricao: string; marcado: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      onClick={onClick}
      className={clsx(
        'flex flex-1 items-start gap-2.5 rounded-input border-[1.5px] px-3.5 py-3 text-left font-[inherit] transition-colors duration-150',
        marcado ? 'border-teal bg-teal/[0.06]' : 'border-line bg-white hover:bg-cream'
      )}
    >
      <span className={clsx(
        'mt-px grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[5px] border-[1.5px]',
        marcado ? 'border-teal bg-teal text-white' : 'border-line-deep bg-white'
      )}>
        {marcado && <Check size={13} strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-dark">{label}</span>
        <span className="block text-xs text-muted">{descricao}</span>
      </span>
    </button>
  )
}

function CadastroDrawer({ onClose, editData, onSuccess }: {
  onClose: () => void
  editData: ClienteResponse | null
  onSuccess: (c: ClienteResponse, novo: boolean) => void
}) {
  const isEdit = !!editData
  const tipoInicial: TipoPessoa = editData?.tipoPessoa ?? 'FISICA'
  const [form, setForm] = useState({
    nome: editData?.nome ?? '',
    // Cadastro novo nasce como Cliente (o uso mais comum); a artesã desmarca/marca à vontade.
    ehCliente: editData?.ehCliente ?? true,
    ehFornecedor: editData?.ehFornecedor ?? false,
    tipoPessoa: tipoInicial,
    documento: editData?.documento ? mascararDocumento(editData.documento, tipoInicial) : '',
    whatsapp: editData?.whatsapp ?? '',
    telefone: editData?.telefone ?? '',
    email: editData?.email ?? '',
    site: editData?.site ?? '',
    endereco: editData?.endereco ?? '',
    observacoes: editData?.observacoes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    document.body.classList.add('drawer-open')
    return () => document.body.classList.remove('drawer-open')
  }, [])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const trocarTipo = (tipo: TipoPessoa) => setForm(f => ({ ...f, tipoPessoa: tipo, documento: mascararDocumento(f.documento, tipo) }))

  const handleSave = async () => {
    setSaving(true)
    setErro(null)
    setFieldErrors({})
    try {
      const opcional = (v: string) => v.trim() || undefined
      const req: ClienteRequest = {
        nome: form.nome.trim(),
        ehCliente: form.ehCliente,
        ehFornecedor: form.ehFornecedor,
        tipoPessoa: form.tipoPessoa,
        documento: opcional(form.documento),
        whatsapp: opcional(form.whatsapp),
        telefone: opcional(form.telefone),
        email: opcional(form.email),
        site: opcional(form.site),
        endereco: opcional(form.endereco),
        observacoes: opcional(form.observacoes),
      }
      const result = isEdit
        ? await clienteService.editar(editData!.id, req)
        : await clienteService.cadastrar(req)
      onSuccess(result, !isEdit)
      onClose()
    } catch (err: any) {
      const data = err.response?.data
      const fe: Record<string, string> = data?.fieldErrors ?? {}
      setFieldErrors(fe)
      setErro(Object.keys(fe).length > 0 ? 'Revise os campos destacados.' : extractApiError(err, 'Erro ao salvar. Tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (campo: string) => clsx(inputBase, fieldErrors[campo] ? 'border-[#F2B8A6]' : 'border-line')

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[80] animate-fade-in bg-black/[0.34]" />

      <div
        role="dialog"
        aria-label={isEdit ? 'Editar cadastro' : 'Novo cadastro'}
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
                  {isEdit ? 'Editar cadastro' : 'Novo cadastro'}
                </div>
                <div className="mt-px text-[12.5px] text-white/85">
                  {isEdit ? `${editData!.identificador ?? ''} · atualize os dados` : 'Cliente, fornecedor ou os dois'}
                </div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border-none bg-white/[0.16] text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body scrollável */}
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[26px] py-6">
          <Field label="Este cadastro é" group size="md" required>
            <div className="flex gap-2.5">
              <PapelOpcao label="Cliente" descricao="Compra de você" marcado={form.ehCliente} onClick={() => set('ehCliente', !form.ehCliente)} />
              <PapelOpcao label="Fornecedor" descricao="Vende para você" marcado={form.ehFornecedor} onClick={() => set('ehFornecedor', !form.ehFornecedor)} />
            </div>
          </Field>

          <Field label="Nome" required size="md" erro={fieldErrors.nome}>
            <input className={inputClass('nome')} maxLength={255} placeholder="Beatriz Santos ou Papelaria Central"
              value={form.nome} onChange={e => set('nome', e.target.value)} />
          </Field>

          <Field label="Tipo de pessoa" group size="md">
            <SegmentedControl options={TIPOS_PESSOA} value={form.tipoPessoa} onChange={trocarTipo} height="h-11" textSize="text-[13.5px]" />
          </Field>

          <Field label={ROTULO_DOCUMENTO[form.tipoPessoa]} opt size="md" erro={fieldErrors.documento}>
            <input className={clsx(inputClass('documento'), '[font-variant-numeric:tabular-nums]')} maxLength={30}
              placeholder={PLACEHOLDER_DOCUMENTO[form.tipoPessoa]}
              value={form.documento} onChange={e => set('documento', mascararDocumento(e.target.value, form.tipoPessoa))} />
          </Field>

          <Field label="WhatsApp" opt size="md" erro={fieldErrors.whatsapp} hint="Usado para enviar orçamentos diretamente.">
            <input className={inputClass('whatsapp')} type="tel" placeholder="(11) 99999-0000"
              value={form.whatsapp} onChange={e => set('whatsapp', mascararTelefone(e.target.value))} />
          </Field>

          <Field label="Telefone" opt size="md" erro={fieldErrors.telefone}>
            <input className={inputClass('telefone')} type="tel" placeholder="(11) 3333-4444"
              value={form.telefone} onChange={e => set('telefone', mascararTelefone(e.target.value))} />
          </Field>

          <Field label="E-mail" opt size="md" erro={fieldErrors.email}>
            <input className={inputClass('email')} type="email" maxLength={255} placeholder="contato@email.com"
              value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>

          <Field label="Site ou Instagram" opt size="md" erro={fieldErrors.site}>
            <input className={inputClass('site')} maxLength={255} placeholder="@papelariacentral"
              value={form.site} onChange={e => set('site', e.target.value)} />
          </Field>

          <Field label="Endereço" opt size="md">
            <TextArea value={form.endereco} onChange={v => set('endereco', v)} erro={fieldErrors.endereco}
              minHeight="min-h-[64px]" placeholder="Rua, número, bairro, cidade" />
          </Field>

          <Field label="Observações" opt size="md">
            <TextArea value={form.observacoes} onChange={v => set('observacoes', v)} erro={fieldErrors.observacoes}
              placeholder="Ex: Prefere entregas às sextas" />
          </Field>
        </div>

        {/* Erro fica acima do rodapé, sempre visível (o corpo rola) */}
        {erro && (
          <div role="alert" className="mx-6 mb-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">
            {erro}
          </div>
        )}

        {/* Footer fixo */}
        <div className="flex flex-shrink-0 gap-2.5 border-t border-line bg-white px-6 py-4">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} fullWidth disabled={saving}>
            {saving
              ? <span className="flex items-center gap-2">
                  <Spinner size={15} trackColor="rgba(255,255,255,0.3)" />
                  Salvando…
                </span>
              : (isEdit ? 'Salvar alterações' : 'Salvar cadastro')
            }
          </Button>
        </div>

      </div>
    </>
  )
}

// ---------- ClientesPage ----------

export default function ClientesPage() {
  const [filtro, setFiltro] = useState<FiltroId>('todos')
  const isFirstFiltro = useRef(true)
  const [contagens, setContagens] = useState<ClienteContagensResponse | null>(null)
  const filtroAtual = FILTROS.find(f => f.id === filtro)!

  const {
    items: cadastros,
    setItems: setCadastros,
    hasMore: hasNext,
    loading,
    loadingMore,
    loadMore,
    query,
    setQuery,
    reset: carregar,
  } = useDebounceSearch({
    fetcher: (page, size, q) => clienteService.listar(page, size, q, filtroAtual.filtros),
  })
  const [drawer, setDrawer] = useState(false)
  const [editData, setEditData] = useState<ClienteResponse | null>(null)
  const { toast, setToast } = useToast()
  const [confirmInativar, setConfirmInativar] = useState<ClienteResponse | null>(null)

  const carregarContagens = () => {
    clienteService.contagens().then(setContagens).catch(() => {})
  }

  useEffect(() => { carregarContagens() }, [])

  useEffect(() => {
    if (isFirstFiltro.current) { isFirstFiltro.current = false; return }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const handleSuccess = (cadastro: ClienteResponse, novo: boolean) => {
    // Filtro é server-side: recarrega em vez de adivinhar se o registro ainda cabe no filtro atual.
    carregar()
    carregarContagens()
    setToast(novo ? 'Cadastro salvo com sucesso!' : `${cadastro.nome} atualizado com sucesso!`)
  }

  const handleInativar = async () => {
    if (!confirmInativar) return
    const alvo = confirmInativar
    try {
      await clienteService.inativar(alvo.id)
      setCadastros(prev => prev.filter(c => c.id !== alvo.id))
      carregarContagens()
      setToast(`${alvo.nome} inativado.`)
    } catch (err) {
      setToast(extractApiError(err, 'Erro ao inativar. Tente novamente.'))
    } finally {
      setConfirmInativar(null)
    }
  }

  const handleReativar = async (alvo: ClienteResponse) => {
    try {
      await clienteService.reativar(alvo.id)
      setCadastros(prev => prev.filter(c => c.id !== alvo.id))
      carregarContagens()
      setToast(`${alvo.nome} reativado.`)
    } catch (err) {
      setToast(extractApiError(err, 'Erro ao reativar. Tente novamente.'))
    }
  }

  const openNova = () => { setEditData(null); setDrawer(true) }
  const openEdit = (c: ClienteResponse) => { setEditData(c); setDrawer(true) }

  // Estado "primeiro uso": nenhum cadastro na conta (ativo ou inativo).
  const semCadastros = contagens != null && contagens.ativos === 0 && contagens.inativos === 0 && !loading && !query.trim()

  return (
    <AppLayout active="clientes" compact>

      <Toast message={toast} />

      {/* HEADER */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Clientes e Fornecedores</h1>
          <p className="mt-[7px] mb-0 text-[14.5px] leading-[1.5] text-muted">
            Quem compra de você e de quem você compra, num cadastro só.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openNova}>
          Novo cadastro
        </Button>
      </div>

      {semCadastros ? (
        <div className="mt-[26px]">
          <EmptyState
            icon={<Users size={20} />}
            title="Nenhum cadastro ainda"
            description="Cadastre clientes para criar orçamentos e fornecedores para registrar compras."
            action={{ label: 'Fazer o primeiro cadastro', icon: <Plus size={16} />, onClick: openNova }}
          />
        </div>
      ) : (
        <>
          {/* FILTROS + BUSCA */}
          <div className="my-[22px] mb-[18px] flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTROS.map(f => {
                const on = filtro === f.id
                const count = contagens?.[f.contagem]
                return (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    aria-pressed={on}
                    className={clsx(
                      'inline-flex h-[34px] items-center gap-[7px] rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream'
                    )}
                  >
                    {f.label}
                    {count != null && (
                      <span className={clsx(
                        'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[11px] font-bold',
                        on ? 'bg-white/[0.28] text-white' : 'bg-line-soft text-body'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="relative max-w-[440px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ"
                className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
              <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
              Carregando…
            </div>
          ) : (
            <div className="rounded-none border-0 bg-transparent shadow-none md:rounded-card md:border md:border-[#F0EEE9] md:bg-white md:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="hidden border-b border-line px-[18px] py-[13px] md:grid md:grid-cols-[2fr_1.2fr_1.2fr_46px] md:gap-4">
                {['Cadastro', 'Contato', 'CPF/CNPJ', ''].map((h, k) => (
                  <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">{h}</div>
                ))}
              </div>

              {cadastros.length > 0 ? (
                cadastros.map((c, i) => (
                  <CadastroRow
                    key={c.id}
                    cliente={c}
                    index={i}
                    rowZIndex={cadastros.length - i}
                    onEdit={openEdit}
                    onInativar={setConfirmInativar}
                    onReativar={handleReativar}
                  />
                ))
              ) : (
                <EmptyState
                  compact
                  title={query.trim() ? `Nenhum cadastro encontrado para "${query}"` : filtro === 'inativos' ? 'Nenhum cadastro inativo' : 'Nenhum cadastro neste filtro'}
                  description={query.trim() ? 'Ajuste o termo de busca ou o filtro.' : 'Troque o filtro para ver os demais cadastros.'}
                />
              )}
            </div>
          )}

          {/* CARREGAR MAIS */}
          {hasNext && !loading && (
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

      {drawer && (
        <CadastroDrawer
          key={editData ? editData.id : 'nova'}
          onClose={() => setDrawer(false)}
          editData={editData}
          onSuccess={handleSuccess}
        />
      )}

      <ConfirmacaoModal
        open={!!confirmInativar}
        onClose={() => setConfirmInativar(null)}
        onConfirm={handleInativar}
        variant="danger"
        title={`Inativar "${confirmInativar?.nome}"?`}
        icon={<Ban size={16} />}
        width={420}
        confirmLabel="Inativar"
        description="O cadastro deixa de aparecer na escolha de cliente e de fornecedor. Orçamentos, vendas e compras que já usam este cadastro continuam iguais. Você pode reativá-lo depois, pelo filtro Inativos."
      />

    </AppLayout>
  )
}
