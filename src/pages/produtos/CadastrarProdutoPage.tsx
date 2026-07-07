import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Button } from '../../components/ui'
import { produtoService } from '../../services/produtoService'
import { empresaService } from '../../services/empresaService'
import type { ProdutoRequest, TipoProduto } from '../../types/produto'

const num = (s: string) =>
  parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TIPO_LABEL_TO_API: Record<string, TipoProduto> = {
  'Produto':      'PRODUTO',
  'Produto Base': 'PRODUTO_BASE',
  'Customização': 'CUSTOMIZACAO',
}

const TIPO_API_TO_LABEL: Record<string, string> = {
  'PRODUTO':      'Produto',
  'PRODUTO_BASE': 'Produto Base',
  'CUSTOMIZACAO': 'Customização',
}

interface ItemDb {
  id: string
  nome: string
  marca: string
  un: string
  custo: number
  tipo: 'insumo' | 'produto'
  fracionavel: boolean
}

interface FichaItem extends ItemDb {
  qtd: number
}

// ---------- Field ----------

function Field({ label, opt, required, children }: {
  label: string; opt?: boolean; required?: boolean; children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
        {label}{required && <span style={{ color: '#F97316', marginLeft: 3 }}>*</span>}
        {opt && <span style={{ fontSize: 12, fontWeight: 500, color: '#B0ACA4', marginLeft: 6 }}>(opcional)</span>}
      </span>
      {children}
    </label>
  )
}

// ---------- TextInput ----------

function TextInput({ value, onChange, placeholder, suffix, prefix, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  suffix?: string; prefix?: string; inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  const [f, setF] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 44, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, color: '#6B6860', background: '#FAF8F5', borderRadius: '10px 0 0 10px', borderRight: '1px solid #EFEDE8', pointerEvents: 'none' }}>{prefix}</span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: '100%', height: 48, padding: `0 ${suffix ? 64 : 14}px 0 ${prefix ? 56 : 14}px`,
          border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`,
          borderRadius: 10, fontSize: 14.5, color: '#3A372F',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          boxShadow: f ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
      {suffix && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{suffix}</span>}
    </div>
  )
}

// ---------- TipoSelector ----------

const TIPOS = [
  { v: 'Produto',      desc: 'Produto final para criar seu catálogo' },
  { v: 'Produto Base', desc: 'Componente usado em outros produtos' },
  { v: 'Customização', desc: 'Extra opcional adicionado no orçamento' },
]

function TipoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      {TIPOS.map(tp => {
        const on = value === tp.v
        return (
          <button key={tp.v} type="button" onClick={() => onChange(tp.v)} style={{
            textAlign: 'left', padding: '13px 14px', borderRadius: 10,
            border: `1.5px solid ${on ? '#2A9D8F' : '#EFEDE8'}`,
            background: on ? 'rgba(42,157,143,0.06)' : '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: on ? '0 0 0 3px rgba(42,157,143,0.12)' : 'none',
            transition: 'border-color .15s, box-shadow .15s',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.borderColor = '#DCD8D0' }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.borderColor = '#EFEDE8' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: on ? '#1F7A6F' : '#3A372F', whiteSpace: 'nowrap' }}>{tp.v}</span>
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                border: `1.5px solid ${on ? '#2A9D8F' : '#CFCBC3'}`,
                background: on ? '#2A9D8F' : '#fff', display: 'grid', placeItems: 'center',
              }}>
                {on && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19.5 7"/></svg>}
              </span>
            </span>
            <span style={{ fontSize: 12, color: '#A29E96', lineHeight: 1.4 }}>{tp.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- DescTextarea ----------

function DescTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [f, setF] = useState(false)
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      rows={3}
      placeholder="Conte os detalhes que tornam esse produto especial..."
      style={{
        width: '100%', padding: '12px 14px',
        border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`,
        borderRadius: 10, fontSize: 14.5, color: '#3A372F',
        background: '#fff', outline: 'none', fontFamily: 'inherit',
        resize: 'vertical', lineHeight: 1.5,
        boxShadow: f ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    />
  )
}

// ---------- DadosBasicos ----------

