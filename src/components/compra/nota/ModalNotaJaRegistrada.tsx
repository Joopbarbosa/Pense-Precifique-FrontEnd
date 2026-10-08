import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button, ModalShell } from '../../ui'
import { notaCompraService } from '../../../services/notaCompraService'

/**
 * #683 (V0.16.0, RN-NOVA-5) — BLOQUEIO: a nota já está numa compra confirmada ou cancelada. Mostra o aviso e
 * o link para a compra existente (BLOQUEIO usa a modal de erro padrão, com um único botão OK; aqui o link
 * entra no corpo). Rascunho existente não passa por aqui: a tela abre o rascunho. Texto é rascunho até validação.
 */
export default function ModalNotaJaRegistrada({ identificador, mensagem, onOk }: {
  identificador: string
  mensagem: string
  onOk: () => void
}) {
  const [compraId, setCompraId] = useState<string | null>(null)

  useEffect(() => {
    notaCompraService.buscarCompraPorIdentificador(identificador)
      .then(c => setCompraId(c?.id ?? null))
      .catch(() => setCompraId(null))
  }, [identificador])

  return (
    <ModalShell open onClose={onOk} width={520} title="Nota já registrada"
      icon={<AlertTriangle size={17} />} iconBg="rgba(192,73,43,0.10)" iconColor="#C0492B"
      footer={<Button variant="primary" onClick={onOk} autoFocus>OK</Button>}>
      <div className="flex flex-col gap-3 text-[13.5px] leading-[1.55] text-body" data-testid="modal-nota-ja-registrada">
        <p className="m-0">{mensagem}</p>
        {compraId && (
          <Link to={`/compras/${compraId}`} className="font-semibold text-teal underline" data-testid="link-compra-existente">
            Abrir a compra {identificador}
          </Link>
        )}
      </div>
    </ModalShell>
  )
}
