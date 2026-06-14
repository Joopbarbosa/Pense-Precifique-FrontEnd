import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'

/* ── interfaces ─────────────────────────────────────────────── */

interface InsumoTag { n: string; v: string }
interface Consumido  { nome: string; total: string }

interface ProducaoHist {
  num: number
  data: string
  produto: string
  qtd: number
  un: string
  insumos: InsumoTag[]
  consumidos: Consumido[]
  status: 'ativa' | 'cancelada'
  motivoCancelamento?: string
}

/* ── store de módulo — persiste cancelamentos entre navegações ─ */

const HISTORICO_INICIAL: ProducaoHist[] = [
  {
    num: 18, data: '04/06/2026', produto: 'Amigurumi Coelhinha Rosa', qtd: 3, un: 'unidades',
    insumos: [{ n: 'Linha teal', v: '45g' }, { n: 'Olhinhos', v: '6 un' }],
    consumidos: [
      { nome: 'Linha de crochê teal 100g', total: '45 g' },
      { nome: 'Olhinhos de segurança 6mm', total: '6 un' },
      { nome: 'Arame para estrutura',      total: '15 cm' },
    ],
    status: 'ativa',
  },
  {
    num: 17, data: '28/05/2026', produto: 'Kit Convite Casamento', qtd: 5, un: 'kits',
    insumos: [{ n: 'Papel couchê', v: '10 folhas' }, { n: 'Fita', v: '75cm' }],
    consumidos: [
      { nome: 'Papel couchê 180g',    total: '10 folhas' },
      { nome: 'Fita dupla face 12mm', total: '75 cm' },
    ],
    status: 'ativa',
  },
]

// Persiste cancelamentos quando o usuário navega entre /producao e /producao/:numero
let mockHistorico: ProducaoHist[] = HISTORICO_INICIAL.map(h => ({ ...h }))

interface ProdOption { nome: string; categoria: string; tipo: string }

const PRODUTOS_PROD: ProdOption[] = [
  { nome: 'Amigurumi Coelhinha Rosa', categoria: 'Produto',      tipo: 'Produto' },
  { nome: 'Kit Convite Casamento',    categoria: 'Produto',      tipo: 'Produto' },
  { nome: 'Etiqueta personalizada',   categoria: 'Produto',      tipo: 'Produto' },
  { nome: 'Miolo de Agenda',          categoria: 'Produto Base', tipo: 'Produto Base' },
  { nome: 'Capa Kraft',               categoria: 'Produto Base', tipo: 'Produto Base' },
  { nome: 'Laminação fosca',          categoria: 'Customização', tipo: 'Customização' },
  { nome: 'Envelope personalizado',   categoria: 'Customização', tipo: 'Customização' },
]

interface FichaItem { nome: string; porUn: number; un: string; disponivel: number }

const FICHA: FichaItem[] = [
  { nome: 'Linha de crochê teal 100g', porUn: 15, un: 'g',  disponivel: 12 },
  { nome: 'Olhinhos de segurança 6mm', porUn: 2,  un: 'un', disponivel: 24 },
  { nome: 'Arame para estrutura',      porUn: 5,  un: 'cm', disponivel: 200 },
]

/* ── ProdutoSelect ──────────────────────────────────────────── */

