import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Logo, Button, StatusBadge } from '../../components/ui'

// ── Dados mockados ──────────────────────────────────────────────────────────

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EMPRESA = {
  nome: 'Pense & Crie Studio',
  email: 'penseecrie@email.com',
  whatsapp: '(11) 98888-1234',
}

const ORCAMENTO = {
  numero: '#0042',
  cliente: 'Mariana Costa',
  telefone: '(11) 99999-0000',
  emissao: '04/06/2026',
  validade: '11/06/2026',
  subtotal: 204,
  desconto: 20.4,
  total: 183.6,
  sinalValor: 91.8,
  restante: 91.8,
  metodoPagamento: 'Pix',
  observacoes: 'Prazo de entrega: 10 dias úteis após aprovação e recebimento do sinal.',
}

const ITENS = [
  { nome: 'Kit Convite Casamento', custom: 'Laminação fosca (×2)', qtd: 3, unit: 45, total: 135 },
  { nome: 'Etiqueta personalizada', custom: '—', qtd: 10, unit: 4.5, total: 45 },
]

const PRAZO = {
  dias: 10,
  inicioImediato: true,
  dataInicioEstimada: '',
}

const TEAL = '#2A9D8F'
const ORANGE = '#F97316'

// ── DocumentoPDF ────────────────────────────────────────────────────────────

