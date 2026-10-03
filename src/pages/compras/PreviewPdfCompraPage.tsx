import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PreviewPdfDocumento from '../../components/shared/PreviewPdfDocumento'
import { StatusCompraBadge } from '../../components/compra/StatusCompraBadge'
import { compraService } from '../../services/compraService'
import type { CompraResponse } from '../../types/compra'

// #545 (RN-NOVA-11) — PDF da compra, para qualquer compra com COM-N (rascunho e cancelada aparecem
// destacadas no próprio documento, pelo microsserviço).
export default function PreviewPdfCompraPage() {
  const { id } = useParams<{ id: string }>()
  const [compra, setCompra] = useState<CompraResponse | null>(null)
  useEffect(() => { if (id) compraService.buscar(id).then(setCompra).catch(() => setCompra(null)) }, [id])

  return (
    <PreviewPdfDocumento
      active="compras"
      trilha={[{ label: 'Minhas compras', to: '/compras' }, { label: compra?.identificador ?? 'Compra', to: `/compras/${id}` }, { label: 'PDF' }]}
      titulo={`PDF da compra ${compra?.identificador ?? ''}`}
      badge={compra && <StatusCompraBadge status={compra.status} size="sm" />}
      voltar={{ label: 'Voltar à compra', to: `/compras/${id}` }}
      carregarHtml={() => compraService.previewHtml(id!)}
      baixarPdf={() => compraService.baixarPdf(id!)}
      nomeArquivo={`compra-${compra?.identificador ?? id}.pdf`}
    />
  )
}
