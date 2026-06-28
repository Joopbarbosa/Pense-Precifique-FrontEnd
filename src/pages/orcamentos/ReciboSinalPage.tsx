import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons, Logo, Button } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'

// ── Constantes ───────────────────────────────────────────────────────────────

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TEAL = '#2A9D8F'
const ORANGE = '#F97316'

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function adicionarDiasUteis(isoDate: string, dias: number): string {
  const data = new Date(isoDate)
  if (isNaN(data.getTime())) return '—'
  let adicionados = 0
  while (adicionados < dias) {
    data.setDate(data.getDate() + 1)
    const diaSemana = data.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) adicionados++
  }
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function DocLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function DocSectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: hexA(TEAL, 0.12), color: TEAL }}>
        {icon}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#3A372F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {children}
      </span>
    </div>
  )
}

// ── DocumentoRecibo ──────────────────────────────────────────────────────────

function DocumentoRecibo({ orcamento, empresa }: { orcamento: OrcamentoDetalheResponse; empresa: EmpresaResponse | null }) {
  const numeroFormatado = `#${String(orcamento.numero).padStart(4, '0')}`
  const emissao = fmtDate(orcamento.createdAt)
  const dataRecebimento = fmtDate(orcamento.dataSinalPago)
  const formaPagamento = orcamento.metodoSinalRecebido || '—'
  const aprovacao = orcamento.dataAprovacao
  const valorSinal = orcamento.valorSinal || 0
  const valorTotal = orcamento.total
  const restante = valorTotal - valorSinal
  const pctSinal = orcamento.percentualSinal

  const dataBaseInicio = orcamento.inicioAssimQueAprovado
    ? (orcamento.dataAprovacao || orcamento.createdAt)
    : (orcamento.dataInicioEstimada || orcamento.createdAt)
  const previsaoEntrega = adicionarDiasUteis(dataBaseInicio, orcamento.prazoProducaoDias)

  return (
    <div className="a4" style={{ animation: 'fadeUp .4s ease both' }}>

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: `2px solid ${hexA(TEAL, 0.25)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>{empresa?.nome || ''}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, fontSize: 12, color: '#7C786F' }}>
              {empresa?.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icons.mail width={13} height={13} style={{ color: TEAL }} /> {empresa.email}
                </span>
              )}
              {empresa?.whatsapp && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icons.phone width={13} height={13} style={{ color: TEAL }} /> {empresa.whatsapp}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEAL }}>Orçamento</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{numeroFormatado}</div>
        </div>
      </div>

      {/* TÍTULO DO RECIBO */}
      <div style={{ marginTop: 26, padding: '20px 22px', borderRadius: 12, background: hexA(TEAL, 0.07), border: `1px solid ${hexA(TEAL, 0.22)}`, borderLeft: `4px solid ${TEAL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: '#fff', color: TEAL, border: `1px solid ${hexA(TEAL, 0.25)}` }}>
            <Icons.checkCircle />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E7268', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              RECIBO DE PAGAMENTO — ENTRADA
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', marginTop: 5, fontSize: 12.5, color: '#4A6B62' }}>
              <span>Referência: <strong style={{ fontWeight: 700 }}>Orçamento {numeroFormatado}</strong></span>
              <span>Emissão: <strong style={{ fontWeight: 700 }}>{emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div style={{ padding: '22px 0 0' }}>
        <DocLabel>Dados da cliente</DocLabel>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3A372F' }}>{orcamento.nomeCliente}</div>
      </div>

      {/* CONFIRMAÇÃO DO RECEBIMENTO */}
      <div style={{ marginTop: 24, borderRadius: 14, border: `1.5px solid ${hexA(TEAL, 0.32)}`, background: hexA(TEAL, 0.05), overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', background: `linear-gradient(135deg, ${hexA(TEAL, 0.14)}, ${hexA(TEAL, 0.04)})`, borderBottom: `1px solid ${hexA(TEAL, 0.2)}` }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: '#fff', color: TEAL, boxShadow: `0 3px 9px -3px ${hexA(TEAL, 0.4)}` }}>
            <Icons.check />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1E7268', letterSpacing: '-0.005em' }}>Entrada recebida com sucesso</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '18px 24px', padding: 18 }}>
          <div style={{ flex: '1 1 180px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1E7268' }}>Valor recebido</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: TEAL, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {BRL(valorSinal)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '18px 28px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9A968E' }}>Data do recebimento</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', marginTop: 3 }}>{dataRecebimento}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9A968E' }}>Forma de pagamento</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#3A372F', marginTop: 3 }}>
                <Icons.wallet width={14} height={14} style={{ color: TEAL }} /> {formaPagamento}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATAS */}
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '18px', borderRadius: 12, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
        <div>
          <DocLabel>Data de aprovação</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{fmtDate(aprovacao)}</div>
        </div>
        <div>
          <DocLabel>Prazo de produção</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEAL }}>{orcamento.prazoProducaoDias} dias úteis</div>
        </div>
        <div>
          <DocLabel>Início estimado</DocLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>
            {orcamento.inicioAssimQueAprovado ? 'Assim que aprovado' : fmtDate(orcamento.dataInicioEstimada)}
          </div>
        </div>
      </div>

      {/* DETALHES DO PEDIDO */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<Icons.bag />}>Detalhes do pedido</DocSectionTitle>
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
          <div style={{ width: 'min(340px, 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '8px 12px' }}>
              <span>Valor total do pedido</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#3A372F' }}>{BRL(valorTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '10px 12px', borderRadius: 9, background: hexA(TEAL, 0.07), border: `1px dashed ${hexA(TEAL, 0.4)}`, margin: '2px 0' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: TEAL }}>
                <Icons.check /> Entrada paga{pctSinal ? ` (${pctSinal}%)` : ''}
              </span>
              <span style={{ fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>{BRL(valorSinal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, padding: '13px 14px', borderRadius: 10, background: '#FFF1E8', border: `1px solid ${hexA(ORANGE, 0.28)}` }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3A372F', lineHeight: 1.3 }}>Restante a pagar na entrega</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: ORANGE, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{BRL(restante)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRÓXIMOS PASSOS */}
      <div style={{ marginTop: 26 }}>
        <DocSectionTitle icon={<Icons.sparkles />}>Próximos passos</DocSectionTitle>
        <div style={{ padding: '16px 18px', borderRadius: 12, background: hexA(TEAL, 0.05), border: `1px solid ${hexA(TEAL, 0.2)}` }}>
          {orcamento.inicioAssimQueAprovado ? (
            <p style={{ margin: 0, fontSize: 13.5, color: '#3A372F', lineHeight: 1.65 }}>
              <strong style={{ fontWeight: 700, color: '#1E7268' }}>Sua produção já foi iniciada!</strong>{' '}
              O restante de <strong style={{ fontWeight: 700, color: ORANGE }}>{BRL(restante)}</strong>{' '}
              será cobrado na entrega do pedido.{' '}
              Prazo: <strong style={{ fontWeight: 700, color: '#5C594F' }}>{orcamento.prazoProducaoDias} dias úteis</strong>{' '}
              <span style={{ color: '#2A9D8F', fontWeight: 600 }}>(previsão: {previsaoEntrega})</span>.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: '#3A372F', lineHeight: 1.65 }}>
              <strong style={{ fontWeight: 700, color: '#1E7268' }}>Sua produção entrará na fila!</strong>{' '}
              O restante de <strong style={{ fontWeight: 700, color: ORANGE }}>{BRL(restante)}</strong>{' '}
              será cobrado na entrega do pedido.{' '}
              Início estimado: <strong style={{ fontWeight: 700, color: '#5C594F' }}>{fmtDate(orcamento.dataInicioEstimada)}</strong>{' '}
              · Prazo: <strong style={{ fontWeight: 700, color: '#5C594F' }}>{orcamento.prazoProducaoDias} dias úteis</strong>{' '}
              <span style={{ color: '#2A9D8F', fontWeight: 600 }}>(previsão: {previsaoEntrega})</span>.
            </p>
          )}
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: 'auto', paddingTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 11.5, color: '#9A968E', flexWrap: 'wrap' }}>
          <Icons.doc width={15} height={15} style={{ color: TEAL, flexShrink: 0 }} />
          Este recibo foi gerado pelo sistema
          <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>Pense &amp; Precifique</strong>
          em <strong style={{ fontWeight: 600, color: '#6B6860', marginLeft: 3 }}>{emissao}</strong>.
        </div>
      </div>

    </div>
  )
}

// ── ReciboSinalPage ──────────────────────────────────────────────────────────

export default function ReciboSinalPage() {
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
    const url = orcamentoService.downloadReciboSinal(id)
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `recibo-sinal-${id}.pdf`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Erro ao baixar recibo do sinal:', err)
      alert('Erro ao baixar recibo do sinal')
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

          {/* Breadcrumb + título */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#9A968E', marginBottom: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Orçamentos', path: '/orcamentos' },
                { label: 'Detalhe do orçamento', path: `/orcamentos/${id}` },
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
              <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap' }}>Recibo do Sinal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
                Recibo do Sinal
              </h1>
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" icon={<Icons.back />} onClick={() => navigate(`/orcamentos/${id}`)}>
              Voltar ao orçamento
            </Button>
            <Button variant="secondary" icon={<Icons.download />} onClick={handleDownload}>
              Baixar Recibo
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="doc-scroll">
        <div className="doc-wrap">
          <DocumentoRecibo orcamento={orcamento} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
