import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Logo, Button, StatusBadge } from '../../components/ui'
import { orcamentoService } from '../../services/orcamentoService'
import { useAuthStore } from '../../store/authStore'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EMPRESA = {
  nome: 'Pense & Crie Studio',
  email: 'penseecrie@email.com',
  whatsapp: '(11) 98888-1234',
}

const TEAL = '#2A9D8F'
const ORANGE = '#F97316'

// ── DocumentoPDF ────────────────────────────────────────────────────────────

function DocumentoPDF({ orcamento, sinal }: { orcamento: OrcamentoDetalheResponse | null; sinal: boolean }) {
  if (!orcamento) {
    return <div>Carregando...</div>
  }

  const dataEmissao = new Date(orcamento.createdAt).toLocaleDateString('pt-BR')
  const dataValidade = orcamento.dataValidade
    ? new Date(orcamento.dataValidade).toLocaleDateString('pt-BR')
    : 'Não definida'

  return (
    <div className="a4">

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: `2px solid rgba(42,157,143,0.25)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={52} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>{EMPRESA.nome}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, fontSize: 12, color: '#7C786F' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icons.mail width={13} height={13} style={{ color: TEAL }} /> {EMPRESA.email}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icons.phone width={13} height={13} style={{ color: TEAL }} /> {EMPRESA.whatsapp}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEAL }}>Orçamento</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>#{String(orcamento.numero).padStart(4, '0')}</div>
        </div>
      </div>

      {/* META + CLIENTE */}
      <div className="a4-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '22px 0', borderBottom: '1px solid #F0EEE9' }}>
        <div>
          <Label>Datas</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div>Emissão: <strong style={{ fontWeight: 600 }}>{dataEmissao}</strong></div>
            <div>Validade: <strong style={{ fontWeight: 600 }}>{dataValidade}</strong></div>
          </div>
        </div>
        <div>
          <Label>Prazo de produção</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: TEAL, fontSize: 14 }}>{orcamento.prazoProducaoDias} dias úteis</div>
            <div style={{ color: '#7C786F', marginTop: 2 }}>
              Início: {orcamento.inicioAssimQueAprovado ? 'Assim que aprovado' : (orcamento.dataInicioEstimada ? new Date(orcamento.dataInicioEstimada).toLocaleDateString('pt-BR') : '—')}
            </div>
          </div>
        </div>
        <div>
          <Label>Cliente</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{orcamento.nomeCliente}</div>
            <div style={{ color: '#7C786F' }}>—</div>
          </div>
        </div>
      </div>

      {/* MÉTODO DE PAGAMENTO */}
      <div style={{ padding: '14px 0', borderBottom: '1px solid #F0EEE9' }}>
        <Label>Método de pagamento</Label>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#3A372F' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, background: `rgba(42,157,143,0.12)`, color: TEAL }}>
            <Icons.wallet width={14} height={14} />
          </span>
          {orcamento.metodoPagamento}
        </div>
      </div>

      {/* TABELA DE ITENS */}
      <table className="a4-table" style={{ marginTop: 22 }}>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Customizações</th>
            <th className="num">Qtd</th>
            <th className="num">Valor unit.</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map((it, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600, color: '#3A372F' }}>{it.nomeProduto}</td>
              <td style={{ color: it.customizacoes.length === 0 ? '#C0BCB4' : '#5C594F' }}>
                {it.customizacoes.length === 0 ? '—' : it.customizacoes.map(c => c.nomeProduto).join(', ')}
              </td>
              <td className="num">{it.quantidade}</td>
              <td className="num">{BRL(it.precoUnitario)}</td>
              <td className="num" style={{ fontWeight: 600, color: '#3A372F' }}>{BRL(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ENTRADA SOLICITADA */}
      {sinal && orcamento.sinalAtivo && (
        <div style={{ marginTop: 24, padding: '16px 18px', borderRadius: 12, border: `1.5px solid rgba(42,157,143,0.4)`, background: `rgba(42,157,143,0.05)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: '#fff', color: TEAL, border: `1px solid rgba(42,157,143,0.25)` }}>
              <Icons.wallet width={16} height={16} />
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3A372F' }}>Entrada solicitada</div>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#5C594F', lineHeight: 1.55 }}>
            Para iniciar a produção, solicitamos o pagamento de {orcamento.percentualSinal ? `${orcamento.percentualSinal}%` : BRL(orcamento.valorSinal || 0)} do valor total.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: `1px solid rgba(42,157,143,0.2)` }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TEAL }}>Valor do sinal</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(orcamento.valorSinal || 0)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: '1px solid #F0EEE9' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B0ACA4' }}>Restante na entrega</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(orcamento.total - (orcamento.valorSinal || 0))}</div>
            </div>
          </div>
        </div>
      )}

      {/* TOTAIS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <div style={{ width: 'min(320px, 100%)' }}>
          <Row label="Subtotal" value={BRL(orcamento.subtotal)} />
          {orcamento.descontoValor ? (
            <Row label={`Desconto (${orcamento.tipoDesconto})`} value={`− ${BRL(orcamento.descontoValor)}`} valueColor="#C0492B" />
          ) : null}
          {sinal && orcamento.sinalAtivo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', padding: '8px 12px', borderRadius: 9, background: `rgba(42,157,143,0.07)`, border: `1px dashed rgba(42,157,143,0.4)` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: TEAL }}>
                <Icons.wallet width={14} height={14} /> Sinal solicitado
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>{BRL(orcamento.valorSinal || 0)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, padding: '12px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Total</span>
            <span style={{ fontSize: 21, fontWeight: 700, color: ORANGE, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{BRL(orcamento.total)}</span>
          </div>
          {sinal && orcamento.sinalAtivo && (
            <Row label="Restante após sinal" value={BRL(orcamento.total - (orcamento.valorSinal || 0))} style={{ paddingTop: 9 }} />
          )}
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      {orcamento.observacoes && (
        <div style={{ marginTop: 26, padding: '16px 18px', borderRadius: 10, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
          <Label>Observações</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.6 }}>{orcamento.observacoes}</div>
        </div>
      )}

      {/* RODAPÉ */}
      <div style={{ marginTop: 'auto', paddingTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 12, color: '#9A968E', flexWrap: 'wrap' }}>
          <Icons.doc width={15} height={15} style={{ color: TEAL, flexShrink: 0 }} />
          Este orçamento é válido até
          <strong style={{ fontWeight: 600, color: '#6B6860', margin: '0 2px' }}>{dataValidade}</strong>.
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Gerado por <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 4 }}>Pense &amp; Precifique</strong>
          </span>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 10.5, lineHeight: 1.55, color: '#B0ACA4' }}>
          Em caso de cancelamento após aprovação, poderá ser cobrado uma taxa referente aos materiais e tempo já investidos na produção.
        </p>
      </div>

    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Row({ label, value, valueColor, style }: { label: string; value: string; valueColor?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '7px 10px', ...style }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: valueColor }}>{value}</span>
    </div>
  )
}

