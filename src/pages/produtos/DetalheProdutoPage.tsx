import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: dec ?? 2, maximumFractionDigits: dec ?? 2 })

type TipoProduto = 'Produto' | 'Produto Base' | 'Customização'

function tipoStyle(tipo: TipoProduto) {
  if (tipo === 'Produto Base') return { bg: '#EFEDE9', fg: '#6B6860' }
  if (tipo === 'Customização') return { bg: 'rgba(42,157,143,0.14)', fg: '#2A9D8F' }
  return { bg: '#E9F1F9', fg: '#3A6FA0' }
}

const PRODUTO = { nome: 'Kit Convite Casamento', estoque: 0, minimo: 5, custo: 30.87, venda: 53.00 }

type MovKind = 'entrada-producao' | 'saida-orcamento' | 'saida-baixa' | 'cancelamento-producao'

interface HistItem {
  data: string
  kind: MovKind
  titulo: string
  delta: number
  ref: string
  cancelada?: boolean
  estornoDe?: number
}

const HIST: HistItem[] = [
  { data: '04/06/2026', kind: 'entrada-producao',      titulo: 'Entrada — Produção',           delta:  3, ref: 'Produção #18', cancelada: true },
  { data: '04/06/2026', kind: 'cancelamento-producao', titulo: 'Cancelamento — Produção #18',  delta: -3, ref: 'Estorno: registrei a quantidade errada por engano, era para ser outro produto.', estornoDe: 18 },
  { data: '03/06/2026', kind: 'saida-orcamento',       titulo: 'Saída — Orçamento',            delta: -3, ref: 'Orçamento #0042 — Mariana Costa' },
  { data: '28/05/2026', kind: 'entrada-producao',      titulo: 'Entrada — Produção',           delta:  5, ref: 'Produção #15' },
  { data: '20/05/2026', kind: 'saida-baixa',           titulo: 'Saída — Baixa manual',        delta: -2, ref: 'Motivo: Avaria — unidades danificadas no transporte da gráfica até o estúdio.' },
]

const MOV: Record<MovKind, { c: string; bg: string; icon: keyof typeof Icons }> = {
  'entrada-producao':      { c: '#1F8A5B', bg: '#E8F5EE', icon: 'factorySm' },
  'saida-orcamento':       { c: '#C0492B', bg: '#FBEDE9', icon: 'cart' },
  'saida-baixa':           { c: '#C8721F', bg: '#FBF1E5', icon: 'minus' },
  'cancelamento-producao': { c: '#C0492B', bg: '#FBEDE9', icon: 'alertCircle' },
}

interface Componente {
  nome: string
  marca: string
  qtd: string
  custo: number
}

const COMPONENTES: Componente[] = [
  { nome: 'Papel couchê 180g',    marca: 'Suzano', qtd: '2 folhas', custo: 0.90 },
  { nome: 'Fita dupla face 12mm', marca: '3M',     qtd: '15 cm',    custo: 1.20 },
  { nome: 'Envelope kraft C6',    marca: '',       qtd: '1 un',     custo: 1.20 },
]

interface Cell {
  k: string
  v: string
  big?: boolean
  accent?: boolean
  price?: boolean
  danger?: boolean
  hint?: string
}

function buildCells(tipo: TipoProduto): Cell[] {
  const P = PRODUTO
  const cells: Cell[] = [
    { k: 'Tipo', v: tipo },
    { k: 'Estoque atual', v: `${P.estoque} unidades`, big: true, danger: P.estoque === 0 },
    { k: 'Estoque mínimo', v: `${P.minimo} unidades` },
    { k: 'Preço de custo', v: moeda(P.custo), accent: true, hint: 'calculado pela ficha técnica' },
  ]
  if (tipo === 'Produto') {
    cells.push({ k: 'Preço de venda', v: moeda(P.venda), price: true })
  } else if (tipo === 'Customização') {
    cells.push({ k: 'Preço de venda', v: '+ ' + moeda(P.venda), price: true, hint: 'adicionado ao orçamento' })
  }
  return cells
}