function DocumentoPDF({ sinal }: { sinal: boolean }) {
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
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{ORCAMENTO.numero}</div>
        </div>
      </div>

      {/* META + CLIENTE */}
      <div className="a4-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '22px 0', borderBottom: '1px solid #F0EEE9' }}>
        <div>
          <Label>Datas</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div>Emissão: <strong style={{ fontWeight: 600 }}>{ORCAMENTO.emissao}</strong></div>
            <div>Validade: <strong style={{ fontWeight: 600 }}>{ORCAMENTO.validade}</strong></div>
          </div>
        </div>
        <div>
          <Label>Prazo de produção</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: TEAL, fontSize: 14 }}>{PRAZO.dias} dias úteis</div>
            <div style={{ color: '#7C786F', marginTop: 2 }}>
              Início: {PRAZO.inicioImediato ? 'Assim que aprovado' : PRAZO.dataInicioEstimada}
            </div>
          </div>
        </div>
        <div>
          <Label>Cliente</Label>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ORCAMENTO.cliente}</div>
            <div style={{ color: '#7C786F' }}>{ORCAMENTO.telefone}</div>
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
          {ORCAMENTO.metodoPagamento}
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
          {ITENS.map((it, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600, color: '#3A372F' }}>{it.nome}</td>
              <td style={{ color: it.custom === '—' ? '#C0BCB4' : '#5C594F' }}>{it.custom}</td>
              <td className="num">{it.qtd}</td>
              <td className="num">{BRL(it.unit)}</td>
              <td className="num" style={{ fontWeight: 600, color: '#3A372F' }}>{BRL(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ENTRADA SOLICITADA */}
      {sinal && (
        <div style={{ marginTop: 24, padding: '16px 18px', borderRadius: 12, border: `1.5px solid rgba(42,157,143,0.4)`, background: `rgba(42,157,143,0.05)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: '#fff', color: TEAL, border: `1px solid rgba(42,157,143,0.25)` }}>
              <Icons.wallet width={16} height={16} />
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3A372F' }}>Entrada solicitada</div>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#5C594F', lineHeight: 1.55 }}>
            Para iniciar a produção, solicitamos o pagamento de 50% do valor total.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: `1px solid rgba(42,157,143,0.2)` }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TEAL }}>Valor do sinal</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(ORCAMENTO.sinalValor)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: '1px solid #F0EEE9' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B0ACA4' }}>Restante na entrega</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(ORCAMENTO.restante)}</div>
            </div>
          </div>
        </div>
      )}

      {/* TOTAIS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <div style={{ width: 'min(320px, 100%)' }}>
          <Row label="Subtotal" value={BRL(ORCAMENTO.subtotal)} />
          <Row label="Desconto (10%)" value={`− ${BRL(ORCAMENTO.desconto)}`} valueColor="#C0492B" />
          {sinal && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', padding: '8px 12px', borderRadius: 9, background: `rgba(42,157,143,0.07)`, border: `1px dashed rgba(42,157,143,0.4)` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: TEAL }}>
                <Icons.wallet width={14} height={14} /> Sinal solicitado (50%)
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>{BRL(ORCAMENTO.sinalValor)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, padding: '12px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Total</span>
            <span style={{ fontSize: 21, fontWeight: 700, color: ORANGE, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{BRL(ORCAMENTO.total)}</span>
          </div>
          {sinal && (
            <Row label="Restante após sinal" value={BRL(ORCAMENTO.restante)} style={{ paddingTop: 9 }} />
          )}
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div style={{ marginTop: 26, padding: '16px 18px', borderRadius: 10, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
        <Label>Observações</Label>
        <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.6 }}>{ORCAMENTO.observacoes}</div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: 'auto', paddingTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 12, color: '#9A968E', flexWrap: 'wrap' }}>
          <Icons.doc width={15} height={15} style={{ color: TEAL, flexShrink: 0 }} />
          Este orçamento é válido até
          <strong style={{ fontWeight: 600, color: '#6B6860', margin: '0 2px' }}>{ORCAMENTO.validade}</strong>.
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Gerado por <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 4 }}>Pense &amp; Precifique</strong>
          </span>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 10.5, lineHeight: 1.55, color: '#B0ACA4' }}>
          Em caso de cancelamento após aprovação, poderá ser cobrado uma taxa de 50% do valor total ({BRL(ORCAMENTO.sinalValor)}) referente aos materiais e tempo já investidos na produção.
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

type Status = 'rascunho' | 'enviado' | 'aprovado'

const STATUS_LABEL: Record<Status, 'Rascunho' | 'Enviado' | 'Aprovado'> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
}

export default function PreviewPdfPage() {
  const navigate = useNavigate()
  const [sinal, setSinal] = useState(true)
  const [status, setStatus] = useState<Status>('rascunho')
  const enviado = status === 'enviado' || status === 'aprovado'

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
                onClick={() => navigate('/orcamentos/0042')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12.5, fontWeight: 600, color: '#5C594F', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#5C594F')}
              >
                {ORCAMENTO.numero} — {ORCAMENTO.cliente}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                Preview do orçamento
              </h1>
              <StatusBadge status={STATUS_LABEL[status]} size="sm" />
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!enviado && (
              <Button variant="ghost" icon={<Icons.back />} onClick={() => navigate('/orcamentos/novo')}>
                Editar orçamento
              </Button>
            )}
            <Button variant="secondary" icon={<Icons.download />} onClick={() => {}}>
              Baixar PDF
            </Button>
            {!enviado ? (
              <Button variant="primary" icon={<Icons.send />} iconRight={<Icons.arrowRight />} onClick={() => setStatus('enviado')}>
                Marcar como Enviado
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Icons.check />}
                iconRight={<Icons.arrowRight />}
                onClick={() => setStatus('aprovado')}
                disabled={status === 'aprovado'}
              >
                Marcar como Aprovado
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TOGGLE SINAL (teste dos dois estados) */}
      <div style={{ maxWidth: 820, margin: '16px auto 0', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#A29E96' }}>Sinal:</span>
        <button
          onClick={() => setSinal(s => !s)}
          style={{
            height: 30, padding: '0 12px', borderRadius: 999,
            border: `1.5px solid ${sinal ? TEAL : '#EFEDE8'}`,
            background: sinal ? 'rgba(42,157,143,0.1)' : '#fff',
            color: sinal ? TEAL : '#5C594F',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {sinal ? 'Com sinal ✓' : 'Sem sinal'}
        </button>
      </div>

      {/* DOCUMENTO A4 */}
      <div className="doc-scroll" style={{ marginTop: 16 }}>
        <div className="doc-wrap">
          <DocumentoPDF sinal={sinal} />
        </div>
      </div>

    </AppLayout>
  )
}
