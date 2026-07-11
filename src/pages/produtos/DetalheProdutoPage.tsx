import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import { produtoService } from '../../services/produtoService'
import { tipoProdutoBadge } from '../../utils/badges'
import type { ProdutoDetalheResponse, MovimentacaoProdutoResponse, BaixaManualProdutoRequest } from '../../types/produto'

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: dec ?? 2, maximumFractionDigits: dec ?? 2 })

const fmtData = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

// Mapeamento de motivo da API para label exibido
const MOTIVO_LABEL: Record<string, string> = {
  PRODUCAO: 'Produção',
  ORCAMENTO: 'Orçamento',
  PERDA: 'Perda',
  AVARIA: 'Avaria',
  USO_EXTRA: 'Uso extra',
  CORRECAO: 'Correção de estoque',
  OUTRO: 'Outro',
  ESTORNO_PRODUCAO: 'Cancelamento de produção',
}

type MovKind = 'entrada' | 'saida' | 'estorno'

function resolveKind(mov: MovimentacaoProdutoResponse): MovKind {
  if (mov.estornada) return 'estorno'
  if (mov.tipo === 'ENTRADA') return 'entrada'
  return 'saida'
}

const MOV_STYLE: Record<MovKind, { c: string; bg: string; icon: keyof typeof Icons }> = {
  entrada:  { c: '#1F8A5B', bg: '#E8F5EE', icon: 'factorySm' },
  saida:    { c: '#C0492B', bg: '#FBEDE9', icon: 'minus' },
  estorno:  { c: '#C0492B', bg: '#FBEDE9', icon: 'alertCircle' },
}

function MovTitulo(mov: MovimentacaoProdutoResponse) {
  const kind = resolveKind(mov)
  if (kind === 'estorno') return `Cancelamento — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
  if (mov.tipo === 'ENTRADA') return `Entrada — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
  return `Saída — ${MOTIVO_LABEL[mov.motivo] || mov.motivo}`
}

function HistTipo({ mov }: { mov: MovimentacaoProdutoResponse }) {
  const kind = resolveKind(mov)
  const m = MOV_STYLE[kind]
  const Ic = Icons[m.icon] as (p?: React.SVGProps<SVGSVGElement>) => JSX.Element
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: m.bg, color: m.c }}>
        <Ic />
      </span>
      <span style={{ fontSize: 13.8, fontWeight: 600, color: '#3A372F' }}>{MovTitulo(mov)}</span>
    </div>
  )
}

function ReferenciaCell({ mov }: { mov: MovimentacaoProdutoResponse }) {
  if (mov.motivo !== 'ORCAMENTO' || !mov.catalogoReferencia) {
    return <span style={{ color: '#D8D4CC' }}>—</span>
  }
  const isCatalogo = mov.catalogoReferencia.startsWith('CTG-')
  const Ic = isCatalogo ? Icons.layers : Icons.cube
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', minWidth: 0, maxWidth: '100%' }}>
      <span title={mov.catalogoReferencia} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px',
        borderRadius: 999, fontSize: 11.5, fontWeight: 600,
        color: isCatalogo ? '#2A9D8F' : '#8A8780',
        background: isCatalogo ? 'rgba(42,157,143,0.10)' : '#F1F0EC',
        maxWidth: '100%', minWidth: 0,
      }}>
        <Ic width={11} height={11} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {mov.catalogoReferencia}
        </span>
      </span>
      {mov.precoVendido != null && (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>
          {moeda(mov.precoVendido)}
        </span>
      )}
    </div>
  )
}

const MOTIVOS_PRODUTO: { api: BaixaManualProdutoRequest['motivo']; label: string }[] = [
  { api: 'PERDA',     label: 'Perda' },
  { api: 'AVARIA',    label: 'Avaria' },
  { api: 'USO_EXTRA', label: 'Uso extra' },
  { api: 'CORRECAO',  label: 'Correção de estoque' },
  { api: 'OUTRO',     label: 'Outro' },
]

const HIST_COLS = '110px 1fr 88px minmax(120px, 180px) 1fr'

