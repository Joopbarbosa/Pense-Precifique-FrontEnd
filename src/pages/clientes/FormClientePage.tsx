import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Check, ChevronRight, Save } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, SegmentedControl, TextArea } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import SectionTitle from '../../components/shared/SectionTitle'
import { clienteService } from '../../services/clienteService'
import { extractApiError } from '../../utils/apiError'
import { mascararDocumento, ROTULO_DOCUMENTO } from '../../utils/documento'
import { mascararTelefone } from '../../utils/telefone'
import type { ClienteRequest, TipoPessoa } from '../../types/cliente'

// V0.15.0 (#536/#537, Decisão 21) — cadastro/edição em página própria, no formato de
// FormInsumoPage: /clientes/novo e /clientes/:id/editar. Salvar leva ao detalhe (/clientes/:id).

const inputBase = 'h-12 w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus'

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

type FormState = {
  nome: string
  ehCliente: boolean
  ehFornecedor: boolean
  tipoPessoa: TipoPessoa
  documento: string
  whatsapp: string
  telefone: string
  email: string
  site: string
  endereco: string
  observacoes: string
}

const FORM_VAZIO: FormState = {
  nome: '',
  // Cadastro novo nasce como Cliente (o uso mais comum); a artesã desmarca/marca à vontade.
  ehCliente: true,
  ehFornecedor: false,
  tipoPessoa: 'FISICA',
  documento: '',
  whatsapp: '',
  telefone: '',
  email: '',
  site: '',
  endereco: '',
  observacoes: '',
}

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

export default function FormClientePage() {
  const { id } = useParams<{ id: string }>()
  const editando = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [identificador, setIdentificador] = useState<string | undefined>()
  const [carregando, setCarregando] = useState(editando)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    setCarregando(true)
    clienteService.buscarPorId(id)
      .then(c => {
        setIdentificador(c.identificador)
        setForm({
          nome: c.nome,
          ehCliente: c.ehCliente,
          ehFornecedor: c.ehFornecedor,
          tipoPessoa: c.tipoPessoa,
          documento: c.documento ? mascararDocumento(c.documento, c.tipoPessoa) : '',
          whatsapp: c.whatsapp ?? '',
          telefone: c.telefone ?? '',
          email: c.email ?? '',
          site: c.site ?? '',
          endereco: c.endereco ?? '',
          observacoes: c.observacoes ?? '',
        })
      })
      .catch(err => setErroCarga(extractApiError(err, 'Não foi possível carregar o cadastro.')))
      .finally(() => setCarregando(false))
  }, [id])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

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
      const salvo = editando ? await clienteService.editar(id!, req) : await clienteService.cadastrar(req)
      navigate(`/clientes/${salvo.id}`, { state: { toast: editando ? 'Cadastro atualizado com sucesso!' : 'Cadastro salvo com sucesso!' } })
    } catch (err: any) {
      const fe: Record<string, string> = err.response?.data?.fieldErrors ?? {}
      setFieldErrors(fe)
      setErro(Object.keys(fe).length > 0 ? 'Revise os campos destacados.' : extractApiError(err, 'Erro ao salvar. Tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (campo: string) => clsx(inputBase, fieldErrors[campo] ? 'border-[#F2B8A6]' : 'border-line')
  const titulo = editando ? 'Editar cadastro' : 'Novo cadastro'

  if (carregando || erroCarga) {
    return (
      <AppLayout active="clientes" compact>
        {erroCarga ? (
          <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">{erroCarga}</div>
        ) : (
          <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
            <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
            Carregando cadastro…
          </div>
        )}
      </AppLayout>
    )
  }

  return (
    <AppLayout active="clientes" compact>

      <div className="mb-[22px]">
        <div className="mb-2 flex items-center gap-[7px] text-[12.5px] text-muted">
          <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/clientes')}>
            Clientes e Fornecedores
          </span>
          <ChevronRight size={15} className="text-dim" />
          {editando && (
            <>
              <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate(`/clientes/${id}`)}>
                {identificador ?? form.nome}
              </span>
              <ChevronRight size={15} className="text-dim" />
            </>
          )}
          <span className="font-semibold text-body">{titulo}</span>
        </div>
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-dark">{titulo}</h1>
      </div>

      <div className="max-w-[760px] animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

        {/* SEÇÃO 1 — Identificação */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="1" title="Identificação" subtitle="Quem é e qual papel tem para você." />
          <div className="flex flex-col gap-[18px]">
            <Field label="Este cadastro é" group size="md" required>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <PapelOpcao label="Cliente" descricao="Compra de você" marcado={form.ehCliente} onClick={() => set('ehCliente', !form.ehCliente)} />
                <PapelOpcao label="Fornecedor" descricao="Vende para você" marcado={form.ehFornecedor} onClick={() => set('ehFornecedor', !form.ehFornecedor)} />
              </div>
            </Field>

            <Field label="Nome" required size="md" erro={fieldErrors.nome}>
              <input className={inputClass('nome')} maxLength={255} placeholder="Beatriz Santos ou Papelaria Central"
                value={form.nome} onChange={e => set('nome', e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
              <Field label="Tipo de pessoa" group size="md">
                <SegmentedControl options={TIPOS_PESSOA} value={form.tipoPessoa} onChange={trocarTipo} textSize="text-[13.5px]" />
              </Field>
              <Field label={ROTULO_DOCUMENTO[form.tipoPessoa]} opt size="md" erro={fieldErrors.documento}>
                <input className={clsx(inputClass('documento'), '[font-variant-numeric:tabular-nums]')} maxLength={30}
                  placeholder={PLACEHOLDER_DOCUMENTO[form.tipoPessoa]}
                  value={form.documento} onChange={e => set('documento', mascararDocumento(e.target.value, form.tipoPessoa))} />
              </Field>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2 — Contato */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="2" title="Contato" subtitle="Como falar com esta pessoa ou empresa." />
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
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
          </div>
        </div>

        {/* SEÇÃO 3 — Endereço e observações */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="3" title="Endereço e observações" />
          <div className="flex flex-col gap-[18px]">
            <Field label="Endereço" opt size="md">
              <TextArea value={form.endereco} onChange={v => set('endereco', v)} erro={fieldErrors.endereco}
                minHeight="min-h-[64px]" placeholder="Rua, número, bairro, cidade" />
            </Field>
            <Field label="Observações" opt size="md">
              <TextArea value={form.observacoes} onChange={v => set('observacoes', v)} erro={fieldErrors.observacoes}
                placeholder="Ex: Prefere entregas às sextas" />
            </Field>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="flex flex-col gap-3 px-[26px] py-[18px]">
          {erro && (
            <p role="alert" className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate(editando ? `/clientes/${id}` : '/clientes')}>Cancelar</Button>
            <Button variant="primary" icon={<Save size={16} />} disabled={saving} onClick={handleSave}>
              {saving ? 'Salvando…' : 'Salvar cadastro'}
            </Button>
          </div>
        </div>
      </div>

    </AppLayout>
  )
}
