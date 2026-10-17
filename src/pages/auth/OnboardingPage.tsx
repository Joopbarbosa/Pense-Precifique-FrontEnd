import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark, Button, Spinner } from '../../components/ui'
import { Check, Lightbulb, Clock, TrendingUp, Settings, Image, X } from 'lucide-react'
import { empresaService } from '../../services/empresaService'
import { useAuthStore } from '../../store/authStore'
import { extractApiError } from '../../utils/apiError'
import { MENSAGEM_TELEFONE_INVALIDO, telefoneValido } from '../../utils/telefone'
import { BotaoNumeroEstrangeiro, useModoTelefone } from '../../components/ui/TelefoneEstrangeiro'
import type { EmpresaResponse } from '../../types/empresa'

// ── Stepper ────────────────────────────────────────────────────────────────
function Passo({ n, rotulo, estado }: { n: number; rotulo: string; estado: 'feito' | 'atual' | 'pendente' }) {
  return (
    <div className="flex items-center gap-[9px]">
      {estado === 'feito' ? (
        <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-teal/40 bg-teal/[0.14] text-teal">
          <Check size={14} />
        </span>
      ) : (
        <span className={clsx(
          'grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold',
          estado === 'atual'
            ? 'bg-teal text-white shadow-[0_4px_10px_-4px_rgba(42,157,143,0.7)]'
            : 'border-[1.5px] border-line bg-white text-muted'
        )}>
          {n}
        </span>
      )}
      <span className={clsx('whitespace-nowrap text-sm', estado === 'atual' ? 'font-semibold text-dark' : 'font-medium text-muted')}>
        {rotulo}
      </span>
    </div>
  )
}

function Stepper({ passo }: { passo: 1 | 2 }) {
  return (
    <div className="mb-6 flex items-center gap-3.5">
      <Passo n={1} rotulo="Sua conta" estado="feito" />
      <span className="h-0.5 min-w-6 flex-1 rounded-xs bg-[linear-gradient(90deg,rgba(42,157,143,0.5),#EFEDE8)]" />
      <Passo n={2} rotulo="Sua empresa" estado={passo === 1 ? 'atual' : 'feito'} />
      <span className="h-0.5 min-w-6 flex-1 rounded-xs bg-[linear-gradient(90deg,rgba(42,157,143,0.5),#EFEDE8)]" />
      <Passo n={3} rotulo="Precificação" estado={passo === 2 ? 'atual' : 'pendente'} />
    </div>
  )
}

// ── PriceField ─────────────────────────────────────────────────────────────
interface PriceFieldProps {
  icon: React.ReactNode
  question: string
  explain: string
  affix: string
  affixSide: 'left' | 'right'
  placeholder: string
  dica: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'decimal' | 'numeric'
  error?: string
}

function PriceField({ icon, question, explain, affix, affixSide, placeholder, dica, value, onChange, inputMode, error }: PriceFieldProps) {
  const hasError = !!error

  return (
    <div className="flex items-start gap-3.5">
      <span className="mt-0.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <label className="block text-[15.5px] font-semibold tracking-[-0.01em] text-dark">
          {question} <span className="text-[15px] text-warning-alt">*</span>
        </label>
        <p className="mt-1 mb-3 text-[13px] leading-normal text-muted">{explain}</p>

        <div className={clsx(
          'flex h-[54px] items-stretch overflow-hidden rounded-input border-[1.5px] bg-white transition-[border-color,box-shadow] duration-150',
          hasError
            ? 'border-warning-alt ring-4 ring-warning-alt/10'
            : 'border-line focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/12'
        )}>
          {affixSide === 'left' && (
            <span className="grid place-items-center border-r border-line bg-cream px-4 text-base font-semibold text-dim">
              {affix}
            </span>
          )}
          <input
            type="text"
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
            className="min-w-0 flex-1 border-none bg-transparent px-4 font-[inherit] text-lg font-semibold text-dark outline-hidden"
          />
          {affixSide === 'right' && (
            <span className="grid place-items-center border-l border-line bg-cream px-section text-[17px] font-semibold text-dim">
              {affix}
            </span>
          )}
        </div>

        {hasError && (
          <p className="mt-1.5 mb-0 text-[12.5px] font-medium text-warning-alt">{error}</p>
        )}

        <div className={clsx(
          'flex items-start gap-[9px] rounded-xl border border-[#FCE2CF] bg-orange/8 px-[13px] py-[11px]',
          hasError ? 'mt-2.5' : 'mt-[11px]'
        )}>
          <span className="mt-px shrink-0 text-warning-alt">
            <Lightbulb size={15} />
          </span>
          <p className="m-0 text-[12.7px] leading-[1.55] text-[#8A5A33]">{dica}</p>
        </div>
      </div>
    </div>
  )
}

