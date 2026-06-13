import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import ModalShell from '../../components/ui/ModalShell'
import { Icons } from '../../components/ui/Icons'

const STEPS = ['Rascunho','Enviado','Aprovado','Aguardando Sinal','Sinal Pago','Em Produção','Finalizado','Entregue','Pago'] as const

type StatusOrcamento = typeof STEPS[number]

const STATUS_META: Record<string, { bg: string; fg: string; dot: string }> = {
  'Rascunho':         { bg: '#F1F0EC', fg: '#7C786F', dot: '#A8A49C' },
  'Enviado':          { bg: '#EAF1FB', fg: '#2A6FB0', dot: '#3A86CE' },
  'Aprovado':         { bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F' },
  'Aguardando Sinal': { bg: '#FFF4E8', fg: '#B5701F', dot: '#E8973A' },
  'Sinal Pago':       { bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F' },
  'Em Produção':      { bg: '#E7F4F1', fg: '#1F7A6F', dot: '#2A9D8F' },
  'Finalizado':       { bg: '#E7F4F1', fg: '#1F7A6F', dot: '#2A9D8F' },
  'Entregue':         { bg: '#EAF1FB', fg: '#2A6FB0', dot: '#3A86CE' },
  'Pago':             { bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F' },
}

const INSUMOS_BAIXA = [
  { nome: 'Papel couchê 300g',          un: 'folhas', qtd: '6',   saldo: undefined },
  { nome: 'Fita de cetim 10mm',         un: 'cm',     qtd: '180', saldo: undefined },
  { nome: 'Linha de crochê 100g teal',  un: 'g',      qtd: '1,2', saldo: 'Saldo insuficiente (0,5g disponível)' },
]

const BRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

const CATALOGO_CANCEL = [
  'Papel couchê 180g',
  'Fita dupla face 12mm',
  'Envelope kraft C6',
  'Linha de crochê teal',
  'Kit Convite Casamento',
]

// ─── Timeline ────────────────────────────────────────────────────────────────

function Timeline({ current }: { current: string }) {
  const ci = STEPS.indexOf(current as StatusOrcamento)
  return (
    <div className="timeline">
      {STEPS.map((s, i) => {
        const done   = i < ci
        const active = i === ci
        const circleBg    = active ? '#2A9D8F' : done ? 'rgba(42,157,143,0.16)' : '#F1F0EC'
        const circleColor = active ? '#fff'    : done ? '#2A9D8F'               : '#B7B4AD'
        const connColor   = i <= ci ? 'rgba(42,157,143,0.5)' : '#EFEDE8'

        return (
          <div className="tl-step" key={s}>
            {i > 0 && (
              <span className="tl-connector" style={{ background: connColor }} />
            )}
            <span style={{
              position: 'relative', zIndex: 1,
              width: 36, height: 36, borderRadius: '50%',
              display: 'grid', placeItems: 'center',
              background: circleBg, color: circleColor,
              border: active ? '2px solid #2A9D8F' : '2px solid transparent',
              boxShadow: active ? '0 0 0 5px rgba(42,157,143,0.14)' : 'none',
              fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {done
                ? <Icons.check />
                : active
                  ? <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />
                  : i + 1}
            </span>
            <span className="tl-label-wrap" style={{ marginTop: 10 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? '#3A372F' : done ? '#6B6860' : '#B7B4AD', whiteSpace: 'nowrap' }}>
                {s}
              </span>
              {active && (
                <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10.5, fontWeight: 600, color: '#2A9D8F', background: 'rgba(42,157,143,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                  Atual
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── ModalFinalizacao ─────────────────────────────────────────────────────────

function ModalFinalizacao({ onClose }: { onClose: () => void }) {
  const [qtds, setQtds] = useState(INSUMOS_BAIXA.map(x => x.qtd))
  const [confirmInsuf, setConfirmInsuf] = useState(false)
  const hasInsuf = INSUMOS_BAIXA.some(x => x.saldo)
  const blocked  = hasInsuf && !confirmInsuf

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Confirmar baixa no estoque"
      subtitle="Confirmar finalização"
      icon={<Icons.layers />}
      iconBg="rgba(42,157,143,0.12)"
      iconColor="#2A9D8F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={blocked} onClick={onClose}>
            Confirmar e finalizar →
          </Button>
        </>
      }
    >
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5C594F', lineHeight: 1.55 }}>
        Os itens abaixo serão descontados do seu estoque:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {INSUMOS_BAIXA.map((it, i) => {
          const insuf = !!it.saldo
          return (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${insuf ? 'rgba(192,73,43,0.4)' : '#EFEDE8'}`,
              background: insuf ? '#FCF3F0' : '#FCFBF9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150, fontSize: 14, fontWeight: 600, color: '#3A372F' }}>
                  {it.nome}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={qtds[i]}
                    onChange={e => setQtds(a => a.map((v, j) => j === i ? e.target.value.replace(/[^\d.,]/g, '') : v))}
                    inputMode="decimal"
                    style={{
                      width: 72, height: 40, padding: '0 12px', textAlign: 'right',
                      border: `1.5px solid ${insuf ? 'rgba(192,73,43,0.5)' : '#EFEDE8'}`,
                      borderRadius: 10, fontSize: 14.5, fontWeight: 600,
                      color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#A29E96', minWidth: 54 }}>{it.un}</span>
                </div>
              </div>
              {insuf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, fontSize: 12.5, fontWeight: 600, color: '#C0492B' }}>
                  <Icons.alertCircle width={14} height={14} /> {it.saldo}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasInsuf && (
        <button
          onClick={() => setConfirmInsuf(c => !c)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 11, marginTop: 16,
            width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
            border: `1.5px solid ${confirmInsuf ? 'rgba(192,73,43,0.5)' : '#EFEDE8'}`,
            background: confirmInsuf ? '#FCF3F0' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
            display: 'grid', placeItems: 'center', marginTop: 1,
            border: `1.5px solid ${confirmInsuf ? '#C0492B' : '#D6D3CC'}`,
            background: confirmInsuf ? '#C0492B' : '#fff', color: '#fff',
          }}>
            {confirmInsuf && <Icons.check />}
          </span>
          <span style={{ fontSize: 13.5, color: '#5C594F', lineHeight: 1.5 }}>
            Confirmar mesmo com saldo insuficiente
            <br />
            <span style={{ fontSize: 12, color: '#A29E96' }}>O estoque ficará negativo até você repor o insumo.</span>
          </span>
        </button>
      )}
    </ModalShell>
  )
}

// ─── ModalSinal ───────────────────────────────────────────────────────────────

function ModalSinal({ onClose }: { onClose: () => void }) {
  const [forma, setForma] = useState('PIX')
  const [data,  setData]  = useState('2026-06-05')
  const [focus, setFocus] = useState(false)
  const formas = ['PIX', 'Dinheiro', 'Cartão', 'Outro']

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Confirmar recebimento do sinal"
      subtitle="Aguardando Sinal"
      icon={<Icons.wallet />}
      iconBg="#FFF4E8"
      iconColor="#B5701F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onClose}>Confirmar e gerar recibo →</Button>
        </>
      }
    >
      {/* Valor esperado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.07)', border: '1px solid rgba(42,157,143,0.2)', marginBottom: 18 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F' }}>Valor esperado</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>
          {BRL(91.8)} <span style={{ fontSize: 13, fontWeight: 600, color: '#A29E96' }}>(50%)</span>
        </span>
      </div>

      {/* Forma de pagamento */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 9 }}>Forma de pagamento</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {formas.map(fp => {
            const on = forma === fp
            return (
              <button key={fp} onClick={() => setForma(fp)} style={{
                flex: '1 1 100px', height: 44, borderRadius: 10, cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                border: `1.5px solid ${on ? '#2A9D8F' : '#EFEDE8'}`,
                background: on ? 'rgba(42,157,143,0.08)' : '#fff',
                color: on ? '#2A9D8F' : '#5C594F', transition: 'all .14s',
              }}>{fp}</button>
            )
          })}
        </div>
      </div>

      {/* Data */}
      <label style={{ display: 'block', marginBottom: 18 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
          <Icons.calendar style={{ color: '#2A9D8F' }} /> Data do recebimento
        </span>
        <input
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: '100%', height: 46, padding: '0 14px',
            border: `1.5px solid ${focus ? '#2A9D8F' : '#EFEDE8'}`,
            borderRadius: 10, fontSize: 14.5, color: '#3A372F',
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            boxShadow: focus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
          }}
        />
      </label>

      {/* Aviso */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)' }}>
        <Icons.receipt style={{ flexShrink: 0, color: '#2A9D8F', marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: '#5C594F', lineHeight: 1.55 }}>
          Após confirmar, o sistema avançará para <strong style={{ fontWeight: 600, color: '#3A372F' }}>Em Produção</strong> e gerará o recibo do sinal.
        </p>
      </div>
    </ModalShell>
  )
}

// ─── ModalCancelSimples ───────────────────────────────────────────────────────

function ModalCancelSimples({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title="Cancelar orçamento?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Voltar</Button>
          <Button variant="danger" onClick={onClose}>Sim, cancelar</Button>
        </>
      }
    >
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <span style={{ display: 'inline-grid', placeItems: 'center', width: 54, height: 54, borderRadius: 15, background: '#FCF3F0', color: '#C0492B', marginBottom: 16 }}>
          <Icons.ban width={24} height={24} />
        </span>
        <p style={{ margin: 0, fontSize: 14, color: '#5C594F', lineHeight: 1.6 }}>
          Esta ação não pode ser desfeita. O orçamento será marcado como <strong>Cancelado</strong>.
        </p>
      </div>
    </ModalShell>
  )
}

// ─── ModalCancelWizard ────────────────────────────────────────────────────────

function ModalCancelWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [consumidos, setConsumidos] = useState([{ nome: 'Papel couchê 180g', qtd: '4 folhas' }])
  const [busca, setBusca] = useState('')
  const [qtd, setQtd] = useState('')
  const [openList, setOpenList] = useState(false)
  const [multaAtiva, setMultaAtiva] = useState(true)
  const [multaTipo, setMultaTipo] = useState<'%' | 'R$'>('%')
  const [multaValor, setMultaValor] = useState('50')
  const [focusField, setFocusField] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const total = 183.6
  const multaNum = parseFloat((multaValor || '0').replace(',', '.')) || 0
  const multaAplicada = multaAtiva
    ? (multaTipo === '%' ? total * multaNum / 100 : Math.min(multaNum, total))
    : 0

  const addItem = () => {
    if (!busca.trim()) return
    setConsumidos(a => [...a, { nome: busca.trim(), qtd: qtd.trim() || '1' }])
    setBusca('')
    setQtd('')
    setOpenList(false)
  }

  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px' }}>
      {[1, 2, 3].map(n => (
        <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? '#C0492B' : '#EFEDE8' }} />
      ))}
    </div>
  )

  const Header = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: '1px solid #EFEDE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#FCF3F0', color: '#C0492B', flexShrink: 0 }}>
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cancelar · Passo {step} de 3
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
        </div>
      </div>
      <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icons.x />
      </button>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(540px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        {/* ─── PASSO 1 — CONSUMO ─── */}
        {step === 1 && (
          <>
            <Header title="Houve consumo de insumos ou produtos?" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#5C594F', lineHeight: 1.55 }}>
                Registre o que já foi usado para dar baixa no estoque mesmo com o cancelamento.
              </p>
              <div style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 2, minWidth: 160 }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                    <Icons.search width={16} height={16} />
                  </span>
                  <input
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setOpenList(true) }}
                    onFocus={() => { setFocusField('b'); setOpenList(true) }}
                    onBlur={() => setFocusField(null)}
                    placeholder="Buscar insumo ou produto…"
                    style={{
                      width: '100%', height: 46, padding: '0 14px 0 40px',
                      border: `1.5px solid ${focusField === 'b' ? '#2A9D8F' : '#EFEDE8'}`,
                      borderRadius: 10, fontSize: 14, color: '#3A372F',
                      background: '#fff', outline: 'none', fontFamily: 'inherit',
                      boxShadow: focusField === 'b' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                    }}
                  />
                  {openList && busca && (
                    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both' }}>
                      {CATALOGO_CANCEL.filter(c => c.toLowerCase().includes(busca.toLowerCase())).slice(0, 4).map(c => (
                        <button key={c} onMouseDown={() => { setBusca(c); setOpenList(false) }} style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, color: '#3A372F' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F7F5F1')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value)}
                  onFocus={() => setFocusField('q')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Qtd"
                  style={{ width: 90, height: 46, padding: '0 12px', border: `1.5px solid ${focusField === 'q' ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10, fontSize: 14, color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={addItem} style={{ height: 46, padding: '0 16px', borderRadius: 10, border: '1.5px solid rgba(42,157,143,0.4)', background: 'rgba(42,157,143,0.06)', color: '#2A9D8F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <Icons.plus /> Adicionar
                </button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {consumidos.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#A29E96', border: '1.5px dashed #EFEDE8', borderRadius: 12 }}>
                    Nenhum item adicionado ainda.
                  </div>
                ) : consumidos.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#3A372F' }}>{it.nome}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6860' }}>{it.qtd}</span>
                    <button onClick={() => setConsumidos(a => a.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', color: '#B7B4AD', cursor: 'pointer', display: 'flex' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#C0492B')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#B7B4AD')}
                    >
                      <Icons.trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>Pular</Button>
              <Button variant="primary" fullWidth onClick={() => setStep(2)}>Próximo →</Button>
            </div>
          </>
        )}

        {/* ─── PASSO 2 — MULTA ─── */}
        {step === 2 && (
          <>
            <Header title="Deseja cobrar multa pelo cancelamento?" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>
              <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', width: 'fit-content', marginBottom: 18 }}>
                {(['Não', 'Sim'] as const).map(lbl => {
                  const val = lbl === 'Sim'
                  return (
                    <button key={lbl} onClick={() => setMultaAtiva(val)} style={{
                      width: 80, height: 44, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                      background: multaAtiva === val ? (val ? '#F97316' : '#F1F0EC') : '#fff',
                      color: multaAtiva === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                    }}>{lbl}</button>
                  )
                })}
              </div>

              {multaAtiva && (
                <div style={{ animation: 'fadeUp .25s ease both' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', borderRadius: 9, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
                      {(['%', 'R$'] as const).map(tp => (
                        <button key={tp} onClick={() => setMultaTipo(tp)} style={{
                          width: 46, height: 46, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                          background: multaTipo === tp ? '#F97316' : '#fff',
                          color: multaTipo === tp ? '#fff' : '#8A8780',
                        }}>{tp}</button>
                      ))}
                    </div>
                    <input
                      value={multaValor}
                      onChange={e => setMultaValor(e.target.value.replace(/[^\d.,]/g, ''))}
                      onFocus={() => setFocusField('m')}
                      onBlur={() => setFocusField(null)}
                      inputMode="decimal"
                      placeholder={multaTipo === '%' ? '50' : '0,00'}
                      style={{
                        flex: 1, minWidth: 120, height: 46, padding: '0 14px',
                        border: `1.5px solid ${focusField === 'm' ? '#F97316' : '#EFEDE8'}`,
                        borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#3A372F',
                        background: '#fff', outline: 'none', fontFamily: 'inherit',
                        boxShadow: focusField === 'm' ? '0 0 0 4px rgba(249,115,22,0.12)' : 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#A29E96' }}>Sugestão padrão: 50% do valor total.</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>Multa</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                      {BRL(multaAplicada)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
              <Button variant="primary" fullWidth onClick={() => setStep(3)}>Próximo →</Button>
            </div>
          </>
        )}

        {/* ─── PASSO 3 — RESUMO ─── */}
        {step === 3 && (
          <>
            <Header title="Resumo do cancelamento" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#B0ACA4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 9 }}>
                  Insumos consumidos
                </div>
                {consumidos.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: '#A29E96' }}>Nenhum consumo registrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {consumidos.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#3A372F', padding: '9px 12px', borderRadius: 9, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
                        <span style={{ fontWeight: 500 }}>{it.nome}</span>
                        <span style={{ fontWeight: 600, color: '#6B6860' }}>{it.qtd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {multaAtiva && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>
                    Multa <span style={{ fontWeight: 500, color: '#A29E96' }}>({multaTipo === '%' ? `${multaValor || 0}%` : 'valor fixo'})</span>
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                    {BRL(multaAplicada)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)' }}>
                <Icons.alertCircle style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.8, color: '#8A5A33', lineHeight: 1.55 }}>
                  Um <strong style={{ fontWeight: 700 }}>PDF de multa</strong> será gerado para enviar à cliente.
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
              <Button variant="danger" fullWidth onClick={onClose}>
                Confirmar e gerar PDF de multa
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ─── ModalCancelSinalPago ─────────────────────────────────────────────────────

function ModalCancelSinalPago({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [estornar, setEstornar] = useState(true)
  const [focusField, setFocusField] = useState(false)
  const [dataEstorno, setDataEstorno] = useState('2026-06-13')

  const valorSinal = 91.80
  const nomeCliente = 'Mariana Costa'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px' }}>
      {[1, 2].map(n => (
        <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? '#C0492B' : '#EFEDE8' }} />
      ))}
    </div>
  )

  const Header = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: '1px solid #EFEDE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#FCF3F0', color: '#C0492B', flexShrink: 0 }}>
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cancelar · Passo {step} de 2
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
        </div>
      </div>
      <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icons.x />
      </button>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        {/* ─── PASSO 1 — ESTORNO ─── */}
        {step === 1 && (
          <>
            <Header title={`Estornar sinal para ${nomeCliente}?`} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px' }}>

              {/* Valor do sinal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Sinal recebido</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                    {BRL(valorSinal)}
                  </div>
                </div>
                <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 13, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
                  <Icons.wallet />
                </span>
              </div>

              {/* Toggle Sim/Não */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', marginBottom: 10 }}>
                  Deseja estornar o sinal?
                </div>
                <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', width: 'fit-content' }}>
                  {(['Não', 'Sim'] as const).map(lbl => {
                    const val = lbl === 'Sim'
                    return (
                      <button key={lbl} onClick={() => setEstornar(val)} style={{
                        width: 80, height: 44, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                        background: estornar === val ? (val ? '#F97316' : '#F1F0EC') : '#fff',
                        color: estornar === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                        transition: 'all .14s',
                      }}>{lbl}</button>
                    )
                  })}
                </div>
              </div>

              {/* Data do estorno (só quando Sim) */}
              {estornar && (
                <div style={{ animation: 'fadeUp .2s ease both' }}>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
                      <Icons.calendar style={{ color: '#F97316' }} /> Data do estorno
                    </span>
                    <input
                      type="date"
                      value={dataEstorno}
                      onChange={e => setDataEstorno(e.target.value)}
                      onFocus={() => setFocusField(true)}
                      onBlur={() => setFocusField(false)}
                      style={{
                        width: '100%', height: 46, padding: '0 14px',
                        border: `1.5px solid ${focusField ? '#F97316' : '#EFEDE8'}`,
                        borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                        background: '#fff', outline: 'none', fontFamily: 'inherit',
                        boxShadow: focusField ? '0 0 0 4px rgba(249,115,22,0.12)' : 'none',
                        transition: 'border-color .15s, box-shadow .15s',
                      }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}>
                    <Icons.receipt style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: '#8A5A33', lineHeight: 1.55 }}>
                      Um <strong style={{ fontWeight: 700 }}>recibo de estorno</strong> será gerado para enviar à cliente como comprovante da devolução.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso sem estorno */}
              {!estornar && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#F7F5F1', border: '1px solid #EFEDE8', animation: 'fadeUp .2s ease both' }}>
                  <Icons.info style={{ flexShrink: 0, color: '#A29E96', marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: '#6B6860', lineHeight: 1.55 }}>
                    O orçamento será cancelado sem devolução do sinal. Nenhum documento será gerado.
                  </p>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={onClose}>Voltar</Button>
              <Button variant="primary" fullWidth onClick={() => estornar ? setStep(2) : onClose()}>
                {estornar ? 'Próximo →' : 'Confirmar cancelamento'}
              </Button>
            </div>
          </>
        )}

        {/* ─── PASSO 2 — CONFIRMAR ESTORNO ─── */}
        {step === 2 && estornar && (
          <>
            <Header title="Confirmar estorno do sinal" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card de destaque — gradiente laranja */}
              <div style={{
                borderRadius: 14,
                background: 'linear-gradient(135deg, #F97316 0%, #F4853A 100%)',
                padding: '20px 22px',
                color: '#fff',
                position: 'relative',
                minHeight: 110,
              }}>
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', top: -40, right: -30, pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
                    Recibo de Estorno
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
                    {BRL(valorSinal)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.88)' }}>
                    {nomeCliente} · {dataEstorno.split('-').reverse().join('/')}
                  </div>
                </div>
              </div>

              {/* Resumo da operação */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  ['Cliente', nomeCliente],
                  ['Valor do estorno', BRL(valorSinal)],
                  ['Data do estorno', dataEstorno.split('-').reverse().join('/')],
                  ['Orçamento', '#0042'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '9px 0', borderBottom: '1px solid #EFEDE8' }}>
                    <span style={{ color: '#A29E96', fontWeight: 500 }}>{label}</span>
                    <span style={{ color: '#3A372F', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Aviso final */}
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <Icons.receipt style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: '#8A5A33', lineHeight: 1.55 }}>
                  O recibo de estorno ficará disponível para download na tela de detalhe do orçamento cancelado.
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
              <Button variant="primary" fullWidth onClick={onClose}>
                Confirmar e gerar recibo de estorno
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetalheOrcamentoPage() {
  const current = 'Sinal Pago'
  const idx  = STEPS.indexOf(current as StatusOrcamento)
  const next = STEPS[idx + 1]
  const meta = STATUS_META[current]
  const [modal, setModal] = useState<string | null>(null)
  const [modalCancel, setModalCancel] = useState(false)
  const cancelaComWizard  = current === 'Em Produção' || current === 'Finalizado'
  const cancelaComEstorno = current === 'Sinal Pago'

  return (
    <AppLayout active="orcamentos">

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Orçamento
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>
              #0042 — Mariana Costa
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 30, padding: '0 13px', borderRadius: 999,
              background: meta.bg, color: meta.fg, fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
              {current}
            </span>
          </div>
        </div>
        <Button variant="ghost" icon={<Icons.copy />} onClick={() => {}}>
          Duplicar orçamento
        </Button>
      </div>

      {/* SEÇÃO 1 — TIMELINE */}
      <section style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '26px 28px', animation: 'fadeUp .4s ease both' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 24 }}>Andamento do pedido</div>
        <Timeline current={current} />

        <div style={{ marginTop: 30, paddingTop: 22, borderTop: '1px solid #EFEDE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <button
            onClick={() => setModalCancel(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: 'none', color: 'rgba(192,73,43,0.85)',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C0492B')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(192,73,43,0.85)')}
          >
            <Icons.ban width={15} height={15} /> Cancelar orçamento
          </button>

          <Button variant="primary" size="lg" iconRight={<Icons.arrowRight />} onClick={() => setModal('finalizacao')}>
            Avançar para: {next}
          </Button>
        </div>
      </section>

      {/* SEÇÃO 2 — RESUMO + PRÓXIMO PASSO */}
      <div className="lower-grid" style={{ marginTop: 18 }}>

        {/* Resumo do orçamento */}
        <section style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '22px 24px', animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, background: 'rgba(42,157,143,0.12)', color: '#2A9D8F' }}>
              <Icons.doc />
            </span>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#3A372F' }}>Resumo do orçamento</h2>
          </div>

          {/* Cliente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #EFEDE8' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.14)', color: '#2A9D8F', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>M</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Mariana Costa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>
                <Icons.phone style={{ color: '#2A9D8F' }} /> (11) 99999-0000
              </div>
            </div>
          </div>

          {/* Itens */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid #EFEDE8', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { qtd: 3,  nome: 'Kit Convite Casamento',  custom: 'Laminação fosca' },
              { qtd: 10, nome: 'Etiqueta personalizada', custom: null },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(249,115,22,0.10)', color: '#F97316', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                  ×{it.qtd}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{it.nome}</div>
                  {it.custom && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 11.5, color: '#A35A26', background: 'rgba(249,115,22,0.08)', padding: '2px 8px', borderRadius: 999 }}>
                      <Icons.tag /> {it.custom}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total + sinal + validade */}
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#A29E96' }}>Total</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{BRL(183.60)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#A29E96' }}>Validade</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#5C594F', marginTop: 2 }}>
                  <Icons.calendar style={{ color: '#2A9D8F' }} /> 11/06/2026
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 10, background: 'rgba(42,157,143,0.07)', border: '1px solid rgba(42,157,143,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#2A9D8F', whiteSpace: 'nowrap' }}>
                  <Icons.check /> Sinal recebido
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{BRL(91.80)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 10, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#A8A49C', whiteSpace: 'nowrap' }}>Restante</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{BRL(91.80)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Card próximo passo */}
        <section style={{
          background: 'linear-gradient(150deg, rgba(42,157,143,0.08) 0%, #fff 55%, rgba(249,115,22,0.05) 100%)',
          border: '1px solid rgba(42,157,143,0.18)',
          borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '22px 24px', animation: 'fadeUp .55s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#fff', color: '#2A9D8F', border: '1px solid rgba(42,157,143,0.2)' }}>
              <Icons.layers />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3A372F' }}>Próximo passo</div>
              <div style={{ fontSize: 12.5, color: '#2A9D8F', fontWeight: 600, marginTop: 1 }}>Finalizar produção</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#5C594F' }}>
            Ao avançar para <strong style={{ fontWeight: 600, color: '#3A372F' }}>Finalizado</strong>, o sistema vai pedir a confirmação da <strong style={{ fontWeight: 600, color: '#3A372F' }}>baixa de estoque</strong> dos insumos usados. Revise as quantidades antes de confirmar.
          </p>
        </section>

      </div>

      {/* Modais */}
      {modal === 'finalizacao' && <ModalFinalizacao onClose={() => setModal(null)} />}
      {modal === 'sinal'       && <ModalSinal       onClose={() => setModal(null)} />}
      {modalCancel && cancelaComWizard                       && <ModalCancelWizard     onClose={() => setModalCancel(false)} />}
      {modalCancel && cancelaComEstorno                      && <ModalCancelSinalPago  onClose={() => setModalCancel(false)} />}
      {modalCancel && !cancelaComWizard && !cancelaComEstorno && <ModalCancelSimples    onClose={() => setModalCancel(false)} />}

    </AppLayout>
  )
}
