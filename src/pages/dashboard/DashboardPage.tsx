import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui'
import { Box, Factory, FileText, ArrowRight, DollarSign, Files, AlertTriangle } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { dashboardService } from '../../services/dashboardService'
import { produtoService } from '../../services/produtoService'
import { insumoService } from '../../services/insumoService'
import type { DashboardResponse } from '../../types/dashboard'
import type { InsumoResponse } from '../../types/insumo'
import type { StatusOrcamento } from '../../types'

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── MetricCard ─────────────────────────────────────────────────────────────
interface MetricProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  valueColor: string
  sub?: string
}

function MetricCard({ icon, iconBg, iconColor, label, value, valueColor, sub }: MetricProps) {
  return (
    <Card padding="20px 22px" style={{ animation: 'fadeUp .45s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: '#8A8780' }}>{label}</span>
        <span style={{
          flexShrink: 0, display: 'grid', placeItems: 'center',
          width: 42, height: 42, borderRadius: 12,
          background: iconBg, color: iconColor,
        }}>{icon}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: valueColor, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ marginTop: 9, fontSize: 12.5, color: '#B7B4AD' }}>{sub ?? ' '}</div>
    </Card>
  )
}

// ── Status labels ───────────────────────────────────────────────────────────
const STATUS_LABEL: Record<StatusOrcamento, string> = {
  RASCUNHO:         'Rascunho',
  ENVIADO:          'Enviado',
  APROVADO:         'Aprovado',
  AGUARDANDO_SINAL: 'Aguard. sinal',
  SINAL_PAGO:       'Sinal pago',
  EM_PRODUCAO:      'Em produção',
  FINALIZADO:       'Finalizado',
  ENTREGUE:         'Entregue',
  PAGO:             'Pago',
  CANCELADO:        'Cancelado',
}

const ORANGE = '#F97316'
const TEAL   = '#2A9D8F'

const ACOES_RAPIDAS = [
  { label: 'Cadastrar insumo',  icon: <Box size={20} />,      rota: '/insumos/novo'    },
  { label: 'Cadastrar produto', icon: <Box size={20} />,      rota: '/produtos/novo'   },
  { label: 'Lançar produção',   icon: <Factory size={20} />,  rota: '/producao'        },
  { label: 'Criar orçamento',   icon: <FileText size={20} />, rota: '/orcamentos/novo' },
]

