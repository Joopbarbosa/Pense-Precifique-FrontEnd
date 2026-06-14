import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2),
    maximumFractionDigits: dec != null ? dec : 3,
  })

const INSUMO = { nome: 'Papel couchê 180g', marca: 'Suzano', un: 'folha', fracao: false, saldo: 24, minimo: 10, custo: 0.45 }

interface HistItem {
  data: string
  tipo: 'entrada' | 'saida' | 'estorno'
  titulo: string
  delta: number
  custo: number
  ref: string
  obs?: string
  cancelada?: boolean
}

const HIST: HistItem[] = [
  { data: '04/06/2026', tipo: 'saida',   titulo: 'Saída — Produção',     delta: -45, custo: 0.089, ref: 'Produção #18', cancelada: true },
  { data: '04/06/2026', tipo: 'estorno', titulo: 'Estorno — Cancelamento Produção #18', delta: 45, custo: 0.089, ref: 'Estorno: registrei a quantidade errada por engano, era para ser outro produto.' },
  { data: '01/06/2026', tipo: 'entrada', titulo: 'Entrada — Compra',     delta: 100, custo: 0.45,  ref: 'Compra: R$ 45,00 / 100 un' },
  { data: '15/05/2026', tipo: 'saida',   titulo: 'Saída — Orçamento',    delta: -9,  custo: 0.48,  ref: 'Orçamento #0038' },
  { data: '10/05/2026', tipo: 'saida',   titulo: 'Saída — Baixa manual', delta: -3,  custo: 0.48,  ref: 'Motivo: Avaria — folhas ficaram manchadas durante o transporte da gráfica até o estúdio, não é possível utilizá-las para impressão de qualidade.' },
]

interface Ficha {
  nome: string
  tipo: 'Produto' | 'Customização'
  icon: keyof typeof Icons
  consumo: string
  preco: number | null
  novo: number | null
}

const FICHAS: Ficha[] = [
  { nome: 'Kit Convite Casamento',  tipo: 'Produto',      icon: 'cubeSmall', consumo: '4 folhas / un',  preco: 45.00, novo: 43.80 },
  { nome: 'Etiqueta personalizada', tipo: 'Produto',      icon: 'cubeSmall', consumo: '1 folha / un',   preco: 4.50,  novo: 4.38 },
  { nome: 'Laminação fosca',        tipo: 'Customização', icon: 'tag',       consumo: '0,5 folha / un', preco: null,  novo: null },
]

const MOTIVOS = ['Perda', 'Avaria', 'Uso extra', 'Correção de estoque', 'Outro']

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function ModalHead({ icon, tint, title, sub, onClose }: { icon: React.ReactNode; tint: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: hexA(tint, 0.12), color: tint }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.background = '#E9E7E2'} onMouseLeave={e => e.currentTarget.style.background = '#F1F0EC'}
      >
        <Icons.x />
      </button>
    </div>
  )
}

