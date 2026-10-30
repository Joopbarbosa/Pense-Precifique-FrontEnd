import { useState } from 'react'
import { ArrowRight, AlertTriangle, Ban } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import type { MovimentoCompromisso } from '../../types/agenda'
import { formatarData } from '../../utils/data'

/**
 * V0.18.0 (#1181, RN-NOVA-43) — janela de confirmação ao mover ou esticar qualquer card. Mostra título, antes e depois e o efeito;
 * o AVISO informa e permite confirmar; o BLOQUEIO desabilita o Confirmar e mostra o motivo.
 */
export default function ModalConfirmarMovimento({ movimento, onConfirmar, onCancelar }: {
  movimento: MovimentoCompromisso
  onConfirmar: () => Promise<void>
  onCancelar: () => void
}) {
  const [gravando, setGravando] = useState(false)
  const bloqueado = !!movimento.bloqueio
  const confirmar = async () => {
    setGravando(true)
    try { await onConfirmar() } finally { setGravando(false) }
  }
  return (
    <ModalShell open onClose={onCancelar} width={460} title="Confirmar a mudança" subtitle={movimento.titulo}
      footer={<><Button variant="ghost" onClick={onCancelar} data-testid="cancelar-movimento">Cancelar</Button>
        <Button onClick={() => void confirmar()} disabled={bloqueado || gravando} data-testid="confirmar-movimento">Confirmar</Button></>}>
      <div className="flex flex-col gap-3" data-testid="modal-confirmar-movimento">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark" data-testid="movimento-antes-depois">
          <span>{formatarData(movimento.dataAntes)}</span><ArrowRight size={14} className="text-subtle" /><span>{formatarData(movimento.dataDepois)}</span>
        </div>
        <p className="m-0 text-sm text-dark" data-testid="movimento-efeito">{movimento.efeito}</p>
        {movimento.avisos.map(a => (
          <p key={a} className="m-0 flex items-start gap-2 rounded-card border border-orange/40 bg-orange/10 px-3 py-2 text-sm text-dark" data-testid="movimento-aviso">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange" />{a}</p>
        ))}
        {movimento.bloqueio && (
          <p className="m-0 flex items-start gap-2 rounded-card border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-deep" data-testid="movimento-bloqueio">
            <Ban size={15} className="mt-0.5 shrink-0" />{movimento.bloqueio}</p>
        )}
      </div>
    </ModalShell>
  )
}