function DadosBasicos({ st, set, onNext, nomeErro }: { st: any; set: (k: string, v: any) => void; onNext: () => void; nomeErro?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '28px 30px', maxWidth: 760, animation: 'fadeUp .35s ease both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 24px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Nome do produto" required>
            <TextInput value={st.nome} onChange={v => set('nome', v)} placeholder="Ex: Kit Convite Casamento" />
            {nomeErro && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{nomeErro}</span>}
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Tipo do produto" required>
            <TipoSelector value={st.tipo} onChange={v => set('tipo', v)} />
          </Field>
        </div>
        <Field label="Tempo de produção" required>
          <TextInput value={st.tempo} onChange={v => set('tempo', v.replace(/[^\d]/g, ''))} placeholder="45" suffix="minutos" inputMode="numeric" />
          <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 6 }}>Tempo para produzir o lote inteiro, não a unidade.</span>
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Descrição" opt>
            <DescTextarea value={st.descricao} onChange={v => set('descricao', v)} />
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28, paddingTop: 22, borderTop: '1px solid #EFEDE8' }}>
        <Button variant="primary" iconRight={<Icons.arrowRight />} onClick={onNext}>
          Próximo: Ficha Técnica
        </Button>
      </div>
    </div>
  )
}

// ---------- TipoBadge ----------

function TipoBadge({ tipo }: { tipo: 'insumo' | 'produto' }) {
  const produto = tipo === 'produto'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 7px', borderRadius: 999,
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap',
      background: produto ? 'rgba(42,157,143,0.12)' : '#F1F0EC',
      color: produto ? '#2A9D8F' : '#7C786F',
    }}>
      {produto ? 'Produto Base' : 'Insumo'}
    </span>
  )
}

// ---------- InsumoSearch (com API real + debounce) ----------

function InsumoSearch({ onAdd, jaAdicionados }: { onAdd: (i: ItemDb) => void; jaAdicionados: string[] }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(false)
  const [insumos, setInsumos] = useState<ItemDb[]>([])
  const [produtosBase, setProdutosBase] = useState<ItemDb[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setInsumos([])
      setProdutosBase([])
      return
    }
    const qLower = q.trim().toLowerCase()
    const timer = setTimeout(async () => {
      try {
        const [ins, prods] = await Promise.all([
          produtoService.buscarInsumos(q),
          produtoService.buscarProdutosBase(q),
        ])
        setInsumos(
          ins
            .filter(i => i.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(i.id))
            .map(i => ({ id: i.id, nome: i.nome, marca: i.marca || '', un: i.unidadeMedida || 'un', custo: i.custoUnitario ?? 0, tipo: 'insumo' as const, fracionavel: i.fracionavel ?? true }))
        )
        setProdutosBase(
          prods
            .filter(p => p.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(p.id))
            .map(p => ({ id: p.id, nome: p.nome, marca: '', un: 'un', custo: p.precoCusto, tipo: 'produto' as const, fracionavel: true }))
        )
      } catch {
        // silent
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [q, jaAdicionados])

  const total = insumos.length + produtosBase.length

  const grupo = (titulo: string, itens: ItemDb[]) => itens.length === 0 ? null : (
    <div key={titulo}>
      <div style={{ padding: '8px 11px 5px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A8A49C' }}>{titulo}</div>
      {itens.map(i => (
        <button key={i.id} onClick={() => { onAdd(i); setQ(''); setOpen(false); setInsumos([]); setProdutosBase([]) }} style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
          padding: '10px 11px', borderRadius: 9, border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: i.tipo === 'produto' ? 'rgba(42,157,143,0.12)' : '#F1F0EC', color: i.tipo === 'produto' ? '#2A9D8F' : '#9A968E' }}>
            {i.tipo === 'produto' ? <Icons.cubeSmall /> : <Icons.box width={16} height={16} />}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nome}</span>
              <TipoBadge tipo={i.tipo} />
            </span>
            <span style={{ display: 'block', fontSize: 12, color: '#A29E96' }}>{i.marca}{i.marca ? ' · ' : ''}{moeda(i.custo)} / {i.un}</span>
          </span>
          <Icons.plus style={{ flexShrink: 0, color: '#2A9D8F' }} />
        </button>
      ))}
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: f ? '#2A9D8F' : '#A29E96', display: 'flex' }}>
        <Icons.search />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => { setF(true); setOpen(true) }}
        onBlur={() => setF(false)}
        placeholder="Buscar insumo ou produto base..."
        style={{
          width: '100%', height: 46, padding: '0 14px 0 42px',
          border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`,
          borderRadius: 10, fontSize: 14.5, color: '#3A372F',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          boxShadow: f ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
      {open && total > 0 && (
        <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 14px 34px -10px rgba(0,0,0,0.2)', padding: 6, animation: 'pop .14s ease both', maxHeight: 320, overflowY: 'auto' }}>
          {grupo('Insumos', insumos)}
          {grupo('Produtos Base', produtosBase)}
        </div>
      )}
    </div>
  )
}

// ---------- QtyInput ----------

function QtyInput({ value, un, fracionavel, onChange }: { value: number; un: string; fracionavel: boolean; onChange: (v: string) => void }) {
  const [f, setF] = useState(false)
  const maxFrac = fracionavel ? 2 : 0
  const [display, setDisplay] = useState(value.toLocaleString('pt-BR', { maximumFractionDigits: maxFrac }))

  // Sync when value changes from outside (API load)
  useEffect(() => {
    setDisplay(value.toLocaleString('pt-BR', { maximumFractionDigits: maxFrac }))
  }, [value, maxFrac])

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={display}
        onChange={e => {
          let cleaned = e.target.value.replace(/[^\d.,]/g, '')
          if (!fracionavel) {
            cleaned = cleaned.replace(/[.,]/g, '')
          }
          setDisplay(cleaned)
          onChange(cleaned)
        }}
        inputMode={fracionavel ? 'decimal' : 'numeric'}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: '100%', height: 40, padding: '0 38px 0 11px',
          border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`,
          borderRadius: 8, fontSize: 14, color: '#3A372F',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          boxShadow: f ? '0 0 0 3px rgba(42,157,143,0.12)' : 'none',
        }}
      />
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{un}</span>
    </div>
  )
}

