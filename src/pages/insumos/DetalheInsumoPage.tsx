import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import type { InsumoResponse, MovimentacaoInsumoResponse, ProdutoRelacionadoResponse } from '../../types/insumo'
import { insumoService } from '../../services/insumoService'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2),
    maximumFractionDigits: dec != null ? dec : 3,
  })

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR')

const MOTIVOS = ['Perda', 'Avaria', 'Uso extra', 'Correção de estoque', 'Outro']

const TIPO_LABEL: Record<string, string> = {
  PRODUTO: 'Produto',
  PRODUTO_BASE: 'Produto base',
  CUSTOMIZACAO: 'Customização',
}

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function tituloMovimentacao(m: MovimentacaoInsumoResponse): { titulo: string; tipoDisplay: 'entrada' | 'saida' | 'estorno' } {
  if (m.motivo === 'ESTORNO_PRODUCAO') return { titulo: 'Estorno — Cancelamento Produção', tipoDisplay: 'estorno' }
  const labelsEntrada: Record<string, string> = { COMPRA: 'Compra' }
  const labelsSaida: Record<string, string> = { BAIXA_MANUAL: 'Baixa manual', PRODUCAO: 'Produção', ORCAMENTO: 'Orçamento' }
  if (m.tipo === 'ENTRADA') return { titulo: `Entrada — ${labelsEntrada[m.motivo] ?? m.motivo}`, tipoDisplay: 'entrada' }
  return { titulo: `Saída — ${labelsSaida[m.motivo] ?? m.motivo}`, tipoDisplay: 'saida' }
}