function ProdutoSelect({ value, onChange, options }: { value: ProdOption; onChange: (p: ProdOption) => void; options: ProdOption[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        border: `1.5px solid ${open ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10,
        background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        boxShadow: open ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}><Icons.cube /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{value.nome}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>{value.categoria}</span>
        </span>
        <span style={{ color: '#A29E96', display: 'flex' }}><Icons.caret /></span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 14px 34px -10px rgba(0,0,0,0.2)', padding: 6, animation: 'pop .14s ease both', maxHeight: 260, overflowY: 'auto' }}>
          {options.map(p => {
            const on = p.nome === value.nome
            return (
              <button key={p.nome} onClick={() => { onChange(p); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                padding: '10px 11px', borderRadius: 9, border: 'none',
                background: on ? 'rgba(42,157,143,0.08)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#F7F5F1' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}><Icons.cube /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: on ? '#2A9D8F' : '#3A372F' }}>{p.nome}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#A29E96' }}>{p.categoria}</span>
                </span>
                {on && <span style={{ color: '#2A9D8F', display: 'flex' }}><Icons.check /></span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Counter ────────────────────────────────────────────────── */

function Counter({ value, setValue }: { value: number; setValue: (n: number) => void }) {
  const btn = (icon: React.ReactNode, fn: () => void, disabled: boolean) => (
    <button onClick={fn} disabled={disabled} aria-label="ajustar" style={{
      width: 44, height: 44, borderRadius: 11, border: '1.5px solid #EFEDE8',
      background: disabled ? '#F8F7F4' : '#fff', color: disabled ? '#CFCBC3' : '#5C594F',
      cursor: disabled ? 'default' : 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = '#2A9D8F'; e.currentTarget.style.color = '#2A9D8F' } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = '#EFEDE8'; e.currentTarget.style.color = '#5C594F' } }}
    >{icon}</button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {btn(<Icons.minus />, () => setValue(Math.max(1, value - 1)), value <= 1)}
      <div style={{ minWidth: 54, textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {btn(<Icons.plus />, () => setValue(value + 1), false)}
    </div>
  )
}

/* ── NovaProducaoModal ──────────────────────────────────────── */

function NovaProducaoModal({ onClose }: { onClose: () => void }) {
  const [tipoItem, setTipoItem] = useState('Produto')
  const produtosFiltrados = PRODUTOS_PROD.filter(p => p.tipo === tipoItem)
  const [produto, setProduto] = useState(PRODUTOS_PROD[0])
  const [qtd, setQtd] = useState(3)
  const [confirma, setConfirma] = useState(false)

  const trocaTipo = (v: string) => { setTipoItem(v); setProduto(PRODUTOS_PROD.filter(p => p.tipo === v)[0]) }

  const consumo = FICHA.map(f => ({ ...f, total: f.porUn * qtd, falta: f.porUn * qtd > f.disponivel }))
  const temFalta = consumo.some(c => c.falta)
  const podeConfirmar = !temFalta || confirma

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both', margin: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
              <Icons.factory width={24} height={24} />
            </span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Nova Produção</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Produza antecipado e baixe os insumos do estoque.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E9E7E2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F1F0EC')}
          ><Icons.x /></button>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>Tipo do item produzido</span>
            <div style={{ display: 'flex', padding: 4, background: '#F1F0EC', borderRadius: 10, gap: 3 }}>
              {['Produto', 'Produto Base', 'Customização'].map(v => {
                const on = tipoItem === v
                return (
                  <button key={v} type="button" onClick={() => trocaTipo(v)} style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: on ? '#fff' : 'transparent', color: on ? '#3A372F' : '#8A8780', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 4px', boxShadow: on ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all .14s' }}>{v}</button>
                )
              })}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
              {tipoItem === 'Produto Base' ? 'Produto base a produzir' : tipoItem === 'Customização' ? 'Customização a produzir' : 'Produto a produzir'}
            </span>
            <ProdutoSelect value={produto} onChange={setProduto} options={produtosFiltrados} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F' }}>Quantidade a produzir</span>
            <Counter value={qtd} setValue={setQtd} />
          </div>

          <div style={{ borderRadius: 14, background: 'rgba(42,157,143,0.05)', border: '1.5px solid rgba(42,157,143,0.22)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid rgba(42,157,143,0.18)' }}>
              <span style={{ display: 'flex', color: '#2A9D8F' }}><Icons.layers /></span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1E7268' }}>Insumos que serão consumidos para {qtd} {qtd === 1 ? 'unidade' : 'unidades'}</span>
            </div>
            <div>
              {consumo.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(42,157,143,0.12)', animation: 'rowIn .25s ease both' }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: c.falta ? '#FBEDE9' : '#E8F5EE', color: c.falta ? '#C0492B' : '#1F8A5B' }}>
                    {c.falta ? <Icons.alertCircle width={13} height={13} /> : <Icons.check width={13} height={13} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.8, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: '#A29E96', marginTop: 1 }}>Disponível: <strong style={{ fontWeight: 600, color: c.falta ? '#C0492B' : '#5C594F' }}>{c.disponivel}{c.un}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{c.total}{c.un}</div>
                    {c.falta
                      ? <div style={{ fontSize: 11, fontWeight: 700, color: '#C0492B', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 1 }}><Icons.alertCircle width={11} height={11} /> Saldo insuficiente</div>
                      : <div style={{ fontSize: 11, fontWeight: 600, color: '#1F8A5B', marginTop: 1 }}>OK</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {temFalta && (
            <div style={{ animation: 'fadeUp .3s ease both' }}>
              <div style={{ display: 'flex', gap: 10, padding: '13px 15px', borderRadius: 12, background: '#FFF8F0', border: '1px solid #F6E4CE' }}>
                <span style={{ flexShrink: 0, color: '#C8721F', marginTop: 1 }}><Icons.alertTriangle width={16} height={16} /></span>
                <p style={{ margin: 0, fontSize: 12.8, color: '#7A5A33', lineHeight: 1.55 }}>Um ou mais insumos estão com <strong style={{ fontWeight: 700 }}>saldo insuficiente</strong>. Você pode confirmar mesmo assim — o saldo ficará negativo.</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 12, cursor: 'pointer', userSelect: 'none' }}>
                <span onClick={() => setConfirma(c => !c)} style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${confirma ? '#F97316' : '#CFCBC3'}`, background: confirma ? '#F97316' : '#fff', display: 'grid', placeItems: 'center', color: '#fff', transition: 'all .14s' }}>
                  {confirma && <Icons.check width={12} height={12} />}
                </span>
                <span onClick={() => setConfirma(c => !c)} style={{ fontSize: 13.5, fontWeight: 500, color: '#5C594F' }}>Confirmar mesmo com saldo insuficiente</span>
              </label>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <button onClick={onClose} disabled={!podeConfirmar} style={{ height: 46, padding: '0 22px', borderRadius: 10, border: 'none', background: podeConfirmar ? '#F97316' : '#E7E4DE', color: podeConfirmar ? '#fff' : '#B0ACA4', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: podeConfirmar ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxShadow: podeConfirmar ? '0 8px 18px -8px rgba(249,115,22,0.7)' : 'none', transition: 'all .15s' }}
            onMouseEnter={e => { if (podeConfirmar) e.currentTarget.style.filter = 'brightness(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            <Icons.factory width={17} height={17} /> Confirmar produção
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CancelarProducaoModal ──────────────────────────────────── */

function CancelarProducaoModal({ prod, onClose, onConfirm }: { prod: ProducaoHist; onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState(false)
  const podeConfirmar = obs.trim().length >= 50

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(192,73,43,0.12)', color: '#C0492B' }}>
              <Icons.alertCircle />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Cancelar produção #{prod.num}</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Esta ação não pode ser desfeita.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E9E7E2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F1F0EC')}
          ><Icons.x /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 16px', borderRadius: 12, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#B23A1E', marginBottom: 8 }}>Esta ação irá:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#8A5A4C', lineHeight: 1.6 }}>
              <li>Subtrair <strong style={{ fontWeight: 700 }}>{prod.qtd} {prod.un}</strong> do estoque de <strong style={{ fontWeight: 700 }}>{prod.produto}</strong></li>
              <li>Devolver ao estoque os insumos consumidos: {prod.consumidos.map(c => c.nome).join(', ')}</li>
              <li>Marcar a produção como <strong style={{ fontWeight: 700 }}>Cancelada</strong> (não pode ser reativada)</li>
            </ul>
          </div>

          <label>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              Motivo do cancelamento <span style={{ color: '#F97316' }}>*</span>
              <span style={{ fontWeight: 400, color: obs.length >= 50 ? '#3E9D5A' : '#A29E96', marginLeft: 8 }}>
                {obs.length}/50 caracteres mín.
              </span>
            </span>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="Descreva o motivo do cancelamento (ex: registrei a quantidade errada, era para ser 5 unidades de Kit Convite e não 3 de Amigurumi)"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px',
                border: `1.5px solid ${obs.length > 0 && obs.length < 50 ? '#F2B8A6' : (focus ? '#2A9D8F' : '#EFEDE8')}`,
                borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                resize: 'vertical', lineHeight: 1.5,
                boxShadow: focus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                transition: 'border-color .15s, box-shadow .15s',
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
          <Button variant="ghost" onClick={onClose}>Voltar</Button>
          <Button variant="danger" disabled={!podeConfirmar} onClick={() => onConfirm(obs)}>
            Cancelar produção
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── ProducaoDetalhe ────────────────────────────────────────── */

function ProducaoDetalhe({ prod, onBack }: { prod: ProducaoHist; onBack: () => void }) {
  const cancelada = prod.status === 'cancelada'

  return (
    <div style={{ animation: 'fadeUp .35s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px 0 12px', borderRadius: 10, border: '1.5px solid #EFEDE8', background: '#fff', color: '#5C594F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FAF8F5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Icons.chevron /></span> Voltar para Produção
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22, flexWrap: 'wrap' }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
          <Icons.factory width={24} height={24} />
        </span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Produção #{prod.num} — {prod.data}</h1>
            {cancelada && (
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 27, padding: '0 11px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 12.5, fontWeight: 700 }}>
                Cancelada
              </span>
            )}
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: '#A29E96' }}>
            {cancelada ? 'Esta produção foi cancelada e seus efeitos no estoque foram revertidos.' : 'Baixa de insumos registrada no estoque.'}
          </p>
        </div>
      </div>

      {cancelada && prod.motivoCancelamento && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, padding: '13px 15px', borderRadius: 12, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
          <span style={{ flexShrink: 0, color: '#C0492B', marginTop: 1 }}><Icons.alertCircle /></span>
          <p style={{ margin: 0, fontSize: 12.8, color: '#8A5A4C', lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 700 }}>Motivo do cancelamento:</strong> {prod.motivoCancelamento}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '18px 20px', marginBottom: 18, opacity: cancelada ? 0.65 : 1 }}>
        <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          <Icons.cube width={22} height={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em', textDecoration: cancelada ? 'line-through' : 'none' }}>{prod.produto}</div>
          <div style={{ fontSize: 13, color: '#A29E96', marginTop: 2 }}>Produzido em {prod.data}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: cancelada ? '#A29E96' : '#2A9D8F', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textDecoration: cancelada ? 'line-through' : 'none' }}>{prod.qtd}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#A29E96', marginTop: 3 }}>{prod.un} produzidas</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', opacity: cancelada ? 0.65 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', borderBottom: '1px solid #EFEDE8' }}>
          <span style={{ display: 'flex', color: '#2A9D8F' }}><Icons.layers /></span>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#5C594F', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Insumos consumidos</h2>
        </div>
        {prod.consumidos.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F4F2EE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: '#F1F0EC', color: '#9A968E' }}>
                <Icons.box width={16} height={16} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', textDecoration: cancelada ? 'line-through' : 'none' }}>{row.nome}</span>
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: cancelada ? 'line-through' : 'none' }}>{row.total}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