// ── DashboardPage ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [produtosCadastrados, setProdutosCadastrados] = useState(0)
  const [insumosEstoqueBaixo, setInsumosEstoqueBaixo] = useState<InsumoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    Promise.all([
      dashboardService.buscar(),
      produtoService.listar(0, 1),
      insumoService.listar(0, 100),
    ])
      .then(([dash, prods, insumos]) => {
        setData(dash)
        setProdutosCadastrados(prods.totalElements)
        setInsumosEstoqueBaixo(
          insumos.content.filter(
            (i) => i.estoqueMinimo != null && i.estoqueAtual <= i.estoqueMinimo
          )
        )
      })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout active="dashboard">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap', marginBottom: 26,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: '#2D2A26' }}>
            Dashboard
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 15, color: '#8A8780', lineHeight: 1.5 }}>
            Aqui está o resumo do seu negócio.
          </p>
        </div>
        <Button
          variant="primary"
          iconRight={<ArrowRight size={17} />}
          onClick={() => navigate('/orcamentos/novo')}
        >
          Novo Orçamento
        </Button>
      </div>

      {/* Erro de carregamento */}
      {erro && (
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#B91C1C', fontSize: 14, marginBottom: 18,
        }}>
          Falha ao carregar o dashboard. Tente novamente.
        </div>
      )}

      {/* Metrics */}
      <div className="metrics">
        <MetricCard
          icon={<DollarSign size={22} />}
          iconBg={hexA(ORANGE, 0.12)} iconColor={ORANGE}
          label="Faturamento do Mês"
          value={loading ? '—' : fmtBRL(data?.receitaMes ?? 0)}
          valueColor={ORANGE}
          sub={!loading && (data?.receitaMes ?? 0) === 0 ? 'Sem receita este mês' : undefined}
        />
        <MetricCard
          icon={<Box size={20} />}
          iconBg={hexA(TEAL, 0.12)} iconColor={TEAL}
          label="Produtos Cadastrados"
          value={loading ? '—' : String(produtosCadastrados)}
          valueColor={TEAL}
          sub={!loading && produtosCadastrados === 0 ? 'Nenhum produto ainda' : undefined}
        />
        <MetricCard
          icon={<Files size={22} />}
          iconBg="#F1F0EC" iconColor="#7C786F"
          label="Orçamentos Pendentes"
          value={loading ? '—' : String(data?.orcamentosPendentes ?? 0)}
          valueColor="#2D2A26"
          sub={!loading && (data?.orcamentosPendentes ?? 0) === 0
            ? 'Nenhum pendente'
            : !loading ? 'Aguardando resposta' : undefined}
        />
      </div>

      {/* Alerta de insumos com estoque baixo */}
      {!loading && insumosEstoqueBaixo.length > 0 && (
        <div style={{
          marginTop: 18,
          background: '#fff',
          border: '1px solid #F0EEE9',
          borderLeft: `4px solid ${ORANGE}`,
          borderRadius: 'var(--r-card)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '18px 22px',
          animation: 'fadeUp .5s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <span style={{
              flexShrink: 0, display: 'grid', placeItems: 'center',
              width: 40, height: 40, borderRadius: 11,
              background: hexA(ORANGE, 0.12), color: ORANGE, marginTop: 1,
            }}>
              <AlertTriangle size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: '#2D2A26' }}>
                {insumosEstoqueBaixo.length} {insumosEstoqueBaixo.length === 1 ? 'insumo com estoque baixo' : 'insumos com estoque baixo'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
                {insumosEstoqueBaixo.slice(0, 6).map((ins) => (
                  <span key={ins.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontSize: 13, color: '#6B6860', whiteSpace: 'nowrap',
                    background: '#FCFBF9', border: '1px solid #ECEAE5',
                    borderRadius: 999, padding: '6px 12px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, flexShrink: 0 }} />
                    {ins.nome}
                    <strong style={{ fontWeight: 600, color: '#A35A26' }}>
                      · {ins.estoqueAtual} {ins.unidadeMedida}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/insumos')}
              style={{
                flexShrink: 0, alignSelf: 'center',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13.5, fontWeight: 600, color: ORANGE,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', padding: 0,
              }}
              onMouseOver={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseOut={(e) => { e.currentTarget.style.textDecoration = 'none' }}
            >
              Ver todos os insumos <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Lower grid: listas de dados reais */}
      {!loading && !erro && data && (
        <div className="lower-grid" style={{ marginTop: 18 }}>

          {/* Orçamentos Recentes */}
          <Card padding="22px 24px" style={{ animation: 'fadeUp .55s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                display: 'grid', placeItems: 'center',
                width: 42, height: 42, borderRadius: 12,
                background: hexA(TEAL, 0.12), color: TEAL,
              }}>
                <Files size={22} />
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2A26' }}>Orçamentos Recentes</div>
                <div style={{ fontSize: 13, color: '#8A8780', marginTop: 1 }}>Últimas movimentações</div>
              </div>
            </div>

            {data.orcamentosRecentes.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: '#B7B4AD' }}>Nenhum orçamento ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.orcamentosRecentes.map((orc) => (
                  <div
                    key={orc.id}
                    onClick={() => navigate(`/orcamentos/${orc.id}`)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '11px 14px', borderRadius: 10,
                      border: '1px solid #ECEAE5', background: '#FCFBF9',
                      cursor: 'pointer', transition: 'background .14s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F6F4F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FCFBF9' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6B6860', flexShrink: 0 }}>
                        #{orc.numero}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#2D2A26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {orc.nomeCliente}
                      </span>
                      <span style={{
                        flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: '#8A8780',
                        background: '#F1F0EC', borderRadius: 999, padding: '3px 8px',
                      }}>
                        {STATUS_LABEL[orc.status] ?? orc.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: TEAL, flexShrink: 0, marginLeft: 12 }}>
                      {fmtBRL(orc.total ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Produtos Mais Vendidos */}
          <Card padding="22px 24px" style={{ animation: 'fadeUp .6s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                display: 'grid', placeItems: 'center',
                width: 42, height: 42, borderRadius: 12,
                background: hexA(ORANGE, 0.12), color: ORANGE,
              }}>
                <Box size={20} />
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2A26' }}>Mais Vendidos</div>
                <div style={{ fontSize: 13, color: '#8A8780', marginTop: 1 }}>Top produtos do período</div>
              </div>
            </div>

            {data.produtosMaisVendidos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: '#B7B4AD' }}>Nenhum produto vendido ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.produtosMaisVendidos.map((prod, i) => (
                  <div
                    key={prod.nomeProduto}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px', borderRadius: 10,
                      border: '1px solid #ECEAE5', background: '#FCFBF9',
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: i === 0 ? hexA(ORANGE, 0.15) : '#F1F0EC',
                      color: i === 0 ? ORANGE : '#8A8780',
                      display: 'grid', placeItems: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#2D2A26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.nomeProduto}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6860', flexShrink: 0 }}>
                      {prod.quantidade} {prod.quantidade === 1 ? 'vendido' : 'vendidos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      )}

      {/* Ações Rápidas */}
      {!loading && !erro && (
        <Card padding="22px 24px" style={{ marginTop: 18, animation: 'fadeUp .65s ease both' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2A26', marginBottom: 14 }}>
            Ações Rápidas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ACOES_RAPIDAS.map((acao) => (
              <button
                key={acao.rota}
                onClick={() => navigate(acao.rota)}
                style={{
                  flex: '1 1 180px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid #ECEAE5', background: '#FCFBF9',
                  fontFamily: 'inherit', transition: 'background .14s, border-color .14s, transform .12s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F6F4F0'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FCFBF9'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <span style={{
                  display: 'grid', placeItems: 'center',
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: hexA(TEAL, 0.10), color: TEAL,
                }}>
                  {acao.icon}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#2D2A26' }}>
                  {acao.label}
                </span>
                <span style={{ color: '#B7B4AD', display: 'flex' }}>
                  <ArrowRight size={17} />
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

    </AppLayout>
  )
}
