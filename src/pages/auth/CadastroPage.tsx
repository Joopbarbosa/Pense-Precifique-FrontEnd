import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark, Button, Input, Spinner } from '../../components/ui'
import { X, Image, AlertCircle, Mail, Lock } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { extractApiError } from '../../utils/apiError'

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper() {
  return (
    <div className="mb-6 flex items-center gap-3.5">
      <div className="flex items-center gap-[9px]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-teal text-[13px] font-bold text-white shadow-[0_4px_10px_-4px_rgba(42,157,143,0.6)]">
          1
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-dark">
          Sua conta
        </span>
      </div>
      <span className="h-0.5 min-w-6 flex-1 rounded-sm bg-line" />
      <div className="flex items-center gap-[9px]">
        <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-line bg-white text-[13px] font-bold text-faint">
          2
        </span>
        <span className="whitespace-nowrap text-sm font-medium text-muted">
          Precificação
        </span>
      </div>
    </div>
  )
}

// ── StrengthMeter ──────────────────────────────────────────────────────────
function StrengthMeter({ senha }: { senha: string }) {
  if (!senha) return null

  let score = 0
  if (senha.length >= 8) score++
  if (/[A-Z]/.test(senha)) score++
  if (/[0-9]/.test(senha)) score++
  if (/[^A-Za-z0-9]/.test(senha)) score++

  const levels = [
    { label: 'Muito fraca', color: '#E0613F' },
    { label: 'Fraca',       color: '#F2913C' },
    { label: 'Razoável',    color: '#E8B23A' },
    { label: 'Boa',         color: '#7FB84F' },
    { label: 'Forte',       color: '#2A9D8F' },
  ]
  const cur = levels[score]

  return (
    <div className="mt-[9px] animate-fade-up">
      <div className="flex gap-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-[5px] flex-1 rounded-[3px] transition-colors duration-200"
            style={{ background: i < score ? cur.color : '#EFEDE8' }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span className="text-muted">
          {senha.length < 8 ? 'Use no mínimo 8 caracteres' : 'Boa combinação ajuda na segurança'}
        </span>
        <span className="font-semibold" style={{ color: cur.color }}>{cur.label}</span>
      </div>
    </div>
  )
}

// ── LogoUpload ─────────────────────────────────────────────────────────────
function LogoUpload({ preview, onPick, onRemove }: {
  preview: string | null
  onPick: (src: string) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPick(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className={clsx(
      'flex items-center gap-4 rounded-[14px] p-3.5 transition-all duration-150',
      preview ? 'border-[1.5px] border-line bg-white' : 'border-[1.6px] border-dashed border-[#D4D0C8] bg-cream'
    )}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {preview ? (
        <div className="relative flex-shrink-0">
          <img
            src={preview}
            alt="Logo"
            className="h-[72px] w-[72px] animate-pop rounded-full border-2 border-teal/35 object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover logo"
            className="absolute -top-[5px] -right-[5px] grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-danger shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[14px] bg-teal/[0.08] text-teal">
          <Image size={28} />
        </div>
      )}

      <div className="flex-1">
        <div className="mb-[3px] text-sm font-semibold text-dark">
          {preview ? 'Logo enviada' : 'Logo do ateliê'}
          <span className="ml-1.5 text-xs font-normal text-muted">opcional</span>
        </div>
        <div className={clsx('text-[12.5px] text-muted', !preview && 'mb-[9px]')}>
          {preview ? 'Aparece nos seus PDFs e orçamentos.' : 'PNG ou JPG, até 2 MB. Aparece nos PDFs.'}
        </div>
        {!preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-[34px] rounded-lg border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[13px] font-semibold text-body hover:bg-cream"
          >
            Escolher arquivo
          </button>
        )}
      </div>
    </div>
  )
}

// ── SuccessNote ────────────────────────────────────────────────────────────
function SuccessNote({ nome }: { nome: string }) {
  return (
    <div className="animate-fade-up pt-[30px] pb-2.5 text-center">
      <div className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-teal/[0.12] text-teal">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
          <path d="m4 12.5 5 5L20 6.5" stroke="#2A9D8F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="mt-[18px] mb-1.5 text-[22px] font-bold text-dark">
        Conta criada{nome ? `, ${nome.split(' ')[0]}` : ''}! 🎉
      </h2>
      <p className="m-0 text-[14.5px] leading-[1.55] text-muted">
        Agora vamos para a <strong className="text-teal">Etapa 2 — Precificação</strong> para configurar seus custos.
      </p>
    </div>
  )
}

// ── CadastroPage ───────────────────────────────────────────────────────────
export default function CadastroPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [touched, setTouched] = useState({
    nome: false, empresa: false, email: false, senha: false, senha2: false,
  })
  const [emailEmUso, setEmailEmUso] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const erros = {
    nome:    touched.nome    && !nome.trim()      ? 'Como podemos te chamar?' : '',
    empresa: touched.empresa && !empresa.trim()   ? 'Informe o nome do seu ateliê.' : '',
    email:   emailEmUso
      ? 'Este e-mail já está em uso. Faça login ou use outro e-mail.'
      : touched.email && !email.trim()            ? 'Informe seu e-mail.'
      : touched.email && !emailValido             ? 'E-mail inválido.' : '',
    senha:   touched.senha  && senha.length < 8   ? 'A senha precisa de no mínimo 8 caracteres.' : '',
    senha2:  touched.senha2 && senha2 !== senha   ? 'As senhas não coincidem.' : '',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ nome: true, empresa: true, email: true, senha: true, senha2: true })
    setEmailEmUso(false)
    setApiError(null)

    if (!nome.trim() || !empresa.trim() || !email.trim() || !emailValido || senha.length < 8 || senha2 !== senha) return

    setLoading(true)
    try {
      const response = await authService.register({
        email: email.trim(),
        senha,
        confirmarSenha: senha2,
      })
      setAuth(response.token, { id: response.usuarioId, email: response.email })
      // TODO: Épico 2 — passar nome/empresa para onboarding e salvar via EmpresaService
      navigate('/onboarding')
    } catch (error: any) {
      const msg = extractApiError(error, 'Erro ao criar conta. Tente novamente.')
      if (msg.toLowerCase().includes('e-mail já cadastrado') || msg.toLowerCase().includes('email')) {
        setEmailEmUso(true)
      } else {
        setApiError(msg)
      }
      setDone(false)
    } finally {
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
        <div className="flex flex-col justify-center overflow-y-auto px-[46px] pt-10 pb-9">
          {/* Logo mobile */}
          <div className="mb-[22px] flex items-center gap-2.5 md:hidden">
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          <Stepper />

          {done ? (
            <SuccessNote nome={nome} />
          ) : (
            <>
              <h1 className="mt-0 mb-1.5 text-2xl font-bold tracking-[-0.02em] text-dark">
                Vamos criar sua conta!
              </h1>
              <p className="mt-0 mb-[22px] text-sm leading-[1.55] text-muted">
                Leva menos de 2 minutos. Sem cartão de crédito.
              </p>

              {apiError && (
                <div role="alert" className="mb-1 flex animate-shake items-start gap-2.5 rounded-[10px] border-[1.5px] border-[#F6C6B7] bg-[#FEF3F0] p-[12px_14px] text-[13.5px] leading-[1.45] text-danger">
                  <AlertCircle size={18} className="mt-px flex-shrink-0 text-[#D9603C]" />
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
                {/* Nome + Empresa */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Nome"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={setNome}
                    error={erros.nome}
                    autoComplete="given-name"
                  />
                  <Input
                    label="Nome do ateliê"
                    placeholder="Ex: Ateliê da Ana"
                    value={empresa}
                    onChange={setEmpresa}
                    error={erros.empresa}
                    autoComplete="organization"
                  />
                </div>

                {/* E-mail */}
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seuemail@email.com"
                  value={email}
                  onChange={(v) => { setEmail(v); setEmailEmUso(false) }}
                  icon={<Mail size={18} />}
                  error={erros.email}
                  autoComplete="email"
                />

                {/* Senha + Confirmar */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={senha}
                    onChange={setSenha}
                    icon={<Lock size={18} />}
                    error={erros.senha}
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirmar senha"
                    type="password"
                    placeholder="Repita a senha"
                    value={senha2}
                    onChange={setSenha2}
                    icon={<Lock size={18} />}
                    error={erros.senha2}
                    autoComplete="new-password"
                  />
                </div>

                <StrengthMeter senha={senha} />

                <LogoUpload
                  preview={logoPreview}
                  onPick={setLogoPreview}
                  onRemove={() => setLogoPreview(null)}
                />

                <Button
                  variant="primary"
                  type="submit"
                  fullWidth
                  disabled={loading}
                  icon={loading ? <Spinner size={16} /> : undefined}
                  iconRight={loading ? undefined : <span className="-mt-px text-lg">→</span>}
                  size="lg"
                >
                  {loading ? 'Criando sua conta…' : 'Próximo'}
                </Button>
              </form>

              <p className="mt-[18px] mb-0 text-center text-sm text-muted">
                Já tem conta?{' '}
                <a href="/login" className="font-semibold text-teal no-underline hover:underline">
                  Faça login
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
