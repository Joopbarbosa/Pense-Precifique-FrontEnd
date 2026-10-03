import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import { compraService } from '../../services/compraService'
import type { CompraResponse } from '../../types/compra'

/**
 * #593 (RN-NOVA-43) — duplicar compra: com algum desconto (linha ou nota) pergunta "Manter os descontos na
 * compra nova?"; sem desconto duplica direto. Usado pelo detalhe e pelo menu de Minhas compras.
 * `pedir` aceita a compra completa ou só o id (busca antes para saber se tem desconto).
 */
export function useDuplicarCompra(onErro: (err: unknown, fallback: string) => void): {
  pedir: (compra: CompraResponse | string) => Promise<void>
  processando: boolean
  modal: ReactNode
} {
  const navigate = useNavigate()
  const [pergunta, setPergunta] = useState<CompraResponse | null>(null)
  const [processando, setProcessando] = useState(false)

  const duplicar = async (c: CompraResponse, manterDescontos: boolean) => {
    setPergunta(null)
    setProcessando(true)
    try {
      const nova = await compraService.duplicar(c.id, manterDescontos)
      navigate(`/compras/${nova.id}`, { state: { toast: `Rascunho ${nova.identificador} criado a partir de ${c.identificador}. Revise e confirme.` } })
    } catch (err) {
      onErro(err, 'Não foi possível duplicar a compra.')
    } finally {
      setProcessando(false)
    }
  }

  const pedir = async (compra: CompraResponse | string) => {
    let c: CompraResponse
    if (typeof compra === 'string') {
      setProcessando(true)
      try { c = await compraService.buscar(compra) } catch (err) { onErro(err, 'Não foi possível abrir a compra.'); setProcessando(false); return }
      setProcessando(false)
    } else c = compra
    if (c.totalDescontos > 0) setPergunta(c)
    else await duplicar(c, true)
  }

  const modal = pergunta && (
    <ModalShell open onClose={() => setPergunta(null)} title="Manter os descontos na compra nova?" subtitle={pergunta.identificador}
      icon={<Copy size={16} />} width={460}
      footer={<>
        <Button variant="ghost" onClick={() => duplicar(pergunta, false)}>Sem descontos</Button>
        <Button variant="primary" onClick={() => duplicar(pergunta, true)}>Manter descontos</Button>
      </>}>
      <p className="m-0 text-[13.5px] leading-[1.55] text-body">
        Esta compra tem desconto. Com <strong>Manter descontos</strong>, o rascunho novo copia o preço cheio e os descontos de cada
        linha e da nota. Com <strong>Sem descontos</strong>, copia o preço cheio e as quantidades, sem nenhum desconto.
      </p>
    </ModalShell>
  )

  return { pedir, processando, modal }
}