function refText(m: MovimentacaoInsumoResponse): string {
  const labels: Record<string, string> = { PRODUCAO: 'Produção', ORCAMENTO: 'Orçamento', LOTE_COMPRA: 'Compra' }
  if (m.referenciaTipo && m.referenciaId) return `${labels[m.referenciaTipo] ?? m.referenciaTipo} #${m.referenciaId.slice(0, 8)}`
  return ''
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

function BaixaModal({ insumoId, unidade, onClose, onSuccess }: {
  insumoId: string
  unidade: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState('Perda')
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [selOpen, setSelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selRef = useRef<HTMLDivElement>(null)

  const podeRegistrar = qtd.trim() !== '' && parseFloat(qtd.replace(',', '.')) > 0 && obs.trim().length >= 50

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await insumoService.baixaManual(insumoId, {
        quantidade: parseFloat(qtd.replace(',', '.')),
        motivo: 'BAIXA_MANUAL',
        observacao: obs.trim(),
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar baixa. Tente novamente.')
      setLoading(false)
    }
  }

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
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{unidade}</span>
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
          {error && (
            <p style={{ margin: 0, fontSize: 13.5, color: '#C0392B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" icon={<Icons.minus />} disabled={!podeRegistrar || loading} onClick={handleSubmit}>
            {loading ? 'Registrando…' : 'Registrar baixa'}
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

function HistRows({ movimentacoes, unidade }: { movimentacoes: MovimentacaoInsumoResponse[]; unidade: string }) {
  return (
    <>
      {movimentacoes.map(m => {
        const { titulo, tipoDisplay } = tituloMovimentacao(m)
        const positivo = m.tipo === 'ENTRADA'
        const isEstorno = tipoDisplay === 'estorno'
        const deltaC = isEstorno ? '#C0492B' : (positivo ? '#1F8A5B' : '#C0492B')
        const deltaT = (positivo ? '+ ' : '− ') + m.quantidade + ` ${unidade}`
        const riscado = m.estornada
        const ref = refText(m)

        return (
          <React.Fragment key={m.id}>
            {/* desktop row */}
            <div className="hist-row" style={{
              animation: 'fadeUp .35s ease both',
              opacity: riscado ? 0.6 : 1,
              background: isEstorno ? '#FBEDE9' : 'transparent',
            }}>
              <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{formatDate(m.createdAt)}</div>
              <div style={{ textDecoration: riscado ? 'line-through' : 'none' }}>
                <HistTipo tipo={tipoDisplay} titulo={titulo} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: riscado ? 'line-through' : 'none' }}>{deltaT}</div>
              <div style={{ fontSize: 13.5, color: '#3A372F', fontVariantNumeric: 'tabular-nums', textDecoration: riscado ? 'line-through' : 'none' }}>—</div>
              <div style={{ fontSize: 13, color: isEstorno ? '#B23A1E' : '#A29E96', whiteSpace: isEstorno ? 'normal' : 'nowrap', overflow: isEstorno ? 'visible' : 'hidden', textOverflow: 'ellipsis', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                {ref}
              </div>
            </div>
            {m.observacao && (
              <div className="hist-row" style={{ gridTemplateColumns: '1fr', padding: '0 20px 15px', borderTop: 'none', marginTop: -15 }}>
                <div style={{ fontSize: 12.5, color: '#A29E96', fontStyle: 'italic', lineHeight: 1.5, paddingLeft: 132 }}>
                  "{m.observacao}"
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
                <HistTipo tipo={tipoDisplay} titulo={titulo} />
                <span style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{deltaT}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap', fontSize: 12.5, color: isEstorno ? '#B23A1E' : '#A29E96', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(m.createdAt)}</span>
                {ref && <><span style={{ color: '#D8D4CC' }}>·</span><span>{ref}</span></>}
              </div>
              {m.observacao && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#A29E96', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{m.observacao}"
                </div>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

function FichasList({ produtos, loading, onSelect }: { produtos: ProdutoRelacionadoResponse[]; loading: boolean; onSelect: (produtoId: string) => void }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '32px 20px', justifyContent: 'center' }}>
        <span style={{ width: 18, height: 18, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
        Carregando fichas técnicas…
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: '#A29E96' }}>
        Nenhuma ficha técnica usa este insumo ainda.
      </div>
    )
  }

  return (
    <div>
      {produtos.map((p) => (
        <button key={p.id} onClick={() => onSelect(p.id)} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          borderTop: '1px solid #EFEDE8', borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
          animation: 'fadeUp .35s ease both', width: '100%',
          background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FAF8F5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.cubeSmall />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {p.identificador && (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#A29E96', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{p.identificador}</span>
              )}
              <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
            </div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7C786F', background: '#F1F0EC', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {TIPO_LABEL[p.tipo] ?? p.tipo}
          </span>
          <span style={{ flexShrink: 0, color: '#CFCBC3', display: 'flex' }}>
            <Icons.chevron />
          </span>
        </button>
      ))}
    </div>
  )
}

export default function DetalheInsumoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [modal, setModal] = useState<'baixa' | null>(null)
  const [aba, setAba] = useState<'historico' | 'fichas'>('historico')
  const [insumo, setInsumo] = useState<InsumoResponse | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoInsumoResponse[]>([])
  const [histPage, setHistPage] = useState(0)
  const [histHasNext, setHistHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMoreHist, setLoadingMoreHist] = useState(false)
  const [produtosRelacionados, setProdutosRelacionados] = useState<ProdutoRelacionadoResponse[]>([])
  const [loadingFichas, setLoadingFichas] = useState(false)

  const ABAS = [
    { id: 'historico' as const, label: 'Histórico de movimentações', icon: Icons.history },
    { id: 'fichas' as const,    label: 'Fichas técnicas que usam este insumo', icon: Icons.layers },
  ]

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      insumoService.buscarPorId(id),
      insumoService.listarMovimentacoes(id, 0),
    ]).then(([ins, hist]) => {
      setInsumo(ins)
      setMovimentacoes(hist.content)
      setHistHasNext(!hist.last)
      setHistPage(0)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (aba !== 'fichas' || !id) return
    setLoadingFichas(true)
    insumoService.listarProdutosRelacionados(id)
      .then(setProdutosRelacionados)
      .catch(console.error)
      .finally(() => setLoadingFichas(false))
  }, [aba, id])

  const carregarMaisHistorico = () => {
    if (!id) return
    const nextPage = histPage + 1
    setLoadingMoreHist(true)
    insumoService.listarMovimentacoes(id, nextPage)
      .then(hist => {
        setMovimentacoes(prev => [...prev, ...hist.content])
        setHistHasNext(!hist.last)
        setHistPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setLoadingMoreHist(false))
  }

  const recarregarAposBaixa = () => {
    if (!id) return
    Promise.all([
      insumoService.buscarPorId(id),
      insumoService.listarMovimentacoes(id, 0),
    ]).then(([ins, hist]) => {
      setInsumo(ins)
      setMovimentacoes(hist.content)
      setHistHasNext(!hist.last)
      setHistPage(0)
    }).catch(console.error)
  }

  if (loading || !insumo) {
    return (
      <AppLayout active="insumos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando insumo…
        </div>
      </AppLayout>
    )
  }

  const isLow = insumo.estoqueMinimo != null && insumo.estoqueAtual < insumo.estoqueMinimo

  return (
    <AppLayout active="insumos">

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate('/insumos')}
          onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
          onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
        >Insumos</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{insumo.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0 }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.box width={26} height={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {insumo.identificador && (
                <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>{insumo.identificador}</span>
              )}
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>{insumo.nome}</h1>
              {insumo.ativo ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: '#E8F5EE', color: '#1F8A5B', fontSize: 12.5, fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A56F' }} /> Ativo
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: '#F1F0EC', color: '#7C786F', fontSize: 12.5, fontWeight: 600 }}>
                  Inativo
                </span>
              )}
              {insumo.permitirEstoqueNegativo ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: hexA('#2A9D8F', 0.12), color: '#2A9D8F', fontSize: 12.5, fontWeight: 600 }}>
                  <Icons.check width={13} height={13} /> Permite estoque negativo
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: hexA('#EF4444', 0.12), color: '#EF4444', fontSize: 12.5, fontWeight: 600 }}>
                  <Icons.x width={13} height={13} /> Bloqueia estoque negativo
                </span>
              )}
              {insumo.fracionavel ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 27, padding: '0 11px', borderRadius: 999, background: hexA('#2A9D8F', 0.10), color: '#2A9D8F', fontSize: 12.5, fontWeight: 600 }}>
                  Fracionável
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 27, padding: '0 11px', borderRadius: 999, background: hexA('#6B6860', 0.10), color: '#6B6860', fontSize: 12.5, fontWeight: 600 }}>
                  Não fracionável
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, color: '#A29E96', marginTop: 4 }}>Marca: <strong style={{ color: '#5C594F', fontWeight: 600 }}>{insumo.marca || '—'}</strong></div>
          </div>
        </div>
        <Button variant="ghost" icon={<Icons.edit />} onClick={() => navigate(`/insumos/${id}/editar`)}>
          Editar
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#EFEDE8' }}>
          {[
            { k: 'Unidade de medida',    v: insumo.unidadeMedida },
            { k: 'Saldo atual',          v: `${insumo.estoqueAtual} ${insumo.unidadeMedida}`, big: true, warn: isLow },
            { k: 'Estoque mínimo',       v: insumo.estoqueMinimo != null ? `${insumo.estoqueMinimo} ${insumo.unidadeMedida}` : '—' },
            { k: 'Custo unitário atual', v: `${moeda(insumo.custoUnitario, 2)} / ${insumo.unidadeMedida}`, accent: true },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', padding: '18px 20px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{c.k}</div>
              <div style={{
                marginTop: 7, fontVariantNumeric: 'tabular-nums',
                fontSize: c.big ? 28 : c.accent ? 18 : 16,
                fontWeight: c.big || c.accent ? 700 : 600,
                letterSpacing: c.big ? '-0.02em' : '0',
                color: c.warn ? '#C8721F' : (c.big || c.accent ? '#2A9D8F' : '#3A372F'),
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
            {movimentacoes.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: '#A29E96' }}>
                Nenhuma movimentação registrada ainda.
              </div>
            ) : (
              <HistRows movimentacoes={movimentacoes} unidade={insumo.unidadeMedida} />
            )}
          </>
        ) : (
          <FichasList produtos={produtosRelacionados} loading={loadingFichas} onSelect={produtoId => navigate(`/produtos/${produtoId}`)} />
        )}
      </div>

      {aba === 'historico' && (
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12.5, color: '#A29E96', alignSelf: 'flex-end', width: '100%', textAlign: 'right' }}>
            {movimentacoes.length} movimentações
          </div>
          {histHasNext && (
            <button onClick={carregarMaisHistorico} disabled={loadingMoreHist} style={{
              height: 44, padding: '0 24px', borderRadius: 10,
              border: '1.5px solid #EFEDE8', background: '#fff',
              color: '#2A9D8F', fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit', cursor: loadingMoreHist ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: loadingMoreHist ? 0.7 : 1,
            }}
              onMouseEnter={e => { if (!loadingMoreHist) e.currentTarget.style.background = 'rgba(42,157,143,0.06)' }}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {loadingMoreHist
                ? <><span style={{ width: 16, height: 16, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} /> Carregando…</>
                : <>Carregar mais <Icons.chevron style={{ transform: 'rotate(90deg)' }} /></>
              }
            </button>
          )}
        </div>
      )}

      {modal === 'baixa' && (
        <BaixaModal
          insumoId={id!}
          unidade={insumo.unidadeMedida}
          onClose={() => setModal(null)}
          onSuccess={recarregarAposBaixa}
        />
      )}

    </AppLayout>
  )
}
