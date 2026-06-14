import React, { useState, useRef, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'

/* ── helpers ─────────────────────────────────────────────────── */

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/* ── AffixInput ──────────────────────────────────────────────── */

function AffixInput({ value, onChange, prefix, suffix, icon, inputMode }: {
  value: string; onChange: (v: string) => void
  prefix?: string; suffix?: string; icon?: React.ReactNode
  inputMode?: 'decimal' | 'numeric'
}) {
  const [f, setF] = useState(false)
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'stretch',
      border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10,
      background: '#fff', overflow: 'hidden',
      boxShadow: f ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
      transition: 'border-color .15s, box-shadow .15s', maxWidth: 300,
    }}>
      {prefix && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', fontSize: 14.5, fontWeight: 600, color: f ? '#1F7A6F' : '#6B6860', background: '#FAF8F5', borderRight: '1px solid #EFEDE8', whiteSpace: 'nowrap' }}>
          {icon && <span style={{ display: 'flex', color: f ? '#2A9D8F' : '#A8A49C' }}>{icon}</span>}{prefix}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode={inputMode}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{ flex: 1, minWidth: 0, height: 52, padding: '0 14px', border: 'none', outline: 'none', fontSize: 17, fontWeight: 600, color: '#3A372F', background: 'transparent', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
      />
      {suffix && <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 15, fontWeight: 600, color: f ? '#1F7A6F' : '#6B6860', background: '#FAF8F5', borderLeft: '1px solid #EFEDE8' }}>{suffix}</span>}
    </div>
  )
}

/* ── Toast ───────────────────────────────────────────────────── */

function Toast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 11, padding: '13px 20px 13px 15px',
      background: '#143D33', color: '#fff', borderRadius: 13,
      boxShadow: '0 16px 40px -10px rgba(0,0,0,0.5)',
      animation: 'toastIn .3s cubic-bezier(.34,1.3,.5,1) both', maxWidth: 'calc(100vw - 32px)',
    }}>
      <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: '#34A56F', color: '#fff' }}>
        <Icons.check />
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Configurações salvas com sucesso!</span>
    </div>
  )
}

/* ── SubNav ──────────────────────────────────────────────────── */

const SUBABAS = [
  { id: 'precificacao' as const, label: 'Precificação',      icon: Icons.sliders },
  { id: 'perfil' as const,       label: 'Perfil da empresa', icon: Icons.building },
  { id: 'conta' as const,        label: 'Conta',             icon: Icons.shield },
]

type SubAba = typeof SUBABAS[number]['id']

function SubNav({ aba, setAba }: { aba: SubAba; setAba: (a: SubAba) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 26, borderBottom: '1.5px solid #EFEDE8', overflowX: 'auto' }}>
      {SUBABAS.map(a => {
        const on = aba === a.id
        return (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 14.5, fontWeight: on ? 600 : 500,
            color: on ? '#2A9D8F' : '#8A8780', whiteSpace: 'nowrap', transition: 'color .14s',
          }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.color = '#5C594F' }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.color = '#8A8780' }}
          >
            <span style={{ display: 'flex', color: on ? '#2A9D8F' : '#B0ACA4' }}><a.icon /></span>
            {a.label}
            {on && <span style={{ position: 'absolute', left: 8, right: 8, bottom: -1.5, height: 2.5, borderRadius: 3, background: '#2A9D8F' }} />}
          </button>
        )
      })}
    </div>
  )
}

/* ── PerfilCard ──────────────────────────────────────────────── */