function BaixaModal({ onClose }: { onClose: () => void }) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState('Perda')
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [selOpen, setSelOpen] = useState(false)
  const selRef = useRef<HTMLDivElement>(null)

  const podeRegistrar = qtd.trim() !== '' && obs.trim().length >= 50

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const baseStyle = (k: string): React.CSSProperties => ({
    width: '100%', minHeight: 48, padding: '0 14px',
    border: `1.5px solid ${focus === k ? '#2A9D8F' : '#EFEDE8'}`,
    borderRadius: 10, fontSize: 14.5, color: '#3A372F',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxShadow: focus === k ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <ModalHead icon={<Icons.minus />} tint="#C8721F" title="Baixa manual" sub="Registra uma saída fora de produção." onClose={onClose} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label>
              <span style={fieldLabel}>Quantidade *</span>
              <div style={{ position: 'relative' }}>
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value.replace(/[^\d.,]/g, ''))}
                  onFocus={() => setFocus('qtd')}
                  onBlur={() => setFocus(null)}
                  inputMode="decimal"
                  placeholder="3"
                  style={{ ...baseStyle('qtd'), height: 48, paddingRight: 62 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>folhas</span>
              </div>
            </label>
            <label>
              <span style={fieldLabel}>Motivo *</span>
              <div ref={selRef} style={{ position: 'relative' }}>
                <button type="button" onClick={() => setSelOpen(o => !o)} style={{
                  ...baseStyle('sel'), height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                  borderColor: selOpen ? '#2A9D8F' : '#EFEDE8',
                  boxShadow: selOpen ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                }}>
                  {motivo}<span style={{ color: '#A29E96', display: 'flex' }}><Icons.caret /></span>
                </button>
                {selOpen && (
                  <div style={{ position: 'absolute', top: 52, left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both' }}>
                    {MOTIVOS.map(m => (
                      <button key={m} type="button" onClick={() => { setMotivo(m); setSelOpen(false) }} style={{
                        width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 8,
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                        background: m === motivo ? 'rgba(42,157,143,0.08)' : 'transparent',
                        fontWeight: m === motivo ? 600 : 500,
                        color: m === motivo ? '#2A9D8F' : '#3A372F',
                      }}
                        onMouseEnter={e => { if (m !== motivo) e.currentTarget.style.background = '#F7F5F1' }}
                        onMouseLeave={e => { if (m !== motivo) e.currentTarget.style.background = 'transparent' }}
                      >{m}</button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
          <label>
            <span style={fieldLabel}>
              Observação <span style={{ color: '#F97316' }}>*</span>
              <span style={{ fontWeight: 400, color: obs.length >= 50 ? '#3E9D5A' : '#A29E96', marginLeft: 8 }}>
                {obs.length}/50 caracteres mín.
              </span>
            </span>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onFocus={() => setFocus('obs')}
              onBlur={() => setFocus(null)}
              placeholder="Descreva o motivo da baixa em detalhes (ex: 3 folhas ficaram manchadas durante o transporte e não podem ser usadas)"
              rows={3}
              style={{
                ...baseStyle('obs'), height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5,
                borderColor: obs.length > 0 && obs.length < 50 ? '#F2B8A6' : (focus === 'obs' ? '#2A9D8F' : '#EFEDE8'),
              }}
            />
            {obs.length > 0 && obs.length < 50 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12.5, color: '#C0492B' }}>
                <Icons.alertCircle width={13} height={13} /> Mínimo de 50 caracteres. Faltam {50 - obs.length}.
              </div>
            )}
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" icon={<Icons.minus />} disabled={!podeRegistrar} onClick={onClose}>
            Registrar baixa
          </Button>
        </div>
      </div>
    </div>
  )
}

function HistTipo({ tipo, titulo }: { tipo: 'entrada' | 'saida' | 'estorno'; titulo: string }) {
  const cores = {
    entrada: { c: '#1F8A5B', bg: '#E8F5EE' },
    saida:   { c: '#C0492B', bg: '#FBEDE9' },
    estorno: { c: '#C0492B', bg: '#FBEDE9' },
  }[tipo]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: cores.bg, color: cores.c }}>
        {tipo === 'estorno'
          ? <Icons.alertCircle />
          : <Icons.arrowDown style={{ transform: tipo === 'entrada' ? 'rotate(180deg)' : 'none' }} />}
      </span>
      <span style={{ fontSize: 13.8, fontWeight: 600, color: '#3A372F' }}>{titulo}</span>
    </div>
  )
}

function HistRows() {
  return (
    <>
      {HIST.map((h, i) => {
        const positivo = h.delta > 0
        const isEstorno = h.tipo === 'estorno'
        const deltaC = isEstorno ? '#C0492B' : (positivo ? '#1F8A5B' : '#C0492B')
        const deltaT = (positivo ? '+ ' : '− ') + Math.abs(h.delta) + ' folhas'
        const riscado = h.cancelada

        return (
          <React.Fragment key={i}>
            {/* desktop row */}
            <div className="hist-row" style={{
              animation: 'fadeUp .35s ease both',
              opacity: riscado ? 0.6 : 1,
              background: isEstorno ? '#FBEDE9' : 'transparent',
            }}>
              <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{h.data}</div>
              <div style={{ textDecoration: riscado ? 'line-through' : 'none' }}>
                <HistTipo tipo={h.tipo} titulo={h.titulo} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: riscado ? 'line-through' : 'none' }}>{deltaT}</div>
              <div style={{ fontSize: 13.5, color: '#3A372F', fontVariantNumeric: 'tabular-nums', textDecoration: riscado ? 'line-through' : 'none' }}>{moeda(h.custo, 2)}</div>
              <div style={{ fontSize: 13, color: isEstorno ? '#B23A1E' : '#A29E96', whiteSpace: isEstorno ? 'normal' : 'nowrap', overflow: isEstorno ? 'visible' : 'hidden', textOverflow: 'ellipsis', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                {h.ref}
              </div>
            </div>
            {h.obs && (
              <div className="hist-row" style={{ gridTemplateColumns: '1fr', padding: '0 20px 15px', borderTop: 'none', marginTop: -15 }}>
                <div style={{ fontSize: 12.5, color: '#A29E96', fontStyle: 'italic', lineHeight: 1.5, paddingLeft: 132 }}>
                  "{h.obs}"
                </div>
              </div>
            )}
            {/* mobile card */}
            <div className="hist-card" style={{
              padding: '15px 18px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both',
              opacity: riscado ? 0.6 : 1,
              background: isEstorno ? '#FBEDE9' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: riscado ? 'line-through' : 'none' }}>
                <HistTipo tipo={h.tipo} titulo={h.titulo} />
                <span style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{deltaT}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap', fontSize: 12.5, color: isEstorno ? '#B23A1E' : '#A29E96', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{h.data}</span>
                <span style={{ color: '#D8D4CC' }}>·</span>
                {!isEstorno && (
                  <>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{moeda(h.custo, 2)} / folha</span>
                    <span style={{ color: '#D8D4CC' }}>·</span>
                  </>
                )}
                <span>{h.ref}</span>
              </div>
              {h.obs && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#A29E96', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{h.obs}"
                </div>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

function FichasList() {
  return (
    <div>
      {FICHAS.map((f, i) => {
        const Ic = Icons[f.icon]
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both' }}>
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
              <Ic />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{f.nome}</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Consome {f.consumo}</div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7C786F', background: '#F1F0EC', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{f.tipo}</span>
            <button style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#2A9D8F', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
              Ver ficha <Icons.chevron />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function DetalheInsumoPage() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<'baixa' | null>(null)
  const [aba, setAba] = useState<'historico' | 'fichas'>('historico')
  const o = INSUMO

  const ABAS = [
    { id: 'historico' as const, label: 'Histórico de movimentações', icon: Icons.history },
    { id: 'fichas' as const,    label: 'Fichas técnicas que usam este insumo', icon: Icons.layers },
  ]

  return (
    <AppLayout active="insumos">

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/insumos')}
          onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
          onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
        >Insumos</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0 }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.box width={26} height={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>{o.nome}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: '#E8F5EE', color: '#1F8A5B', fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A56F' }} /> Ativo
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#A29E96', marginTop: 4 }}>Marca: <strong style={{ color: '#5C594F', fontWeight: 600 }}>{o.marca}</strong></div>
          </div>
        </div>
        <Button variant="ghost" icon={<Icons.edit />} onClick={() => navigate('/insumos/1/editar')}>
          Editar
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#EFEDE8' }}>
          {[
            { k: 'Unidade de medida',    v: 'Folha' },
            { k: 'Fracionável',          v: o.fracao ? 'Sim' : 'Não' },
            { k: 'Saldo atual',          v: `${o.saldo} folhas`, big: true },
            { k: 'Estoque mínimo',       v: `${o.minimo} folhas` },
            { k: 'Custo unitário atual', v: `${moeda(o.custo, 2)} / folha`, accent: true },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', padding: '18px 20px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{c.k}</div>
              <div style={{
                marginTop: 7, fontVariantNumeric: 'tabular-nums',
                fontSize: c.big ? 28 : c.accent ? 18 : 16,
                fontWeight: c.big || c.accent ? 700 : 600,
                letterSpacing: c.big ? '-0.02em' : '0',
                color: c.big || c.accent ? '#2A9D8F' : '#3A372F',
              }}>{c.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 11, padding: '16px 20px', borderTop: '1px solid #EFEDE8', flexWrap: 'wrap' }}>
          <Button variant="ghost" icon={<Icons.minus />} onClick={() => setModal('baixa')}>
            Baixa manual
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 26, borderBottom: '1.5px solid #EFEDE8', overflowX: 'auto' }}>
        {ABAS.map(a => {
          const on = aba === a.id
          return (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 600 : 500,
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

      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {aba === 'historico' ? (
          <>
            <div className="hist-head">
              {['Data', 'Movimentação', 'Quantidade', 'Custo unit.', 'Referência'].map((h, k) => (
                <div key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{h}</div>
              ))}
            </div>
            <HistRows />
          </>
        ) : (
          <FichasList />
        )}
      </div>
      {aba === 'historico' && (
        <div style={{ marginTop: 13, fontSize: 12.5, color: '#A29E96', textAlign: 'right' }}>
          {HIST.length} movimentações
        </div>
      )}

      {modal === 'baixa' && <BaixaModal onClose={() => setModal(null)} />}

    </AppLayout>
  )
}
