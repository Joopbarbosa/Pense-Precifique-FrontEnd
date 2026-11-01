import { useParams } from 'react-router-dom'
import PreviewPdfDocumento from '../../../components/shared/PreviewPdfDocumento'
import { orcamentoService } from '../../../services/orcamentoService'

/** V0.19.0 #382 — prévia e download do PDF do Descritivo (mesmos endpoints do orçamento; o backend escolhe o modelo pelo tipo). */
export default function PdfDescritivoPage() {
  const { id = '' } = useParams<{ id: string }>()
  return (
    <PreviewPdfDocumento
      active="orcamentos"
      trilha={[{ label: 'Orçamentos descritivos', to: '/orcamentos/descritivos' }, { label: 'PDF' }]}
      titulo="PDF do orçamento descritivo"
      voltar={{ label: 'Voltar ao orçamento', to: `/orcamentos/descritivos/${id}` }}
      carregarHtml={() => orcamentoService.buscarPreviewHtml(id)}
      baixarPdf={() => orcamentoService.baixarPdf(id)}
      nomeArquivo={`orcamento-descritivo-${id}.pdf`}
    />
  )
}