const MOTIVOS_PRODUTO = ['Perda', 'Avaria', 'Uso extra', 'Correção de estoque', 'Outro']

const HIST_COLS = '116px 1fr 110px 1fr'

function HistTipo({ kind, titulo }: { kind: MovKind; titulo: string }) {
  const m = MOV[kind]
  const Ic = Icons[m.icon] as (p?: React.SVGProps<SVGSVGElement>) => JSX.Element
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: m.bg, color: m.c }}>
        <Ic />
      </span>
      <span style={{ fontSize: 13.8, fontWeight: 600, color: '#3A372F' }}>{titulo}</span>
    </div>
  )
}

function HistRows() {
  return (
    <>
      {HIST.map((h, i) => {
        const pos = h.delta > 0
        const isEstorno = !!h.estornoDe
        const deltaC = isEstorno ? '#C0492B' : (pos ? '#1F8A5B' : '#C0492B')
        const deltaT = (h.delta > 0 ? '+ ' : '− ') + Math.abs(h.delta) + ' un'
        const riscado = h.cancelada

        return (
          <React.Fragment key={i}>
            <div className="hist-row" style={{
              gridTemplateColumns: HIST_COLS, animation: 'fadeUp .35s ease both',
              opacity: riscado ? 0.6 : 1,
              background: isEstorno ? '#FBEDE9' : 'transparent',
            }}>
              <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{h.data}</div>
              <div style={{ textDecoration: riscado ? 'line-through' : 'none' }}>
                <HistTipo kind={h.kind} titulo={h.titulo} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: riscado ? 'line-through' : 'none' }}>{deltaT}</div>
              <div style={{ fontSize: 13, color: isEstorno ? '#B23A1E' : '#A29E96', whiteSpace: isEstorno ? 'normal' : 'nowrap', overflow: isEstorno ? 'visible' : 'hidden', textOverflow: 'ellipsis', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                {h.ref}
              </div>
            </div>
            <div className="hist-card" style={{
              padding: '15px 18px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both',
              opacity: riscado ? 0.6 : 1,
              background: isEstorno ? '#FBEDE9' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: riscado ? 'line-through' : 'none' }}>
                <HistTipo kind={h.kind} titulo={h.titulo} />
                <span style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{deltaT}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap', fontSize: 12.5, color: isEstorno ? '#B23A1E' : '#A29E96', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{h.data}</span>
                <span style={{ color: '#D8D4CC' }}>·</span>
                <span>{h.ref}</span>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

function FichaList() {
  return (
    <div>
      {COMPONENTES.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid #EFEDE8', animation: 'fadeUp .35s ease both' }}>
          <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: '#F1F0EC', color: '#9A968E' }}>
            <Icons.box width={20} height={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap' }}>{c.nome}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7C786F', background: '#F1F0EC', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>Insumo</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>{c.marca ? c.marca + ' · ' : ''}{c.qtd}</div>
          </div>
          <span style={{ flexShrink: 0, fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{moeda(c.custo)}</span>
        </div>
      ))}
    </div>
  )
}

function BaixaProdutoModal({ onClose }: { onClose: () => void }) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState('Perda')
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [selOpen, setSelOpen] = useState(false)
  const selRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const podeRegistrar = qtd.trim() !== '' && obs.trim().length >= 50

  const baseStyle = (k: string): React.CSSProperties => ({
    width: '100%', minHeight: 48, padding: '0 14px',
    border: `1.5px solid ${focus === k ? '#2A9D8F' : '#EFEDE8'}`,
    borderRadius: 10, fontSize: 14.5, color: '#3A372F',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxShadow: focus === k ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
              <Icons.minus />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Baixa manual — {PRODUTO.nome}
              </div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Registra uma saída fora de produção.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E9E7E2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F1F0EC')}
          >
            <Icons.x />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label>
              <span style={lbl}>Quantidade a subtrair *</span>
              <div style={{ position: 'relative' }}>
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  placeholder="1"
                  onFocus={() => setFocus('qtd')}
                  onBlur={() => setFocus(null)}
                  style={{ ...baseStyle('qtd'), height: 48, paddingRight: 80 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>unidades</span>
              </div>
            </label>
            <label>
              <span style={lbl}>Motivo *</span>
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
                    {MOTIVOS_PRODUTO.map(m => (
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
            <span style={lbl}>
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
              placeholder="Descreva o motivo da baixa em detalhes (ex: 2 unidades ficaram com manchas durante o transporte da gráfica até o estúdio e não podem ser vendidas)"
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

export default function DetalheProdutoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [aba, setAba] = useState<'historico' | 'ficha'>('historico')
  const [modal, setModal] = useState<'baixa' | null>(null)

  const tipo: TipoProduto = 'Produto'
  const ts = tipoStyle(tipo)
  const cells = buildCells(tipo)
  const o = PRODUTO

  const ABAS = [
    { id: 'historico' as const, label: 'Histórico de movimentações', icon: Icons.history },
    { id: 'ficha'     as const, label: 'Ficha técnica',              icon: Icons.layers },
  ]

  return (
    <AppLayout active="produtos">

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/produtos')}
          onMouseEnter={e => (e.currentTarget.style.color = '#2A9D8F')}
          onMouseLeave={e => (e.currentTarget.style.color = '#A29E96')}
        >Produtos</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0 }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.cube width={26} height={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F', whiteSpace: 'nowrap' }}>{o.nome}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 999, background: ts.bg, color: ts.fg, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                {tipo}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: '#E8F5EE', color: '#1F8A5B', fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A56F' }} /> Ativo
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#A29E96', marginTop: 4 }}>
              Atualizado em <strong style={{ color: '#5C594F', fontWeight: 600 }}>04/06/2026</strong>
            </div>
          </div>
        </div>
        <Button variant="ghost" icon={<Icons.edit />} onClick={() => navigate(`/produtos/${id}/editar`)}>
          Editar
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#EFEDE8' }}>
          {cells.map((c, i) => (
            <div key={i} style={{ background: '#fff', padding: '18px 20px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{c.k}</div>
              <div style={{
                marginTop: 7, fontVariantNumeric: 'tabular-nums',
                fontSize: c.big ? 28 : (c.accent || c.price) ? 18 : 16,
                fontWeight: (c.big || c.accent || c.price) ? 700 : 600,
                letterSpacing: c.big ? '-0.02em' : '0',
                color: c.danger ? '#C0492B' : c.accent ? '#2A9D8F' : '#3A372F',
              }}>{c.v}</div>
              {c.hint && <div style={{ marginTop: 3, fontSize: 11.5, color: '#A8A49C', fontWeight: 500 }}>{c.hint}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 11, padding: '16px 20px', borderTop: '1px solid #EFEDE8', flexWrap: 'wrap' }}>
          <Button variant="primary" icon={<Icons.factory />} onClick={() => navigate('/producao')}>
            Registrar produção
          </Button>
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
            <div className="hist-head" style={{ gridTemplateColumns: HIST_COLS }}>
              {['Data', 'Movimentação', 'Quantidade', 'Referência'].map((h, k) => (
                <div key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{h}</div>
              ))}
            </div>
            <HistRows />
          </>
        ) : (
          <FichaList />
        )}
      </div>
      {aba === 'historico' && (
        <div style={{ marginTop: 13, fontSize: 12.5, color: '#A29E96', textAlign: 'right' }}>
          {HIST.length} movimentações
        </div>
      )}

      {modal === 'baixa' && <BaixaProdutoModal onClose={() => setModal(null)} />}

    </AppLayout>
  )
}
