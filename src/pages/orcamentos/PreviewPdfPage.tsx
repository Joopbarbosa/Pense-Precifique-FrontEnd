import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Logo, Button, StatusBadge } from '../../components/ui'
import { Mail, Phone, Wallet, FileText, ChevronRight, Download } from 'lucide-react'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import { useAuthStore } from '../../store/authStore'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'
import { STATUS_LABEL } from '../../constants'

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── DocumentoPDF ────────────────────────────────────────────────────────────

function DocumentoPDF({ orcamento, sinal, empresa }: { orcamento: OrcamentoDetalheResponse | null; sinal: boolean; empresa: EmpresaResponse | null }) {
  if (!orcamento) {
    return <div>Carregando...</div>
  }

  const dataEmissao = new Date(orcamento.createdAt).toLocaleDateString('pt-BR')
  const dataValidade = orcamento.dataValidade
    ? new Date(orcamento.dataValidade).toLocaleDateString('pt-BR')
    : 'Não definida'

  return (
    <div className="flex min-h-[calc((820px-72px)*1.414)] w-full flex-col rounded-[4px] border border-[#EFEDE8] bg-white p-14 shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)] max-[767px]:min-h-0 max-[767px]:px-6 max-[767px]:py-8">

      {/* CABEÇALHO */}
      <div className="flex items-start justify-between gap-5 border-b-2 border-teal/25 pb-[22px]">
        <div className="flex items-center gap-3.5">
          <Logo size={52} />
          <div>
            <div className="text-[17px] font-bold tracking-[-0.01em] text-dark">{empresa?.nome || ''}</div>
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
          <div className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-dark">#{String(orcamento.numero).padStart(4, '0')}</div>
        </div>
      </div>

      {/* META + CLIENTE */}
      <div className="grid grid-cols-3 gap-4 border-b border-[#F0EEE9] py-[22px] max-[600px]:grid-cols-2">
        <div>
          <Label>Datas</Label>
          <div className="text-[13px] leading-[1.7] text-dark">
            <div>Emissão: <strong className="font-semibold">{dataEmissao}</strong></div>
            <div>Validade: <strong className="font-semibold">{dataValidade}</strong></div>
          </div>
        </div>
        <div>
          <Label>Prazo de produção</Label>
          <div className="text-[13px] leading-[1.7] text-dark">
            <div className="text-sm font-semibold text-teal">{orcamento.prazoProducaoDias} dias úteis</div>
            <div className="mt-0.5 text-subtle">
              Início: {orcamento.inicioAssimQueAprovado ? 'Assim que aprovado' : (orcamento.dataInicioEstimada ? new Date(orcamento.dataInicioEstimada).toLocaleDateString('pt-BR') : '—')}
            </div>
          </div>
        </div>
        <div>
          <Label>Cliente</Label>
          <div className="text-[13px] leading-[1.7] text-dark">
            <div className="text-sm font-semibold">{orcamento.nomeCliente}</div>
            <div className="text-subtle">—</div>
          </div>
        </div>
      </div>

      {/* MÉTODO DE PAGAMENTO */}
      <div className="border-b border-[#F0EEE9] py-3.5">
        <Label>Método de pagamento</Label>
        <div className="inline-flex items-center gap-[7px] text-[13.5px] font-semibold text-dark">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-teal/[0.12] text-teal">
            <Wallet size={14} />
          </span>
          {orcamento.metodoPagamento}
        </div>
      </div>

      {/* TABELA DE ITENS */}
      <table className="mt-[22px] w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Produto</th>
            <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Customizações</th>
            <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Qtd</th>
            <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Valor unit.</th>
            <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Total</th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map((it, i) => (
            <tr key={i}>
              <td className="border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px] font-semibold text-dark">{it.nomeProduto}</td>
              <td className={clsx('border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px]', it.customizacoes.length === 0 ? 'text-[#C0BCB4]' : 'text-body')}>
                {it.customizacoes.length === 0 ? '—' : it.customizacoes.map(c => c.nomeProduto).join(', ')}
              </td>
              <td className="whitespace-nowrap border-b border-[#F0EEE9] px-2.5 py-[13px] text-right align-top text-[13.5px] text-dark [font-variant-numeric:tabular-nums]">{it.quantidade}</td>
              <td className="whitespace-nowrap border-b border-[#F0EEE9] px-2.5 py-[13px] text-right align-top text-[13.5px] text-dark [font-variant-numeric:tabular-nums]">{BRL(it.precoUnitario)}</td>
              <td className="whitespace-nowrap border-b border-[#F0EEE9] px-2.5 py-[13px] text-right align-top text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ENTRADA SOLICITADA */}
      {sinal && orcamento.sinalAtivo && (
        <div className="mt-6 rounded-xl border-[1.5px] border-teal/40 bg-teal/[0.05] px-[18px] py-4">
          <div className="mb-2 flex items-center gap-[9px]">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-teal/25 bg-white text-teal">
              <Wallet size={16} />
            </span>
            <div className="text-sm font-bold text-dark">Entrada solicitada</div>
          </div>
          <p className="mb-3 mt-0 text-[12.5px] leading-[1.55] text-body">
            Para iniciar a produção, solicitamos o pagamento de {orcamento.percentualSinal ? `${orcamento.percentualSinal}%` : BRL(orcamento.valorSinal || 0)} do valor total.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[140px] flex-1 rounded-[9px] border border-teal/20 bg-white px-[13px] py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-teal">Valor do sinal</div>
              <div className="mt-0.5 text-base font-bold text-teal [font-variant-numeric:tabular-nums]">{BRL(orcamento.valorSinal || 0)}</div>
            </div>
            <div className="min-w-[140px] flex-1 rounded-[9px] border border-[#F0EEE9] bg-white px-[13px] py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#B0ACA4]">Restante na entrega</div>
              <div className="mt-0.5 text-base font-bold text-dark [font-variant-numeric:tabular-nums]">{BRL(orcamento.total - (orcamento.valorSinal || 0))}</div>
            </div>
          </div>
        </div>
      )}

      {/* TOTAIS */}
      <div className="mt-[22px] flex justify-end">
        <div className="w-[min(320px,100%)]">
          <Row label="Subtotal" value={BRL(orcamento.subtotal)} />
          {orcamento.descontoValor ? (
            <Row label={`Desconto (${orcamento.tipoDesconto})`} value={`− ${BRL(orcamento.descontoValor)}`} valueClassName="text-danger" />
          ) : null}
          {sinal && orcamento.sinalAtivo && (
            <div className="my-1 flex items-center justify-between rounded-[9px] border border-dashed border-teal/40 bg-teal/[0.07] px-3 py-2">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal">
                <Wallet size={14} /> Sinal solicitado
              </span>
              <span className="text-[13.5px] font-bold text-teal [font-variant-numeric:tabular-nums]">{BRL(orcamento.valorSinal || 0)}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-baseline justify-between rounded-input border border-orange/25 bg-orange/[0.08] px-3.5 py-3">
            <span className="text-[14.5px] font-semibold text-dark">Total</span>
            <span className="text-xl font-bold tracking-[-0.01em] text-orange [font-variant-numeric:tabular-nums]">{BRL(orcamento.total)}</span>
          </div>
          {sinal && orcamento.sinalAtivo && (
            <Row label="Restante após sinal" value={BRL(orcamento.total - (orcamento.valorSinal || 0))} className="pt-2.5" />
          )}
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      {orcamento.observacoes && (
        <div className="mt-[26px] rounded-input border border-[#F0EEE9] bg-[#FBFAF8] px-[18px] py-4">
          <Label>Observações</Label>
          <div className="text-[13px] leading-[1.6] text-dark">{orcamento.observacoes}</div>
        </div>
      )}

      {/* RODAPÉ */}
      <div className="mt-auto pt-[26px]">
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] pt-[18px] text-xs text-[#9A968E]">
          <FileText size={15} className="flex-shrink-0 text-teal" />
          Este orçamento é válido até
          <strong className="mx-0.5 font-semibold text-[#6B6860]">{dataValidade}</strong>.
          <span className="ml-auto inline-flex items-center gap-1">
            Gerado por <strong className="ml-1 font-semibold text-[#6B6860]">Pense &amp; Precifique</strong>
          </span>
        </div>
        <p className="mb-0 mt-3 text-[10.5px] leading-[1.55] text-[#B0ACA4]">
          Em caso de cancelamento após aprovação, poderá ser cobrado uma taxa referente aos materiais e tempo já investidos na produção.
        </p>
      </div>

    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#B0ACA4]">
      {children}
    </div>
  )
}

function Row({ label, value, valueClassName, className }: { label: string; value: string; valueClassName?: string; className?: string }) {
  return (
    <div className={clsx('flex justify-between px-2.5 py-[7px] text-[13.5px] text-body', className)}>
      <span>{label}</span>
      <span className={clsx('[font-variant-numeric:tabular-nums]', valueClassName)}>{value}</span>
    </div>
  )
}

// ── PreviewPdfPage ───────────────────────────────────────────────────────────

type StatusBadgeType =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

export default function PreviewPdfPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore((state) => state.token)
  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null)
  const [sinal, setSinal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const [data, emp] = await Promise.all([
          orcamentoService.buscarPorId(id),
          empresaService.getEmpresa(),
        ])
        setOrcamento(data)
        setSinal(data.sinalAtivo)
        setEmpresa(emp)
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
        <div className="px-5 py-10 text-center text-muted">
          Carregando orçamento...
        </div>
      </AppLayout>
    )
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos">
        <div className="px-5 py-10 text-center text-danger">
          Orçamento não encontrado
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="orcamentos" noPad>

      {/* BARRA DE AÇÕES */}
      <div className="flex-shrink-0 border-b border-line bg-white px-7 py-3.5">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-4">

          {/* Breadcrumb + título */}
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-[7px] text-[12.5px] text-muted">
              <button
                onClick={() => navigate('/orcamentos')}
                className="cursor-pointer border-none bg-none p-0 font-[inherit] text-[12.5px] font-medium text-muted transition-colors duration-150 hover:text-teal"
              >
                Orçamentos
              </button>
              <ChevronRight size={15} className="flex-shrink-0 text-[#CFCBC3]" />
              <button
                onClick={() => navigate(`/orcamentos/${orcamento.id}`)}
                className="cursor-pointer whitespace-nowrap border-none bg-none p-0 font-[inherit] text-[12.5px] font-semibold text-body transition-colors duration-150 hover:text-teal"
              >
                #{String(orcamento.numero).padStart(4, '0')} — {orcamento.nomeCliente}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">
                Preview do orçamento
              </h1>
              <StatusBadge status={(STATUS_LABEL[orcamento.status] || 'Rascunho') as StatusBadgeType} size="sm" />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" icon={<Download size={17} />} onClick={handleDownloadPdf} disabled={downloadLoading}>
              {downloadLoading ? 'Baixando...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO A4 */}
      <div className="mt-4 flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pb-14 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          <DocumentoPDF orcamento={orcamento} sinal={sinal} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