// ---------- FichaTecnica ----------

function FichaTecnica({ ficha, setFicha, rendimento, setRendimento, rendimentoErro, custoTotalLote, custoUnitario }: {
  ficha: FichaItem[]; setFicha: React.Dispatch<React.SetStateAction<FichaItem[]>>
  rendimento: string; setRendimento: (v: string) => void; rendimentoErro?: string
  custoTotalLote: number | null; custoUnitario: number | null
}) {
  const add = (i: ItemDb) => setFicha(f => [...f, { ...i, qtd: 1 }])
  const remove = (idx: number) => setFicha(f => f.filter((_, k) => k !== idx))
  const setQtd = (idx: number, v: string) => setFicha(f => f.map((row, k) => k === idx ? { ...row, qtd: num(v) } : row))

  return (
    <div style={{ animation: 'fadeUp .35s ease both' }}>
      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px 22px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <Icons.layers style={{ color: '#2A9D8F' }} />
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#3A372F', whiteSpace: 'nowrap' }}>Componentes do produto</h3>
          </div>
          <InsumoSearch onAdd={add} jaAdicionados={ficha.map(f => f.id)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 132px 96px 44px', gap: 12, padding: '10px 22px', background: '#FBFAF8', borderTop: '1px solid #EFEDE8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
          <span>Componente</span><span>Quantidade</span><span style={{ textAlign: 'right' }}>Custo</span><span></span>
        </div>
        {ficha.length === 0 ? (
          <div style={{ padding: '34px 22px', textAlign: 'center', color: '#A29E96', fontSize: 13.5, borderTop: '1px solid #EFEDE8' }}>
            Nenhum componente ainda. Use a busca acima para adicionar.
          </div>
        ) : ficha.map((row, idx) => (
          <div key={`${row.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 132px 96px 44px', gap: 12, alignItems: 'center', padding: '13px 22px', borderTop: '1px solid #EFEDE8', animation: 'rowIn .25s ease both' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.nome}</span>
                <TipoBadge tipo={row.tipo} />
              </div>
              <div style={{ fontSize: 12, color: '#A29E96' }}>{row.marca}{row.marca ? ' · ' : ''}{moeda(row.custo)}/{row.un}</div>
            </div>
            <QtyInput value={row.qtd} un={row.un} fracionavel={row.fracionavel} onChange={v => setQtd(idx, v)} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3A372F', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{moeda(row.qtd * row.custo)}</div>
            <button onClick={() => remove(idx)} aria-label="Remover componente" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'transparent', color: '#BDB9B1', cursor: 'pointer', display: 'grid', placeItems: 'center', justifySelf: 'end' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FBEDE9'; e.currentTarget.style.color = '#C0492B' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#BDB9B1' }}
            >
              <Icons.trash />
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px 24px', padding: '18px 22px', borderTop: '1px solid #EFEDE8' }}>
          <div>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
              Rendimento<span style={{ color: '#F97316', marginLeft: 3 }}>*</span>
            </span>
            <div style={{ maxWidth: 200 }}>
              <TextInput value={rendimento} onChange={v => setRendimento(v.replace(/[^\d,]/g, ''))} placeholder="1" suffix="un" inputMode="decimal" />
            </div>
            <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 6 }}>Quantidade de unidades que este lote produz.</span>
            {rendimentoErro && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{rendimentoErro}</span>}
          </div>
          {(custoTotalLote != null || custoUnitario != null) && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(58,111,160,0.07)', border: '1px solid rgba(58,111,160,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#3A6FA0', marginBottom: 8 }}>Valores salvos</div>
              {custoTotalLote != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, padding: '3px 0' }}>
                  <span style={{ color: '#5C594F' }}>Custo Total do lote</span>
                  <span style={{ fontWeight: 700, color: '#3A6FA0', fontVariantNumeric: 'tabular-nums' }}>{moeda(custoTotalLote)}</span>
                </div>
              )}
              {custoUnitario != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, padding: '3px 0' }}>
                  <span style={{ color: '#5C594F' }}>Custo Unitário</span>
                  <span style={{ fontWeight: 700, color: '#3A6FA0', fontVariantNumeric: 'tabular-nums' }}>{moeda(custoUnitario)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- MargemInput ----------

function MargemInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [f, setF] = useState(false)
  return (
    <div style={{ position: 'relative', width: 92 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
        inputMode="numeric"
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: '100%', height: 40, padding: '0 30px 0 12px',
          border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`,
          borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#3A372F',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          boxShadow: f ? '0 0 0 3px rgba(42,157,143,0.12)' : 'none',
        }}
      />
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>%</span>
    </div>
  )
}

// ---------- PrecoFinalInput ----------

function PrecoFinalInput({ value, onChange, highlight }: { value: string; onChange: (v: string) => void; highlight: boolean }) {
  const [f, setF] = useState(false)
  const bc = highlight ? '#F97316' : (f ? '#2A9D8F' : '#EFEDE8')
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 46, display: 'grid', placeItems: 'center',
        fontSize: 15, fontWeight: 700, color: highlight ? '#F97316' : '#6B6860',
        background: highlight ? 'rgba(249,115,22,0.08)' : '#FAF8F5',
        borderRadius: '10px 0 0 10px',
        borderRight: `1px solid ${highlight ? 'rgba(249,115,22,0.3)' : '#EFEDE8'}`,
        pointerEvents: 'none',
      }}>R$</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: '100%', height: 52, padding: '0 14px 0 58px',
          border: `1.5px solid ${bc}`, borderRadius: 10,
          fontSize: 20, fontWeight: 700, color: highlight ? '#F97316' : '#3A372F',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          boxShadow: f ? `0 0 0 4px ${highlight ? 'rgba(249,115,22,0.12)' : 'rgba(42,157,143,0.12)'}` : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
    </div>
  )
}

