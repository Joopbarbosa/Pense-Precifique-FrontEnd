import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Button, ModalShell } from '../../components/ui'
import { clienteService } from '../../services/clienteService'
import { produtoService } from '../../services/produtoService'
import { orcamentoService } from '../../services/orcamentoService'
import type { ClienteResponse } from '../../types/cliente'
import type { ProdutoResponse } from '../../types/produto'
import type { OrcamentoRequest, MetodoPagamento } from '../../types/orcamento'

const CUSTOMIZACOES_MOCK = [
  { nome: 'Laminação fosca',  valor: 8 },
  { nome: 'Envelope kraft',   valor: 3.5 },
  { nome: 'Fita de cetim',    valor: 2 },
  { nome: 'Caixa premium',    valor: 12 },
]

const BRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

const METODOS_PAGAMENTO = [
  { id: 'PIX',           label: 'Pix' },
  { id: 'DINHEIRO',      label: 'Dinheiro' },
  { id: 'CREDITO',       label: 'Crédito' },
  { id: 'DEBITO',        label: 'Débito' },
  { id: 'TRANSFERENCIA', label: 'Transferência' },
  { id: 'BOLETO',        label: 'Boleto Bancário' },
  { id: 'OUTRO',         label: 'Outro' },
]

interface Item {
  id: number
  nome: string
  qtd: number
  preco: number
  customs: { nome: string; valor: number; qtd: number }[]
  produtoId?: string
}

// ── QuoteCard ──────────────────────────────────────────────────────────────
function QuoteCard({ step, label, hint, children }: {
  step: string
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #F0EEE9',
      borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFEDE8', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 8,
          display: 'grid', placeItems: 'center',
          background: 'rgba(42,157,143,0.12)', color: '#2A9D8F',
          fontWeight: 700, fontSize: 13.5,
        }}>{step}</span>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: '#3A372F' }}>{label}</div>
          <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>{hint}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── ClienteSelect ──────────────────────────────────────────────────────
