import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { Check, SlidersHorizontal, Building2, ShieldCheck, ArrowRight, Clock, Info, Settings } from 'lucide-react'
import { empresaService } from '../../services/empresaService'
import { usuarioService } from '../../services/usuarioService'
import type { EmpresaResponse, ConfiguracaoResponse } from '../../types/empresa'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'

/* ── helpers ─────────────────────────────────────────────────── */

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const parseDecimal = (s: string) => {
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(s) || 0
}

const formatHora = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatMargem = (v: number) =>
  Number.isInteger(v) ? v.toString() : v.toLocaleString('pt-BR')

/* ── AffixInput ──────────────────────────────────────────────── */

function AffixInput({ value, onChange, prefix, suffix, icon, inputMode, error }: {
  value: string; onChange: (v: string) => void
  prefix?: string; suffix?: string; icon?: React.ReactNode
  inputMode?: 'decimal' | 'numeric'; error?: string
}) {
  const hasError = !!error
  return (
    <div className={clsx(
      'group relative flex max-w-[300px] items-stretch overflow-hidden rounded-input border-[1.5px] bg-white transition-[border-color,box-shadow] duration-150',
      hasError
        ? 'border-[#E05C3A] shadow-[0_0_0_4px_rgba(224,92,58,0.10)]'
        : 'border-line focus-within:border-teal focus-within:shadow-[0_0_0_4px_rgba(42,157,143,0.12)]'
    )}>
      {prefix && (
        <span className="flex items-center gap-[7px] whitespace-nowrap border-r border-line bg-[#FAF8F5] px-3.5 text-[14.5px] font-semibold text-[#6B6860] group-focus-within:text-[#1F7A6F]">
          {icon && <span className="flex text-[#A8A49C] group-focus-within:text-teal">{icon}</span>}{prefix}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode={inputMode}
        className="h-[52px] min-w-0 flex-1 border-none bg-transparent px-3.5 font-[inherit] text-[17px] font-semibold text-dark outline-none [font-variant-numeric:tabular-nums]"
      />
      {suffix && (
        <span className="flex items-center border-l border-line bg-[#FAF8F5] px-4 text-[15px] font-semibold text-[#6B6860] group-focus-within:text-[#1F7A6F]">
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ── SubNav ──────────────────────────────────────────────────── */

const SUBABAS = [
  { id: 'precificacao' as const, label: 'Precificação',      icon: SlidersHorizontal, size: 15 },
  { id: 'perfil' as const,       label: 'Perfil da empresa', icon: Building2,         size: 17 },
  { id: 'conta' as const,        label: 'Conta',             icon: ShieldCheck,       size: 17 },
]

type SubAba = typeof SUBABAS[number]['id']

function SubNav({ aba, setAba }: { aba: SubAba; setAba: (a: SubAba) => void }) {
  return (
    <div className="mb-[26px] flex gap-1 overflow-x-auto border-b-[1.5px] border-line">
      {SUBABAS.map(a => {
        const on = aba === a.id
        return (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={clsx(
              'relative flex items-center gap-2 whitespace-nowrap border-none bg-transparent px-4 py-3 font-[inherit] text-[14.5px] transition-colors duration-150',
              on ? 'font-semibold text-teal' : 'font-medium text-[#8A8780] hover:text-body'
            )}
          >
            <span className={clsx('flex', on ? 'text-teal' : 'text-[#B0ACA4]')}><a.icon size={a.size} /></span>
            {a.label}
            {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
          </button>
        )
      })}
    </div>
  )
}

/* ── PerfilCard ──────────────────────────────────────────────── */

function PerfilCard({ nome, email }: { nome?: string; email?: string }) {
  const dots: [string, string, number, string][] = [
    ['18%', '40%', 5, '#F97316'],
    ['82%', '30%', 6, '#2A9D8F'],
    ['66%', '68%', 4, '#F97316'],
  ]
  return (
    <div className="animate-[fadeUp_.4s_ease_both] overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="relative h-16 bg-[linear-gradient(120deg,rgba(42,157,143,0.16),rgba(249,115,22,0.12))]">
        <div className="pointer-events-none absolute inset-0">
          {dots.map((d, k) => (
            <span key={k} className="absolute rounded-full" style={{ left: d[0], top: d[1], width: d[2], height: d[2], background: hexA(d[3], 0.6) }} />
          ))}
        </div>
      </div>
      <div className="-mt-8 px-5 pb-5 text-center">
        <div className="mx-auto grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.2)]">
          <span className="grid h-full w-full place-items-center bg-[#FAF8F5]">
            <img src="/logo.png" width={42} height={42} alt="Logo" className="object-contain" />
          </span>
        </div>
        <h3 className="mt-[13px] text-[17px] font-bold tracking-[-0.01em] text-dark">{nome || '—'}</h3>
        <p className="mt-[3px] text-[13.5px] text-muted">{email || ''}</p>
        <button className="group mt-4 inline-flex items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 font-[inherit] text-[13.5px] font-semibold text-teal transition-[gap] duration-150 hover:gap-2.5">
          Editar perfil <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}

/* ── Precificacao ─────────────────────────────────────────────── */

function Precificacao({
  initialValorHora,
  initialMargemPadrao,
  onSave,
  saving,
  empresaNome,
  empresaEmail,
}: {
  initialValorHora: number
  initialMargemPadrao: number
  onSave: (valorHora: number, margemPadrao: number) => Promise<void>
  saving: boolean
  empresaNome?: string
  empresaEmail?: string
}) {
  const [hora, setHora] = useState(formatHora(initialValorHora))
  const [margem, setMargem] = useState(formatMargem(initialMargemPadrao))
  const { toast, setToast } = useToast()
  const [saved, setSaved] = useState({ hora: formatHora(initialValorHora), margem: formatMargem(initialMargemPadrao) })
  const [fieldErrors, setFieldErrors] = useState<{ hora?: string; margem?: string }>({})
  const dirty = hora !== saved.hora || margem !== saved.margem

  useEffect(() => {
    const h = formatHora(initialValorHora)
    const m = formatMargem(initialMargemPadrao)
    setHora(h)
    setMargem(m)
    setSaved({ hora: h, margem: m })
  }, [initialValorHora, initialMargemPadrao])

  const validate = () => {
    const erros: { hora?: string; margem?: string } = {}
    if (!hora.trim() || parseDecimal(hora) <= 0) erros.hora = 'Informe um valor maior que zero.'
    if (!margem.trim() || parseDecimal(margem) <= 0) erros.margem = 'Informe um valor maior que zero.'
    return erros
  }

  const isValid = hora.trim() && parseDecimal(hora) > 0 && margem.trim() && parseDecimal(margem) > 0

  const salvar = async () => {
    const erros = validate()
    if (Object.keys(erros).length > 0) {
      setFieldErrors(erros)
      return
    }
    setFieldErrors({})
    try {
      await onSave(parseDecimal(hora), parseDecimal(margem))
      setSaved({ hora, margem })
      setToast('Configurações salvas com sucesso!')
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao salvar. Tente novamente.'))
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,640px)_320px]">
      <div className="flex flex-col gap-6">
        <div className="animate-[fadeUp_.35s_ease_both] rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-[5px] flex items-center gap-[11px]">
            <span className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
              <SlidersHorizontal size={15} />
            </span>
            <h2 className="m-0 text-lg font-bold tracking-[-0.01em] text-dark">Como você quer precificar?</h2>
          </div>
          <p className="mb-[22px] ml-[49px] mt-0 text-[13.5px] leading-[1.5] text-muted">
            Estes parâmetros alimentam a calculadora de preço de todos os seus produtos.
          </p>

          <div className="flex flex-col gap-[22px]">
            <div>
              <label className="mb-2 block text-[13.5px] font-semibold text-body">
                Valor da sua hora de trabalho <span className="text-[#E05C3A]">*</span>
              </label>
              <AffixInput value={hora} onChange={v => { setHora(v.replace(/[^\d.,]/g, '')); setFieldErrors(p => ({ ...p, hora: undefined })) }} prefix="R$/h" icon={<Clock size={18} />} inputMode="decimal" error={fieldErrors.hora} />
              {fieldErrors.hora
                ? <p className="mt-1.5 text-[12.5px] font-medium text-[#E05C3A]">{fieldErrors.hora}</p>
                : <p className="mt-2 text-[12.5px] text-[#A8A49C]">Quanto vale uma hora do seu tempo produzindo.</p>
              }
            </div>
            <div>
              <label className="mb-2 block text-[13.5px] font-semibold text-body">
                Margem de lucro padrão <span className="text-[#E05C3A]">*</span>
              </label>
              <AffixInput value={margem} onChange={v => { setMargem(v.replace(/[^\d]/g, '')); setFieldErrors(p => ({ ...p, margem: undefined })) }} suffix="%" inputMode="numeric" error={fieldErrors.margem} />
              {fieldErrors.margem
                ? <p className="mt-1.5 text-[12.5px] font-medium text-[#E05C3A]">{fieldErrors.margem}</p>
                : <p className="mt-2 text-[12.5px] text-[#A8A49C]">Percentual aplicado sobre o custo para formar o preço sugerido.</p>
              }
            </div>
          </div>

          <div className="mt-6 flex gap-3 rounded-xl border border-teal/[0.18] border-l-[3px] border-l-teal bg-teal/[0.06] px-4 py-3.5">
            <Info size={15} className="mt-px flex-shrink-0 text-teal" />
            <p className="m-0 text-[13px] leading-[1.55] text-[#3F5B54]">
              Alterar estes valores <strong className="font-bold">não recalcula orçamentos já criados</strong>. Somente novos orçamentos usarão os parâmetros atualizados.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3.5 border-t border-line pt-[22px]">
            <span className={clsx('flex items-center gap-[7px] text-[12.5px] font-medium', dirty ? 'text-warning' : 'text-[#A8A49C]')}>
              <span className={clsx('h-2 w-2 rounded-full', dirty ? 'bg-[#E8913B] shadow-[0_0_0_4px_rgba(232,145,59,0.18)]' : 'bg-[#CFCBC3]')} />
              {dirty ? 'Você tem alterações não salvas' : 'Tudo salvo'}
            </span>
            <Button variant="primary" icon={<Check size={14} />} disabled={!dirty || saving || !isValid} onClick={salvar}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </div>

      <PerfilCard nome={empresaNome} email={empresaEmail} />
      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ── CfgField / CfgInput / SectionHead ───────────────────────── */

function CfgField({ label, opt, children }: { label: string; opt?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13.5px] font-semibold text-body">
        {label}{opt && <span className="ml-1.5 text-xs font-medium text-faint">(opcional)</span>}
      </span>
      {children}
    </label>
  )
}

function CfgInput({ value: extValue, onChange: extOnChange, defaultValue = '', type = 'text', placeholder, readOnly, inputMode }: {
  value?: string; onChange?: (v: string) => void
  defaultValue?: string; type?: string; placeholder?: string; readOnly?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [internalV, setInternalV] = useState(defaultValue)
  const isControlled = extValue !== undefined
  const v = isControlled ? extValue : internalV

  return (
    <input
      type={type} value={v} placeholder={placeholder} readOnly={readOnly} inputMode={inputMode}
      onChange={e => {
        if (isControlled) extOnChange?.(e.target.value)
        else setInternalV(e.target.value)
      }}
      className={clsx(
        'h-12 w-full rounded-input border-[1.5px] border-line px-3.5 font-[inherit] text-[14.5px] outline-none transition-[border-color,box-shadow] duration-150',
        readOnly
          ? 'bg-[#FAF8F5] text-subtle'
          : 'bg-white text-dark focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
      )}
    />
  )
}

function SectionHead({ icon, titulo }: { icon: React.ReactNode; titulo: string }) {
  return (
    <div className="mb-[18px] flex items-center gap-[11px]">
      <span className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">{icon}</span>
      <h2 className="m-0 whitespace-nowrap text-lg font-bold tracking-[-0.01em] text-dark">{titulo}</h2>
    </div>
  )
}

/* ── PerfilEmpresa ───────────────────────────────────────────── */

function PerfilEmpresa({
  initialNome,
  initialEmail,
  initialWhatsapp,
  initialEndereco,
  onSave,
  saving,
}: {
  initialNome: string
  initialEmail: string
  initialWhatsapp: string
  initialEndereco: string
  onSave: (nome: string, email: string, whatsapp: string, endereco: string) => Promise<void>
  saving: boolean
}) {
  const [nome, setNome] = useState(initialNome)
  const [email, setEmail] = useState(initialEmail)
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp)
  const [endereco, setEndereco] = useState(initialEndereco)
  const { toast, setToast } = useToast()

  useEffect(() => {
    setNome(initialNome)
    setEmail(initialEmail)
    setWhatsapp(initialWhatsapp)
    setEndereco(initialEndereco)
  }, [initialNome, initialEmail, initialWhatsapp, initialEndereco])

  const salvar = async () => {
    try {
      await onSave(nome, email, whatsapp, endereco)
      setToast('Configurações salvas com sucesso!')
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao salvar. Tente novamente.'))
    }
  }

  return (
    <div className="max-w-[640px] animate-[fadeUp_.35s_ease_both]">
      <div className="rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <SectionHead icon={<Building2 size={17} />} titulo="Perfil da empresa" />

        <div className="mb-[22px] flex flex-wrap items-center gap-[18px] border-b border-line pb-[22px]">
          <span className="grid h-[84px] w-[84px] flex-shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-[#FAF8F5] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <img src="/logo.png" width={50} height={50} alt="Logo" className="object-contain" />
          </span>
          <div>
            <Button variant="ghost">Alterar logo</Button>
            <p className="mt-[9px] text-[12.5px] leading-[1.5] text-[#A8A49C]">PNG ou JPG, fundo transparente recomendado.</p>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          <CfgField label="Nome da empresa">
            <CfgInput value={nome} onChange={setNome} placeholder="Nome do seu ateliê ou negócio" />
          </CfgField>
          <CfgField label="E-mail de contato">
            <CfgInput value={email} onChange={setEmail} type="email" placeholder="email@contato.com" />
          </CfgField>
          <CfgField label="WhatsApp / Telefone">
            <CfgInput value={whatsapp} onChange={setWhatsapp} inputMode="tel" placeholder="(00) 00000-0000" />
          </CfgField>
          <CfgField label="Endereço" opt>
            <CfgInput value={endereco} onChange={setEndereco} placeholder="Rua, número, bairro, cidade" />
          </CfgField>
        </div>

        <div className="mt-[22px] flex gap-3 rounded-xl border border-teal/[0.18] border-l-[3px] border-l-teal bg-teal/[0.06] px-4 py-3.5">
          <Info size={15} className="mt-px flex-shrink-0 text-teal" />
          <p className="m-0 text-[13px] leading-[1.55] text-[#3F5B54]">
            Estas informações aparecem em todos os PDFs gerados pelo sistema (orçamentos, recibos e multas).
          </p>
        </div>

        <div className="mt-6 flex justify-end border-t border-line pt-[22px]">
          <Button variant="primary" icon={<Check size={14} />} disabled={saving} onClick={salvar}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ── ContaSeguranca ──────────────────────────────────────────── */

function ContaSeguranca() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const { toast, setToast } = useToast()

  const atualizarSenha = async () => {
    if (novaSenha.length < 8) {
      setToast('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (novaSenha !== confirmarNovaSenha) {
      setToast('As senhas não coincidem.')
      return
    }
    setAtualizando(true)
    try {
      await usuarioService.alterarSenha({ senhaAtual, novaSenha, confirmarNovaSenha })
      setToast('Senha atualizada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarNovaSenha('')
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao atualizar senha. Tente novamente.'))
    } finally {
      setAtualizando(false)
    }
  }

  return (
    <div className="flex max-w-[640px] animate-[fadeUp_.35s_ease_both] flex-col gap-[22px]">
      <div className="rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <SectionHead icon={<ShieldCheck size={17} />} titulo="Dados de acesso" />

        <CfgField label="E-mail atual">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-0 flex-[1_1_240px]"><CfgInput defaultValue="ana@atelier.com" readOnly /></div>
            <Button variant="ghost">Alterar e-mail</Button>
          </div>
        </CfgField>

        <div className="mt-[22px] border-t border-line pt-[22px]">
          <h3 className="m-0 mb-4 text-[15px] font-bold text-dark">Alterar senha</h3>
          <div className="flex flex-col gap-4">
            <CfgField label="Senha atual"><CfgInput type="password" value={senhaAtual} onChange={setSenhaAtual} placeholder="••••••••" /></CfgField>
            <CfgField label="Nova senha"><CfgInput type="password" value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 8 caracteres" /></CfgField>
            <CfgField label="Confirmar nova senha"><CfgInput type="password" value={confirmarNovaSenha} onChange={setConfirmarNovaSenha} placeholder="Repita a nova senha" /></CfgField>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" disabled={atualizando} onClick={atualizarSenha}>
              {atualizando ? 'Atualizando…' : 'Atualizar senha'}
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      <div className="rounded-card border-[1.5px] border-[#F2D8CF] bg-[#FEF8F6] px-7 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h3 className="m-0 text-[15.5px] font-bold text-danger-deep">Excluir conta</h3>
        <p className="mb-[18px] mt-[7px] max-w-[440px] text-[13.5px] leading-[1.55] text-[#8A5A4C]">
          Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
        </p>
        <button className="h-[46px] whitespace-nowrap rounded-input border-[1.5px] border-[#E3A799] bg-transparent px-5 font-[inherit] text-sm font-semibold text-danger transition-colors duration-150 hover:bg-[#FBEDE7]">
          Solicitar exclusão da conta
        </button>
      </div>
    </div>
  )
}

/* ── ConfiguracoesPage ───────────────────────────────────────── */

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<SubAba>('precificacao')
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null)
  const [configuracao, setConfiguracao] = useState<ConfiguracaoResponse | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [savingPrecif, setSavingPrecif] = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)

  useEffect(() => {
    Promise.all([
      empresaService.getEmpresa(),
      empresaService.getConfiguracao(),
    ]).then(([emp, cfg]) => {
      setEmpresa(emp)
      setConfiguracao(cfg)
    }).catch(console.error)
      .finally(() => setLoadingData(false))
  }, [])

  const handleSavePrecificacao = async (valorHora: number, margemPadrao: number) => {
    setSavingPrecif(true)
    try {
      const result = await empresaService.upsertConfiguracao({ valorHora, margemPadrao })
      setConfiguracao(result)
    } finally {
      setSavingPrecif(false)
    }
  }

  const handleSavePerfil = async (nome: string, email: string, whatsapp: string, endereco: string) => {
    setSavingPerfil(true)
    try {
      const result = await empresaService.upsertEmpresa({ nome, email, whatsapp, endereco })
      setEmpresa(result)
    } finally {
      setSavingPerfil(false)
    }
  }

  return (
    <AppLayout active="config" compact>

      <div className="mb-[22px] flex items-center gap-[15px]">
        <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[15px] bg-teal/10 text-teal">
          <Settings size={26} />
        </span>
        <div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.02em] text-dark">Configurações</h1>
          <p className="mt-1 text-[14.5px] text-muted">Defina as regras do seu negócio.</p>
        </div>
      </div>

      <SubNav aba={aba} setAba={setAba} />

      {loadingData ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando configurações…
        </div>
      ) : (
        <>
          {aba === 'precificacao' && (
            <Precificacao
              initialValorHora={configuracao?.valorHora ?? 0}
              initialMargemPadrao={configuracao?.margemPadrao ?? 0}
              onSave={handleSavePrecificacao}
              saving={savingPrecif}
              empresaNome={empresa?.nome}
              empresaEmail={empresa?.email}
            />
          )}
          {aba === 'perfil' && (
            <PerfilEmpresa
              initialNome={empresa?.nome ?? ''}
              initialEmail={empresa?.email ?? ''}
              initialWhatsapp={empresa?.whatsapp ?? ''}
              initialEndereco={empresa?.endereco ?? ''}
              onSave={handleSavePerfil}
              saving={savingPerfil}
            />
          )}
          {aba === 'conta' && <ContaSeguranca />}
        </>
      )}

    </AppLayout>
  )
}