function PerfilCard() {
  const dots: [string, string, number, string][] = [
    ['18%', '40%', 5, '#F97316'],
    ['82%', '30%', 6, '#2A9D8F'],
    ['66%', '68%', 4, '#F97316'],
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', animation: 'fadeUp .4s ease both' }}>
      <div style={{ height: 64, background: 'linear-gradient(120deg, rgba(42,157,143,0.16), rgba(249,115,22,0.12))', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {dots.map((d, k) => (
            <span key={k} style={{ position: 'absolute', left: d[0], top: d[1], width: d[2], height: d[2], borderRadius: '50%', background: hexA(d[3], 0.6) }} />
          ))}
        </div>
      </div>
      <div style={{ padding: '0 20px 20px', marginTop: -32, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, margin: '0 auto', borderRadius: '50%', background: '#fff', border: '3px solid #fff', boxShadow: '0 4px 14px -4px rgba(0,0,0,0.2)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', background: '#FAF8F5' }}>
            <img src="/logo.png" width={42} height={42} alt="Logo" style={{ objectFit: 'contain' }} />
          </span>
        </div>
        <h3 style={{ margin: '13px 0 0', fontSize: 17, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Ateliê da Ana</h3>
        <p style={{ margin: '3px 0 0', fontSize: 13.5, color: '#A29E96' }}>ana@atelier.com</p>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 13.5, fontWeight: 600, color: '#2A9D8F', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.gap = '9px'} onMouseLeave={e => e.currentTarget.style.gap = '6px'}
        >
          Editar perfil <Icons.arrowRight />
        </button>
      </div>
    </div>
  )
}

/* ── Precificacao ─────────────────────────────────────────────── */

function Precificacao() {
  const HORA0 = '25,00', MARGEM0 = '40'
  const [hora, setHora] = useState(HORA0)
  const [margem, setMargem] = useState(MARGEM0)
  const [toast, setToast] = useState(false)
  const [saved, setSaved] = useState({ hora: HORA0, margem: MARGEM0 })
  const dirty = hora !== saved.hora || margem !== saved.margem
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const salvar = () => {
    setSaved({ hora, margem })
    setToast(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(false), 3200)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="cfg-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '26px 28px', animation: 'fadeUp .35s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 5 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
              <Icons.sliders />
            </span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Como você quer precificar?</h2>
          </div>
          <p style={{ margin: '0 0 22px 49px', fontSize: 13.5, color: '#A29E96', lineHeight: 1.5 }}>
            Estes parâmetros alimentam a calculadora de preço de todos os seus produtos.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>Valor da sua hora de trabalho</label>
              <AffixInput value={hora} onChange={v => setHora(v.replace(/[^\d.,]/g, ''))} prefix="R$/h" icon={<Icons.clock />} inputMode="decimal" />
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#A8A49C' }}>Quanto vale uma hora do seu tempo produzindo.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>Margem de lucro padrão</label>
              <AffixInput value={margem} onChange={v => setMargem(v.replace(/[^\d]/g, ''))} suffix="%" inputMode="numeric" />
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#A8A49C' }}>Percentual aplicado sobre o custo para formar o preço sugerido.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)', borderLeft: '3px solid #2A9D8F' }}>
            <Icons.info style={{ flexShrink: 0, color: '#2A9D8F', marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#3F5B54', lineHeight: 1.55 }}>
              Alterar estes valores <strong style={{ fontWeight: 700 }}>não recalcula orçamentos já criados</strong>. Somente novos orçamentos usarão os parâmetros atualizados.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 24, paddingTop: 22, borderTop: '1px solid #EFEDE8', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: dirty ? '#C8721F' : '#A8A49C', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dirty ? '#E8913B' : '#CFCBC3', boxShadow: dirty ? '0 0 0 4px rgba(232,145,59,0.18)' : 'none' }} />
              {dirty ? 'Você tem alterações não salvas' : 'Tudo salvo'}
            </span>
            <Button variant="primary" icon={<Icons.check />} disabled={!dirty} onClick={salvar}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>

      <PerfilCard />
      <Toast show={toast} />
    </div>
  )
}

/* ── CfgField / CfgInput / SectionHead ───────────────────────── */

function CfgField({ label, opt, children }: { label: string; opt?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
        {label}{opt && <span style={{ fontSize: 12, fontWeight: 500, color: '#B0ACA4', marginLeft: 6 }}>(opcional)</span>}
      </span>
      {children}
    </label>
  )
}

function CfgInput({ defaultValue = '', type = 'text', placeholder, readOnly, inputMode }: {
  defaultValue?: string; type?: string; placeholder?: string; readOnly?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [v, setV] = useState(defaultValue)
  const [f, setF] = useState(false)
  return (
    <input
      type={type} value={v} placeholder={placeholder} readOnly={readOnly} inputMode={inputMode}
      onChange={e => setV(e.target.value)}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{
        width: '100%', height: 48, padding: '0 14px',
        border: `1.5px solid ${f && !readOnly ? '#2A9D8F' : '#EFEDE8'}`,
        borderRadius: 10, fontSize: 14.5,
        color: readOnly ? '#7C786F' : '#3A372F',
        background: readOnly ? '#FAF8F5' : '#fff',
        outline: 'none', fontFamily: 'inherit',
        boxShadow: f && !readOnly ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    />
  )
}

function SectionHead({ icon, titulo }: { icon: React.ReactNode; titulo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
      <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{titulo}</h2>
    </div>
  )
}

/* ── PerfilEmpresa ───────────────────────────────────────────── */

function PerfilEmpresa() {
  return (
    <div style={{ maxWidth: 640, animation: 'fadeUp .35s ease both' }}>
      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '26px 28px' }}>
        <SectionHead icon={<Icons.building />} titulo="Perfil da empresa" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 22, marginBottom: 22, borderBottom: '1px solid #EFEDE8', flexWrap: 'wrap' }}>
          <span style={{ flexShrink: 0, width: 84, height: 84, borderRadius: '50%', background: '#FAF8F5', border: '1px solid #EFEDE8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" width={50} height={50} alt="Logo" style={{ objectFit: 'contain' }} />
          </span>
          <div>
            <Button variant="ghost">Alterar logo</Button>
            <p style={{ margin: '9px 0 0', fontSize: 12.5, color: '#A8A49C', lineHeight: 1.5 }}>PNG ou JPG, fundo transparente recomendado.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CfgField label="Nome da empresa"><CfgInput defaultValue="Pense & Crie Studio" /></CfgField>
          <CfgField label="E-mail de contato"><CfgInput defaultValue="penseecrie@email.com" type="email" /></CfgField>
          <CfgField label="WhatsApp / Telefone"><CfgInput defaultValue="(11) 98888-1234" inputMode="tel" /></CfgField>
          <CfgField label="Endereço" opt><CfgInput placeholder="Rua, número, bairro, cidade" /></CfgField>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22, padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)', borderLeft: '3px solid #2A9D8F' }}>
          <Icons.info style={{ flexShrink: 0, color: '#2A9D8F', marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#3F5B54', lineHeight: 1.55 }}>
            Estas informações aparecem em todos os PDFs gerados pelo sistema (orçamentos, recibos e multas).
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 22, borderTop: '1px solid #EFEDE8' }}>
          <Button variant="primary" icon={<Icons.check />}>Salvar alterações</Button>
        </div>
      </div>
    </div>
  )
}

/* ── ContaSeguranca ──────────────────────────────────────────── */

function ContaSeguranca() {
  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 22, animation: 'fadeUp .35s ease both' }}>
      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '26px 28px' }}>
        <SectionHead icon={<Icons.shield />} titulo="Dados de acesso" />

        <CfgField label="E-mail atual">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}><CfgInput defaultValue="ana@atelier.com" readOnly /></div>
            <Button variant="ghost">Alterar e-mail</Button>
          </div>
        </CfgField>

        <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid #EFEDE8' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#3A372F' }}>Alterar senha</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CfgField label="Senha atual"><CfgInput type="password" placeholder="••••••••" /></CfgField>
            <CfgField label="Nova senha"><CfgInput type="password" placeholder="Mínimo 8 caracteres" /></CfgField>
            <CfgField label="Confirmar nova senha"><CfgInput type="password" placeholder="Repita a nova senha" /></CfgField>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="primary">Atualizar senha</Button>
          </div>
        </div>
      </div>

      <div style={{ background: '#FEF8F6', border: '1.5px solid #F2D8CF', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '24px 28px' }}>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#B23A1E' }}>Excluir conta</h3>
        <p style={{ margin: '7px 0 18px', fontSize: 13.5, color: '#8A5A4C', lineHeight: 1.55, maxWidth: 440 }}>
          Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
        </p>
        <button style={{
          height: 46, padding: '0 20px', borderRadius: 10, border: '1.5px solid #E3A799',
          background: 'transparent', color: '#C0492B', fontSize: 14, fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#FBEDE7'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Solicitar exclusão da conta
        </button>
      </div>
    </div>
  )
}

/* ── ConfiguracoesPage ───────────────────────────────────────── */

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<SubAba>('precificacao')

  return (
    <AppLayout active="configuracoes">

      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22 }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          <Icons.gear width={26} height={26} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Configurações</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14.5, color: '#A29E96' }}>Defina as regras do seu negócio.</p>
        </div>
      </div>

      <SubNav aba={aba} setAba={setAba} />

      {aba === 'precificacao' && <Precificacao />}
      {aba === 'perfil'       && <PerfilEmpresa />}
      {aba === 'conta'        && <ContaSeguranca />}

    </AppLayout>
  )
}