// ── PreviewPdfPage ───────────────────────────────────────────────────────────

type StatusBadgeType =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

const STATUS_LABEL: Record<string, StatusBadgeType> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  AGUARDANDO_SINAL: 'Aguardando Sinal',
  SINAL_PAGO: 'Sinal Pago',
  EM_PRODUCAO: 'Em Produção',
  FINALIZADO: 'Finalizado',
  ENTREGUE: 'Entregue',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
}

export default function PreviewPdfPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore((state) => state.token)
  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null)
  const [sinal, setSinal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await orcamentoService.buscarPorId(id)
        setOrcamento(data)
        setSinal(data.sinalAtivo)
      } catch (err) {
        console.error('Erro ao carregar orçamento:', err)
        alert('Erro ao carregar orçamento')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDownloadPdf = async () => {
    if (!id || !token) return
    setDownloadLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/orcamentos/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orcamento-${orcamento?.numero || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao baixar PDF:', err)
      alert('Erro ao baixar PDF')
    } finally {
      setDownloadLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout active="orcamentos">
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A29E96' }}>
          Carregando orçamento...
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

          {/* Breadcrumb + título */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/orcamentos')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12.5, fontWeight: 500, color: '#A29E96', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#A29E96')}
              >
                Orçamentos
              </button>
              <Icons.chevron style={{ color: '#CFCBC3', flexShrink: 0 }} />
              <button
                onClick={() => navigate(`/orcamentos/${orcamento.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12.5, fontWeight: 600, color: '#5C594F', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#5C594F')}
              >
                #{String(orcamento.numero).padStart(4, '0')} — {orcamento.nomeCliente}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                Preview do orçamento
              </h1>
              <StatusBadge status={STATUS_LABEL[orcamento.status] || 'Rascunho'} size="sm" />
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" icon={<Icons.download />} onClick={handleDownloadPdf} disabled={downloadLoading}>
              {downloadLoading ? 'Baixando...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO A4 */}
      <div className="doc-scroll" style={{ marginTop: 16 }}>
        <div className="doc-wrap">
          <DocumentoPDF orcamento={orcamento} sinal={sinal} />
        </div>
      </div>

    </AppLayout>
  )
}
