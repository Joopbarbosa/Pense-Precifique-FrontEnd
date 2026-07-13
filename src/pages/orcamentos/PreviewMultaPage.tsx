import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Logo, Button } from '../../components/ui'
import { Mail, Phone, AlertCircle, Ban, Box, Wallet, FileText, ChevronRight, ArrowLeft, Download } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { orcamentoService } from '../../services/orcamentoService'
import { empresaService } from '../../services/empresaService'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import type { EmpresaResponse } from '../../types/empresa'

// ── Constantes ───────────────────────────────────────────────────────────────

const TEAL = '#2A9D8F'
const DANGER = '#C0492B'

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
    <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#B0ACA4]">
      {children}
    </div>
  )
}

function DocSectionTitle({ icon, color = TEAL, children }: { icon: React.ReactNode; color?: string; children: React.ReactNode }) {
  const isDanger = color === DANGER
  return (
    <div className="mb-3.5 flex items-center gap-[9px]">
      <span className={clsx(
        'grid h-[30px] w-[30px] place-items-center rounded-[9px]',
        isDanger ? 'bg-[#FCF3F0] text-danger' : 'bg-teal/[0.12] text-teal'
      )}>
        {icon}
      </span>
      <span className="text-[13.5px] font-bold uppercase tracking-[0.04em] text-dark">
        {children}
      </span>
    </div>
  )
}

// ── DocumentoMulta ───────────────────────────────────────────────────────────

