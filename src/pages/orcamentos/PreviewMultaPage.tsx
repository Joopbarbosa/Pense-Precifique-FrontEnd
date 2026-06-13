import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Logo, Button } from '../../components/ui'

// ── Constantes ───────────────────────────────────────────────────────────────

const TEAL = '#2A9D8F'
const DANGER = '#C0492B'
const DANGER_SOFT = '#FCF3F0'
const DANGER_LINE = '#F2D0C8'

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Dados mockados ───────────────────────────────────────────────────────────

const VALOR_ORIGINAL = 183.6
const PCT_MULTA = 50
const VALOR_MULTA = VALOR_ORIGINAL * PCT_MULTA / 100

const EMPRESA = {
  nome: 'Pense & Crie Studio',
  email: 'penseecrie@email.com',
  whatsapp: '(11) 98888-1234',
}

const CANCELAMENTO = {
  numero: '#0042',
  cliente: 'Mariana Costa',
  clienteWhats: '(11) 99999-0000',
  dataCancelamento: '05/06/2026',
  emissao: '05/06/2026',
  prazoMulta: '12/06/2026',
  aprovacao: '04/06/2026',
  prazoDias: 10,
  inicioImediato: true,
  dataInicioEstimada: '',
}

const CONSUMIDOS = [
  { item: 'Papel couchê 180g',        qtd: '4 folhas' },
  { item: 'Fita dupla face 12mm',      qtd: '120 cm' },
  { item: 'Linha de crochê teal 100g', qtd: '1,2 g' },
]

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
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: color === DANGER ? DANGER_SOFT : hexA(color, 0.12), color }}>
        {icon}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#3A372F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {children}
      </span>
    </div>
  )
}

// ── DocumentoMulta ───────────────────────────────────────────────────────────

function DocumentoMulta() {
  return (
    <div className="a4" style={{ animation: 'fadeUp .4s ease both' }}>

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: `2px solid ${hexA(TEAL, 0.25)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>{EMPRESA.nome}</div>
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
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: DANGER }}>Orçamento</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{CANCELAMENTO.numero}</div>
        </div>
      </div>

      {/* TÍTULO — NOTIFICAÇÃO DE MULTA */}
      <div style={{ marginTop: 26, padding: '20px 22px', borderRadius: 12, background: DANGER_SOFT, border: `1px solid ${DANGER_LINE}`, borderLeft: `4px solid ${DANGER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: '#fff', color: DANGER, border: `1px solid ${DANGER_LINE}` }}>
            <Icons.alertCircle width={24} height={24} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: DANGER, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              NOTIFICAÇÃO DE MULTA POR CANCELAMENTO
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', marginTop: 5, fontSize: 12.5, color: '#8A5A4E' }}>
              <span>Referência: <strong style={{ fontWeight: 700 }}>Orçamento {CANCELAMENTO.numero}</strong></span>
              <span>Emissão: <strong style={{ fontWeight: 700 }}>{CANCELAMENTO.emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div style={{ padding: '22px 0 0' }}>
        <DocLabel>Dados da cliente</DocLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 28px', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#3A372F' }}>{CANCELAMENTO.cliente}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5C594F' }}>
            <Icons.phone width={13} height={13} style={{ color: TEAL }} /> {CANCELAMENTO.clienteWhats}
          </div>
        </div>
      </div>

      {/* DATAS */}
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '18px', borderRadius: 12, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
        <div>
          <DocLabel>Data de aprovação</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{CANCELAMENTO.aprovacao}</div>
        </div>
        <div>
          <DocLabel>Prazo de produção</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEAL }}>{CANCELAMENTO.prazoDias} dias úteis</div>
        </div>
        <div>
          <DocLabel>Data do cancelamento</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: DANGER }}>{CANCELAMENTO.dataCancelamento}</div>
        </div>
      </div>

      {/* DETALHES DO CANCELAMENTO */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<Icons.ban />} color={DANGER}>Detalhes do cancelamento</DocSectionTitle>
        <div style={{ border: '1px solid #F0EEE9', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { k: 'Valor total do orçamento original', v: BRL(VALOR_ORIGINAL) },
            { k: 'Percentual de multa aplicado',      v: `${PCT_MULTA}%` },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #F4F2EE' }}>
              <span style={{ fontSize: 13, color: '#5C594F' }}>{r.k}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{r.v}</span>
            </div>
          ))}
          {/* Valor da multa — destaque */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '15px 16px', background: DANGER_SOFT }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: DANGER }}>
              <Icons.alertCircle width={16} height={16} /> Valor da multa
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: DANGER, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
              {BRL(VALOR_MULTA)}
            </span>
          </div>
        </div>
      </div>

      {/* INSUMOS CONSUMIDOS */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<Icons.box width={15} height={15} />}>Insumos e materiais já consumidos</DocSectionTitle>
        <table className="a4-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Quantidade consumida</th>
            </tr>
          </thead>
          <tbody>
            {CONSUMIDOS.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, color: '#3A372F' }}>{c.item}</td>
                <td className="num" style={{ fontWeight: 600 }}>{c.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* INSTRUÇÃO DE PAGAMENTO */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<Icons.wallet width={15} height={15} />}>Instrução de pagamento</DocSectionTitle>
        <div style={{ padding: '16px 18px', borderRadius: 12, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
          <p style={{ margin: 0, fontSize: 13.5, color: '#3A372F', lineHeight: 1.65 }}>
            O valor de <strong style={{ fontWeight: 700, color: DANGER }}>{BRL(VALOR_MULTA)}</strong> referente à multa por cancelamento deve ser pago até{' '}
            <strong style={{ fontWeight: 700, color: '#5C594F' }}>{CANCELAMENTO.prazoMulta}</strong>.{' '}
            Entre em contato para combinar a forma de pagamento.
          </p>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: 'auto', paddingTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 11.5, color: '#9A968E', flexWrap: 'wrap' }}>
          <Icons.doc width={15} height={15} style={{ color: TEAL, flexShrink: 0 }} />
          Este documento foi gerado pelo sistema
          <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>Pense &amp; Precifique</strong>
          em <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>{CANCELAMENTO.emissao}</strong>.
        </div>
      </div>

    </div>
  )
}

// ── PreviewMultaPage ─────────────────────────────────────────────────────────

export default function PreviewMultaPage() {
  const navigate = useNavigate()

  return (
    <AppLayout active="orcamentos" noPad>

      {/* BARRA DE AÇÕES */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EFEDE8', padding: '14px 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

          {/* Breadcrumb + título */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#9A968E', marginBottom: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Orçamentos', path: '/orcamentos' },
                { label: '#0042 — Mariana Costa', path: '/orcamentos/0042' },
              ].map(({ label, path }) => (
                <span key={path} style={{ display: 'contents' }}>
                  <button
                    onClick={() => navigate(path)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12.5, fontWeight: 500, color: '#9A968E', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9A968E')}
                  >
                    {label}
                  </button>
                  <Icons.chevron style={{ color: '#CFCBC3', flexShrink: 0 }} />
                </span>
              ))}
              <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>PDF de Multa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                PDF de Multa
              </h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 13px', borderRadius: 999, background: DANGER_SOFT, color: DANGER, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: DANGER }} /> Cancelado
              </span>
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" icon={<Icons.back />} onClick={() => navigate('/orcamentos/0042')}>
              Voltar ao orçamento
            </Button>
            <Button variant="secondary" icon={<Icons.download />} onClick={() => {}}>
              Baixar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="doc-scroll">
        <div className="doc-wrap">
          <DocumentoMulta />
        </div>
      </div>

    </AppLayout>
  )
}