// ── Passo 1: Sua empresa (#339, RN-NOVA-3) ─────────────────────────────────
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function CampoTexto({ label, opcional, value, onChange, placeholder, type = 'text', maxLength, error, inputMode }: {
  label: string; opcional?: boolean; value: string; onChange: (v: string) => void
  placeholder: string; type?: string; maxLength?: number; error?: string
  inputMode?: 'tel' | 'email' | 'text'
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[14px] font-semibold text-dark">
        {label} {opcional && <span className="ml-1 text-xs font-normal text-muted">opcional</span>}
      </label>
      <input
        type={type} value={value} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'h-[48px] w-full rounded-input border-[1.5px] bg-white px-4 font-[inherit] text-[15px] text-dark outline-hidden transition-[border-color,box-shadow] duration-150',
          error ? 'border-warning-alt ring-4 ring-warning-alt/10' : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/12'
        )}
      />
      {error && <p className="mt-1.5 mb-0 text-[12.5px] font-medium text-warning-alt">{error}</p>}
    </div>
  )
}

function PassoEmpresa({ onAvancar }: { onAvancar: () => void }) {
  const emailAcesso = useAuthStore(s => s.usuario?.email ?? '')
  const inputLogo = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(true)
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [arquivoLogo, setArquivoLogo] = useState<File | null>(null)
  const [previaLogo, setPreviaLogo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erros, setErros] = useState<{ nome?: string; email?: string; whatsapp?: string }>({})
  // V0.17.0 #964 (RN-NOVA-19): telefone nacional com máscara ou estrangeiro
  const modoWhatsapp = useModoTelefone(whatsapp, setWhatsapp)

  // abre com o que já foi salvo (CEN-NOVO-5 e 9); o e-mail de acesso só é sugerido enquanto o perfil nunca foi editado
  useEffect(() => {
    let ativo = true
    empresaService.getEmpresa()
      .then(e => {
        if (!ativo) return
        setEmpresa(e)
        setNome(e?.nome ?? '')
        const nuncaEditado = !e || e.createdAt === e.updatedAt
        setEmail(e?.email ?? (nuncaEditado ? emailAcesso : ''))
        setWhatsapp(e?.whatsapp ?? '')
        setPreviaLogo(e?.logoUrl ?? null)
      })
      .catch(() => { if (ativo) setErro('Não foi possível carregar os dados da empresa. Recarregue a página.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [emailAcesso])

  useEffect(() => () => {
    if (previaLogo?.startsWith('blob:')) URL.revokeObjectURL(previaLogo)
  }, [previaLogo])

  function escolherLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setArquivoLogo(arquivo)
    setPreviaLogo(URL.createObjectURL(arquivo))
  }

  async function removerLogo() {
    setArquivoLogo(null)
    setPreviaLogo(null)
    if (empresa?.logoUrl) {
      try {
        setEmpresa(await empresaService.removerLogo())
      } catch (err: any) {
        setErro(extractApiError(err, 'Não foi possível remover o logo. Tente novamente.'))
      }
    }
  }

  async function avancar(e: React.FormEvent) {
    e.preventDefault()
    const novos: { nome?: string; email?: string; whatsapp?: string } = {}
    if (!nome.trim()) novos.nome = 'Informe o nome do seu ateliê'
    if (email.trim() && !EMAIL_VALIDO.test(email.trim())) novos.email = 'E-mail inválido'
    if (!telefoneValido(whatsapp)) novos.whatsapp = MENSAGEM_TELEFONE_INVALIDO
    setErros(novos)
    if (Object.keys(novos).length > 0) return

    setSalvando(true)
    setErro('')
    try {
      // upsert substitui endereço e logo: reenvia o que já existe para não apagar nada ao voltar a este passo
      let salva = await empresaService.upsertEmpresa({
        nome: nome.trim(),
        email: email.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        endereco: empresa?.endereco,
        logoUrl: empresa?.logoUrl,
      })
      if (arquivoLogo) {
        salva = await empresaService.uploadLogo(arquivoLogo)
        setArquivoLogo(null)
      }
      setEmpresa(salva)
      onAvancar()
    } catch (err: any) {
      const campos = err?.response?.data?.fieldErrors as Record<string, string> | null | undefined
      setErro(campos ? Object.values(campos)[0] : extractApiError(err, 'Erro ao salvar os dados da empresa. Tente novamente.'))
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div className="grid place-items-center py-16"><Spinner size={28} /></div>
  }

  return (
    <>
      <h1 className="mt-0 mb-1.5 text-2xl font-bold tracking-[-0.02em] text-dark">Conte sobre o seu ateliê</h1>
      <p className="mt-0 mb-6 text-sm leading-[1.55] text-muted">
        Essas informações aparecem nos seus PDFs e recibos. Você pode alterar depois nas Configurações.
      </p>

      <form onSubmit={avancar} noValidate className="flex flex-col gap-4">
        <CampoTexto label="Nome da empresa" value={nome} maxLength={255}
          onChange={v => { setNome(v); setErros(p => ({ ...p, nome: undefined })) }}
          placeholder="Nome do seu ateliê" error={erros.nome} />
        <CampoTexto label="E-mail de contato" opcional type="email" inputMode="email" value={email} maxLength={255}
          onChange={v => { setEmail(v); setErros(p => ({ ...p, email: undefined })) }}
          placeholder="contato@seuatelie.com" error={erros.email} />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <CampoTexto label="Telefone / WhatsApp" opcional inputMode="tel" value={whatsapp} maxLength={25}
              onChange={v => { modoWhatsapp.digitar(v); setErros(p => ({ ...p, whatsapp: undefined })) }}
              placeholder={modoWhatsapp.estrangeiro ? '+55 11 00000-0000' : '(00) 00000-0000'} error={erros.whatsapp} />
          </div>
          <BotaoNumeroEstrangeiro estrangeiro={modoWhatsapp.estrangeiro} onAlternar={modoWhatsapp.alternar} />
        </div>

        <div className="flex items-center gap-4 rounded-[14px] border-[1.6px] border-dashed border-[#D4D0C8] bg-cream p-3.5">
          <input ref={inputLogo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            aria-label="Arquivo do logo" onChange={escolherLogo} />
          {previaLogo ? (
            <div className="relative shrink-0">
              <img src={previaLogo} alt="Logo" className="h-[64px] w-[64px] rounded-full border-2 border-teal/35 object-cover" />
              <button type="button" onClick={removerLogo} aria-label="Remover logo"
                className="absolute top-[-5px] right-[-5px] grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-danger">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-teal/8 text-teal"><Image size={28} /></div>
          )}
          <div className="flex-1">
            <div className="mb-[3px] text-sm font-semibold text-dark">
              Logo do ateliê <span className="ml-1.5 text-xs font-normal text-muted">opcional</span>
            </div>
            <div className="mb-2 text-[12.5px] text-muted">PNG, JPG ou WebP. Aparece nos PDFs.</div>
            <button type="button" onClick={() => inputLogo.current?.click()}
              className="h-[34px] rounded-lg border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[13px] font-semibold text-body hover:bg-cream">
              {previaLogo ? 'Trocar arquivo' : 'Escolher arquivo'}
            </button>
          </div>
        </div>

        {erro && (
          <p role="alert" className="m-0 rounded-lg border border-danger-line-soft bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
            {erro}
          </p>
        )}

        <Button variant="primary" type="submit" fullWidth size="lg" disabled={salvando}
          icon={salvando ? <Spinner size={16} /> : undefined}
          iconRight={salvando ? undefined : <span className="-mt-px text-[19px]">→</span>}>
          {salvando ? 'Salvando…' : 'Avançar'}
        </Button>
      </form>
    </>
  )
}

// ── OnboardingPage ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [passo, setPasso] = useState<1 | 2>(1)
  const setOnboardingCompleto = useAuthStore(s => s.setOnboardingCompleto)
  const [hora, setHora] = useState('')
  const [margem, setMargem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ hora?: string; margem?: string }>({})

  const parseHora = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  const parseMargem = (v: string) => parseFloat(v.replace(',', '.')) || 0

  const validate = () => {
    const erros: { hora?: string; margem?: string } = {}
    if (!hora.trim() || parseHora(hora) <= 0) erros.hora = 'Informe um valor maior que zero.'
    if (!margem.trim() || parseMargem(margem) <= 0) erros.margem = 'Informe um valor maior que zero.'
    return erros
  }

  const isValid = hora.trim() && parseHora(hora) > 0 && margem.trim() && parseMargem(margem) > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const erros = validate()
    if (Object.keys(erros).length > 0) {
      setFieldErrors(erros)
      return
    }
    setFieldErrors({})
    setLoading(true)
    setError('')
    try {
      const valorHora = parseHora(hora)
      const margemPadrao = parseMargem(margem)
      await empresaService.upsertConfiguracao({ valorHora, margemPadrao })
      setOnboardingCompleto(true)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(extractApiError(err, 'Erro ao salvar configurações. Tente novamente.'))
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-app p-6">
      <div className="grid w-[min(1000px,100%)] animate-fade-up grid-cols-1 overflow-hidden rounded-[24px] border border-[#F0EEE9] bg-white shadow-[0_20px_60px_-28px_rgba(31,122,111,0.28),0_2px_8px_rgba(0,0,0,0.06)] md:grid-cols-[1fr_1.15fr]">
        {/* Painel esquerdo — brand */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(150deg,#2A9D8F_0%,#1F7A6F_78%,#15665C_100%)] p-11 md:flex">
          <div className="absolute top-[-90px] right-[-70px] h-[280px] w-[280px] animate-[floaty_9s_ease-in-out_infinite] rounded-[46%_54%_60%_40%/50%_44%_56%_50%] bg-white/10" />
          <div className="absolute bottom-[-60px] -left-10 h-[200px] w-[200px] animate-[floaty_11s_ease-in-out_infinite_reverse] rounded-[60%_40%_45%_55%/55%_50%_50%_45%] bg-orange/30" />

          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/18 backdrop-blur-xs">
              <Logo size={32} />
            </div>
            <Wordmark size={18} darkMode />
          </div>

          <div className="relative">
            <h2 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.02em] text-white">
              Preço certo,<br />negócio saudável.
            </h2>
            <p className="mt-3.5 mb-0 text-[15px] leading-[1.6] text-white/82">
              Calcule, orce e controle o estoque do seu ateliê em um só lugar.
            </p>
          </div>

          <div className="relative flex flex-col gap-[11px]">
            {[
              'Precificação com margem real',
              'Orçamentos profissionais em PDF',
              'Controle de insumos e produtos',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.2 4.2L19 7"/>
                  </svg>
                </span>
                <span className="text-[13.5px] font-medium text-white/88">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div className="flex flex-col justify-center px-[46px] pt-10 pb-9">
          {/* Logo mobile */}
          <div className="mb-[22px] flex items-center gap-2.5 md:hidden">
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          <Stepper passo={passo} />

          {passo === 1 ? (
            <PassoEmpresa onAvancar={() => setPasso(2)} />
          ) : (
            <>
          <h1 className="mt-0 mb-1.5 text-2xl font-bold tracking-[-0.02em] text-dark">
            Configure como você quer precificar <span className="inline-block animate-floaty">💡</span>
          </h1>
          <p className="mt-0 mb-7 text-sm leading-[1.55] text-muted">
            Você pode alterar isso a qualquer momento nas Configurações.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <PriceField
              icon={<Clock size={18} />}
              question="Quanto vale a sua hora de trabalho?"
              explain="Este valor entra no cálculo de custo de mão de obra de cada produto."
              affix="R$"
              affixSide="left"
              placeholder="25,00"
              inputMode="decimal"
              dica="Exemplo: se você leva 2h para fazer um produto e sua hora vale R$ 25, o custo de mão de obra é R$ 50."
              value={hora}
              onChange={v => { setHora(v); setFieldErrors(p => ({ ...p, hora: undefined })) }}
              error={fieldErrors.hora}
            />

            <PriceField
              icon={<TrendingUp size={20} />}
              question="Qual é a sua margem de lucro padrão?"
              explain="Percentual adicionado ao custo total para formar seu preço de venda."
              affix="%"
              affixSide="right"
              placeholder="40"
              inputMode="numeric"
              dica="Você poderá ajustar a margem produto a produto quando necessário."
              value={margem}
              onChange={v => { setMargem(v); setFieldErrors(p => ({ ...p, margem: undefined })) }}
              error={fieldErrors.margem}
            />

            {error && (
              <p className="m-0 rounded-lg border border-danger-line-soft bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
                {error}
              </p>
            )}

            <Button
              variant="primary"
              type="submit"
              fullWidth
              disabled={loading || !isValid}
              size="lg"
              icon={loading ? <Spinner size={16} /> : undefined}
              iconRight={loading ? undefined : <span className="-mt-px text-[19px]">→</span>}
            >
              {loading ? 'Preparando tudo…' : 'Começar a usar o sistema'}
            </Button>
          </form>

            </>
          )}

          <p className="mt-section mb-0 flex flex-wrap items-center justify-center gap-1.5 text-center text-[12.7px] text-muted">
            <span className="flex text-teal"><Settings size={20} /></span>
            <span>Dá pra mudar tudo depois em <strong className="font-semibold text-dim">Configurações</strong>.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
