import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
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
    <Card padding="20px 22px" className="animate-[fadeUp_.45s_ease_both]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13.5px] font-medium text-[#8A8780]">{label}</span>
        <span
          className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em]" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="mt-[9px] text-[12.5px] text-faint">{sub ?? ' '}</div>
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
      <div className="mb-[26px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[30px] font-bold tracking-[-0.025em] text-[#2D2A26]">
            Dashboard
          </h1>
          <p className="mt-[7px] mb-0 text-[15px] leading-[1.5] text-[#8A8780]">
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
        <div className="mb-[18px] rounded-xl border border-[#FECACA] bg-danger-bg-soft px-5 py-4 text-sm text-[#B91C1C]">
          Falha ao carregar o dashboard. Tente novamente.
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
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
        <div className="mt-[18px] animate-[fadeUp_.5s_ease_both] rounded-card border border-[#F0EEE9] border-l-4 border-l-orange bg-white p-[18px_22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-start gap-3.5">
            <span className="mt-px grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-orange/[0.12] text-orange">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-[220px] flex-1">
              <div className="text-[15.5px] font-semibold text-[#2D2A26]">
                {insumosEstoqueBaixo.length} {insumosEstoqueBaixo.length === 1 ? 'insumo com estoque baixo' : 'insumos com estoque baixo'}
              </div>
              <div className="mt-[11px] flex flex-wrap gap-2">
                {insumosEstoqueBaixo.slice(0, 6).map((ins) => (
                  <span key={ins.id} className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[#ECEAE5] bg-[#FCFBF9] px-3 py-1.5 text-[13px] text-[#6B6860]">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange" />
                    {ins.nome}
                    <strong className="font-semibold text-[#A35A26]">
                      · {ins.estoqueAtual} {ins.unidadeMedida}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/insumos')}
              className="inline-flex flex-shrink-0 items-center gap-1.5 self-center border-none bg-none p-0 font-[inherit] text-[13.5px] font-semibold text-orange hover:underline"
            >
              Ver todos os insumos <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Lower grid: listas de dados reais */}
      {!loading && !erro && data && (
        <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.05fr_1fr]">

          {/* Orçamentos Recentes */}
          <Card padding="22px 24px" className="animate-[fadeUp_.55s_ease_both]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-teal/[0.12] text-teal">
                <Files size={22} />
              </span>
              <div>
                <div className="text-base font-bold text-[#2D2A26]">Orçamentos Recentes</div>
                <div className="mt-px text-[13px] text-[#8A8780]">Últimas movimentações</div>
              </div>
            </div>

            {data.orcamentosRecentes.length === 0 ? (
              <p className="m-0 text-sm text-faint">Nenhum orçamento ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.orcamentosRecentes.map((orc) => (
                  <div
                    key={orc.id}
                    onClick={() => navigate(`/orcamentos/${orc.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[#ECEAE5] bg-[#FCFBF9] px-3.5 py-[11px] transition-colors duration-150 hover:bg-[#F6F4F0]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex-shrink-0 text-[13px] font-bold text-[#6B6860]">
                        #{orc.numero}
                      </span>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-[#2D2A26]">
                        {orc.nomeCliente}
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-line-soft px-2 py-[3px] text-[11.5px] font-medium text-[#8A8780]">
                        {STATUS_LABEL[orc.status] ?? orc.status}
                      </span>
                    </div>
                    <span className="ml-3 flex-shrink-0 text-[13.5px] font-semibold text-teal">
                      {fmtBRL(orc.total ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Produtos Mais Vendidos */}
          <Card padding="22px 24px" className="animate-[fadeUp_.6s_ease_both]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-orange/[0.12] text-orange">
                <Box size={20} />
              </span>
              <div>
                <div className="text-base font-bold text-[#2D2A26]">Mais Vendidos</div>
                <div className="mt-px text-[13px] text-[#8A8780]">Top produtos do período</div>
              </div>
            </div>

            {data.produtosMaisVendidos.length === 0 ? (
              <p className="m-0 text-sm text-faint">Nenhum produto vendido ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.produtosMaisVendidos.map((prod, i) => (
                  <div
                    key={prod.nomeProduto}
                    className="flex items-center gap-3 rounded-[10px] border border-[#ECEAE5] bg-[#FCFBF9] px-3.5 py-[11px]"
                  >
                    <span className={clsx(
                      'grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-orange/[0.15] text-orange' : 'bg-line-soft text-[#8A8780]'
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-[#2D2A26]">
                        {prod.nomeProduto}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[13px] font-semibold text-[#6B6860]">
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
        <Card padding="22px 24px" className="mt-[18px] animate-[fadeUp_.65s_ease_both]">
          <div className="mb-3.5 text-base font-bold text-[#2D2A26]">
            Ações Rápidas
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ACOES_RAPIDAS.map((acao) => (
              <button
                key={acao.rota}
                onClick={() => navigate(acao.rota)}
                className="flex flex-[1_1_180px] items-center gap-3 rounded-xl border border-[#ECEAE5] bg-[#FCFBF9] px-4 py-[13px] text-left font-[inherit] transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:bg-[#F6F4F0]"
              >
                <span className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
                  {acao.icon}
                </span>
                <span className="flex-1 text-sm font-semibold text-[#2D2A26]">
                  {acao.label}
                </span>
                <span className="flex text-faint">
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
