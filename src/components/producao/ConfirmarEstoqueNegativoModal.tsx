import { AlertTriangle } from 'lucide-react'
import ConfirmacaoModal from '../shared/ConfirmacaoModal'
import type { AvisoEstoqueNegativo } from '../../types/producao'

interface Props {
  avisos: AvisoEstoqueNegativo[]
  confirming: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ConfirmarEstoqueNegativoModal({ avisos, confirming, onClose, onConfirm }: Props) {
  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      title="Estoque insuficiente"
      description="Um ou mais insumos ficarão com estoque negativo com essa baixa. Deseja confirmar mesmo assim?"
      icon={<AlertTriangle size={18} />}
      variant="danger"
      confirmLabel="Confirmar mesmo assim"
      confirmingLabel="Confirmando..."
      cancelLabel="Cancelar"
      confirming={confirming}
    >
      <div className="flex flex-col gap-2">
        {avisos.map(a => (
          <div
            key={a.componenteId}
            className="flex items-start gap-2.5 rounded-input border border-orange/30 bg-orange/[0.08] px-3.5 py-3 text-[13.5px] text-[#A35A26]"
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{a.mensagem}</span>
          </div>
        ))}
      </div>
    </ConfirmacaoModal>
  )
}