// ---------- Calculadora ----------

function Calculadora({ ficha, tempo, margem, setMargem, modoMargem, setModoMargem, precoFinal, setPrecoFinal, mostrarPrecoMargem, mensagemSemPreco, valorHora, margemPadrao }: {
  ficha: FichaItem[]; tempo: string
  margem: string; setMargem: (v: string) => void
  modoMargem: string; setModoMargem: (v: string) => void
  precoFinal: string; setPrecoFinal: (v: string) => void
  mostrarPrecoMargem: boolean
  mensagemSemPreco: string
  valorHora: number
  margemPadrao: number
}) {
  const custoInsumos = ficha.reduce((s, r) => s + r.qtd * r.custo, 0)
  const maoObra = (num(tempo) / 60) * (valorHora ?? 0)
  const subtotal = custoInsumos + maoObra
  const lucro = subtotal * (num(margem) / 100)
  const sugerido = subtotal + lucro
  const pf = num(precoFinal)
  const diff = pf - sugerido
  const manual = mostrarPrecoMargem && Math.abs(diff) > 0.005

  const linha = (label: string, val: string, sub?: string) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '9px 0' }}>
      <span style={{ fontSize: 13.2, color: '#5C594F' }}>
        {label}
        {sub && <span style={{ display: 'block', fontSize: 11.5, color: '#A8A49C', marginTop: 1 }}>{sub}</span>}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{val}</span>
    </div>
  )

  return (
    <div className="calc-card">
      <div style={{ background: '#fff', border: '1.5px solid rgba(42,157,143,0.3)', borderRadius: 'var(--r-card)', boxShadow: '0 8px 26px -12px rgba(42,157,143,0.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(42,157,143,0.12), rgba(42,157,143,0.04))', borderBottom: '1px solid rgba(42,157,143,0.18)' }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#fff', color: '#2A9D8F', boxShadow: '0 3px 10px -3px rgba(42,157,143,0.4)' }}>
            <Icons.calc />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1F7A6F', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Calculadora de Custo</div>
            <div style={{ fontSize: 11.5, color: '#2A9D8F', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <Icons.sparkles width={12} height={12} /> Atualiza em tempo real
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 20px 18px' }}>
          {linha('Custo dos insumos', moeda(custoInsumos))}
          {linha('Mão de obra', moeda(maoObra), `${num(tempo)} min × ${moeda(valorHora ?? 0)}/h`)}
          <div style={{ height: 1, background: '#EFEDE8', margin: '4px 0' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '10px 0' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap' }}>Subtotal de custo</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{moeda(subtotal)}</span>
          </div>

          {!mostrarPrecoMargem ? (
            <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#1F7A6F', fontWeight: 600 }}>{mensagemSemPreco}</div>
              <div style={{ fontSize: 11.5, color: '#A29E96', marginTop: 3 }}>O custo acima é registrado automaticamente.</div>
            </div>
          ) : (
            <>
              <div style={{ marginTop: 8, padding: 14, borderRadius: 12, background: '#FBFAF8', border: '1px solid #EFEDE8' }}>
                <div style={{ display: 'flex', padding: 3, background: '#F1F0EC', borderRadius: 9, gap: 3, marginBottom: modoMargem === 'personalizar' ? 12 : 0 }}>
                  {([['padrao', `Margem padrão (${margemPadrao ?? 0}%)`], ['personalizar', 'Personalizar']] as [string, string][]).map(([v, l]) => {
                    const on = modoMargem === v
                    return (
                      <button key={v} onClick={() => { setModoMargem(v); if (v === 'padrao') setMargem((margemPadrao ?? 0).toString()) }} style={{
                        flex: 1, height: 34, borderRadius: 7, border: 'none',
                        background: on ? '#fff' : 'transparent',
                        color: on ? '#3A372F' : '#8A8780',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        boxShadow: on ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap',
                      }}>{l}</button>
                    )
                  })}
                </div>
                {modoMargem === 'personalizar' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5C594F' }}>Margem de lucro</span>
                    <MargemInput value={margem} onChange={setMargem} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '12px 0 4px' }}>
                <span style={{ fontSize: 13, color: '#5C594F' }}>Lucro ({num(margem)}%)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1F8A5B', fontVariantNumeric: 'tabular-nums' }}>+ {moeda(lucro)}</span>
              </div>

              <div key={Math.round(sugerido * 100)} style={{ marginTop: 8, padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(42,157,143,0.14), rgba(42,157,143,0.05))', border: '1.5px solid rgba(42,157,143,0.28)', animation: 'flash .55s ease' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1F7A6F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preço sugerido</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#2A9D8F', letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{moeda(sugerido)}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>Preço final de venda</span>
                <PrecoFinalInput value={precoFinal} onChange={setPrecoFinal} highlight={manual} />
              </div>
              {manual && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '11px 13px', borderRadius: 11, background: '#FFF8F0', border: '1px solid #F6E4CE' }}>
                  <Icons.info style={{ flexShrink: 0, color: '#C8721F', marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.3, color: '#7A5A33', lineHeight: 1.5 }}>
                    Você ajustou o preço manualmente (<strong style={{ fontWeight: 700 }}>{diff > 0 ? '+' : '−'}{moeda(Math.abs(diff))}</strong> {diff > 0 ? 'acima' : 'abaixo'} do sugerido).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Página principal ----------

export default function CadastrarProdutoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id
  const [aba, setAba] = useState<'dados' | 'ficha'>('dados')
  const [dados, setDados] = useState({ nome: '', tipo: 'Produto', descricao: '', tempo: '' })
  const setD = (k: string, v: any) => setDados(d => ({ ...d, [k]: v }))
  const [ficha, setFicha] = useState<FichaItem[]>([])
  const [rendimento, setRendimento] = useState('')
  const [custoTotalLote, setCustoTotalLote] = useState<number | null>(null)
  const [custoUnitario, setCustoUnitario] = useState<number | null>(null)
  const [margem, setMargem] = useState('0')
  const [modoMargem, setModoMargem] = useState('padrao')
  const [precoFinal, setPrecoFinal] = useState('')
  const [salvando, setSalvando] = useState<'padrao' | 'catalogo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [valorHora, setValorHora] = useState(0)
  const [margemPadrao, setMargemPadrao] = useState(0)

  const isProdutoBase = dados.tipo === 'Produto Base'
  const isCustomizacao = dados.tipo === 'Customização'
  const isProduto = dados.tipo === 'Produto'
  const mensagemSemPreco = isProdutoBase
    ? 'Produto Base não tem preço de venda.'
    : 'Produto não tem preço de venda direto — defina o preço ao criar o item de Catálogo.'

  // Buscar configuração de precificação real
  useEffect(() => {
    empresaService.getConfiguracao()
      .then(cfg => {
        const vh = cfg.valorHora ?? 0
        const mp = cfg.margemPadrao ?? 0
        setValorHora(vh)
        setMargemPadrao(mp)
        if (!editando) setMargem(mp.toString())
      })
      .catch(() => {})
  }, [editando])

  // Limpar precoFinal ao sair do tipo Customização
  useEffect(() => {
    if (!isCustomizacao) setPrecoFinal('')
  }, [isCustomizacao])

  // Carregar dados na edição
  useEffect(() => {
    if (!editando || !id) return
    produtoService.buscarPorId(id)
      .then(produto => {
        setDados({
          nome: produto.nome,
          tipo: TIPO_API_TO_LABEL[produto.tipo] || 'Produto',
          descricao: produto.descricao || '',
          tempo: produto.tempoProducao.toString(),
        })
        const fichaItems: FichaItem[] = produto.fichaTecnica.map(item => ({
          id: item.insumoId || item.produtoBaseId || '',
          nome: item.nomeInsumo || item.nomeProdutoBase || '',
          marca: item.marcaInsumo || '',
          un: item.unidadeMedida || 'un',
          custo: item.custoUnitario,
          tipo: item.insumoId ? 'insumo' : 'produto',
          fracionavel: item.fracionavelInsumo ?? true,
          qtd: item.quantidade,
        }))
        setFicha(fichaItems)
        setRendimento(produto.rendimento != null ? produto.rendimento.toString() : '')
        setCustoTotalLote(produto.custoTotalLote ?? null)
        setCustoUnitario(produto.custoUnitario ?? null)
        if (produto.precoVenda != null) {
          setPrecoFinal(produto.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
          setModoMargem('personalizar')
        }
      })
      .catch(console.error)
  }, [editando, id])

  const salvar = async (destino: 'padrao' | 'catalogo' = 'padrao') => {
    setErro(null)
    setFieldErrors({})

    const rendimentoNum = num(rendimento)
    if (!rendimento.trim() || rendimentoNum <= 0) {
      setFieldErrors({ rendimento: 'Rendimento é obrigatório e deve ser maior que zero.' })
      return
    }

    const tipoApi = TIPO_LABEL_TO_API[dados.tipo]
    const precoVendaNum = isCustomizacao ? (num(precoFinal) || undefined) : undefined

    const request: ProdutoRequest = {
      nome: dados.nome.trim(),
      tipo: tipoApi,
      descricao: dados.descricao.trim() || undefined,
      tempoProducao: Math.round(num(dados.tempo)) || 1,
      precoVenda: precoVendaNum,
      rendimento: rendimentoNum,
      fichaTecnica: ficha.map(item => ({
        insumoId: item.tipo === 'insumo' ? item.id : undefined,
        produtoBaseId: item.tipo === 'produto' ? item.id : undefined,
        quantidade: item.qtd,
      })),
    }

    setSalvando(destino)
    try {
      const result = editando && id
        ? await produtoService.editar(id, request)
        : await produtoService.cadastrar(request)

      if (destino === 'catalogo') {
        navigate(`/catalogos/itens/novo?produtoId=${result.id}`)
      } else if (editando) {
        navigate(`/produtos/${id}`)
      } else {
        navigate('/produtos')
      }
    } catch (err: any) {
      const data = err.response?.data
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (data?.message && /rendimento/i.test(data.message)) {
        fe.rendimento = data.message
        setFieldErrors(fe)
      } else {
        setFieldErrors(fe)
        setErro(data?.message || 'Erro ao salvar produto. Verifique os campos obrigatórios.')
      }
    } finally {
      setSalvando(null)
    }
  }

  const ABAS = [
    { id: 'dados' as const, label: 'Dados básicos',  icon: Icons.fileText },
    { id: 'ficha' as const, label: 'Ficha Técnica',  icon: Icons.layers },
  ]

  return (
    <AppLayout active="produtos">

      {/* BREADCRUMB */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/produtos')}
          onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
          onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
        >Produtos</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {editando ? dados.nome || 'Editar Produto' : 'Novo Produto'}
        </span>
      </div>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22 }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          {editando ? <Icons.edit width={26} height={26} /> : <Icons.cube width={26} height={26} />}
        </span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F', whiteSpace: 'nowrap' }}>
          {editando ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1.5px solid #EFEDE8', overflowX: 'auto' }}>
        {ABAS.map((a, i) => {
          const on = aba === a.id
          return (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 9,
              padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14.5, fontWeight: on ? 600 : 500,
              color: on ? '#2A9D8F' : '#8A8780', whiteSpace: 'nowrap', transition: 'color .14s',
            }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.color = '#5C594F' }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.color = '#8A8780' }}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 7, background: on ? 'rgba(42,157,143,0.12)' : '#F1F0EC', color: on ? '#2A9D8F' : '#A8A49C', fontSize: 12, fontWeight: 700 }}>
                {i + 1}
              </span>
              {a.label}
              {on && <span style={{ position: 'absolute', left: 8, right: 8, bottom: -1.5, height: 2.5, borderRadius: 3, background: '#2A9D8F' }} />}
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO */}
      {aba === 'dados' && <DadosBasicos st={dados} set={setD} onNext={() => setAba('ficha')} nomeErro={fieldErrors.nome} />}
      {aba === 'ficha' && (
        <div className="ficha-grid">
          <FichaTecnica
            ficha={ficha} setFicha={setFicha}
            rendimento={rendimento} setRendimento={setRendimento} rendimentoErro={fieldErrors.rendimento}
            custoTotalLote={custoTotalLote} custoUnitario={custoUnitario}
          />
          <Calculadora
            ficha={ficha} tempo={dados.tempo}
            margem={margem} setMargem={setMargem}
            modoMargem={modoMargem} setModoMargem={setModoMargem}
            precoFinal={precoFinal} setPrecoFinal={setPrecoFinal}
            mostrarPrecoMargem={isCustomizacao}
            mensagemSemPreco={mensagemSemPreco}
            valorHora={valorHora}
            margemPadrao={margemPadrao}
          />
        </div>
      )}

      {/* AÇÕES GLOBAIS */}
      {aba !== 'dados' && (
        <div style={{ marginTop: 26 }}>
          {(erro || Object.keys(fieldErrors).length > 0) && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5, marginBottom: 12 }}>
              <div>{erro}</div>
              {Object.keys(fieldErrors).length > 0 && (
                <ul style={{ margin: erro ? '6px 0 0' : 0, padding: '0 0 0 18px' }}>
                  {Object.entries(fieldErrors).map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 11, flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => navigate(editando ? `/produtos/${id}` : '/produtos')} disabled={!!salvando}>
                Cancelar
              </Button>
              <Button variant={isProduto ? 'secondary' : 'primary'} onClick={() => salvar('padrao')} disabled={!!salvando}>
                {salvando === 'padrao'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />{editando ? 'Salvando…' : 'Cadastrando…'}</span>
                  : (editando ? 'Salvar alterações' : 'Salvar produto')
                }
              </Button>
            </div>
            {isProduto && (
              <Button variant="primary" fullWidth iconRight={!salvando ? <Icons.arrowRight /> : undefined} onClick={() => salvar('catalogo')} disabled={!!salvando}>
                {salvando === 'catalogo'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />Criando…</span>
                  : 'Criar produto catálogo'
                }
              </Button>
            )}
          </div>
        </div>
      )}

    </AppLayout>
  )
}
