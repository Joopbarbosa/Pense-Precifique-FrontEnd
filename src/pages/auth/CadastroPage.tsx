import { useState, useRef } from 'react'
import { Logo, Wordmark, Icons, Button, Input, Spinner } from '../../components/ui'

const EMAIL_EM_USO = ['ana@atelier.com', 'teste@teste.com']

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          fontSize: 13, fontWeight: 700,
          background: '#2A9D8F', color: '#fff',
          boxShadow: '0 4px 10px -4px rgba(42,157,143,0.6)',
        }}>1</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap' }}>
          Sua conta
        </span>
      </div>
      <span style={{ flex: 1, height: 2, background: '#EFEDE8', borderRadius: 2, minWidth: 24 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          fontSize: 13, fontWeight: 700,
          background: '#fff', color: '#B7B4AD',
          border: '1.5px solid #EFEDE8',
        }}>2</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#A29E96', whiteSpace: 'nowrap' }}>
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
    <div style={{ marginTop: 9, animation: 'fadeUp .2s ease both' }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: i < score ? cur.color : '#EFEDE8',
            transition: 'background .2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span style={{ color: '#A29E96' }}>
          {senha.length < 8 ? 'Use no mínimo 8 caracteres' : 'Boa combinação ajuda na segurança'}
        </span>
        <span style={{ fontWeight: 600, color: cur.color }}>{cur.label}</span>
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      border: preview ? '1.5px solid #EFEDE8' : '1.6px dashed #D4D0C8',
      background: preview ? '#fff' : '#FCFBF9',
      borderRadius: 14, padding: 14,
      transition: 'all .15s',
    }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {preview ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={preview} alt="Logo" style={{
            width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(42,157,143,0.35)',
            animation: 'pop .25s ease both',
          }} />
          <button type="button" onClick={onRemove} aria-label="Remover logo" style={{
            position: 'absolute', top: -5, right: -5,
            width: 24, height: 24, borderRadius: '50%',
            background: '#fff', border: '1px solid #EFEDE8',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            color: '#C0492B', display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Icons.x width={14} height={14} />
          </button>
        </div>
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: 'rgba(42,157,143,0.08)', color: '#2A9D8F',
        }}>
          <Icons.image />
        </div>
      )}

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', marginBottom: 3 }}>
          {preview ? 'Logo enviada' : 'Logo do ateliê'}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#A29E96', marginLeft: 6 }}>opcional</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#A29E96', marginBottom: preview ? 0 : 9 }}>
          {preview ? 'Aparece nos seus PDFs e orçamentos.' : 'PNG ou JPG, até 2 MB. Aparece nos PDFs.'}
        </div>
        {!preview && (
          <button type="button" onClick={() => inputRef.current?.click()} style={{
            height: 34, padding: '0 14px', borderRadius: 8,
            border: '1.5px solid #EFEDE8', background: '#fff',
            color: '#5C594F', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#FAF8F5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
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
    <div style={{ textAlign: 'center', padding: '30px 0 10px', animation: 'fadeUp .4s ease both' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        margin: '0 auto', display: 'grid', placeItems: 'center',
        background: 'rgba(42,157,143,0.12)', color: '#2A9D8F',
        animation: 'pop .35s ease both',
      }}>
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
          <path d="m4 12.5 5 5L20 6.5" stroke="#2A9D8F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ margin: '18px 0 6px', fontSize: 22, fontWeight: 700, color: '#3A372F' }}>
        Conta criada{nome ? `, ${nome.split(' ')[0]}` : ''}! 🎉
      </h2>
      <p style={{ margin: 0, fontSize: 14.5, color: '#A29E96', lineHeight: 1.55 }}>
        Agora vamos para a <strong style={{ color: '#2A9D8F' }}>Etapa 2 — Precificação</strong> para configurar seus custos.
      </p>
    </div>
  )
}

// ── CadastroPage ───────────────────────────────────────────────────────────
export default function CadastroPage() {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ nome: true, empresa: true, email: true, senha: true, senha2: true })
    setEmailEmUso(false)

    if (!nome.trim() || !empresa.trim() || !email.trim() || !emailValido || senha.length < 8 || senha2 !== senha) return

    if (EMAIL_EM_USO.includes(email.trim().toLowerCase())) {
      setEmailEmUso(true)
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setDone(true)
    }, 1000)
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
        width: 'min(1000px, 100%)',
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr',
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
          padding: '40px 46px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflowY: 'auto',
        }}>
          {/* Logo mobile */}
          <div className="mobile-logo" style={{ alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          <Stepper />

          {done ? (
            <SuccessNote nome={nome} />
          ) : (
            <>
              <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                Vamos criar sua conta!
              </h1>
              <p style={{ margin: '0 0 22px', fontSize: 14, color: '#A29E96', lineHeight: 1.55 }}>
                Leva menos de 2 minutos. Sem cartão de crédito.
              </p>

              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Nome + Empresa */}
                <div className="two-col">
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
                  icon={<Icons.mail />}
                  error={erros.email}
                  autoComplete="email"
                />

                {/* Senha + Confirmar */}
                <div className="two-col">
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={senha}
                    onChange={setSenha}
                    icon={<Icons.lock />}
                    error={erros.senha}
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirmar senha"
                    type="password"
                    placeholder="Repita a senha"
                    value={senha2}
                    onChange={setSenha2}
                    icon={<Icons.lock />}
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
                  iconRight={loading ? undefined : <span style={{ fontSize: 18, marginTop: -1 }}>→</span>}
                  size="lg"
                >
                  {loading ? 'Criando sua conta…' : 'Próximo'}
                </Button>
              </form>

              <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 14, color: '#A29E96' }}>
                Já tem conta?{' '}
                <a href="/login" style={{ color: '#2A9D8F', fontWeight: 600, textDecoration: 'none' }}
                  onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
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
