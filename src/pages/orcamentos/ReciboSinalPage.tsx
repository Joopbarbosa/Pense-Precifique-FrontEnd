import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Button, StatusBadge, Spinner, EmptyState } from '../../components/ui'
import { RetryCooldownModal } from '../../components/shared'
import { ArrowLeft, ChevronRight, Download, FileWarning } from 'lucide-react'
import { orcamentoService } from '../../services/orcamentoService'
import { useToast } from '../../hooks/useToast'
import { useRetryCooldown } from '../../hooks/useRetryCooldown'
import { extractApiError } from '../../utils/apiError'
import { dispararDownloadBlob } from '../../utils/download'
import type { OrcamentoDetalheResponse } from '../../types/orcamento'
import { STATUS_LABEL } from '../../constants'

type StatusBadgeType =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

export default function ReciboSinalPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast, setToast } = useToast()

  const [html, setHtml] = useState<string | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const previewRetry = useRetryCooldown()
  const downloadRetry = useRetryCooldown()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(1120)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await orcamentoService.buscarPorId(id)
        setOrcamento(data)
      } catch (err) {
        console.error('Erro ao carregar orçamento:', err)
        setToast(extractApiError(err, 'Erro ao carregar orçamento.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, setToast])

  // Épico #248 (V0.8.1) — preview via microsserviço (GET .../recibo-sinal/preview-html), mesmo
  // padrão de PreviewPdfOrcamentoPage.tsx: o botão de download só habilita quando esta chamada
  // (a mesma fonte usada pelo download em si) tiver sucesso.
  const carregarPreview = useCallback(async () => {
    if (!id) return
    setHtml(null)
    await previewRetry.executar(async () => {
      const conteudo = await orcamentoService.buscarPreviewHtmlReciboSinal(id)
      setHtml(conteudo)
    }, 'Não foi possível carregar o preview do recibo do sinal.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    carregarPreview()
  }, [carregarPreview])

  useEffect(() => {
    if (previewRetry.erro) setPreviewModalOpen(true)
  }, [previewRetry.erro])

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument
    if (doc?.body) {
      setIframeHeight(doc.body.scrollHeight)
    }
  }

  const previewStatus: 'carregando' | 'ok' | 'erro' = html ? 'ok' : previewRetry.erro ? 'erro' : 'carregando'

  const downloadBloqueado = downloadRetry.executando || downloadRetry.cooldownRestante > 0

  const handleDownloadPdf = () => {
    if (!id || downloadBloqueado) return
    downloadRetry.executar(async () => {
      const blob = await orcamentoService.baixarReciboSinal(id)
      dispararDownloadBlob(blob, `recibo-sinal-${orcamento?.numero || id}.pdf`)
    }, 'Erro ao baixar recibo do sinal.')
  }

  if (loading) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-muted">
          Carregando orçamento...
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
            <div className="mb-1.5 flex flex-wrap items-center gap-[7px] text-[12.5px] text-muted">
              <button
                onClick={() => navigate('/orcamentos')}
                className="cursor-pointer border-none bg-none p-0 font-[inherit] text-[12.5px] font-medium text-muted transition-colors duration-150 hover:text-teal"
              >
                Orçamentos
              </button>
              <ChevronRight size={15} className="flex-shrink-0 text-dim" />
              <button
                onClick={() => navigate(`/orcamentos/${orcamento.id}`)}
                className="cursor-pointer whitespace-nowrap border-none bg-none p-0 font-[inherit] text-[12.5px] font-semibold text-body transition-colors duration-150 hover:text-teal"
              >
                #{orcamento.numero} — {orcamento.nomeCliente}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">
                Recibo do Sinal
              </h1>
              <StatusBadge status={(STATUS_LABEL[orcamento.status] || 'Rascunho') as StatusBadgeType} size="sm" />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => navigate(`/orcamentos/${orcamento.id}`)}>
              Voltar ao orçamento
            </Button>
            <Button
              variant="secondary"
              icon={downloadRetry.executando ? <Spinner size={15} /> : <Download size={17} />}
              onClick={handleDownloadPdf}
              disabled={previewStatus !== 'ok' || downloadBloqueado}
            >
              {downloadRetry.executando
                ? 'Baixando...'
                : downloadRetry.cooldownRestante > 0
                  ? `Aguarde ${downloadRetry.cooldownRestante}s`
                  : 'Baixar Recibo'}
            </Button>
          </div>
        </div>
      </div>

      {/* DOCUMENTO A4 */}
      <div className="mt-4 flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pb-14 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          {previewStatus === 'carregando' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-[4px] border border-line bg-white text-muted">
              <Spinner size={28} color="#2A9D8F" trackColor="rgba(42,157,143,0.18)" thickness={3} />
              Preparando seu documento...
            </div>
          )}

          {previewStatus === 'erro' && (
            <EmptyState
              icon={<FileWarning size={28} />}
              iconColor="#C0492B"
              iconBg="rgba(192,73,43,0.10)"
              title="Não foi possível carregar o preview"
              description="A geração de documentos está temporariamente indisponível. As demais funções do sistema continuam normais."
              action={{ label: 'Tentar novamente', onClick: () => setPreviewModalOpen(true) }}
            />
          )}

          {previewStatus === 'ok' && (
            <iframe
              ref={iframeRef}
              srcDoc={html ?? ''}
              onLoad={handleIframeLoad}
              sandbox=""
              title="Preview do recibo do sinal"
              style={{ height: iframeHeight }}
              className="w-full rounded-[4px] border border-line bg-white shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)]"
            />
          )}
        </div>
      </div>

      <RetryCooldownModal
        open={previewModalOpen && previewStatus === 'erro'}
        mensagem={previewRetry.erro ?? ''}
        cooldownRestante={previewRetry.cooldownRestante}
        executando={previewRetry.executando}
        onTentarNovamente={previewRetry.tentarNovamente}
        onClose={() => setPreviewModalOpen(false)}
      />

      <RetryCooldownModal
        open={!!downloadRetry.erro}
        mensagem={downloadRetry.erro ?? ''}
        cooldownRestante={downloadRetry.cooldownRestante}
        executando={downloadRetry.executando}
        onTentarNovamente={downloadRetry.tentarNovamente}
        onClose={downloadRetry.dispensarErro}
      />

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

    </AppLayout>
  )
}
