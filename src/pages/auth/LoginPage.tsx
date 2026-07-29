import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo, Wordmark, Button, Input, Spinner } from '../../components/ui'
import { AlertCircle, Mail, Lock } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { extractApiError } from '../../utils/apiError'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [touched, setTouched] = useState({ email: false, senha: false })
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const emailErr = touched.email && email.trim() === '' ? 'Informe seu e-mail.'
    : touched.email && !emailValido ? 'E-mail inválido.' : ''
  const senhaErr = touched.senha && senha === '' ? 'Informe sua senha.' : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ email: true, senha: true })
    setAuthError(null)
    if (!emailValido || senha === '') return
    setLoading(true)
    try {
      const response = await authService.login({ email: email.trim(), senha })
      setAuth(response.token, { id: response.usuarioId, email: response.email })
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (error: any) {
      setAuthError(extractApiError(error, 'Erro ao entrar. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-app p-6">
      <div className="grid w-[min(960px,100%)] animate-fade-up grid-cols-1 overflow-hidden rounded-[24px] border border-[#F0EEE9] bg-white shadow-[0_20px_60px_-28px_rgba(31,122,111,0.28),0_2px_8px_rgba(0,0,0,0.06)] md:grid-cols-2">
        {/* Painel esquerdo — brand */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(150deg,#2A9D8F_0%,#1F7A6F_78%,#15665C_100%)] p-11 md:flex">
          {/* Blobs decorativos */}
          <div className="absolute -top-[90px] -right-[70px] h-[280px] w-[280px] animate-[floaty_9s_ease-in-out_infinite] rounded-[46%_54%_60%_40%/50%_44%_56%_50%] bg-white/10" />
          <div className="absolute -bottom-[60px] -left-10 h-[200px] w-[200px] animate-[floaty_11s_ease-in-out_infinite_reverse] rounded-[60%_40%_45%_55%/55%_50%_50%_45%] bg-orange/30" />

          {/* Logo + wordmark */}
          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/[0.18] backdrop-blur-[4px]">
              <Logo size={32} />
            </div>
            <Wordmark size={18} darkMode />
          </div>

          {/* Headline */}
          <div className="relative">
            <h2 className="m-0 text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-white">
              Preço certo,<br />negócio saudável.
            </h2>
            <p className="mt-3.5 mb-0 text-[15px] leading-[1.6] text-white/[0.82]">
              Calcule, orce e controle o estoque do seu ateliê em um só lugar.
            </p>
          </div>

          {/* Bullets */}
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
        <div className="flex flex-col justify-center px-[46px] pt-[46px] pb-10">
          {/* Logo mobile */}
          <div className="mb-[22px] flex items-center gap-2.5 md:hidden">
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          {/* Título */}
          <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-dark">
            Bem-vinda de volta <span className="inline-block animate-[floaty_3s_ease-in-out_infinite]">👋</span>
          </h1>
          <p className="mt-2 mb-[26px] text-[14.5px] leading-[1.55] text-muted">
            Entre para continuar cuidando dos seus preços e orçamentos.
          </p>

          {/* Alerta de erro */}
          {authError && (
            <div role="alert" className="mb-[18px] flex animate-shake items-start gap-2.5 rounded-[10px] border-[1.5px] border-[#F6C6B7] bg-[#FEF3F0] p-[12px_14px] text-[13.5px] leading-[1.45] text-danger">
              <AlertCircle size={18} className="mt-px flex-shrink-0 text-warning-alt" />
              <span>{authError}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seuemail@email.com"
              value={email}
              onChange={setEmail}
              icon={<Mail size={18} />}
              error={emailErr}
              autoComplete="email"
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={setSenha}
              icon={<Lock size={18} />}
              error={senhaErr}
              autoComplete="current-password"
            />

            <div className="-mt-1 flex justify-end">
              <a href="#" className="text-[13.5px] font-medium text-teal no-underline hover:underline">
                Esqueci minha senha
              </a>
            </div>

            <Button
              variant="primary"
              type="submit"
              fullWidth
              disabled={loading}
              icon={loading ? <Spinner size={16} /> : undefined}
              iconRight={loading ? undefined : <span className="-mt-px text-lg">→</span>}
              size="lg"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {/* Divisor */}
          <div className="mt-6 mb-[18px] flex items-center gap-3.5">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[12.5px] font-medium text-faint">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <p className="m-0 text-center text-sm text-muted">
            Não tem conta?{' '}
            <a href="/cadastro" className="font-semibold text-orange no-underline hover:underline">
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
