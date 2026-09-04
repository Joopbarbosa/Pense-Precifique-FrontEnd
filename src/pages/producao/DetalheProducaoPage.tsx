import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Spinner } from '../../components/ui'
import {
  ArrowLeft, Calendar, StickyNote, Box, AlertTriangle, Lock, Clock,
  Play, Pencil, Ban, PauseCircle, CheckCircle2, RotateCcw, ChevronRight, Package, Link2,
} from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { getBadgeEstado } from '../../utils/badges'
import { useToast } from '../../hooks/useToast'
import type { ProducaoDetalhe, EstadoProducao } from '../../types/producao'
import type { StatusOrcamento } from '../../types/orcamento'
import { formatQuantidade } from '../../utils/quantidade'
import { EstoqueTags, StatusBadge } from '../../components/ui/Badge'
import { STATUS_LABEL } from '../../constants/statusOrcamento'

// Mesmo padrão local de StatusBadgeLabel/StatusBadgeType já duplicado em ListaOrcamentosPage.tsx/
// PreviewPdfOrcamentoPage.tsx — StatusBadge (components/ui/Badge.tsx) não exporta seu union type.
type StatusBadgeLabel =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'
import IniciarProducaoModal from '../../components/producao/IniciarProducaoModal'
import TravarProducaoModal from '../../components/producao/TravarProducaoModal'
import RetomarProducaoModal from '../../components/producao/RetomarProducaoModal'
import FinalizarProducaoModal from '../../components/producao/FinalizarProducaoModal'
import CancelarProducaoModal from '../../components/producao/CancelarProducaoModal'
import CancelarProducaoConsumoModal from '../../components/producao/CancelarProducaoConsumoModal'

type TipoModal = 'iniciar' | 'travar' | 'retomar' | 'finalizar' | 'cancelar'

const ESTADO_LABEL_SIMPLES: Record<string, string> = {
  AGUARDANDO_INICIO: 'Aguardando início',
  EM_ANDAMENTO: 'Em andamento',
  TRAVADA: 'Travada',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
  NAO_REALIZADA: 'Não realizada',
}

const ORIGEM_LABEL: Record<string, string> = {
  USUARIO: 'Artesã',
  SISTEMA: 'Sistema',
}

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  return iso.split('T')[0].split('-').reverse().join('/')
}

