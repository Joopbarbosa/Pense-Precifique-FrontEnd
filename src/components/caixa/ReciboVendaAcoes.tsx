import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '../ui'
import EnviarWhatsappBotao from '../whatsapp/EnviarWhatsappBotao'
import { caixaService } from '../../services/caixaService'
import { dispararDownloadBlob } from '../../utils/download'
import { extractApiError, normalizarErroBlob } from '../../utils/apiError'

/**
 * #1170 (V0.19.0) — recibo da venda do Caixa: baixar o PDF e enviar por WhatsApp.
 * Só para venda concluída (quem usa decide); o servidor valida de novo.
 */
export default function ReciboVendaAcoes({ vendaId, identificador, compacto = false }: {
  vendaId: string
  identificador: string
  compacto?: boolean
}) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const baixar = async () => {
    setBaixando(true); setErro(null)
    try {
      const blob = await caixaService.baixarReciboVenda(vendaId)
      dispararDownloadBlob(blob, `recibo-${identificador}.pdf`)
    } catch (err) {
      const e = await normalizarErroBlob(err).catch(() => err)
      setErro(extractApiError(e, 'Não foi possível gerar o recibo. Tente novamente.'))
    } finally { setBaixando(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()} data-testid="recibo-venda-acoes">
      <Button variant="ghost" size={compacto ? 'sm' : undefined} icon={<FileDown size={16} />} onClick={baixar} disabled={baixando}>
        {baixando ? 'Gerando…' : 'Recibo PDF'}
      </Button>
      <EnviarWhatsappBotao tipoDocumento="RECIBO_CAIXA" documentoId={vendaId} />
      {erro && <span role="alert" className="text-[12.5px] text-[#B3261E]">{erro}</span>}
    </div>
  )
}
