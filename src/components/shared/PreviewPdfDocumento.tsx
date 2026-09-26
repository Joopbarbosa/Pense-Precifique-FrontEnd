import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Download, FileWarning } from 'lucide-react'
import AppLayout from '../layout/AppLayout'
import { Button, EmptyState, Spinner } from '../ui'
import RetryCooldownModal from './RetryCooldownModal'
import { useRetryCooldown } from '../../hooks/useRetryCooldown'
import { dispararDownloadBlob } from '../../utils/download'
import { normalizarErroBlob } from '../../utils/apiError'

/**
 * Preview + download de documento do microsserviço de PDF (V0.15.0: compra #545 e lista de compras
 * #547). Mesmo padrão de `PreviewPdfOrcamentoPage`: o preview vem de `/preview-html` (mesma fonte do
 * PDF, sem layout duplicado no front), o download só habilita depois do preview, e erro usa
 * `useRetryCooldown` + `RetryCooldownModal`.
 */
export default function PreviewPdfDocumento({ active, trilha, titulo, badge, voltar, carregarHtml, baixarPdf, nomeArquivo }: {
  active: 'compras'
  trilha: { label: string; to?: string }[]
  titulo: string
  badge?: ReactNode
  voltar: { label: string; to: string }
  carregarHtml: () => Promise<string>
  baixarPdf: () => Promise<Blob>
  nomeArquivo: string
}) {
  const navigate = useNavigate()
  const [html, setHtml] = useState<string | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const previewRetry = useRetryCooldown()
  const downloadRetry = useRetryCooldown()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(1120)

  const carregarPreview = useCallback(async () => {
    setHtml(null)
    await previewRetry.executar(async () => setHtml(await carregarHtml()), 'Não foi possível carregar o preview do documento.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { carregarPreview() }, [carregarPreview])
  useEffect(() => { if (previewRetry.erro) setPreviewModalOpen(true) }, [previewRetry.erro])

  const status: 'carregando' | 'ok' | 'erro' = html ? 'ok' : previewRetry.erro ? 'erro' : 'carregando'
  const downloadBloqueado = downloadRetry.executando || downloadRetry.cooldownRestante > 0

  const baixar = () => {
    if (downloadBloqueado) return
    downloadRetry.executar(async () => {
      try {
        dispararDownloadBlob(await baixarPdf(), nomeArquivo)
      } catch (err) {
        throw await normalizarErroBlob(err)
      }
    }, 'Erro ao baixar o PDF.')
  }

  return (
    <AppLayout active={active} compact noPad>
      <div className="flex-shrink-0 border-b border-line bg-white px-7 py-3.5 max-[767px]:px-4">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-[7px] text-[12.5px] text-muted">
              {trilha.map((t, i) => (
                <span key={i} className="flex items-center gap-[7px]">
                  {i > 0 && <ChevronRight size={15} className="text-dim" />}
                  {t.to
                    ? <button onClick={() => navigate(t.to!)} className="border-none bg-transparent p-0 font-[inherit] text-[12.5px] font-medium text-muted hover:text-teal">{t.label}</button>
                    : <span className="font-semibold text-body">{t.label}</span>}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em] text-dark">{titulo}</h1>
              {badge}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => navigate(voltar.to)}>{voltar.label}</Button>
            <Button variant="primary" icon={downloadRetry.executando ? <Spinner size={15} /> : <Download size={17} />}
              onClick={baixar} disabled={status !== 'ok' || downloadBloqueado}>
              {downloadRetry.executando ? 'Baixando...' : downloadRetry.cooldownRestante > 0 ? `Aguarde ${downloadRetry.cooldownRestante}s` : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-auto bg-[#EDECEA] px-9 pb-14 pt-7 max-[767px]:px-3.5 max-[767px]:pt-[18px]">
        <div className="mx-auto max-w-[820px]">
          {status === 'carregando' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-[4px] border border-line bg-white text-muted">
              <Spinner size={28} color="#2A9D8F" trackColor="rgba(42,157,143,0.18)" thickness={3} />
              Preparando seu documento...
            </div>
          )}
          {status === 'erro' && (
            <EmptyState icon={<FileWarning size={28} />} iconColor="#C0492B" iconBg="rgba(192,73,43,0.10)"
              title="Não foi possível carregar o preview"
              description="A geração de documentos está temporariamente indisponível. As demais funções do sistema continuam normais."
              action={{ label: 'Tentar novamente', onClick: () => setPreviewModalOpen(true) }} />
          )}
          {status === 'ok' && (
            <iframe ref={iframeRef} srcDoc={html ?? ''} sandbox="" title={titulo} data-testid="preview-pdf"
              onLoad={() => { const d = iframeRef.current?.contentDocument; if (d?.body) setIframeHeight(d.body.scrollHeight) }}
              style={{ height: iframeHeight }}
              className="w-full rounded-[4px] border border-line bg-white shadow-[0_10px_40px_-8px_rgba(31,38,52,0.18),0_2px_8px_rgba(0,0,0,0.06)]" />
          )}
        </div>
      </div>

      <RetryCooldownModal open={previewModalOpen && status === 'erro'} mensagem={previewRetry.erro ?? ''}
        cooldownRestante={previewRetry.cooldownRestante} executando={previewRetry.executando}
        onTentarNovamente={previewRetry.tentarNovamente} onClose={() => setPreviewModalOpen(false)} />
      <RetryCooldownModal open={!!downloadRetry.erro} mensagem={downloadRetry.erro ?? ''}
        cooldownRestante={downloadRetry.cooldownRestante} executando={downloadRetry.executando}
        onTentarNovamente={downloadRetry.tentarNovamente} onClose={downloadRetry.dispensarErro} />
    </AppLayout>
  )
}
