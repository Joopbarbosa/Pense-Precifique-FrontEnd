import { useState } from 'react'
import { Logo, Wordmark, Icons, Button, Spinner } from '../../components/ui'

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          background: 'rgba(42,157,143,0.14)', color: '#2A9D8F',
          border: '1.5px solid rgba(42,157,143,0.4)',
        }}>
          <Icons.checkSmall />
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#A29E96', whiteSpace: 'nowrap' }}>
          Sua conta
        </span>
      </div>

      <span style={{
        flex: 1, height: 2, minWidth: 24, borderRadius: 2,
        background: 'linear-gradient(90deg, rgba(42,157,143,0.5), #EFEDE8)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          fontSize: 13, fontWeight: 700,
          background: '#2A9D8F', color: '#fff',
          boxShadow: '0 4px 10px -4px rgba(42,157,143,0.7)',
        }}>2</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap' }}>
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
}

function PriceField({ icon, question, explain, affix, affixSide, placeholder, dica, value, onChange, inputMode }: PriceFieldProps) {
  const [active, setActive] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, marginTop: 2,
        width: 38, height: 38, borderRadius: 12,
        display: 'grid', placeItems: 'center',
        background: 'rgba(42,157,143,0.10)', color: '#2A9D8F',
      }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: '#3A372F', letterSpacing: '-0.01em' }}>
          {question}
        </label>
        <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#A29E96', lineHeight: 1.5 }}>{explain}</p>

        <div style={{
          display: 'flex', alignItems: 'stretch', height: 54,
          borderRadius: 10, overflow: 'hidden',
          border: `1.5px solid ${active ? '#2A9D8F' : '#EFEDE8'}`,
          background: '#fff',
          boxShadow: active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}>
          {affixSide === 'left' && (
            <span style={{
              display: 'grid', placeItems: 'center',
              padding: '0 16px', fontSize: 16, fontWeight: 600,
              color: '#6B6860', background: '#FAF8F5',
              borderRight: '1px solid #EFEDE8',
            }}>{affix}</span>
          )}
          <input
            type="text"
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
            onFocus={() => setActive(true)}
            onBlur={() => setActive(false)}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none',
              background: 'transparent', padding: '0 16px',
              fontSize: 18, fontWeight: 600, color: '#3A372F', fontFamily: 'inherit',
            }}
          />
          {affixSide === 'right' && (
            <span style={{
              display: 'grid', placeItems: 'center',
              padding: '0 18px', fontSize: 17, fontWeight: 600,
              color: '#6B6860', background: '#FAF8F5',
              borderLeft: '1px solid #EFEDE8',
            }}>{affix}</span>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 11,
          background: 'rgba(249,115,22,0.08)', border: '1px solid #FCE2CF',
          borderRadius: 12, padding: '11px 13px',
        }}>
          <span style={{ flexShrink: 0, color: '#EC7A2C', marginTop: 1 }}>
            <Icons.bulb />
          </span>
          <p style={{ margin: 0, fontSize: 12.7, lineHeight: 1.55, color: '#8A5A33' }}>{dica}</p>
        </div>
      </div>
    </div>
  )
}

// ── OnboardingPage ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [hora, setHora] = useState('')
  const [margem, setMargem] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1100)
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
        }}>
          {/* Logo mobile */}
          <div className="mobile-logo" style={{ alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <Logo size={34} />
            <Wordmark size={18} />
          </div>

          <Stepper />

          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
            Configure como você quer precificar <span style={{ display: 'inline-block', animation: 'floaty 3s ease-in-out infinite' }}>💡</span>
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#A29E96', lineHeight: 1.55 }}>
            Você pode alterar isso a qualquer momento nas Configurações.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PriceField
              icon={<Icons.clock />}
              question="Quanto vale a sua hora de trabalho?"
              explain="Este valor entra no cálculo de custo de mão de obra de cada produto."
              affix="R$"
              affixSide="left"
              placeholder="25,00"
              inputMode="decimal"
              dica="Exemplo: se você leva 2h para fazer um produto e sua hora vale R$ 25, o custo de mão de obra é R$ 50."
              value={hora}
              onChange={setHora}
            />

            <PriceField
              icon={<Icons.trendUp />}
              question="Qual é a sua margem de lucro padrão?"
              explain="Percentual adicionado ao custo total para formar seu preço de venda."
              affix="%"
              affixSide="right"
              placeholder="40"
              inputMode="numeric"
              dica="Você poderá ajustar a margem produto a produto quando necessário."
              value={margem}
              onChange={setMargem}
            />

            <Button
              variant="primary"
              type="submit"
              fullWidth
              disabled={loading}
              size="lg"
              icon={loading ? <Spinner size={16} /> : undefined}
              iconRight={loading ? undefined : <span style={{ fontSize: 19, marginTop: -1 }}>→</span>}
            >
              {loading ? 'Preparando tudo…' : 'Começar a usar o sistema'}
            </Button>
          </form>

          <p style={{
            margin: '18px 0 0', display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 12.7, color: '#A29E96', textAlign: 'center',
          }}>
            <span style={{ color: '#2A9D8F', display: 'flex' }}><Icons.gear /></span>
            <span>Dá pra mudar tudo depois em <strong style={{ fontWeight: 600, color: '#6B6860' }}>Configurações</strong>.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
