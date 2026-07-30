import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Logo } from '../../components/ui'
import { Mail, Phone, BadgeCheck, Check, ShoppingBag, ChevronRight, ArrowLeft, Download } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'

// ── Constantes de cor ────────────────────────────────────────────────────────

const GREEN = '#2E9E60'

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
    <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-dim">
      {children}
    </div>
  )
}

function DocSectionTitle({ icon, color = GREEN, children }: { icon: React.ReactNode; color?: string; children: React.ReactNode }) {
  const isGreen = color === GREEN
  return (
    <div className="mb-3.5 flex items-center gap-[9px]">
      <span className={clsx(
        'grid h-[30px] w-[30px] place-items-center rounded-[9px]',
        isGreen ? 'bg-success/[0.12] text-success' : 'bg-teal/[0.12] text-teal'
      )}>
        {icon}
      </span>
      <span className="text-[13.5px] font-bold uppercase tracking-[0.04em] text-dark">
        {children}
      </span>
    </div>
  )
}

// ── DocumentoReciboPagamento ─────────────────────────────────────────────────

function DocumentoReciboPagamento({ orcamento, empresa }: { orcamento: OrcamentoDetalheResponse; empresa: EmpresaResponse | null }) {
  const numeroFormatado = `#${orcamento.numero}`
  const emissao = fmtDate(orcamento.updatedAt)
  const dataPagamento = fmtDate(orcamento.updatedAt)
  const dataSinal = fmtDate(orcamento.dataSinalPago)
  const valorTotal = orcamento.total
  const valorSinal = orcamento.valorSinal || 0
  const pagoAgora = orcamento.sinalAtivo ? valorTotal - valorSinal : valorTotal

  return (
    <div className="flex min-h-[calc((820px-72px)*1.414)] w-full animate-fade-up flex-col rounded-[4px] border border-line bg-white p-14 shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)] max-[767px]:min-h-0 max-[767px]:px-6 max-[767px]:py-8">

      {/* CABEÇALHO — borda verde */}
      <div className="flex items-start justify-between gap-5 border-b-2 border-success/25 pb-[22px]">
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-success">Orçamento</div>
          <div className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-dark">{numeroFormatado}</div>
        </div>
      </div>

      {/* TÍTULO — QUITAÇÃO TOTAL */}
      <div className="mt-6 rounded-xl border border-success/[0.22] border-l-4 border-l-success bg-success/[0.07] px-[22px] py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-success/[0.22] bg-white text-success">
            <BadgeCheck size={22} />
          </span>
          <div>
            <h1 className="m-0 text-lg font-bold leading-[1.2] tracking-[-0.01em] text-success">
              RECIBO DE PAGAMENTO — QUITAÇÃO TOTAL
            </h1>
            <div className="mt-[5px] flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-[#3F6B53]">
              <span>Referência: <strong className="font-bold">Orçamento {numeroFormatado}</strong></span>
              <span>Data: <strong className="font-bold">{emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div className="pt-[22px]">
        <DocLabel>Dados da cliente</DocLabel>
        <div className="text-[15px] font-bold text-dark">{orcamento.nomeCliente}</div>
      </div>

      {/* PEDIDO QUITADO — destaque verde */}
      <div className="mt-6 overflow-hidden rounded-2xl border-[1.5px] border-success/[0.38] bg-success/[0.05]">
        <div className="flex items-center gap-[11px] border-b border-success/[0.22] bg-[linear-gradient(135deg,rgba(46,158,96,0.15),rgba(46,158,96,0.04))] px-[18px] py-3.5">
          <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[9px] bg-white text-success shadow-[0_3px_9px_-3px_rgba(46,158,96,0.45)]">
            <Check size={14} />
          </span>
          <span className="text-[15px] font-bold tracking-[-0.005em] text-success">Pedido quitado</span>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-[18px] p-[18px]">
          <div className="flex-[1_1_220px]">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-success">
              <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-success text-white">
                <Check size={12} />
              </span>
              Pagamento recebido em sua totalidade
            </div>
            <div className="mt-1.5 text-[12.5px] leading-[1.5] text-[#5C7A68]">
              Não há valores pendentes para este orçamento.
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-dim">Data do pagamento</div>
            <div className="mt-[3px] text-sm font-semibold text-dark">{dataPagamento}</div>
          </div>
        </div>
      </div>

      {/* DETALHES FINANCEIROS */}
      <div className="mt-6">
        <DocSectionTitle icon={<ShoppingBag size={15} />} color={GREEN}>Detalhes financeiros</DocSectionTitle>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-dim">Item</th>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-dim">Customização</th>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-dim">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.length === 0 ? (
              <tr>
                <td colSpan={3} className="border-b border-[#F0EEE9] px-2.5 py-[13px] text-center align-top text-[13.5px] text-dim">Nenhum item</td>
              </tr>
            ) : (
              orcamento.itens.map((it, i) => (
                <tr key={i}>
                  <td className="border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px] font-semibold text-dark">{it.nomeProduto}</td>
                  <td className={clsx('border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px]', it.customizacoes.length === 0 ? 'text-[#C0BCB4]' : 'text-body')}>
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
          <div className="w-[min(380px,100%)]">
            <div className="flex justify-between px-3 py-2 text-[13.5px] text-body">
              <span>Valor total do pedido</span>
              <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(valorTotal)}</span>
            </div>
            {orcamento.sinalAtivo && valorSinal > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-[13.5px]">
                <span className="flex items-center gap-1.5 text-body">
                  Entrada já paga <span className="text-xs text-dim">em {dataSinal}</span>
                </span>
                <span className="font-bold text-teal [font-variant-numeric:tabular-nums]">− {BRL(valorSinal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-[#F0EEE9] px-3 py-2 text-[13.5px]">
              <span className="text-body">Valor pago agora</span>
              <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(pagoAgora)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-[9px] border border-dashed border-success/40 bg-success/[0.08] px-3 py-[11px] text-[13.5px]">
              <span className="flex items-center gap-1.5 font-semibold text-success">
                <Check size={14} /> Saldo devedor
              </span>
              <span className="font-bold text-success [font-variant-numeric:tabular-nums]">{BRL(0)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between rounded-input border border-orange/[0.28] bg-orange/[0.08] px-4 py-3.5">
              <span className="text-[13.5px] font-bold leading-[1.3] text-dark">Total quitado</span>
              <span className="whitespace-nowrap text-[22px] font-bold tracking-[-0.01em] text-orange [font-variant-numeric:tabular-nums]">{BRL(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="mt-auto pt-[30px]">
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] pt-[18px] text-[11.5px] leading-[1.6] text-dim">
          <BadgeCheck size={15} className="flex-shrink-0 text-success" />
          Este recibo confirma a quitação total do pedido. Gerado pelo sistema
          <strong className="ml-[3px] font-semibold text-dim">Pense &amp; Precifique</strong>
          em <strong className="ml-[3px] font-semibold text-dim">{emissao}</strong>.
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
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-[7px] text-[12.5px] text-dim">
              <span
                className="cursor-pointer font-medium transition-colors duration-150 hover:text-teal"
                onClick={() => navigate('/orcamentos')}
              >Orçamentos</span>
              <ChevronRight size={15} className="flex-shrink-0 text-dim" />
              <span
                className="cursor-pointer font-medium transition-colors duration-150 hover:text-teal"
                onClick={() => navigate(`/orcamentos/${id}`)}
              >Detalhe do orçamento</span>
              <ChevronRight size={15} className="flex-shrink-0 text-dim" />
              <span className="whitespace-nowrap font-semibold text-body">Recibo de Pagamento</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">
                Recibo de Pagamento
              </h1>
              <span className="inline-flex h-[30px] items-center gap-[7px] rounded-full bg-success/[0.12] px-[13px] text-[13px] font-semibold text-success">
                <span className="h-[7px] w-[7px] rounded-full bg-success" /> Pago
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate(`/orcamentos/${id}`)}
              className="inline-flex h-11 items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-[18px] font-[inherit] text-sm font-semibold text-body transition-colors duration-100 hover:bg-cream"
            >
              <ArrowLeft size={17} /> Voltar ao orçamento
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex h-11 items-center gap-2 rounded-input border-none bg-teal px-[18px] font-[inherit] text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(42,157,143,0.7)]"
            >
              <Download size={17} /> Baixar Recibo
            </button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pb-14 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          <DocumentoReciboPagamento orcamento={orcamento} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
