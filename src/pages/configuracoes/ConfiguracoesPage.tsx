import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Toast from '../../components/shared/Toast'
import ModalShell from '../../components/ui/ModalShell'
import {
  Check, SlidersHorizontal, Building2, ShieldCheck, ArrowRight, Clock, Info, Settings,
  Wallet, Banknote, CreditCard, QrCode, Tag, Plus, Percent,
} from 'lucide-react'
import { empresaService } from '../../services/empresaService'
import { usuarioService } from '../../services/usuarioService'
import type { EmpresaResponse, ConfiguracaoResponse, MetodoPagamentoConfiguravelResponse, TipoMetodoPagamento } from '../../types/empresa'
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
        ? 'border-warning-alt shadow-[0_0_0_4px_rgba(224,92,58,0.10)]'
        : 'border-line focus-within:border-teal focus-within:shadow-[0_0_0_4px_rgba(42,157,143,0.12)]'
    )}>
      {prefix && (
        <span className="flex items-center gap-[7px] whitespace-nowrap border-r border-line bg-cream px-3.5 text-[14.5px] font-semibold text-dim group-focus-within:text-[#1F7A6F]">
          {icon && <span className="flex text-dim group-focus-within:text-teal">{icon}</span>}{prefix}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode={inputMode}
        className="h-[52px] min-w-0 flex-1 border-none bg-transparent px-3.5 font-[inherit] text-[17px] font-semibold text-dark outline-none [font-variant-numeric:tabular-nums]"
      />
      {suffix && (
        <span className="flex items-center border-l border-line bg-cream px-4 text-[15px] font-semibold text-dim group-focus-within:text-[#1F7A6F]">
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ── SubNav ──────────────────────────────────────────────────── */

const SUBABAS = [
  { id: 'precificacao' as const, label: 'Precificação',        icon: SlidersHorizontal, size: 15 },
  { id: 'perfil' as const,       label: 'Perfil da empresa',   icon: Building2,         size: 17 },
  { id: 'pagamento' as const,    label: 'Métodos de Pagamento', icon: Wallet,           size: 17 },
  { id: 'conta' as const,        label: 'Conta',               icon: ShieldCheck,       size: 17 },
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
              on ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body'
            )}
          >
            <span className={clsx('flex', on ? 'text-teal' : 'text-dim')}><a.icon size={a.size} /></span>
            {a.label}
            {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
          </button>
        )
      })}
    </div>
  )
}

/* ── PerfilCard ──────────────────────────────────────────────── */

