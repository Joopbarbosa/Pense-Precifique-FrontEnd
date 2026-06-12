import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Icons } from '../../components/ui/Icons'
import { Button } from '../../components/ui'
import AppLayout from '../../components/layout/AppLayout'

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// ── Decorative dots ────────────────────────────────────────────────────────
function DotTrail({ color }: { color: string }) {
  const dots: [number, number, number][] = [
    [18,24,2.6],[30,16,2],[42,28,2.2],[55,18,2.8],[68,30,2],
    [80,20,2.4],[90,34,1.8],[24,70,2.2],[40,80,2.6],[58,74,2],
    [74,84,2.4],[88,72,1.8],
  ]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r * 0.5} fill={color} opacity={0.45 + (i % 3) * 0.18} />
      ))}
    </svg>
  )
}

// ── MetricCard ─────────────────────────────────────────────────────────────
interface MetricProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  valueColor: string
  delta?: React.ReactNode
  deltaColor?: string
  empty?: string
}

function MetricCard({ icon, iconBg, iconColor, label, value, valueColor, delta, deltaColor, empty }: MetricProps) {
  return (
    <Card padding="20px 22px" style={{ animation: 'fadeUp .45s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: '#8A8780' }}>{label}</span>
        <span style={{
          flexShrink: 0, display: 'grid', placeItems: 'center',
          width: 42, height: 42, borderRadius: 12,
          background: iconBg, color: iconColor,
        }}>{icon}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: valueColor, lineHeight: 1.1 }}>
        {value}
      </div>
      {delta ? (
        <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, color: deltaColor, display: 'flex', alignItems: 'center', gap: 5 }}>
          {delta}
        </div>
      ) : (
        <div style={{ marginTop: 9, fontSize: 12.5, color: '#B7B4AD' }}>{empty || '—'}</div>
      )}
    </Card>
  )
}

// ── DashboardPage ──────────────────────────────────────────────────────────
const ORANGE = '#F97316'
const TEAL   = '#2A9D8F'

const QUICK_ACTIONS = [
  { label: 'Cadastrar novo insumo', icon: <Icons.box /> },
  { label: 'Criar produto',         icon: <Icons.cube /> },
  { label: 'Gerar orçamento',       icon: <Icons.doc /> },
]

const STOCK_ALERTS = [
  ['Fita dupla face 12mm', '0,5 m'],
  ['Papel A4 180g',        '2 folhas'],
  ['Linha teal 100g',      '0,8 g'],
] as const

