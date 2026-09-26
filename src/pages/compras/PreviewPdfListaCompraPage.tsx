import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PreviewPdfDocumento from '../../components/shared/PreviewPdfDocumento'
import { listaCompraService } from '../../services/compraService'
import type { ListaCompraResponse } from '../../types/compra'

// #547 (RN-NOVA-14) — PDF da lista, sempre a partir do retrato LST-N.
export default function PreviewPdfListaCompraPage() {
  const { id } = useParams<{ id: string }>()
  const [lista, setLista] = useState<ListaCompraResponse | null>(null)
  useEffect(() => { if (id) listaCompraService.buscar(id).then(setLista).catch(() => setLista(null)) }, [id])
  return (
    <PreviewPdfDocumento
      active="compras"
      trilha={[{ label: 'Lista de compras', to: '/compras/lista?aba=historico' }, { label: lista?.identificador ?? 'Lista', to: `/compras/lista/${id}` }, { label: 'PDF' }]}
      titulo={`PDF da lista ${lista?.identificador ?? ''}`}
      voltar={{ label: 'Voltar à lista', to: `/compras/lista/${id}` }}
      carregarHtml={() => listaCompraService.previewHtml(id!)}
      baixarPdf={() => listaCompraService.baixarPdf(id!)}
      nomeArquivo={`lista-compras-${lista?.identificador ?? id}.pdf`}
    />
  )
}