function DocumentoMulta({ orcamento, empresa }: { orcamento: OrcamentoDetalheResponse; empresa: EmpresaResponse | null }) {
  const numeroFormatado = `#${String(orcamento.numero).padStart(4, '0')}`
  const emissao = fmtDate(orcamento.createdAt)
  const aprovacao = fmtDate(orcamento.dataAprovacao)
  const dataCancelamento = fmtDate(orcamento.updatedAt)
  const pctMulta = orcamento.percentualMulta || 0
  const valorMulta = orcamento.total * pctMulta / 100

  return (
    <div className="flex min-h-[calc((820px-72px)*1.414)] w-full animate-fade-up flex-col rounded-[4px] border border-[#EFEDE8] bg-white p-14 shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)] max-[767px]:min-h-0 max-[767px]:px-6 max-[767px]:py-8">

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
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-danger">Orçamento</div>
          <div className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-dark">{numeroFormatado}</div>
        </div>
      </div>

      {/* TÍTULO — NOTIFICAÇÃO DE MULTA */}
      <div className="mt-6 rounded-xl border border-[#F2D0C8] border-l-4 border-l-danger bg-[#FCF3F0] px-[22px] py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-[#F2D0C8] bg-white text-danger">
            <AlertCircle size={24} />
          </span>
          <div>
            <h1 className="m-0 text-lg font-bold leading-[1.2] tracking-[-0.01em] text-danger">
              NOTIFICAÇÃO DE MULTA POR CANCELAMENTO
            </h1>
            <div className="mt-[5px] flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-[#8A5A4E]">
              <span>Referência: <strong className="font-bold">Orçamento {numeroFormatado}</strong></span>
              <span>Emissão: <strong className="font-bold">{emissao}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DA CLIENTE */}
      <div className="pt-[22px]">
        <DocLabel>Dados da cliente</DocLabel>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-1.5">
          <div className="text-[15px] font-bold text-dark">{orcamento.nomeCliente}</div>
        </div>
      </div>

      {/* DATAS */}
      <div className="mt-[22px] grid grid-cols-2 gap-3.5 rounded-xl border border-[#F0EEE9] bg-[#FBFAF8] p-[18px]">
        <div>
          <DocLabel>Data de aprovação</DocLabel>
          <div className="text-sm font-semibold text-dark">{aprovacao}</div>
        </div>
        <div>
          <DocLabel>Data do cancelamento</DocLabel>
          <div className="text-sm font-semibold text-danger">{dataCancelamento}</div>
        </div>
      </div>

      {/* DETALHES DO CANCELAMENTO */}
      <div className="mt-6">
        <DocSectionTitle icon={<Ban size={16} />} color={DANGER}>Detalhes do cancelamento</DocSectionTitle>
        <div className="overflow-hidden rounded-xl border border-[#F0EEE9]">
          {[
            { k: 'Valor total do orçamento original', v: BRL(orcamento.total) },
            { k: 'Percentual de multa aplicado',      v: `${pctMulta}%` },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3.5 border-b border-[#F4F2EE] px-4 py-3">
              <span className="text-[13px] text-body">{r.k}</span>
              <span className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">{r.v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3.5 bg-[#FCF3F0] px-4 py-[15px]">
            <span className="flex items-center gap-2 text-sm font-bold text-danger">
              <AlertCircle size={16} /> Valor da multa
            </span>
            <span className="text-[22px] font-bold tracking-[-0.01em] text-danger [font-variant-numeric:tabular-nums]">
              {BRL(valorMulta)}
            </span>
          </div>
        </div>
      </div>

      {/* ITENS DO PEDIDO */}
      <div className="mt-6">
        <DocSectionTitle icon={<Box size={15} />}>Itens do pedido</DocSectionTitle>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Produto</th>
              <th className="border-b-[1.5px] border-teal px-2.5 pb-[9px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A968E]">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.length === 0 ? (
              <tr>
                <td colSpan={2} className="border-b border-[#F0EEE9] px-2.5 py-[13px] text-center align-top text-[13.5px] text-[#B0ACA4]">Nenhum item</td>
              </tr>
            ) : (
              orcamento.itens.map((it, i) => (
                <tr key={i}>
                  <td className="border-b border-[#F0EEE9] px-2.5 py-[13px] align-top text-[13.5px] font-semibold text-dark">{it.nomeProduto}</td>
                  <td className="whitespace-nowrap border-b border-[#F0EEE9] px-2.5 py-[13px] text-right align-top text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">{it.quantidade}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INSTRUÇÃO DE PAGAMENTO */}
      <div className="mt-6">
        <DocSectionTitle icon={<Wallet size={15} />}>Instrução de pagamento</DocSectionTitle>
        <div className="rounded-xl border border-[#F0EEE9] bg-[#FBFAF8] px-[18px] py-4">
          <p className="m-0 text-[13.5px] leading-[1.65] text-dark">
            O valor de <strong className="font-bold text-danger">{BRL(valorMulta)}</strong> referente à multa por cancelamento deve ser pago em prazo acordado entre as partes.{' '}
            Entre em contato para combinar a forma de pagamento.
          </p>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="mt-auto pt-[30px]">
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] pt-[18px] text-[11.5px] text-[#9A968E]">
          <FileText size={15} className="flex-shrink-0 text-teal" />
          Este documento foi gerado pelo sistema
          <strong className="ml-[3px] font-semibold text-[#6B6860]">Pense &amp; Precifique</strong>
          em <strong className="ml-[3px] font-semibold text-[#6B6860]">{emissao}</strong>.
        </div>
      </div>

    </div>
  )
}

// ── PreviewMultaPage ─────────────────────────────────────────────────────────

export default function PreviewMultaPage() {
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
        alert('Erro ao carregar dados do orçamento')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDownload = async () => {
    if (!id) return
    const url = orcamentoService.downloadPdfMulta(id)
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `multa-${id}.pdf`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Erro ao baixar PDF de multa:', err)
      alert('Erro ao baixar PDF de multa')
    }
  }

  if (loading) {
    return (
      <AppLayout active="orcamentos">
        <div className="px-5 py-10 text-center text-muted">
          Carregando...
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
              <span className="whitespace-nowrap font-semibold text-body">PDF de Multa</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">
                PDF de Multa
              </h1>
              <span className="inline-flex h-[30px] items-center gap-[7px] rounded-full bg-[#FCF3F0] px-[13px] text-[13px] font-semibold text-danger">
                <span className="h-[7px] w-[7px] rounded-full bg-danger" /> Cancelado
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => navigate(`/orcamentos/${id}`)}>
              Voltar ao orçamento
            </Button>
            <Button variant="secondary" icon={<Download size={17} />} onClick={handleDownload}>
              Baixar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pb-14 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          <DocumentoMulta orcamento={orcamento} empresa={empresa} />
        </div>
      </div>

    </AppLayout>
  )
}