export default function DashboardPage() {
  const [empty, setEmpty] = useState(false)

  return (
    <AppLayout active="dashboard">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap', marginBottom: 26,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: '#2D2A26' }}>
            Dashboard
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 15, color: '#8A8780', lineHeight: 1.5 }}>
            {empty
              ? <>Bem-vinda, <strong style={{ fontWeight: 600, color: '#6B6860' }}>Ana</strong>! Vamos preparar seu negócio? Comece pelos insumos.</>
              : <>Bem-vinda de volta, <strong style={{ fontWeight: 600, color: '#6B6860' }}>Ana</strong>! Aqui está o resumo do seu negócio.</>
            }
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Toggle demo: empty / com dados */}
          <button onClick={() => setEmpty((v) => !v)} style={{
            height: 36, padding: '0 14px', border: '1.5px solid #EFEDE8',
            borderRadius: 8, background: '#fff', color: '#8A8780',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {empty ? 'Ver com dados' : 'Ver conta nova'}
          </button>
          <Button
            variant="primary"
            iconRight={<Icons.arrowRight />}
            onClick={() => {}}
          >
            {empty ? 'Cadastrar insumos' : 'Novo Orçamento'}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <MetricCard
          icon={<Icons.dollar />}
          iconBg={hexA(ORANGE, 0.12)} iconColor={ORANGE}
          label="Faturamento Mensal"
          value={empty ? 'R$ 0,00' : 'R$ 1.890,00'} valueColor={ORANGE}
          delta={empty ? undefined : <><span style={{ fontSize: 13 }}>↑</span> +23% este mês</>}
          deltaColor="#3E9D5A"
          empty="Sem vendas ainda"
        />
        <MetricCard
          icon={<Icons.cube />}
          iconBg={hexA(TEAL, 0.12)} iconColor={TEAL}
          label="Produtos Cadastrados"
          value={empty ? '0' : '18'} valueColor={TEAL}
          delta={empty ? undefined : <><span style={{ fontSize: 13 }}>↑</span> +2 este mês</>}
          deltaColor="#3E9D5A"
          empty="Nenhum produto"
        />
        <MetricCard
          icon={<Icons.fileStack />}
          iconBg="#F1F0EC" iconColor="#7C786F"
          label="Orçamentos Pendentes"
          value={empty ? '0' : '4'} valueColor="#2D2A26"
          delta={empty ? undefined : <span style={{ color: '#8A8780', fontWeight: 500 }}>Aguardando resposta</span>}
          deltaColor="#8A8780"
          empty="Nenhum pendente"
        />
      </div>

      {/* Alerta de estoque */}
      {!empty && (
        <div style={{
          marginTop: 18,
          background: '#fff',
          border: '1px solid #F0EEE9',
          borderLeft: `4px solid ${ORANGE}`,
          borderRadius: 'var(--r-card)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '18px 22px',
          animation: 'fadeUp .5s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <span style={{
              flexShrink: 0, display: 'grid', placeItems: 'center',
              width: 40, height: 40, borderRadius: 11,
              background: hexA(ORANGE, 0.12), color: ORANGE, marginTop: 1,
            }}>
              <Icons.alertTriangle />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: '#2D2A26' }}>3 insumos com estoque baixo</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
                {STOCK_ALERTS.map(([nome, qtd], i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontSize: 13, color: '#6B6860', whiteSpace: 'nowrap',
                    background: '#FCFBF9', border: '1px solid #ECEAE5',
                    borderRadius: 999, padding: '6px 12px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, flexShrink: 0 }} />
                    {nome} <strong style={{ fontWeight: 600, color: '#A35A26' }}>· {qtd}</strong>
                  </span>
                ))}
              </div>
            </div>
            <a href="/insumos" style={{
              flexShrink: 0, alignSelf: 'center',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13.5, fontWeight: 600, color: ORANGE, textDecoration: 'none',
            }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Ver todos os insumos <Icons.arrowRight />
            </a>
          </div>
        </div>
      )}

      {/* Lower grid: Ações Rápidas + Dica do Dia */}
      <div className="lower-grid" style={{ marginTop: 18 }}>

        {/* Ações Rápidas */}
        <Card padding="22px 24px" style={{ animation: 'fadeUp .55s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
            <span style={{
              display: 'grid', placeItems: 'center',
              width: 42, height: 42, borderRadius: 12,
              background: hexA(ORANGE, 0.12), color: ORANGE,
            }}>
              <Icons.trendUp />
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2A26' }}>Ações Rápidas</div>
              <div style={{ fontSize: 13, color: '#8A8780', marginTop: 1 }}>
                {empty ? 'Comece por aqui' : 'Acesso direto ao essencial'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {QUICK_ACTIONS.map((action, i) => {
              const highlight = empty && i === 0
              return (
                <a key={i} href="#" onClick={(e) => e.preventDefault()} style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '13px 15px', borderRadius: 12, textDecoration: 'none',
                  border: `1px solid ${highlight ? hexA(ORANGE, 0.4) : '#ECEAE5'}`,
                  background: highlight ? '#FFF1E8' : '#FCFBF9',
                  transition: 'background .14s, border-color .14s, transform .12s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = highlight ? hexA(ORANGE, 0.16) : '#F6F4F0'
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = highlight ? '#FFF1E8' : '#FCFBF9'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <span style={{
                    display: 'grid', placeItems: 'center',
                    width: 34, height: 34, borderRadius: 9,
                    background: highlight ? '#fff' : hexA(TEAL, 0.10),
                    color: highlight ? ORANGE : TEAL,
                  }}>
                    {action.icon}
                  </span>
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: '#2D2A26' }}>
                    {action.label}
                  </span>
                  <span style={{ color: highlight ? ORANGE : '#B7B4AD', display: 'flex' }}>
                    <Icons.arrowRight />
                  </span>
                </a>
              )
            })}
          </div>
        </Card>

        {/* Dica do Dia */}
        <Card style={{
          position: 'relative', overflow: 'hidden',
          padding: '24px 26px',
          animation: 'fadeUp .6s ease both',
          background: `linear-gradient(150deg, ${hexA(TEAL, 0.10)} 0%, #FFFFFF 52%, ${hexA(ORANGE, 0.07)} 100%)`,
          border: `1px solid ${hexA(TEAL, 0.18)}`,
        }}>
          {/* Decoração */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.63, pointerEvents: 'none' }}>
            <DotTrail color={ORANGE} />
            <div style={{
              position: 'absolute', width: 150, height: 150,
              borderRadius: '46% 54% 60% 40% / 50% 44% 56% 50%',
              background: hexA(TEAL, 0.10),
              top: -60, right: -40,
              animation: 'floaty 10s ease-in-out infinite',
            }} />
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
            <span style={{
              display: 'grid', placeItems: 'center',
              width: 46, height: 46, borderRadius: 13,
              background: '#fff', color: TEAL,
              boxShadow: '0 4px 12px -4px rgba(31,122,111,0.4)',
              border: `1px solid ${hexA(TEAL, 0.2)}`,
            }}>
              <Icons.bulb width={22} height={22} />
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2A26' }}>Dica do Dia</div>
              <div style={{ fontSize: 13, color: TEAL, fontWeight: 600, marginTop: 1 }}>Melhore seus lucros</div>
            </div>
          </div>

          <p style={{ position: 'relative', margin: 0, fontSize: 14.5, lineHeight: 1.62, color: '#5C594F', maxWidth: 440 }}>
            {empty
              ? <>Cadastre seus insumos com os preços reais de compra. É a base de toda precificação justa — e leva só alguns minutos.</>
              : <>Revise o preço dos seus produtos depois de cada compra de insumo — pequenas variações acumulam e corroem sua margem ao longo do mês.</>
            }
          </p>
        </Card>
      </div>
    </AppLayout>
  )
}
