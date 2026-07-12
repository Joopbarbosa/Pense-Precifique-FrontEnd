import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Logo } from '../../components/ui'
import { Mail, Phone, BadgeCheck, Check, ShoppingBag, ChevronRight, ArrowLeft, Download } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'

// ── Constantes de cor ────────────────────────────────────────────────────────

const TEAL = '#2A9D8F'
const ORANGE = '#F97316'
const GREEN = '#2E9E60'
const GREEN_DEEP = '#1A6B3E'
const GREEN_SOFT = 'rgba(46,158,96,0.07)'
const GREEN_LINE = 'rgba(46,158,96,0.22)'

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function DocLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function DocSectionTitle({ icon, color = TEAL, children }: { icon: React.ReactNode; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: hexA(color, 0.12), color }}>
        {icon}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#3A372F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {children}
      </span>
    </div>
  )
}

// ── DocumentoReciboPagamento ─────────────────────────────────────────────────

function DocumentoReciboPagamento({ orcamento, empresa }: { orcamento: OrcamentoDetalheResponse; empresa: EmpresaResponse | null }) {
  const numeroFormatado = `#${String(orcamento.numero).padStart(4, '0')}`
  const emissao = fmtDate(orcamento.updatedAt)
  const dataPagamento = fmtDate(orcamento.updatedAt)
  const dataSinal = fmtDate(orcamento.dataSinalPago)
  const valorTotal = orcamento.total
  const valorSinal = orcamento.valorSinal || 0
  const pagoAgora = orcamento.sinalAtivo ? valorTotal - valorSinal : valorTotal

  return (
    <div className="a4" style={{ animation: 'fadeUp .4s ease both' }}>

      {/* CABEÇALHO — borda verde */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: `2px solid ${hexA(GREEN, 0.25)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>{empresa?.nome || ''}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, fontSize: 12, color: '#7C786F' }}>
              {empresa?.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={13} style={{ color: TEAL }} /> {empresa.email}
                </span>
              )}
              {empresa?.whatsapp && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Phone size={13} style={{ color: TEAL }} /> {empresa.whatsapp}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: GREEN }}>Orçamento</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{numeroFormatado}</div>
        </div>
      </div>

      {/* TÍTULO — QUITAÇÃO TOTAL */}
      <div style={{ marginTop: 26, padding: '20px 22px', borderRadius: 12, background: GREEN_SOFT, border: `1px solid ${GREEN_LINE}`, borderLeft: `4px solid ${GREEN}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: '#fff', color: GREEN, border: `1px solid ${GREEN_LINE}` }}>
            <BadgeCheck size={22} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: GREEN_DEEP, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              RECIBO DE PAGAMENTO — QUITAÇÃO TOTAL
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', marginTop: 5, fontSize: 12.5, color: '#3F6B53' }}>
              <span>Referência: <strong style={{ fontWeight: 700 }}>Orçamento {numeroFormatado}</strong></span>
              <span>Data: <strong style={{ fontWeight: 700 }}>{emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div style={{ padding: '22px 0 0' }}>
        <DocLabel>Dados da cliente</DocLabel>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3A372F' }}>{orcamento.nomeCliente}</div>
      </div>

      {/* PEDIDO QUITADO — destaque verde */}
      <div style={{ marginTop: 24, borderRadius: 14, border: `1.5px solid ${hexA(GREEN, 0.38)}`, background: hexA(GREEN, 0.05), overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', background: `linear-gradient(135deg, ${hexA(GREEN, 0.15)}, ${hexA(GREEN, 0.04)})`, borderBottom: `1px solid ${hexA(GREEN, 0.22)}` }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: '#fff', color: GREEN, boxShadow: `0 3px 9px -3px ${hexA(GREEN, 0.45)}` }}>
            <Check size={14} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: GREEN_DEEP, letterSpacing: '-0.005em' }}>Pedido quitado</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '18px 24px', padding: 18 }}>
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: GREEN_DEEP }}>
              <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: GREEN, color: '#fff' }}>
                <Check size={12} />
              </span>
              Pagamento recebido em sua totalidade
            </div>
            <div style={{ fontSize: 12.5, color: '#5C7A68', marginTop: 6, lineHeight: 1.5 }}>
              Não há valores pendentes para este orçamento.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9A968E' }}>Data do pagamento</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', marginTop: 3 }}>{dataPagamento}</div>
          </div>
        </div>
      </div>

      {/* DETALHES FINANCEIROS */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<ShoppingBag size={15} />} color={GREEN}>Detalhes financeiros</DocSectionTitle>
        <table className="a4-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Customização</th>
              <th className="num">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#B0ACA4' }}>Nenhum item</td>
              </tr>
            ) : (
              orcamento.itens.map((it, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: '#3A372F' }}>{it.nomeProduto}</td>
                  <td style={{ color: it.customizacoes.length === 0 ? '#C0BCB4' : '#5C594F' }}>
                    {it.customizacoes.length === 0 ? '—' : it.customizacoes.map(c => c.nomeProduto).join(', ')}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>× {it.quantidade}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Resumo financeiro */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <div style={{ width: 'min(380px, 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '8px 12px' }}>
              <span>Valor total do pedido</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#3A372F' }}>{BRL(valorTotal)}</span>
            </div>
            {orcamento.sinalAtivo && valorSinal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '8px 12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5C594F' }}>
                  Entrada já paga <span style={{ color: '#9A968E', fontSize: 12 }}>em {dataSinal}</span>
                </span>
                <span style={{ fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>− {BRL(valorSinal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '8px 12px', borderBottom: '1px solid #F0EEE9' }}>
              <span style={{ color: '#5C594F' }}>Valor pago agora</span>
              <span style={{ fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{BRL(pagoAgora)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '11px 12px', marginTop: 4, borderRadius: 9, background: hexA(GREEN, 0.08), border: `1px dashed ${hexA(GREEN, 0.4)}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: GREEN_DEEP }}>
                <Check size={14} /> Saldo devedor
              </span>
              <span style={{ fontWeight: 700, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{BRL(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, padding: '14px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: `1px solid ${hexA(ORANGE, 0.28)}` }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#3A372F', lineHeight: 1.3 }}>Total quitado</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: ORANGE, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{BRL(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: 'auto', paddingTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 11.5, color: '#9A968E', flexWrap: 'wrap', lineHeight: 1.6 }}>
          <BadgeCheck size={15} style={{ color: GREEN, flexShrink: 0 }} />
          Este recibo confirma a quitação total do pedido. Gerado pelo sistema
          <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>Pense &amp; Precifique</strong>
          em <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>{emissao}</strong>.
        </div>
      </div>

    </div>
  )
}

// ── ReciboPagamentoPage ──────────────────────────────────────────────────────

export default function ReciboPagamentoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore(s => s.token)

  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const [orc, emp] = await Promise.all([
          orcamentoService.buscarPorId(id),
          empresaService.getEmpresa(),
        ])
        setOrcamento(orc)
        setEmpresa(emp)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        alert('Erro ao carregar dados do recibo')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDownload = async () => {
    if (!id) return
    const url = orcamentoService.downloadReciboPagamento(id)
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `recibo-pagamento-${id}.pdf`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Erro ao baixar recibo de pagamento:', err)
      alert('Erro ao baixar recibo de pagamento')
    }
  }

  if (loading) {
    return (
      <AppLayout active="orcamentos">
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A29E96' }}>
          Carregando...
        </div>
      </AppLayout>
    )
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos">
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#C0492B' }}>
          Orçamento não encontrado
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="orcamentos" noPad>

      {/* BARRA DE AÇÕES */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EFEDE8', padding: '14px 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#9A968E', marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onClick={() => navigate('/orcamentos')}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#9A968E')}
              >Orçamentos</span>
              <ChevronRight size={15} style={{ color: '#CFCBC3', flexShrink: 0 }} />
              <span
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onClick={() => navigate(`/orcamentos/${id}`)}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#9A968E')}
              >Detalhe do orçamento</span>
              <ChevronRight size={15} style={{ color: '#CFCBC3', flexShrink: 0 }} />
              <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>Recibo de Pagamento</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                Recibo de Pagamento
              </h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 13px', borderRadius: 999, background: hexA(GREEN, 0.12), color: GREEN_DEEP, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} /> Pago
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/orcamentos/${id}`)}
              style={{ height: 44, padding: '0 18px', borderRadius: 10, border: '1.5px solid #EFEDE8', background: '#fff', color: '#5C594F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAF8F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <ArrowLeft size={17} /> Voltar ao orçamento
            </button>
            <button
              onClick={handleDownload}
              style={{ height: 44, padding: '0 18px', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 8px 18px -8px ${hexA(TEAL, 0.7)}` }}>
              <Download size={17} /> Baixar Recibo
            </button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="doc-scroll">
        <div className="doc-wrap">
          <DocumentoReciboPagamento orcamento={orcamento} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