function BaixaProdutoModal({ produtoId, nomeProduto, onClose, onSuccess }: {
  produtoId: string
  nomeProduto: string
  onClose: () => void
  onSuccess: (novoEstoque: number) => void
}) {
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState<BaixaManualProdutoRequest['motivo']>('PERDA')
  const [motivoLabel, setMotivoLabel] = useState('Perda')
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [selOpen, setSelOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const selRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setSelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const qtdNum = parseFloat((qtd || '0').replace(/\./g, '').replace(',', '.')) || 0
  const podeRegistrar = qtdNum > 0 && obs.trim().length >= 50 && !salvando

  const baseStyle = (k: string): React.CSSProperties => ({
    width: '100%', minHeight: 48, padding: '0 14px',
    border: `1.5px solid ${focus === k ? '#2A9D8F' : '#EFEDE8'}`,
    borderRadius: 10, fontSize: 14.5, color: '#3A372F',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxShadow: focus === k ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

  const registrar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      const result = await produtoService.baixaManual(produtoId, {
        quantidade: qtdNum,
        motivo,
        observacao: obs.trim(),
      })
      onSuccess(result.quantidade)
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao registrar baixa.')
    } finally {
      setSalvando(false)
    }
  }

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
                Baixa manual — {nomeProduto}
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
                  {motivoLabel}<span style={{ color: '#A29E96', display: 'flex' }}><Icons.caret /></span>
                </button>
                {selOpen && (
                  <div style={{ position: 'absolute', top: 52, left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both' }}>
                    {MOTIVOS_PRODUTO.map(m => (
                      <button key={m.api} type="button" onClick={() => { setMotivo(m.api); setMotivoLabel(m.label); setSelOpen(false) }} style={{
                        width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 8,
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                        background: m.api === motivo ? 'rgba(42,157,143,0.08)' : 'transparent',
                        fontWeight: m.api === motivo ? 600 : 500,
                        color: m.api === motivo ? '#2A9D8F' : '#3A372F',
                      }}
                        onMouseEnter={e => { if (m.api !== motivo) e.currentTarget.style.background = '#F7F5F1' }}
                        onMouseLeave={e => { if (m.api !== motivo) e.currentTarget.style.background = 'transparent' }}
                      >{m.label}</button>
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

          {erro && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13 }}>
              {erro}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="secondary" icon={<Icons.minus />} disabled={!podeRegistrar} onClick={registrar}>
            {salvando ? 'Registrando…' : 'Registrar baixa'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DetalheProdutoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [produto, setProduto] = useState<ProdutoDetalheResponse | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProdutoResponse[]>([])
  const [movPage, setMovPage] = useState(0)
  const [movHasNext, setMovHasNext] = useState(false)
  const [movLoadingMore, setMovLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'historico' | 'ficha'>('historico')
  const [modal, setModal] = useState<'baixa' | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      produtoService.buscarPorId(id),
      produtoService.listarMovimentacoes(id, 0),
    ])
      .then(([prod, movs]) => {
        setProduto(prod)
        setMovimentacoes(movs.content)
        setMovHasNext(!movs.last)
        setMovPage(0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const carregarMaisMovs = () => {
    if (!id) return
    const nextPage = movPage + 1
    setMovLoadingMore(true)
    produtoService.listarMovimentacoes(id, nextPage)
      .then(data => {
        setMovimentacoes(prev => [...prev, ...data.content])
        setMovHasNext(!data.last)
        setMovPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setMovLoadingMore(false))
  }

  const recarregarMovimentacoes = () => {
    if (!id) return
    produtoService.listarMovimentacoes(id, 0)
      .then(data => {
        setMovimentacoes(data.content)
        setMovHasNext(!data.last)
        setMovPage(0)
      })
      .catch(console.error)
  }

  const handleBaixaSuccess = (qtdSubtraida: number) => {
    setModal(null)
    if (produto) {
      setProduto(prev => prev ? { ...prev, estoqueAtual: Math.max(0, prev.estoqueAtual - qtdSubtraida) } : prev)
    }
    recarregarMovimentacoes()
  }

  if (loading || !produto) {
    return (
      <AppLayout active="produtos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '60px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando produto…
        </div>
      </AppLayout>
    )
  }

  const badge = tipoProdutoBadge(produto.tipo)
  const ts = { bg: badge.bg, fg: badge.fg }
  const tipoLabel = badge.label

  const isCustom = produto.tipo === 'CUSTOMIZACAO'
  const isProdutoBase = produto.tipo === 'PRODUTO_BASE'

  const precoCustoTotal = produto.fichaTecnica.reduce((s, i) => s + i.custoTotal, 0)

  const cells = [
    { k: 'Tipo', v: tipoLabel },
    ...(!isProdutoBase ? [{ k: 'Estoque atual', v: `${produto.estoqueAtual} unidades`, big: true, danger: produto.estoqueAtual === 0 }] : []),
    ...(produto.estoqueMinimo != null ? [{ k: 'Estoque mínimo', v: `${produto.estoqueMinimo} unidades` }] : []),
    { k: 'Preço de custo', v: moeda(produto.precoCusto), accent: true, hint: 'calculado pela ficha técnica' },
    ...(produto.precoVenda != null ? [{ k: isCustom ? 'Valor adicional' : 'Preço de venda', v: isCustom ? '+ ' + moeda(produto.precoVenda) : moeda(produto.precoVenda), price: true }] : []),
    ...(produto.rendimento != null ? [{ k: 'Rendimento', v: `${produto.rendimento} unidades` }] : []),
    ...(produto.custoTotalLote != null ? [{ k: 'Custo Total do lote', v: moeda(produto.custoTotalLote), blue: true }] : []),
    ...(produto.custoUnitario != null ? [{ k: 'Custo Unitário', v: moeda(produto.custoUnitario), blue: true }] : []),
  ]

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
        <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>{produto.nome}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0 }}>
          <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.cube width={26} height={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {produto.identificador && (
                <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>{produto.identificador}</span>
              )}
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F', whiteSpace: 'nowrap' }}>{produto.nome}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 999, background: ts.bg, color: ts.fg, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                {tipoLabel}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: produto.ativo ? '#E8F5EE' : '#F1F0EC', color: produto.ativo ? '#1F8A5B' : '#7C786F', fontSize: 12.5, fontWeight: 600 }}>
                {produto.ativo && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A56F' }} />}
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </span>
              {produto.permitirEstoqueNegativo ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: 'rgba(42,157,143,0.12)', color: '#2A9D8F', fontSize: 12.5, fontWeight: 600 }}>
                  <Icons.check width={13} height={13} /> Permite estoque negativo
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontSize: 12.5, fontWeight: 600 }}>
                  <Icons.x width={13} height={13} /> Bloqueia estoque negativo
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, color: '#A29E96', marginTop: 4 }}>
              Atualizado em <strong style={{ color: '#5C594F', fontWeight: 600 }}>{fmtData(produto.updatedAt)}</strong>
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
                fontSize: (c as any).big ? 28 : ((c as any).accent || (c as any).price || (c as any).blue) ? 18 : 16,
                fontWeight: ((c as any).big || (c as any).accent || (c as any).price || (c as any).blue) ? 700 : 600,
                letterSpacing: (c as any).big ? '-0.02em' : '0',
                color: (c as any).danger ? '#C0492B' : (c as any).blue ? '#3A6FA0' : (c as any).accent ? '#2A9D8F' : '#3A372F',
              }}>{c.v}</div>
              {(c as any).hint && <div style={{ marginTop: 3, fontSize: 11.5, color: '#A8A49C', fontWeight: 500 }}>{(c as any).hint}</div>}
            </div>
          ))}
        </div>
        {!isProdutoBase && (
          <div style={{ display: 'flex', gap: 11, padding: '16px 20px', borderTop: '1px solid #EFEDE8', flexWrap: 'wrap' }}>
            <Button variant="primary" icon={<Icons.factory />} onClick={() => navigate('/producao')}>
              Registrar produção
            </Button>
            <Button variant="ghost" icon={<Icons.minus />} onClick={() => setModal('baixa')}>
              Baixa manual
            </Button>
          </div>
        )}
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
              {['Data', 'Movimentação', 'Quantidade', 'Referência', 'Observação'].map((h, k) => (
                <div key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>{h}</div>
              ))}
            </div>
            {movimentacoes.length === 0 ? (
              <div style={{ padding: '34px 20px', textAlign: 'center', color: '#A29E96', fontSize: 13.5, borderTop: '1px solid #EFEDE8' }}>
                Nenhuma movimentação registrada ainda.
              </div>
            ) : movimentacoes.map((mov) => {
              const kind = resolveKind(mov)
              const pos = mov.tipo === 'ENTRADA'
              const deltaC = kind === 'estorno' ? '#C0492B' : (pos ? '#1F8A5B' : '#C0492B')
              const deltaT = (pos ? '+ ' : '− ') + mov.quantidade + ' un'
              const isEstorno = mov.estornada
              const riscado = isEstorno

              return (
                <React.Fragment key={mov.id}>
                  <div className="hist-row" style={{
                    gridTemplateColumns: HIST_COLS, animation: 'fadeUp .35s ease both',
                    opacity: riscado ? 0.6 : 1,
                    background: isEstorno ? '#FBEDE9' : 'transparent',
                  }}>
                    <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{fmtData(mov.createdAt)}</div>
                    <div style={{ textDecoration: riscado ? 'line-through' : 'none' }}>
                      <HistTipo mov={mov} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: riscado ? 'line-through' : 'none' }}>{deltaT}</div>
                    <div style={{ minWidth: 0 }}>
                      <ReferenciaCell mov={mov} />
                    </div>
                    <div style={{ fontSize: 13, color: isEstorno ? '#B23A1E' : '#A29E96', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                      {mov.observacao || (mov.referenciaId ? `Ref: ${mov.referenciaId}` : '—')}
                    </div>
                  </div>
                  <div className="hist-card" style={{
                    padding: '15px 18px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both',
                    opacity: riscado ? 0.6 : 1,
                    background: isEstorno ? '#FBEDE9' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: riscado ? 'line-through' : 'none' }}>
                      <HistTipo mov={mov} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: deltaC, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{deltaT}</span>
                    </div>
                    {mov.motivo === 'ORCAMENTO' && mov.catalogoReferencia && (
                      <div style={{ marginTop: 9 }}>
                        <ReferenciaCell mov={mov} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap', fontSize: 12.5, color: isEstorno ? '#B23A1E' : '#A29E96', fontStyle: isEstorno ? 'italic' : 'normal' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtData(mov.createdAt)}</span>
                      {mov.observacao && <><span style={{ color: '#D8D4CC' }}>·</span><span>{mov.observacao}</span></>}
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </>
        ) : (
          // ABA FICHA TÉCNICA
          produto.fichaTecnica.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center', color: '#A29E96', fontSize: 13.5 }}>
              Nenhum componente cadastrado na ficha técnica.
            </div>
          ) : (
            <>
              {produto.fichaTecnica.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: idx === 0 ? 'none' : '1px solid #EFEDE8', animation: 'fadeUp .35s ease both' }}>
                  <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: item.produtoBaseId ? 'rgba(42,157,143,0.12)' : '#F1F0EC', color: item.produtoBaseId ? '#2A9D8F' : '#9A968E' }}>
                    {item.produtoBaseId ? <Icons.cubeSmall /> : <Icons.box width={20} height={20} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap' }}>
                        {item.nomeInsumo || item.nomeProdutoBase}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: item.produtoBaseId ? '#2A9D8F' : '#7C786F', background: item.produtoBaseId ? 'rgba(42,157,143,0.10)' : '#F1F0EC', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                        {item.produtoBaseId ? 'Produto Base' : 'Insumo'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>
                      {item.marcaInsumo ? item.marcaInsumo + ' · ' : ''}{item.quantidade} {item.unidadeMedida || 'un'}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {moeda(item.custoTotal)}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid #EFEDE8' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5C594F' }}>
                  Total: <span style={{ color: '#2A9D8F', fontSize: 15 }}>{moeda(precoCustoTotal)}</span>
                </span>
              </div>
            </>
          )
        )}
      </div>

      {aba === 'historico' && (
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: '#A29E96', alignSelf: 'flex-end', width: '100%', textAlign: 'right' }}>
            {movimentacoes.length} movimentaç{movimentacoes.length === 1 ? 'ão' : 'ões'}
          </div>
          {movHasNext && (
            <button onClick={carregarMaisMovs} disabled={movLoadingMore} style={{
              height: 42, padding: '0 20px', borderRadius: 10,
              border: '1.5px solid #EFEDE8', background: '#fff',
              color: '#2A9D8F', fontSize: 13.5, fontWeight: 600,
              fontFamily: 'inherit', cursor: movLoadingMore ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: movLoadingMore ? 0.7 : 1,
            }}
              onMouseEnter={e => { if (!movLoadingMore) e.currentTarget.style.background = 'rgba(42,157,143,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              {movLoadingMore
                ? <><span style={{ width: 15, height: 15, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} /> Carregando…</>
                : <>Carregar mais <Icons.chevron style={{ transform: 'rotate(90deg)' }} /></>
              }
            </button>
          )}
        </div>
      )}

      {modal === 'baixa' && id && (
        <BaixaProdutoModal
          produtoId={id}
          nomeProduto={produto.nome}
          onClose={() => setModal(null)}
          onSuccess={handleBaixaSuccess}
        />
      )}

    </AppLayout>
  )
}
