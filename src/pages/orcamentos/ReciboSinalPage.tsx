import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Logo, Button } from '../../components/ui'
import { Mail, Phone, CheckCircle, Check, Wallet, ShoppingBag, Sparkles, FileText, ChevronRight, ArrowLeft, Download } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'

// ── Constantes ───────────────────────────────────────────────────────────────

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
    <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#B0ACA4]">
      {children}
    </div>
  )
}

function DocSectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-[9px]">
      <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
        {icon}
      </span>
      <span className="text-[13.5px] font-bold uppercase tracking-[0.04em] text-dark">
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
    <div className="flex min-h-[calc((820px-72px)*1.414)] w-full animate-fade-up flex-col rounded-[4px] border border-line bg-white p-14 shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)] max-[767px]:min-h-0 max-[767px]:px-6 max-[767px]:py-8">

      {/* CABEÇALHO */}
      <div className="flex items-start justify-between gap-5 border-b-2 border-teal/25 pb-[22px]">
        <div className="flex items-center gap-3.5">
          <Logo size={56} />
          <div>
            <div className="text-lg font-bold tracking-[-0.01em] text-dark">{empresa?.nome || ''}</div>
            <div className="mt-[5px] flex flex-wrap gap-x-3.5 gap-y-0.5 text-xs text-subtle">
              {empresa?.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={13} className="text-teal" /> {empresa.email}
                </span>
              )}
              {empresa?.whatsapp && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} className="text-teal" /> {empresa.whatsapp}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">Orçamento</div>
          <div className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-dark">{numeroFormatado}</div>
        </div>
      </div>

      {/* TÍTULO DO RECIBO */}
      <div className="mt-6 rounded-xl border border-teal/[0.22] border-l-4 border-l-teal bg-teal/[0.07] px-[22px] py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-teal/25 bg-white text-teal">
            <CheckCircle size={22} />
          </span>
          <div>
            <h1 className="m-0 text-lg font-bold leading-[1.2] tracking-[-0.01em] text-teal-deep">
              RECIBO DE PAGAMENTO — ENTRADA
            </h1>
            <div className="mt-[5px] flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-[#4A6B62]">
              <span>Referência: <strong className="font-bold">Orçamento {numeroFormatado}</strong></span>
              <span>Emissão: <strong className="font-bold">{emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div className="pt-[22px]">
        <DocLabel>Dados da cliente</DocLabel>
        <div className="text-[15px] font-bold text-dark">{orcamento.nomeCliente}</div>
      </div>

      {/* CONFIRMAÇÃO DO RECEBIMENTO */}
      <div className="mt-6 overflow-hidden rounded-2xl border-[1.5px] border-teal/[0.32] bg-teal/[0.05]">
        <div className="flex items-center gap-[11px] border-b border-teal/20 bg-[linear-gradient(135deg,rgba(42,157,143,0.14),rgba(42,157,143,0.04))] px-[18px] py-3.5">
          <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[9px] bg-white text-teal shadow-[0_3px_9px_-3px_rgba(42,157,143,0.4)]">
            <Check size={14} />
          </span>
          <span className="text-[15px] font-bold tracking-[-0.005em] text-teal-deep">Entrada recebida com sucesso</span>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-[18px] p-[18px]">
          <div className="flex-[1_1_180px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-teal-deep">Valor recebido</div>
            <div className="mt-[3px] text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-teal [font-variant-numeric:tabular-nums]">
              {BRL(valorSinal)}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-[18px]">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#9A968E]">Data do recebimento</div>
              <div className="mt-[3px] text-sm font-semibold text-dark">{dataRecebimento}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#9A968E]">Forma de pagamento</div>
              <div className="mt-[3px] inline-flex items-center gap-1.5 text-sm font-semibold text-dark">
                <Wallet size={14} className="text-teal" /> {formaPagamento}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATAS */}
      <div className="mt-[22px] grid grid-cols-3 gap-3.5 rounded-xl border border-[#F0EEE9] bg-cream p-[18px]">
        <div>
          <DocLabel>Data de aprovação</DocLabel>
          <div className="text-sm font-semibold text-dark">{fmtDate(aprovacao)}</div>
        </div>
        <div>
          <DocLabel>Prazo de produção</DocLabel>
          <div className="text-sm font-semibold text-teal">{orcamento.prazoProducaoDias} dias úteis</div>
        </div>
        <div>
          <DocLabel>Início estimado</DocLabel>
          <div className="text-sm font-semibold text-dark">
            {orcamento.inicioAssimQueAprovado ? 'Assim que aprovado' : fmtDate(orcamento.dataInicioEstimada)}
          </div>
        </div>
      </div>

      {/* DETALHES DO PEDIDO */}
      <div className="mt-6">
        <DocSectionTitle icon={<ShoppingBag size={15} />}>Detalhes do pedido</DocSectionTitle>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Item</th>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Customização</th>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.length === 0 ? (
              <tr>
                <td colSpan={3} className="border-b border-[#F0EEE9] px-2.5 py-[13px] text-center align-top text-[13.5px] text-[#B0ACA4]">Nenhum item</td>
              </tr>
            ) : (
              orcamento.itens.map((it, i) => (
                <tr key={i}>
                  <td className="border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px] font-semibold text-dark">{it.nomeProduto}</td>
                  <td className={`border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px] ${it.customizacoes.length === 0 ? 'text-[#C0BCB4]' : 'text-body'}`}>
                    {it.customizacoes.length === 0 ? '—' : it.customizacoes.map(c => c.nomeProduto).join(', ')}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#F0EEE9] px-2.5 py-[13px] text-right align-top text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">× {it.quantidade}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Resumo financeiro */}
        <div className="mt-[18px] flex justify-end">
          <div className="w-[min(340px,100%)]">
            <div className="flex justify-between px-3 py-2 text-[13.5px] text-body">
              <span>Valor total do pedido</span>
              <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(valorTotal)}</span>
            </div>
            <div className="my-0.5 flex items-center justify-between rounded-[9px] border border-dashed border-teal/40 bg-teal/[0.07] px-3 py-2.5 text-[13.5px]">
              <span className="flex items-center gap-1.5 font-semibold text-teal">
                <Check size={14} /> Entrada paga{pctSinal ? ` (${pctSinal}%)` : ''}
              </span>
              <span className="font-bold text-teal [font-variant-numeric:tabular-nums]">{BRL(valorSinal)}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between rounded-input border border-orange/[0.28] bg-warning-bg px-3.5 py-[13px]">
              <span className="text-[13.5px] font-semibold leading-[1.3] text-dark">Restante a pagar na entrega</span>
              <span className="whitespace-nowrap text-xl font-bold tracking-[-0.01em] text-orange [font-variant-numeric:tabular-nums]">{BRL(restante)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRÓXIMOS PASSOS */}
      <div className="mt-6">
        <DocSectionTitle icon={<Sparkles size={16} />}>Próximos passos</DocSectionTitle>
        <div className="rounded-xl border border-teal/20 bg-teal/[0.05] px-[18px] py-4">
          {orcamento.inicioAssimQueAprovado ? (
            <p className="m-0 text-[13.5px] leading-[1.65] text-dark">
              <strong className="font-bold text-teal-deep">Sua produção já foi iniciada!</strong>{' '}
              O restante de <strong className="font-bold text-orange">{BRL(restante)}</strong>{' '}
              será cobrado na entrega do pedido.{' '}
              Prazo: <strong className="font-bold text-body">{orcamento.prazoProducaoDias} dias úteis</strong>{' '}
              <span className="font-semibold text-teal">(previsão: {previsaoEntrega})</span>.
            </p>
          ) : (
            <p className="m-0 text-[13.5px] leading-[1.65] text-dark">
              <strong className="font-bold text-teal-deep">Sua produção entrará na fila!</strong>{' '}
              O restante de <strong className="font-bold text-orange">{BRL(restante)}</strong>{' '}
              será cobrado na entrega do pedido.{' '}
              Início estimado: <strong className="font-bold text-body">{fmtDate(orcamento.dataInicioEstimada)}</strong>{' '}
              · Prazo: <strong className="font-bold text-body">{orcamento.prazoProducaoDias} dias úteis</strong>{' '}
              <span className="font-semibold text-teal">(previsão: {previsaoEntrega})</span>.
            </p>
          )}
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="mt-auto pt-[30px]">
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] pt-[18px] text-[11.5px] text-[#9A968E]">
          <FileText size={15} className="flex-shrink-0 text-teal" />
          Este recibo foi gerado pelo sistema
          <strong className="ml-[3px] font-semibold text-[#6B6860]">Pense &amp; Precifique</strong>
          em <strong className="ml-[3px] font-semibold text-[#6B6860]">{emissao}</strong>.
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
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-muted">
          Carregando...
        </div>
      </AppLayout>
    )
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-danger">
          Orçamento não encontrado
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="orcamentos" compact noPad>

      {/* BARRA DE AÇÕES */}
      <div className="flex-shrink-0 border-b border-line bg-white px-7 py-3.5">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-4">

          {/* Breadcrumb + título */}
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-[7px] text-[12.5px] text-[#9A968E]">
              {[
                { label: 'Orçamentos', path: '/orcamentos' },
                { label: 'Detalhe do orçamento', path: `/orcamentos/${id}` },
              ].map(({ label, path }) => (
                <span key={path} className="contents">
                  <button
                    onClick={() => navigate(path)}
                    className="cursor-pointer border-none bg-none p-0 font-[inherit] text-[12.5px] font-medium text-[#9A968E] transition-colors duration-150 hover:text-teal"
                  >
                    {label}
                  </button>
                  <ChevronRight size={15} className="flex-shrink-0 text-[#CFCBC3]" />
                </span>
              ))}
              <span className="whitespace-nowrap font-semibold text-body">Recibo do Sinal</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">
                Recibo do Sinal
              </h1>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => navigate(`/orcamentos/${id}`)}>
              Voltar ao orçamento
            </Button>
            <Button variant="secondary" icon={<Download size={17} />} onClick={handleDownload}>
              Baixar Recibo
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pb-14 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          <DocumentoRecibo orcamento={orcamento} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
