import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, Wordmark, Icons, Button, Input, Spinner } from '../../components/ui'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
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
      navigate('/dashboard')
    } catch (error: any) {
      setAuthError(error.response?.data?.message ?? 'Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#FAFAF8',
    }}>
      <div className="login-card" style={{
        width: 'min(960px, 100%)',
        display: 'grid',
        background: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 20px 60px -28px rgba(31,122,111,0.28), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #F0EEE9',
        animation: 'fadeUp .5s ease both',
      }}>
        {/* Painel esquerdo — brand */}
        <div className="brand-col" style={{
          background: 'linear-gradient(150deg, #2A9D8F 0%, #1F7A6F 78%, #15665C 100%)',
          padding: '46px 44px',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Blobs decorativos */}
          <div style={{
            position: 'absolute', width: 280, height: 280,
            borderRadius: '46% 54% 60% 40% / 50% 44% 56% 50%',
            background: 'rgba(255,255,255,0.10)',
            top: -90, right: -70,
            animation: 'floaty 9s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 200, height: 200,
            borderRadius: '60% 40% 45% 55% / 55% 50% 50% 45%',
            background: 'rgba(249,115,22,0.30)',
            bottom: -60, left: -40,
            animation: 'floaty 11s ease-in-out infinite reverse',
          }} />

          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'grid', placeItems: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              <Logo size={32} />
            </div>
            <Wordmark size={18} darkMode />
          </div>

          {/* Headline */}
          <div style={{ position: 'relative' }}>
            <h2 style={{
              margin: 0, fontSize: 28, fontWeight: 700,
              color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em',
            }}>
              Preço certo,<br />negócio saudável.
            </h2>
            <p style={{
              margin: '14px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6,
            }}>
              Calcule, orce e controle o estoque do seu ateliê em um só lugar.
            </p>
          </div>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, position: 'relative' }}>
            {[
              'Precificação com margem real',
              'Orçamentos profissionais em PDF',
              'Controle de insumos e produtos',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.20)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.2 4.2L19 7"/>
                  </svg>
                </span>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.88)', fontWeight: 500 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div style={{
          padding: '46px 46px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* Logo mobile */}
          <div className="mobile-logo" style={{ alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          {/* Título */}
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
            Bem-vinda de volta <span style={{ display: 'inline-block', animation: 'floaty 3s ease-in-out infinite' }}>👋</span>
          </h1>
          <p style={{ margin: '8px 0 26px', fontSize: 14.5, color: '#A29E96', lineHeight: 1.55 }}>
            Entre para continuar cuidando dos seus preços e orçamentos.
          </p>

          {/* Alerta de erro */}
          {authError && (
            <div role="alert" style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: '#FEF3F0', border: '1.5px solid #F6C6B7',
              color: '#C0492B', borderRadius: 10, padding: '12px 14px',
              marginBottom: 18, fontSize: 13.5, lineHeight: 1.45,
              animation: 'shake .45s ease',
            }}>
              <Icons.alertCircle width={18} height={18} style={{ color: '#D9603C', flexShrink: 0, marginTop: 1 }} />
              <span>{authError}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="E-mail"
              type="email"
              placeholder="seuemail@email.com"
              value={email}
              onChange={setEmail}
              icon={<Icons.mail />}
              error={emailErr}
              autoComplete="email"
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={setSenha}
              icon={<Icons.lock />}
              error={senhaErr}
              autoComplete="current-password"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
              <a href="#" style={{ fontSize: 13.5, fontWeight: 500, color: '#2A9D8F', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Esqueci minha senha
              </a>
            </div>

            <Button
              variant="primary"
              type="submit"
              fullWidth
              disabled={loading}
              icon={loading ? <Spinner size={16} /> : undefined}
              iconRight={loading ? undefined : <span style={{ fontSize: 18, marginTop: -1 }}>→</span>}
              size="lg"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0 18px' }}>
            <span style={{ flex: 1, height: 1, background: '#EFEDE8' }} />
            <span style={{ fontSize: 12.5, color: '#B7B4AD', fontWeight: 500 }}>ou</span>
            <span style={{ flex: 1, height: 1, background: '#EFEDE8' }} />
          </div>

          <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: '#A29E96' }}>
            Não tem conta?{' '}
            <a href="/cadastro" style={{ color: '#F97316', fontWeight: 600, textDecoration: 'none' }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