function fmtDataHora(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// RN-NOVA-15 (V0.8.3, #375+308) — mesmo padrão local de BRL(n) já usado em
// DetalheOrcamentoPage.tsx/ListaProdutosPage.tsx, sem util compartilhado no projeto.
const BRL = (n: number) => `R$ ${(n ?? 0).toFixed(2).replace('.', ',')}`

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-up rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-[18px] flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
          {icon}
        </span>
        <h2 className="m-0 text-[15.5px] font-bold text-dark">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function DetalheProducaoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast, setToast } = useToast()
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [modal, setModal] = useState<TipoModal | null>(null)
  const [modalCancelarConsumo, setModalCancelarConsumo] = useState(false)

  const carregar = useCallback(() => {
    if (!id) return
    setLoading(true)
    producaoService.buscarPorId(id)
      .then(setProducao)
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const fecharModal = () => setModal(null)
  const handleSuccess = (mensagem: string) => {
    setToast(mensagem)
    setModal(null)
    carregar()
  }

  const handleCancelar = () => {
    if (!producao) return
    if (producao.estado === 'AGUARDANDO_INICIO') {
      setModal('cancelar')
    } else {
      setModalCancelarConsumo(true)
    }
  }

  const handleSuccessCancelarConsumo = (mensagem: string) => {
    setModalCancelarConsumo(false)
    handleSuccess(mensagem)
  }

  if (loading) {
    return (
      <AppLayout active="producao" compact>
        <div className="flex justify-center py-24"><Spinner /></div>
      </AppLayout>
    )
  }

  if (erro || !producao) {
    return (
      <AppLayout active="producao" compact>
        <div className="px-5 py-10 text-center text-danger">Produção não encontrada</div>
      </AppLayout>
    )
  }

  const badge = getBadgeEstado(producao.estado, producao.historicoStatus)
  const travas = producao.historicoStatus.filter(h => h.statusNovo === 'TRAVADA')
  const ultimaTrava = travas[travas.length - 1]

  const botoesPorEstado: Record<EstadoProducao, { label: string; icon: React.ReactNode; variant: 'primary' | 'secondary' | 'ghost' | 'danger'; onClick: () => void }[]> = {
    AGUARDANDO_INICIO: [
      { label: 'Iniciar', icon: <Play size={16} />, variant: 'primary', onClick: () => setModal('iniciar') },
      { label: 'Editar', icon: <Pencil size={16} />, variant: 'secondary', onClick: () => navigate(`/producao/${producao.id}/editar`) },
      { label: 'Cancelar', icon: <Ban size={16} />, variant: 'danger', onClick: handleCancelar },
    ],
    EM_ANDAMENTO: [
      { label: 'Finalizar', icon: <CheckCircle2 size={16} />, variant: 'primary', onClick: () => setModal('finalizar') },
      { label: 'Travar', icon: <PauseCircle size={16} />, variant: 'secondary', onClick: () => setModal('travar') },
      { label: 'Cancelar', icon: <Ban size={16} />, variant: 'danger', onClick: handleCancelar },
    ],
    TRAVADA: [
      { label: 'Retomar', icon: <RotateCcw size={16} />, variant: 'primary', onClick: () => setModal('retomar') },
      { label: 'Cancelar', icon: <Ban size={16} />, variant: 'danger', onClick: handleCancelar },
    ],
    FINALIZADA: [],
    CANCELADA: [],
    NAO_REALIZADA: [],
  }
  const botoes = botoesPorEstado[producao.estado]

  return (
    <AppLayout active="producao" compact>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <button
            onClick={() => navigate('/producao')}
            className="mb-[5px] inline-flex items-center gap-1.5 border-none bg-none p-0 font-[inherit] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal"
          >
            <ArrowLeft size={13} /> Produção
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[25px] font-bold tracking-[-0.025em] text-dark">
              {producao.identificador}
            </h1>
            <span
              className="inline-flex h-[30px] items-center rounded-full px-[13px] text-[13px] font-semibold"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {botoes.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {botoes.map(b => (
              <Button key={b.label} variant={b.variant} icon={b.icon} onClick={b.onClick}>
                {b.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[18px]">
        {producao.estado === 'TRAVADA' && ultimaTrava && (
          <div
            className="flex items-start gap-3 rounded-card border px-6 py-5"
            style={{ background: badge.bg, borderColor: badge.fg + '40' }}
          >
            <span className="mt-0.5 flex-shrink-0" style={{ color: badge.fg }}>
              <Lock size={20} />
            </span>
            <div>
              <div className="text-[15px] font-bold" style={{ color: badge.fg }}>
                Produção travada
              </div>
              <p className="m-0 mt-1 text-[13.5px] leading-[1.55]" style={{ color: badge.fg }}>
                {ultimaTrava.justificativa || 'Sem justificativa registrada.'}
              </p>
            </div>
          </div>
        )}

        <Section icon={<Calendar size={18} />} title="Datas">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Início</div>
              <div className="mt-0.5 text-sm font-semibold text-dark">{fmtData(producao.dataInicio)}</div>
            </div>
            <div>
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Término previsto</div>
              <div className="mt-0.5 text-sm font-semibold text-dark">{fmtData(producao.dataTerminoPrevista)}</div>
            </div>
            {producao.dataTerminoReal && (
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Término real</div>
                <div className="mt-0.5 text-sm font-semibold text-dark">{fmtData(producao.dataTerminoReal)}</div>
              </div>
            )}
          </div>
          {producao.observacoes && (
            <div className="mt-4 flex items-start gap-2 border-t border-line pt-4">
              <StickyNote size={15} className="mt-0.5 flex-shrink-0 text-muted" />
              <p className="m-0 text-[13.5px] leading-[1.55] text-body">{producao.observacoes}</p>
            </div>
          )}
        </Section>

        <Section icon={<Box size={18} />} title="Produtos">
          <div className="flex flex-col gap-2.5">
            {producao.produtos.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] border border-line bg-cream px-3.5 py-3">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                  <Box size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-dark">{p.nomeProduto}</div>
                  <div className="text-[12px] text-muted">{p.tipoProduto}</div>
                  <EstoqueTags
                    className="mt-1"
                    fracionavel={!p.algumInsumoNaoFracionavel}
                    permitirEstoqueNegativo={p.permitirEstoqueNegativo}
                    estoqueAtual={p.estoqueAtual}
                    variant="busca"
                  />
                  {producao.estado === 'FINALIZADA' && p.quantidadePerdida > 0 && (
                    <div className="text-[12px] text-danger">Perda: {p.quantidadePerdida}</div>
                  )}
                </div>
                <span className="flex-shrink-0 text-[13.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">
                  ×{p.quantidade}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {producao.alertasInsumos.some(a => a.situacao !== 'SUFICIENTE') && (
          <Section icon={<AlertTriangle size={18} />} title="Alertas de insumos">
            <div className="flex flex-col gap-2">
              {producao.alertasInsumos.filter(a => a.situacao !== 'SUFICIENTE').map((a, i) => {
                const bloqueio = a.situacao === 'BLOQUEIO_FUTURO'
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex items-start gap-2.5 rounded-input border px-3.5 py-3 text-[13.5px]',
                      bloqueio ? 'border-danger/40 bg-danger-bg text-danger' : 'border-orange/30 bg-orange/[0.08] text-warning-alt'
                    )}
                  >
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{a.nomeInsumo}:</strong> necessário {a.quantidadeNecessaria}, disponível {a.estoqueAtual}
                      {bloqueio && ' (bloqueará ao iniciar)'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {producao.insumosConsumidos.length > 0 && (
          <Section icon={<Package size={18} />} title="Insumos consumidos">
            <div className="flex flex-col gap-2">
              {producao.insumosConsumidos.map((ic, i) => (
                <div key={i} className="flex items-center justify-between rounded-[10px] border border-line bg-cream px-3.5 py-3">
                  <span className="text-sm font-medium text-dark">{ic.nomeInsumo || ic.insumoId || '—'}</span>
                  <span className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">
                    {formatQuantidade(ic.quantidade, ic.fracionavel ?? true, ic.tipoExibicaoQuantidade)} {ic.unidadeMedida || 'un'}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section icon={<Clock size={18} />} title="Histórico de status">
          <div className="flex flex-col gap-0">
            {producao.historicoStatus.map((h, i) => (
              <div key={i} className={clsx('flex items-start gap-3 py-3', i > 0 && 'border-t border-line')}>
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-teal" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-dark">
                    {h.statusAnterior && (
                      <>
                        <span>{ESTADO_LABEL_SIMPLES[h.statusAnterior] ?? h.statusAnterior}</span>
                        <ChevronRight size={13} className="text-muted" />
                      </>
                    )}
                    <span>{ESTADO_LABEL_SIMPLES[h.statusNovo] ?? h.statusNovo}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {fmtDataHora(h.dataTransicao)} · <span className="uppercase tracking-[0.03em]">{ORIGEM_LABEL[h.origem] ?? h.origem}</span>
                  </div>
                  {h.justificativa && (
                    <p className="m-0 mt-1 text-[13px] leading-[1.5] text-body">{h.justificativa}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {producao.producoesFilhas.length > 0 && (
          <Section icon={<Box size={18} />} title="Produções relacionadas">
            <div className="flex flex-col gap-2">
              {producao.producoesFilhas.map(filha => {
                const badgeFilha = getBadgeEstado(filha.estado)
                return (
                  <button
                    key={filha.id}
                    onClick={() => navigate(`/producao/${filha.id}`)}
                    className="flex items-center justify-between rounded-[10px] border border-line bg-cream px-3.5 py-3 text-left font-[inherit] transition-colors duration-100 hover:bg-line-soft"
                  >
                    <span className="text-sm font-semibold text-dark">{filha.identificador}</span>
                    <span
                      className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold"
                      style={{ background: badgeFilha.bg, color: badgeFilha.fg }}
                    >
                      {badgeFilha.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {producao.orcamentosVinculados.length > 0 && (
          <Section icon={<Link2 size={18} />} title="Orçamentos vinculados">
            <div className="flex flex-col gap-2">
              {producao.orcamentosVinculados.map(orc => (
                <button
                  key={orc.orcamentoId}
                  onClick={() => navigate(`/orcamentos/${orc.orcamentoId}`)}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-cream px-3.5 py-3 text-left font-[inherit] transition-colors duration-100 hover:bg-line-soft"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-dark">{orc.identificadorOrcamento}</div>
                    <div className="mt-0.5 truncate text-[12.5px] text-muted">{orc.nomeCliente}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2.5">
                    <span className="text-[13.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">
                      {BRL(orc.valorTotal)}
                    </span>
                    <StatusBadge status={STATUS_LABEL[orc.statusOrcamento as StatusOrcamento] as StatusBadgeLabel} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      {modal === 'iniciar' && (
        <IniciarProducaoModal producaoId={producao.id} producao={producao} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal === 'travar' && (
        <TravarProducaoModal producaoId={producao.id} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal === 'retomar' && (
        <RetomarProducaoModal producaoId={producao.id} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal === 'finalizar' && (
        <FinalizarProducaoModal producaoId={producao.id} producao={producao} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modal === 'cancelar' && (
        <CancelarProducaoModal producaoId={producao.id} onClose={fecharModal} onSuccess={handleSuccess} />
      )}
      {modalCancelarConsumo && (
        <CancelarProducaoConsumoModal
          producaoId={producao.id}
          onClose={() => setModalCancelarConsumo(false)}
          onSuccess={handleSuccessCancelarConsumo}
        />
      )}
    </AppLayout>
  )
}