function ClienteSelect({ cliente, onSelect, onClear }: {
  cliente: ClienteResponse | null
  onSelect: (c: ClienteResponse) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(false)
  const [results, setResults] = useState<ClienteResponse[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const load = async () => {
      try {
        const data = await clienteService.listar(0, 20, q)
        setResults(data.content)
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
        setResults([])
      }
    }
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [q])

  if (cliente) {
    return (
      <div style={{ padding: '14px 20px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          borderRadius: 12, background: 'rgba(42,157,143,0.07)', border: '1px solid rgba(42,157,143,0.2)',
        }}>
          <span style={{
            flexShrink: 0, width: 46, height: 46, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: 'rgba(42,157,143,0.15)', color: '#2A9D8F', fontWeight: 700, fontSize: 18,
          }}>
            {cliente.nome.charAt(0)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: '#3A372F' }}>{cliente.nome}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#5C594F', marginTop: 2 }}>
              <Icons.phone style={{ color: '#2A9D8F' }} /> {cliente.whatsapp || 'Sem telefone'}
            </div>
          </div>
          <button onClick={onClear} style={{
            flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#2A9D8F',
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 8px',
          }}>
            Trocar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 20px 20px' }}>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
          <Icons.search />
        </span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }}
          onBlur={() => setFocus(false)}
          placeholder="Selecionar cliente..."
          style={{
            width: '100%', height: 48, padding: '0 16px 0 42px',
            border: `1.5px solid ${focus ? '#2A9D8F' : '#EFEDE8'}`,
            borderRadius: 10, fontSize: 14.5, color: '#3A372F',
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            boxShadow: focus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
        />
        {open && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 54, left: 0, right: 0, zIndex: 30,
            background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12,
            boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6,
            animation: 'pop .14s ease both', maxHeight: 248, overflowY: 'auto',
          }}>
            {results.map(c => (
              <button key={c.id} onClick={() => { onSelect(c); setOpen(false); setQ('') }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 9, border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F5F1')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: 'rgba(42,157,143,0.12)', color: '#2A9D8F', fontWeight: 700,
                }}>
                  {c.nome.charAt(0)}
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{c.nome}</div>
                  <div style={{ fontSize: 12.5, color: '#A29E96' }}>{c.whatsapp || 'Sem telefone'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #EFEDE8', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={{
        width: 38, height: 42, border: 'none', background: '#FCFBF9',
        color: '#5C594F', cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F1F0EC')}
        onMouseLeave={e => (e.currentTarget.style.background = '#FCFBF9')}
      >−</button>
      <span style={{
        width: 46, textAlign: 'center', fontSize: 15, fontWeight: 700,
        color: '#3A372F', fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #EFEDE8', borderRight: '1px solid #EFEDE8',
        lineHeight: '42px',
      }}>
        {value}
      </span>
      <button onClick={() => onChange(value + 1)} style={{
        width: 38, height: 42, border: 'none', background: '#FCFBF9',
        color: '#2A9D8F', cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F1F0EC')}
        onMouseLeave={e => (e.currentTarget.style.background = '#FCFBF9')}
      >+</button>
    </div>
  )
}

// ── ItemRow ────────────────────────────────────────────────────────────────
function ItemRow({ item, index, onQtd, onRemove, onOpenCustom }: {
  item: Item
  index: number
  onQtd: (id: number, v: number) => void
  onRemove: (id: number) => void
  onOpenCustom: (item: Item) => void
}) {
  const lineTotal = item.preco * item.qtd

  return (
    <div style={{ padding: '16px 20px', borderTop: index > 0 ? '1px solid #EFEDE8' : 'none', animation: 'fadeUp .35s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: '#3A372F' }}>{item.nome}</div>
          <div style={{ fontSize: 13, color: '#A29E96', marginTop: 2 }}>{BRL(item.preco)} / unidade</div>
        </div>
        <Stepper value={item.qtd} onChange={v => onQtd(item.id, v)} />
        <div style={{ minWidth: 108, textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#B7B4AD' }}>Subtotal</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{BRL(lineTotal)}</div>
        </div>
        <button onClick={() => onRemove(item.id)} style={{
          width: 38, height: 38, borderRadius: 9, border: '1px solid transparent',
          background: 'transparent', color: '#B7B4AD', cursor: 'pointer',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FCF1ED'; e.currentTarget.style.color = '#C0492B' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B7B4AD' }}
        >
          <Icons.trash />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => onOpenCustom(item)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px',
          borderRadius: 9, border: `1px solid ${item.customs.length ? 'rgba(249,115,22,0.4)' : '#EFEDE8'}`,
          background: item.customs.length ? 'rgba(249,115,22,0.08)' : '#FCFBF9',
          color: item.customs.length ? '#A35A26' : '#5C594F',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          <Icons.sliders /> Customizações{item.customs.length ? ` (${item.customs.length})` : ''}
        </button>
        {item.customs.map((c, k) => (
          <span key={k} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px',
            borderRadius: 999, background: '#fff', border: '1px solid #EFEDE8', fontSize: 12.5, color: '#6B6860',
          }}>
            <Icons.tag style={{ color: '#F97316' }} />
            {c.nome} <strong style={{ fontWeight: 600, color: '#A35A26' }}>+{BRL(c.valor)}/un</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── ModalCustomizacoes ─────────────────────────────────────────────────────
function ModalCustomizacoes({ item, onClose, onConfirm }: {
  item: Item
  onClose: () => void
  onConfirm: (id: number, customs: { nome: string; valor: number; qtd: number }[]) => void
}) {
  const [busca, setBusca] = useState('')
  const [selecionadas, setSelecionadas] = useState<{ nome: string; valor: number; qtd: number }[]>(
    item.customs.map(c => ({ ...c, qtd: c.qtd ?? 1 }))
  )

  const filtradas = CUSTOMIZACOES_MOCK.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const toggle = (c: { nome: string; valor: number }) => {
    setSelecionadas(prev =>
      prev.find(x => x.nome === c.nome)
        ? prev.filter(x => x.nome !== c.nome)
        : [...prev, { ...c, qtd: 1 }]
    )
  }

  const setQtd = (nome: string, qtd: number) => {
    setSelecionadas(prev =>
      prev.map(x => x.nome === nome ? { ...x, qtd: Math.max(1, qtd) } : x)
    )
  }

  const extraTotal = selecionadas.reduce((s, c) => s + c.valor * c.qtd, 0)

  return (
    <ModalShell
      open
      onClose={onClose}
      title={item.nome}
      subtitle="Customizações"
      icon={<Icons.sliders width={20} height={20} />}
      iconBg="rgba(249,115,22,0.10)"
      iconColor="#F97316"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(item.id, selecionadas)}>
            Confirmar {selecionadas.length > 0 ? `(${selecionadas.length})` : ''}
          </Button>
        </>
      }
    >
      {/* Campo de busca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
          <Icons.search width={16} height={16} />
        </span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar customização..."
          style={{
            width: '100%', height: 42, padding: '0 14px 0 36px',
            border: '1.5px solid #EFEDE8', borderRadius: 10,
            fontSize: 14, color: '#3A372F', background: '#fff',
            outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = '#2A9D8F')}
          onBlur={e => (e.target.style.borderColor = '#EFEDE8')}
        />
      </div>

      {/* Lista de customizações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtradas.map(c => {
          const sel = selecionadas.find(x => x.nome === c.nome)
          const on = !!sel

          return (
            <div key={c.nome} style={{
              borderRadius: 11,
              border: `1.5px solid ${on ? 'rgba(249,115,22,0.4)' : '#EFEDE8'}`,
              background: on ? 'rgba(249,115,22,0.07)' : '#FCFBF9',
              transition: 'all .14s', overflow: 'hidden',
            }}>
              {/* Linha principal */}
              <button onClick={() => toggle(c)} style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '12px 14px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${on ? '#F97316' : '#D4D0C8'}`,
                    background: on ? '#F97316' : 'transparent',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    transition: 'all .14s',
                  }}>
                    {on && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 4.2 4.2L19 7"/></svg>}
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{c.nome}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: on ? '#F97316' : '#6B6860' }}>
                  +{BRL(c.valor)}/un
                </span>
              </button>

              {/* Linha de quantidade */}
              {on && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 14px 12px', gap: 12,
                  animation: 'fadeUp .2s ease both',
                }}>
                  <span style={{ fontSize: 13, color: '#A29E96' }}>Quantidade</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #EFEDE8', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => setQtd(c.nome, (sel?.qtd ?? 1) - 1)} style={{
                      width: 32, height: 34, border: 'none', background: '#FAF8F5',
                      color: '#5C594F', cursor: 'pointer', fontSize: 16,
                      display: 'grid', placeItems: 'center',
                    }}>−</button>
                    <span style={{
                      width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700,
                      color: '#3A372F', borderLeft: '1px solid #EFEDE8',
                      borderRight: '1px solid #EFEDE8', lineHeight: '34px',
                    }}>
                      {sel?.qtd ?? 1}
                    </span>
                    <button onClick={() => setQtd(c.nome, (sel?.qtd ?? 1) + 1)} style={{
                      width: 32, height: 34, border: 'none', background: '#FAF8F5',
                      color: '#2A9D8F', cursor: 'pointer', fontSize: 16,
                      display: 'grid', placeItems: 'center',
                    }}>+</button>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#F97316', minWidth: 72, textAlign: 'right' }}>
                    = {BRL(c.valor * (sel?.qtd ?? 1))}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {filtradas.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#A29E96', fontSize: 14 }}>
            Nenhuma customização encontrada.
          </div>
        )}
      </div>

      {/* Rodapé de totais */}
      {selecionadas.length > 0 && (
        <div style={{
          marginTop: 16, padding: '12px 15px', borderRadius: 10,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#A35A26' }}>
            {selecionadas.length} customização{selecionadas.length > 1 ? 'ões' : ''} selecionada{selecionadas.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F97316' }}>+{BRL(extraTotal)}</span>
        </div>
      )}
    </ModalShell>
  )
}

// ── PrazoSection ───────────────────────────────────────────────────────────
function PrazoSection({
  prazoDias, setPrazoDias,
  inicioImediato, setInicioImediato,
  dataInicioEstimada, setDataInicioEstimada,
  error,
}: {
  prazoDias: string
  setPrazoDias: (v: string) => void
  inicioImediato: boolean
  setInicioImediato: (v: boolean) => void
  dataInicioEstimada: string
  setDataInicioEstimada: (v: string) => void
  error?: string
}) {
  const [prazoDiasFocus, setPrazoDiasFocus] = useState(false)
  const [dataInicioFocus, setDataInicioFocus] = useState(false)

  return (
    <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Campo de dias */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="number"
          min={1}
          value={prazoDias}
          onChange={e => setPrazoDias(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={() => setPrazoDiasFocus(true)}
          onBlur={() => setPrazoDiasFocus(false)}
          placeholder="10"
          style={{
            width: 100, height: 46, padding: '0 14px', textAlign: 'center',
            border: `1.5px solid ${prazoDiasFocus ? '#2A9D8F' : error ? '#C0492B' : '#EFEDE8'}`,
            borderRadius: 10, fontSize: 18, fontWeight: 700, color: '#3A372F',
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            boxShadow: prazoDiasFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
            transition: 'border-color .15s',
          }}
        />
        <span style={{ fontSize: 15, color: '#5C594F', fontWeight: 500 }}>dias úteis</span>
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#C0492B' }}>
          <Icons.alertCircle width={13} height={13} />
          {error}
        </div>
      )}

      {/* Checkbox início */}
      <button
        type="button"
        onClick={() => setInicioImediato(!inicioImediato)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: inicioImediato ? 'rgba(42,157,143,0.06)' : '#FCFBF9',
          border: `1.5px solid ${inicioImediato ? 'rgba(42,157,143,0.3)' : '#EFEDE8'}`,
          borderRadius: 12, padding: '13px 15px',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'all .14s',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `2px solid ${inicioImediato ? '#2A9D8F' : '#D4D0C8'}`,
          background: inicioImediato ? '#2A9D8F' : 'transparent',
          display: 'grid', placeItems: 'center', transition: 'all .14s',
        }}>
          {inicioImediato && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 12.5 4.2 4.2L19 7"/>
            </svg>
          )}
        </span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Início assim que aprovado</div>
          <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>A produção começa logo após a aprovação do cliente.</div>
        </div>
      </button>

      {/* Data estimada */}
      {!inicioImediato && (
        <div style={{ animation: 'fadeUp .2s ease both' }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <Icons.calendar style={{ color: '#2A9D8F' }} /> Data estimada de início
            </span>
            <input
              type="date"
              value={dataInicioEstimada}
              onChange={e => setDataInicioEstimada(e.target.value)}
              onFocus={() => setDataInicioFocus(true)}
              onBlur={() => setDataInicioFocus(false)}
              style={{
                width: '100%', height: 46, padding: '0 14px',
                border: `1.5px solid ${dataInicioFocus ? '#2A9D8F' : '#EFEDE8'}`,
                borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                boxShadow: dataInicioFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
              }}
            />
          </label>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#A29E96' }}>
            Informe quando você estima começar a produção deste pedido.
          </p>
        </div>
      )}

    </div>
  )
}

// ── PagamentoSection ───────────────────────────────────────────────────────
function PagamentoSection({
  metodoPagamento, setMetodoPagamento,
  metodoPagamentoObs, setMetodoPagamentoObs,
  ativo, setAtivo,
  tipo, setTipo,
  valor, setValor,
  sinalAplicado, restante,
}: {
  metodoPagamento: string
  setMetodoPagamento: (v: string) => void
  metodoPagamentoObs: string
  setMetodoPagamentoObs: (v: string) => void
  ativo: boolean
  setAtivo: (v: boolean) => void
  tipo: '%' | 'R$'
  setTipo: (v: '%' | 'R$') => void
  valor: string
  setValor: (v: string) => void
  sinalAplicado: number
  restante: number
}) {
  const [focus, setFocus] = useState<string | null>(null)
  const obsCharCount = metodoPagamentoObs.length
  return (
    <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* MÉTODO DE PAGAMENTO */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.wallet />
          </span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Método de pagamento</div>
            <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Como a cliente vai pagar.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {METODOS_PAGAMENTO.map(m => {
            const on = metodoPagamento === m.id
            return (
              <button key={m.id} onClick={() => setMetodoPagamento(m.id)} style={{
                height: 38, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                border: `1.5px solid ${on ? '#2A9D8F' : '#EFEDE8'}`,
                background: on ? '#2A9D8F' : '#fff',
                color: on ? '#fff' : '#5C594F',
                transition: 'all .14s',
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#FAF8F5' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff' }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {metodoPagamento === 'OUTRO' && (
          <div style={{ marginTop: 12, animation: 'fadeUp .2s ease both' }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
                <span>Descreva o método de pagamento <span style={{ color: '#F97316' }}>*</span></span>
                <span style={{ fontWeight: 400, color: obsCharCount >= 50 ? '#3E9D5A' : '#A29E96' }}>
                  {obsCharCount}/50 caracteres mín.
                </span>
              </span>
              <textarea
                value={metodoPagamentoObs}
                onChange={e => setMetodoPagamentoObs(e.target.value)}
                onFocus={() => setFocus('obs')}
                onBlur={() => setFocus(null)}
                placeholder="Ex: cheque à vista, transferência internacional..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: `1.5px solid ${focus === 'obs' ? '#2A9D8F' : obsCharCount > 0 && obsCharCount < 50 ? '#F2B8A6' : '#EFEDE8'}`,
                  borderRadius: 10, fontSize: 14, color: '#3A372F',
                  background: '#fff', outline: 'none', fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box',
                  boxShadow: focus === 'obs' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                  transition: 'border-color .15s',
                }}
              />
              {obsCharCount > 0 && obsCharCount < 50 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 13, color: '#C0492B' }}>
                  <Icons.alertCircle width={13} height={13} />
                  Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* DIVISOR */}
      <div style={{ height: 1, background: '#EFEDE8' }} />

      {/* SINAL */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
              <Icons.dollar />
            </span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Cobrar entrada (sinal)?</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Garante o início da produção.</div>
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
            {(['Não', 'Sim'] as const).map((lbl, i) => {
              const val = i === 1
              return (
                <button key={lbl} onClick={() => setAtivo(val)} style={{
                  width: 60, height: 40, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                  background: ativo === val ? (val ? '#2A9D8F' : '#F1F0EC') : '#fff',
                  color: ativo === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                  transition: 'background .14s',
                }}>{lbl}</button>
              )
            })}
          </div>
        </div>

        {ativo && (
          <div style={{ marginTop: 16, animation: 'fadeUp .25s ease both' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', borderRadius: 9, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
                {(['%', 'R$'] as const).map(tp => (
                  <button key={tp} onClick={() => setTipo(tp)} style={{
                    width: 46, height: 46, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    background: tipo === tp ? '#2A9D8F' : '#fff',
                    color: tipo === tp ? '#fff' : '#8A8780',
                  }}>{tp}</button>
                ))}
              </div>
              <input
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                onFocus={() => setFocus('s')}
                onBlur={() => setFocus(null)}
                inputMode="decimal"
                placeholder={tipo === '%' ? '50' : '0,00'}
                style={{
                  flex: 1, minWidth: 0, height: 46, padding: '0 14px',
                  border: `1.5px solid ${focus === 's' ? '#2A9D8F' : '#EFEDE8'}`,
                  borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#3A372F',
                  background: '#fff', outline: 'none', fontFamily: 'inherit',
                  boxShadow: focus === 's' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                  transition: 'border-color .15s',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(42,157,143,0.06)', border: '1px dashed rgba(42,157,143,0.35)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#2A9D8F' }}>
                  <Icons.wallet width={15} height={15} /> Sinal solicitado
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>
                  {BRL(sinalAplicado)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '0 2px' }}>
                <span>Restante após sinal</span>
                <span style={{ fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>
                  {BRL(restante)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary ────────────────────────────────────────────────────────────────
function Summary({ subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit, loading }: {
  subtotal: number
  descTipo: '%' | 'R$'
  descValor: string
  setDescTipo: (v: '%' | 'R$') => void
  setDescValor: (v: string) => void
  descontoAplicado: number
  total: number
  validade: string
  setValidade: (v: string) => void
  obs: string
  setObs: (v: string) => void
  sinalAtivo: boolean
  sinalAplicado: number
  restante: number
  onSubmit: () => void
  loading: boolean
}) {
  const [focus, setFocus] = useState<string | null>(null)
  return (
    <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFEDE8', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'rgba(42,157,143,0.12)', color: '#2A9D8F' }}>
          <Icons.doc />
        </span>
        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#3A372F' }}>Resumo do orçamento</h2>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, color: '#5C594F' }}>
          <span>Subtotal</span>
          <span style={{ fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{BRL(subtotal)}</span>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14.5, color: '#5C594F' }}>Desconto</span>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#C0492B', fontVariantNumeric: 'tabular-nums' }}>− {BRL(descontoAplicado)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', borderRadius: 9, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
              {(['%', 'R$'] as const).map(tp => (
                <button key={tp} onClick={() => setDescTipo(tp)} style={{
                  width: 42, height: 42, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                  background: descTipo === tp ? '#2A9D8F' : '#fff',
                  color: descTipo === tp ? '#fff' : '#8A8780',
                }}>{tp}</button>
              ))}
            </div>
            <input
              value={descValor}
              onChange={e => setDescValor(e.target.value.replace(/[^\d.,]/g, ''))}
              onFocus={() => setFocus('d')}
              onBlur={() => setFocus(null)}
              inputMode="decimal" placeholder="0"
              style={{
                flex: 1, minWidth: 0, height: 42, padding: '0 14px',
                border: `1.5px solid ${focus === 'd' ? '#2A9D8F' : '#EFEDE8'}`,
                borderRadius: 10, fontSize: 14.5, fontWeight: 600, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                boxShadow: focus === 'd' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                transition: 'border-color .15s',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.18)' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#3A372F' }}>Total</span>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#2A9D8F', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{BRL(total)}</span>
        </div>

        {sinalAtivo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: -2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(42,157,143,0.06)', border: '1px dashed rgba(42,157,143,0.35)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#2A9D8F' }}>
                <Icons.wallet width={15} height={15} /> Sinal solicitado
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>{BRL(sinalAplicado)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '0 2px' }}>
              <span>Restante após sinal</span>
              <span style={{ fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{BRL(restante)}</span>
            </div>
          </div>
        )}

        <label style={{ display: 'block' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 6, whiteSpace: 'nowrap' }}>
            <Icons.calendar style={{ color: '#2A9D8F' }} /> Validade do orçamento
          </span>
          <input
            type="date" value={validade}
            onChange={e => setValidade(e.target.value)}
            onFocus={() => setFocus('v')} onBlur={() => setFocus(null)}
            style={{
              width: '100%', height: 44, padding: '0 14px',
              border: `1.5px solid ${focus === 'v' ? '#2A9D8F' : '#EFEDE8'}`,
              borderRadius: 10, fontSize: 14, color: '#3A372F',
              background: '#fff', outline: 'none', fontFamily: 'inherit',
              boxShadow: focus === 'v' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
            }}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 6 }}>
            <Icons.note /> Observações
          </span>
          <textarea
            value={obs} onChange={e => setObs(e.target.value)}
            onFocus={() => setFocus('o')} onBlur={() => setFocus(null)}
            rows={2} placeholder="Ex: Entrega combinada para 15/06"
            style={{
              width: '100%', minHeight: 64, padding: '10px 14px',
              border: `1.5px solid ${focus === 'o' ? '#2A9D8F' : '#EFEDE8'}`,
              borderRadius: 10, fontSize: 14, color: '#3A372F',
              background: '#fff', outline: 'none', fontFamily: 'inherit',
              resize: 'vertical', lineHeight: 1.5,
              boxSizing: 'border-box',
              boxShadow: focus === 'o' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
            }}
          />
        </label>

        <Button variant="primary" fullWidth size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? 'Criando orçamento...' : 'Criar orçamento'}
        </Button>
      </div>
    </div>
  )
}

// ── ProdutoSelect ──────────────────────────────────────────────────────────
function ProdutoSelect({ onSelect, onClose, open }: {
  onSelect: (p: ProdutoResponse) => void
  onClose: () => void
  open: boolean
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ProdutoResponse[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
      return
    }
    const load = async () => {
      try {
        const data = await produtoService.listar(0, 20, 'PRODUTO', q || undefined)
        setResults(data.content)
      } catch (err) {
        console.error('Erro ao buscar produtos:', err)
        setResults([])
      }
    }
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [q, open])

  if (!open) return null

  return (
    <div ref={wrapRef} style={{
      position: 'absolute', left: 20, right: 20, top: 62, zIndex: 30,
      background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12,
      boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6,
      animation: 'pop .14s ease both', maxHeight: 300, overflowY: 'auto',
    }}>
      <div style={{ position: 'sticky', top: 0, padding: '6px 6px 0', background: '#fff', zIndex: 10 }}>
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar produto..."
          style={{
            width: '100%', height: 38, padding: '0 12px',
            border: '1.5px solid #EFEDE8', borderRadius: 9,
            fontSize: 14, color: '#3A372F', background: '#FCFBF9',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>
      <div style={{ marginTop: 6 }}>
        {results.length > 0 ? (
          results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); onClose(); setQ('') }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 11px', borderRadius: 9, border: 'none',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#3A372F',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F7F5F1')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
                <Icons.cube />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#3A372F' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: '#A29E96' }}>{BRL(p.precoVenda || 0)}</div>
              </div>
            </button>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#A29E96', fontSize: 14 }}>
            Nenhum produto encontrado.
          </div>
        )}
      </div>
    </div>
  )
}

// ── CriarOrcamentoPage ─────────────────────────────────────────────────────
export default function CriarOrcamentoPage() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [modalItem, setModalItem] = useState<Item | null>(null)
  const [descTipo, setDescTipo] = useState<'%' | 'R$'>('%')
  const [descValor, setDescValor] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState('PIX')
  const [metodoPagamentoObs, setMetodoPagamentoObs] = useState('')
  const [prazoDias, setPrazoDias] = useState('')
  const [prazoDiasError, setPrazoDiasError] = useState('')
  const [inicioImediato, setInicioImediato] = useState(true)
  const [dataInicioEstimada, setDataInicioEstimada] = useState('')
  const [sinalAtivo, setSinalAtivo] = useState(false)
  const [sinalTipo, setSinalTipo] = useState<'%' | 'R$'>('%')
  const [sinalValor, setSinalValor] = useState('')
  const [validade, setValidade] = useState('')
  const [obs, setObs] = useState('')
  const [productOpen, setProductOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const prodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const subtotal = items.reduce((s, it) => s + it.preco * it.qtd + it.customs.reduce((cs, c) => cs + c.valor * c.qtd * it.qtd, 0), 0)
  const descNum = parseFloat(descValor.replace(',', '.')) || 0
  const descontoAplicado = descTipo === '%' ? subtotal * descNum / 100 : Math.min(descNum, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)
  const sinalNum = parseFloat(sinalValor.replace(',', '.')) || 0
  const sinalAplicado = sinalAtivo ? (sinalTipo === '%' ? total * sinalNum / 100 : Math.min(sinalNum, total)) : 0
  const restante = Math.max(0, total - sinalAplicado)

  const handleAddProduto = (produto: ProdutoResponse) => {
    setItems(arr => [...arr, {
      id: Date.now(),
      nome: produto.nome,
      qtd: 1,
      preco: produto.precoVenda || 0,
      customs: [],
      produtoId: produto.id,
    }])
    setProductOpen(false)
  }

  const handleSubmit = async () => {
    setPrazoDiasError('')

    if (!cliente) {
      alert('Selecione um cliente')
      return
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um produto')
      return
    }

    const prazoDiasNum = parseInt(prazoDias)
    if (!prazoDiasNum || prazoDiasNum < 1) {
      setPrazoDiasError('Prazo obrigatório, mínimo 1 dia')
      return
    }

    if (!inicioImediato && !dataInicioEstimada) {
      alert('Informe a data estimada de início')
      return
    }

    if (metodoPagamento === 'OUTRO' && metodoPagamentoObs.length < 50) {
      alert('Descreva o método de pagamento com ao menos 50 caracteres')
      return
    }

    const payload: OrcamentoRequest = {
      clienteId: cliente.id,
      itens: items.map(it => ({
        produtoId: it.produtoId || '',
        quantidade: it.qtd,
        customizacoes: it.customs.map(c => ({
          produtoId: '', // TODO: mapear para ID da customização se necessário
          quantidade: c.qtd,
        })),
      })),
      metodoPagamento: metodoPagamento as MetodoPagamento,
      metodoPagamentoObs: metodoPagamento === 'OUTRO' ? metodoPagamentoObs : undefined,
      prazoProducaoDias: prazoDiasNum,
      inicioAssimQueAprovado: inicioImediato,
      dataInicioEstimada: !inicioImediato ? dataInicioEstimada : undefined,
      sinalAtivo,
      percentualSinal: sinalAtivo && sinalTipo === '%' ? sinalNum : undefined,
      valorSinal: sinalAtivo && sinalTipo === 'R$' ? sinalNum : undefined,
      tipoDesconto: descNum > 0 ? descTipo : undefined,
      descontoValor: descNum > 0 ? descNum : undefined,
      observacoes: obs || undefined,
      dataValidade: validade || undefined,
    }

    setLoading(true)
    try {
      const result = await orcamentoService.criar(payload)
      navigate(`/orcamentos/${result.id}`)
    } catch (err) {
      console.error('Erro ao criar orçamento:', err)
      alert('Erro ao criar orçamento')
    } finally {
      setLoading(false)
    }
  }

  const summaryProps = { subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit: handleSubmit, loading }

  return (
    <AppLayout active="orcamentos">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Orçamentos
          </div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>
            Novo Orçamento
          </h1>
        </div>
      </div>

      {/* Layout duas colunas */}
      <div className="quote-layout">

        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>

          {/* Seção 1: Cliente */}
          <QuoteCard step="1" label="Cliente" hint="Quem vai receber este orçamento?">
            <ClienteSelect cliente={cliente} onSelect={setCliente} onClear={() => setCliente(null)} />
          </QuoteCard>

          {/* Seção 2: Itens */}
          <QuoteCard step="2" label="Itens do orçamento" hint="Produtos e quantidades do pedido.">
            <div style={{ marginTop: 14 }}>
              {items.length === 0 ? (
                <div style={{ margin: '4px 20px 20px', padding: '40px 24px', textAlign: 'center', border: '1.5px dashed #EFEDE8', borderRadius: 14, background: '#FCFBF9' }}>
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F', marginBottom: 14 }}>
                    <Icons.cart />
                  </span>
                  <div style={{ fontSize: 15.5, fontWeight: 600, color: '#3A372F' }}>Nenhum produto adicionado</div>
                  <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#A29E96' }}>Comece pelo botão abaixo.</p>
                </div>
              ) : (
                items.map((it, i) => (
                  <ItemRow
                    key={it.id} item={it} index={i}
                    onQtd={(id, v) => setItems(arr => arr.map(x => x.id === id ? { ...x, qtd: v } : x))}
                    onRemove={id => setItems(arr => arr.filter(x => x.id !== id))}
                    onOpenCustom={setModalItem}
                  />
                ))
              )}

              {/* Botão adicionar produto */}
              <div ref={prodRef} style={{ position: 'relative', padding: '14px 20px 20px', borderTop: items.length ? '1px solid #EFEDE8' : 'none' }}>
                <button onClick={() => setProductOpen(o => !o)} style={{
                  width: '100%', height: 48, borderRadius: 10,
                  border: '1.5px dashed rgba(42,157,143,0.5)',
                  background: 'rgba(42,157,143,0.05)', color: '#2A9D8F',
                  fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,157,143,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(42,157,143,0.05)')}
                >
                  <Icons.plus /> Adicionar produto
                </button>
                <ProdutoSelect onSelect={handleAddProduto} onClose={() => setProductOpen(false)} open={productOpen} />
              </div>
            </div>
          </QuoteCard>

          {/* Seção 3: Prazo de produção */}
          <QuoteCard step="3" label="Prazo de produção" hint="Quantos dias úteis para finalizar este pedido.">
            <PrazoSection
              prazoDias={prazoDias} setPrazoDias={setPrazoDias}
              inicioImediato={inicioImediato} setInicioImediato={setInicioImediato}
              dataInicioEstimada={dataInicioEstimada} setDataInicioEstimada={setDataInicioEstimada}
              error={prazoDiasError}
            />
          </QuoteCard>

          {/* Seção 4: Pagamento */}
          <QuoteCard step="4" label="Condições de pagamento" hint="Quer pedir um sinal (entrada) para começar?">
            <PagamentoSection
              metodoPagamento={metodoPagamento}
              setMetodoPagamento={setMetodoPagamento}
              metodoPagamentoObs={metodoPagamentoObs}
              setMetodoPagamentoObs={setMetodoPagamentoObs}
              ativo={sinalAtivo} setAtivo={setSinalAtivo}
              tipo={sinalTipo} setTipo={setSinalTipo}
              valor={sinalValor} setValor={setSinalValor}
              sinalAplicado={sinalAplicado} restante={restante}
            />
          </QuoteCard>

          {/* Resumo inline mobile */}
          <div className="summary-inline-mobile">
            <Summary {...summaryProps} />
          </div>
        </div>

        {/* Coluna direita */}
        <div className="summary-col">
          <Summary {...summaryProps} />
        </div>
      </div>

      {/* Barra mobile */}
      <div className="mobile-summary-bar">
        <div>
          <div style={{ fontSize: 11.5, color: '#A29E96', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{BRL(total)}</div>
        </div>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? 'Criando...' : 'Criar orçamento'}
        </Button>
      </div>

      {/* Modal customizações */}
      {modalItem && (
        <ModalCustomizacoes
          item={modalItem}
          onClose={() => setModalItem(null)}
          onConfirm={(id, customs) => {
            setItems(arr => arr.map(x => x.id === id ? { ...x, customs } : x))
            setModalItem(null)
          }}
        />
      )}

    </AppLayout>
  )
}