/* ── página principal ───────────────────────────────────────── */

export default function RegistroProducaoPage() {
  const navigate = useNavigate()
  const { numero } = useParams<{ numero?: string }>()

  const [busca, setBusca] = useState('')
  const [buscaFocus, setBuscaFocus] = useState(false)
  const [modal, setModal] = useState(false)
  const [historico, setHistorico] = useState<ProducaoHist[]>(() => mockHistorico)
  const [cancelarNum, setCancelarNum] = useState<number | null>(null)
  const produtoCancelar = cancelarNum ? (historico.find(h => h.num === cancelarNum) ?? null) : null

  const detalhe = numero ? (historico.find(h => h.num === Number(numero)) ?? null) : null

  const menuItemsLinha = (h: ProducaoHist): ActionMenuItem[] =>
    h.status === 'cancelada'
      ? [{ label: 'Ver detalhes', icon: <Icons.eye />, onClick: () => navigate(`/producao/${h.num}`) }]
      : [
          { label: 'Ver detalhes', icon: <Icons.eye />, onClick: () => navigate(`/producao/${h.num}`) },
          { label: 'Desativar', icon: <Icons.power />, onClick: () => setCancelarNum(h.num), danger: true, dividerBefore: true },
        ]

  const filtrado = historico.filter(h =>
    busca.trim() === '' || h.produto.toLowerCase().includes(busca.trim().toLowerCase())
  )

  if (detalhe) {
    return (
      <AppLayout active="producao">
        <ProducaoDetalhe prod={detalhe} onBack={() => navigate('/producao')} />
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Registro de Produção</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: '#A29E96' }}>Registre o que você produziu para dar baixa nos insumos e atualizar o estoque dos seus produtos.</p>
        </div>
        <button onClick={() => setModal(true)} style={{ height: 46, padding: '0 20px', borderRadius: 10, border: 'none', background: '#F97316', color: '#fff', fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap', boxShadow: '0 8px 18px -8px rgba(249,115,22,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <Icons.plus /> Nova Produção
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 380 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: buscaFocus ? '#2A9D8F' : '#A8A49C', display: 'flex' }}>
            <Icons.search />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setBuscaFocus(true)}
            onBlur={() => setBuscaFocus(false)}
            placeholder="Buscar por produto..."
            style={{ width: '100%', height: 46, padding: '0 14px 0 42px', border: `1.5px solid ${buscaFocus ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10, fontSize: 14.5, color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit', boxShadow: buscaFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none', transition: 'border-color .15s, box-shadow .15s' }}
          />
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 16px', border: '1.5px solid #EFEDE8', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#5C594F', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'flex', color: '#A8A49C' }}><Icons.calendar /></span>
          <span>01 mai — 08 jun 2026</span>
          <span style={{ display: 'flex', color: '#A29E96' }}><Icons.caret /></span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ display: 'flex', color: '#A8A49C' }}><Icons.factory width={17} height={17} /></span>
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#5C594F', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Histórico de produções</h2>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div className="prod-head">
          {['Data', 'Produto', 'Quantidade', 'Insumos consumidos', ''].map((h, k) => (
            <div key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C', textAlign: k === 4 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {filtrado.map((h, i) => (
          <React.Fragment key={h.num}>
            {/* desktop row */}
            <div className="prod-row" style={{ animation: 'fadeUp .35s ease both', opacity: h.status === 'cancelada' ? 0.65 : 1 }}>
              <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{h.data}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
                  <Icons.cube />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.produto}</span>
                {h.status === 'cancelada' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    Cancelada
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{h.qtd} {h.un}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {h.insumos.map((ins, k) => (
                  <span key={k} style={{ fontSize: 12, fontWeight: 500, color: '#6B6860', background: '#F4F2EE', padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    {ins.n}: <strong style={{ fontWeight: 700, color: '#3A372F' }}>{ins.v}</strong>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ActionMenu items={menuItemsLinha(h)} align="right" />
              </div>
            </div>

            {/* mobile card */}
            <div className="prod-card" style={{ padding: '16px 18px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both', opacity: h.status === 'cancelada' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
                    <Icons.cube />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{h.produto}</span>
                    {h.status === 'cancelada' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 11, fontWeight: 700, marginLeft: 8 }}>
                        Cancelada
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2A9D8F', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{h.qtd} {h.un}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {h.insumos.map((ins, k) => (
                  <span key={k} style={{ fontSize: 11.5, fontWeight: 500, color: '#6B6860', background: '#F4F2EE', padding: '4px 9px', borderRadius: 999 }}>
                    {ins.n}: <strong style={{ fontWeight: 700 }}>{ins.v}</strong>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
                <span style={{ fontSize: 12, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>{h.data}</span>
                <ActionMenu items={menuItemsLinha(h)} align="right" />
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {modal && <NovaProducaoModal onClose={() => setModal(false)} />}
      {produtoCancelar && (
        <CancelarProducaoModal
          prod={produtoCancelar}
          onClose={() => setCancelarNum(null)}
          onConfirm={(motivo) => {
            mockHistorico = mockHistorico.map(h =>
              h.num === produtoCancelar.num ? { ...h, status: 'cancelada' as const, motivoCancelamento: motivo } : h
            )
            setHistorico([...mockHistorico])
            setCancelarNum(null)
          }}
        />
      )}
    </AppLayout>
  )
}
