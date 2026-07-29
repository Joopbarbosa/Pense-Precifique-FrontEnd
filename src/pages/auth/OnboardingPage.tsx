import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark, Button, Spinner } from '../../components/ui'
import { Check, Lightbulb, Clock, TrendingUp, Settings } from 'lucide-react'
import { empresaService } from '../../services/empresaService'
import { useAuthStore } from '../../store/authStore'
import { extractApiError } from '../../utils/apiError'

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper() {
  return (
    <div className="mb-6 flex items-center gap-3.5">
      <div className="flex items-center gap-[9px]">
        <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-teal/40 bg-teal/[0.14] text-teal">
          <Check size={14} />
        </span>
        <span className="whitespace-nowrap text-sm font-medium text-muted">
          Sua conta
        </span>
      </div>

      <span className="h-0.5 min-w-6 flex-1 rounded-sm bg-[linear-gradient(90deg,rgba(42,157,143,0.5),#EFEDE8)]" />

      <div className="flex items-center gap-[9px]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-teal text-[13px] font-bold text-white shadow-[0_4px_10px_-4px_rgba(42,157,143,0.7)]">
          2
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-dark">
          Precificação
        </span>
      </div>
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
      <span className="mt-0.5 grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <label className="block text-[15.5px] font-semibold tracking-[-0.01em] text-dark">
          {question} <span className="text-[15px] text-[#E05C3A]">*</span>
        </label>
        <p className="mt-1 mb-3 text-[13px] leading-normal text-muted">{explain}</p>

        <div className={clsx(
          'flex h-[54px] items-stretch overflow-hidden rounded-input border-[1.5px] bg-white transition-[border-color,box-shadow] duration-150',
          hasError
            ? 'border-[#E05C3A] ring-4 ring-[#E05C3A]/10'
            : 'border-line focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/[0.12]'
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
            className="min-w-0 flex-1 border-none bg-transparent px-4 font-[inherit] text-lg font-semibold text-dark outline-none"
          />
          {affixSide === 'right' && (
            <span className="grid place-items-center border-l border-line bg-cream px-[18px] text-[17px] font-semibold text-dim">
              {affix}
            </span>
          )}
        </div>

        {hasError && (
          <p className="mt-1.5 mb-0 text-[12.5px] font-medium text-[#E05C3A]">{error}</p>
        )}

        <div className={clsx(
          'flex items-start gap-[9px] rounded-xl border border-[#FCE2CF] bg-orange/[0.08] px-[13px] py-[11px]',
          hasError ? 'mt-2.5' : 'mt-[11px]'
        )}>
          <span className="mt-px flex-shrink-0 text-[#EC7A2C]">
            <Lightbulb size={15} />
          </span>
          <p className="m-0 text-[12.7px] leading-[1.55] text-[#8A5A33]">{dica}</p>
        </div>
      </div>
    </div>
  )
}

// ── OnboardingPage ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
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
          <div className="absolute -top-[90px] -right-[70px] h-[280px] w-[280px] animate-[floaty_9s_ease-in-out_infinite] rounded-[46%_54%_60%_40%/50%_44%_56%_50%] bg-white/10" />
          <div className="absolute -bottom-[60px] -left-10 h-[200px] w-[200px] animate-[floaty_11s_ease-in-out_infinite_reverse] rounded-[60%_40%_45%_55%/55%_50%_50%_45%] bg-orange/30" />

          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/[0.18] backdrop-blur-[4px]">
              <Logo size={32} />
            </div>
            <Wordmark size={18} darkMode />
          </div>

          <div className="relative">
            <h2 className="m-0 text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-white">
              Preço certo,<br />negócio saudável.
            </h2>
            <p className="mt-3.5 mb-0 text-[15px] leading-[1.6] text-white/[0.82]">
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
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.2 4.2L19 7"/>
                  </svg>
                </span>
                <span className="text-[13.5px] font-medium text-white/[0.88]">
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

          <Stepper />

          <h1 className="mt-0 mb-1.5 text-2xl font-bold tracking-[-0.02em] text-dark">
            Configure como você quer precificar <span className="inline-block animate-[floaty_3s_ease-in-out_infinite]">💡</span>
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
              <p className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
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

          <p className="mt-[18px] mb-0 flex flex-wrap items-center justify-center gap-1.5 text-center text-[12.7px] text-muted">
            <span className="flex text-teal"><Settings size={20} /></span>
            <span>Dá pra mudar tudo depois em <strong className="font-semibold text-dim">Configurações</strong>.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