function PerfilCard({ nome, email, configurada, onEditarPerfil }: {
  nome?: string
  email?: string
  configurada: boolean
  onEditarPerfil: () => void
}) {
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
          <span className="grid h-full w-full place-items-center bg-cream">
            <img src="/logo.png" width={42} height={42} alt="Logo" className="object-contain" />
          </span>
        </div>
        {configurada ? (
          <>
            <h3 className="mt-[13px] text-[17px] font-bold tracking-[-0.01em] text-dark">{nome}</h3>
            <p className="mt-[3px] text-[13.5px] text-muted">{email || ''}</p>
            <button
              onClick={onEditarPerfil}
              className="group mt-4 inline-flex items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 font-[inherit] text-[13.5px] font-semibold text-teal transition-[gap] duration-150 hover:gap-2.5"
            >
              Editar perfil <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
            <h3 className="mt-[13px] text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-dark">
              Você ainda não cadastrou os dados da sua empresa
            </h3>
            <p className="mt-[5px] text-[12.5px] leading-[1.5] text-muted">
              Nome, contato e logo aparecem nos PDFs e recibos enviados às clientes.
            </p>
            <button
              onClick={onEditarPerfil}
              className="group mt-4 inline-flex items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 font-[inherit] text-[13.5px] font-semibold text-teal transition-[gap] duration-150 hover:gap-2.5"
            >
              Cadastrar dados da empresa <ArrowRight size={17} />
            </button>
          </>
        )}
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
  empresaConfigurada,
  onEditarPerfil,
}: {
  initialValorHora: number
  initialMargemPadrao: number
  onSave: (valorHora: number, margemPadrao: number) => Promise<void>
  saving: boolean
  empresaNome?: string
  empresaEmail?: string
  empresaConfigurada: boolean
  onEditarPerfil: () => void
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
                Valor da sua hora de trabalho <span className="text-warning-alt">*</span>
              </label>
              <AffixInput value={hora} onChange={v => { setHora(v.replace(/[^\d.,]/g, '')); setFieldErrors(p => ({ ...p, hora: undefined })) }} prefix="R$/h" icon={<Clock size={18} />} inputMode="decimal" error={fieldErrors.hora} />
              {fieldErrors.hora
                ? <p className="mt-1.5 text-[12.5px] font-medium text-warning-alt">{fieldErrors.hora}</p>
                : <p className="mt-2 text-[12.5px] text-dim">Quanto vale uma hora do seu tempo produzindo.</p>
              }
            </div>
            <div>
              <label className="mb-2 block text-[13.5px] font-semibold text-body">
                Margem de lucro padrão <span className="text-warning-alt">*</span>
              </label>
              <AffixInput value={margem} onChange={v => { setMargem(v.replace(/[^\d]/g, '')); setFieldErrors(p => ({ ...p, margem: undefined })) }} suffix="%" inputMode="numeric" error={fieldErrors.margem} />
              {fieldErrors.margem
                ? <p className="mt-1.5 text-[12.5px] font-medium text-warning-alt">{fieldErrors.margem}</p>
                : <p className="mt-2 text-[12.5px] text-dim">Percentual aplicado sobre o custo para formar o preço sugerido.</p>
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
            <span className={clsx('flex items-center gap-[7px] text-[12.5px] font-medium', dirty ? 'text-warning' : 'text-dim')}>
              <span className={clsx('h-2 w-2 rounded-full', dirty ? 'bg-[#E8913B] shadow-[0_0_0_4px_rgba(232,145,59,0.18)]' : 'bg-dim')} />
              {dirty ? 'Você tem alterações não salvas' : 'Tudo salvo'}
            </span>
            <Button variant="primary" icon={<Check size={14} />} disabled={!dirty || saving || !isValid} onClick={salvar}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </div>

      <PerfilCard nome={empresaNome} email={empresaEmail} configurada={empresaConfigurada} onEditarPerfil={onEditarPerfil} />
      <Toast message={toast} />
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
          ? 'bg-cream text-subtle'
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
          <span className="grid h-[84px] w-[84px] flex-shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-cream shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <img src="/logo.png" width={50} height={50} alt="Logo" className="object-contain" />
          </span>
          <div>
            <Button variant="ghost">Alterar logo</Button>
            <p className="mt-[9px] text-[12.5px] leading-[1.5] text-dim">PNG ou JPG, fundo transparente recomendado.</p>
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

      <Toast message={toast} />
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

      <Toast message={toast} />

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

/* ── MetodosPagamento (#491, V0.12.0) ────────────────────────── */
//
// RN-NOVA-15/16/17 — 4 tipos fixos (semeados na criação da conta, sem nome próprio — rótulo vem
// do `tipo`) + OUTRO de nome livre. Toggle ativo/inativo em qualquer um; taxa da maquininha só em
// Cartão Crédito/Débito (informativa nesta versão); criação manual só de tipo OUTRO (tentar tipo
// fixo é sempre rejeitado pelo backend, RN-NOVA-16/CEN-NOVO-12).

const LABEL_TIPO_METODO: Record<TipoMetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão Crédito', CARTAO_DEBITO: 'Cartão Débito', OUTRO: '',
}

const ICON_TIPO_METODO: Record<TipoMetodoPagamento, React.ReactNode> = {
  DINHEIRO: <Banknote size={18} />, PIX: <QrCode size={18} />,
  CARTAO_CREDITO: <CreditCard size={18} />, CARTAO_DEBITO: <CreditCard size={18} />, OUTRO: <Tag size={18} />,
}

const TIPOS_CARTAO: TipoMetodoPagamento[] = ['CARTAO_CREDITO', 'CARTAO_DEBITO']

function AtivoToggle({ ativo, onChange, disabled }: { ativo: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        'relative h-6 w-11 flex-shrink-0 rounded-full border-none transition-colors duration-150 disabled:opacity-50',
        ativo ? 'bg-teal' : 'bg-line'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-150',
        ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function TaxaMaquininhaModal({ open, onClose, metodo, onSaved }: {
  open: boolean; onClose: () => void
  metodo: MetodoPagamentoConfiguravelResponse | null
  onSaved: (m: MetodoPagamentoConfiguravelResponse) => void
}) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (metodo) setValor(metodo.taxaMaquininha != null ? formatMargem(metodo.taxaMaquininha) : '')
    setErro(null)
  }, [metodo])

  if (!metodo) return null

  const salvar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const atualizado = await empresaService.atualizarMetodoPagamento(metodo.id, { taxaMaquininha: parseDecimal(valor) })
      onSaved(atualizado)
      onClose()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao salvar a taxa. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Taxa da maquininha — ${LABEL_TIPO_METODO[metodo.tipo]}`}
      subtitle="Só informativo nesta versão — não desconta nada do valor recebido."
      icon={<Percent size={17} />}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      }
    >
      <CfgField label="Taxa cobrada pela operadora">
        <AffixInput value={valor} onChange={setValor} suffix="%" inputMode="decimal" />
      </CfgField>
      {erro && <p className="mt-3 text-[12.5px] font-medium text-danger-deep">{erro}</p>}
    </ModalShell>
  )
}

function NovoMetodoOutroModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void
  onCreated: (m: MetodoPagamentoConfiguravelResponse) => void
}) {
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { if (open) { setNome(''); setErro(null) } }, [open])

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Informe o nome do método.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const criado = await empresaService.criarMetodoPagamento({ tipo: 'OUTRO', nome: nome.trim() })
      onCreated(criado)
      onClose()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao criar método. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Novo método de pagamento"
      subtitle="Ex.: Fiado, Vale-presente."
      icon={<Tag size={17} />}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Criando…' : 'Criar método'}</Button>
        </div>
      }
    >
      <CfgField label="Nome do método">
        <CfgInput value={nome} onChange={setNome} placeholder="Ex: Fiado" />
      </CfgField>
      {erro && <p className="mt-3 text-[12.5px] font-medium text-danger-deep">{erro}</p>}
    </ModalShell>
  )
}

function MetodoPagamentoCard({ metodo, onToggle, onConfigurarTaxa, atualizando }: {
  metodo: MetodoPagamentoConfiguravelResponse
  onToggle: () => void
  onConfigurarTaxa: () => void
  atualizando: boolean
}) {
  const label = metodo.tipo === 'OUTRO' ? (metodo.nome || 'Sem nome') : LABEL_TIPO_METODO[metodo.tipo]
  const podeConfigurarTaxa = TIPOS_CARTAO.includes(metodo.tipo)

  return (
    <div className={clsx(
      'flex items-center justify-between gap-4 rounded-input border-[1.5px] px-4 py-3.5 transition-opacity',
      metodo.ativo ? 'border-line bg-white' : 'border-line bg-cream opacity-70'
    )}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={clsx('grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px]', metodo.ativo ? 'bg-teal/10 text-teal' : 'bg-line-soft text-dim')}>
          {ICON_TIPO_METODO[metodo.tipo]}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14.5px] font-semibold text-dark">{label}</span>
            {metodo.tipo === 'OUTRO' && (
              <span className="flex-shrink-0 rounded-full bg-line-soft px-2 py-0.5 text-[10.5px] font-semibold text-subtle">Personalizado</span>
            )}
          </div>
          {podeConfigurarTaxa && (
            <button onClick={onConfigurarTaxa} className="mt-0.5 border-none bg-transparent p-0 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline">
              {metodo.taxaMaquininha != null ? `Taxa: ${formatMargem(metodo.taxaMaquininha)}%` : 'Configurar taxa da maquininha'}
            </button>
          )}
        </div>
      </div>
      <AtivoToggle ativo={metodo.ativo} onChange={onToggle} disabled={atualizando} />
    </div>
  )
}

function MetodosPagamento({ metodos, onReload }: {
  metodos: MetodoPagamentoConfiguravelResponse[]
  onReload: (novos: MetodoPagamentoConfiguravelResponse[]) => void
}) {
  const { toast, setToast } = useToast()
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [metodoTaxa, setMetodoTaxa] = useState<MetodoPagamentoConfiguravelResponse | null>(null)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)

  const substituir = (atualizado: MetodoPagamentoConfiguravelResponse) => {
    onReload(metodos.map(m => m.id === atualizado.id ? atualizado : m))
  }

  const toggle = async (m: MetodoPagamentoConfiguravelResponse) => {
    setAtualizandoId(m.id)
    try {
      const atualizado = await empresaService.atualizarMetodoPagamento(m.id, { ativo: !m.ativo })
      substituir(atualizado)
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao atualizar método. Tente novamente.'))
    } finally {
      setAtualizandoId(null)
    }
  }

  const ordem: Record<TipoMetodoPagamento, number> = { DINHEIRO: 0, PIX: 1, CARTAO_CREDITO: 2, CARTAO_DEBITO: 3, OUTRO: 4 }
  const metodosOrdenados = [...metodos].sort((a, b) => (ordem[a.tipo] - ordem[b.tipo]) || (a.nome || '').localeCompare(b.nome || ''))

  return (
    <div className="max-w-[640px] animate-[fadeUp_.35s_ease_both]">
      <div className="rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="mb-[5px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-[11px]">
            <span className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
              <Wallet size={16} />
            </span>
            <h2 className="m-0 text-lg font-bold tracking-[-0.01em] text-dark">Métodos de Pagamento</h2>
          </div>
          <Button variant="ghost" icon={<Plus size={14} />} onClick={() => setModalNovoAberto(true)}>Novo método</Button>
        </div>
        <p className="mb-[22px] ml-[49px] mt-0 text-[13.5px] leading-[1.5] text-muted">
          Formas de pagamento aceitas no Caixa — uma venda pode ser dividida entre vários.
        </p>

        <div className="flex flex-col gap-2.5">
          {metodosOrdenados.map(m => (
            <MetodoPagamentoCard
              key={m.id}
              metodo={m}
              atualizando={atualizandoId === m.id}
              onToggle={() => toggle(m)}
              onConfigurarTaxa={() => setMetodoTaxa(m)}
            />
          ))}
        </div>
      </div>

      <TaxaMaquininhaModal
        open={!!metodoTaxa}
        metodo={metodoTaxa}
        onClose={() => setMetodoTaxa(null)}
        onSaved={substituir}
      />
      <NovoMetodoOutroModal
        open={modalNovoAberto}
        onClose={() => setModalNovoAberto(false)}
        onCreated={m => onReload([...metodos, m])}
      />
      <Toast message={toast} />
    </div>
  )
}

/* ── ConfiguracoesPage ───────────────────────────────────────── */

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<SubAba>('precificacao')
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null)
  const [configuracao, setConfiguracao] = useState<ConfiguracaoResponse | null>(null)
  const [metodosPagamento, setMetodosPagamento] = useState<MetodoPagamentoConfiguravelResponse[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [savingPrecif, setSavingPrecif] = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)

  useEffect(() => {
    Promise.all([
      empresaService.getEmpresa(),
      empresaService.getConfiguracao(),
      empresaService.listarMetodosPagamento(),
    ]).then(([emp, cfg, metodos]) => {
      setEmpresa(emp)
      setConfiguracao(cfg)
      setMetodosPagamento(metodos)
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
              empresaConfigurada={!!empresa}
              onEditarPerfil={() => setAba('perfil')}
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
          {aba === 'pagamento' && (
            <MetodosPagamento metodos={metodosPagamento} onReload={setMetodosPagamento} />
          )}
          {aba === 'conta' && <ContaSeguranca />}
        </>
      )}

    </AppLayout>
  )
}
