import { AlertTriangle } from 'lucide-react'
import ConfirmacaoModal from '../shared/ConfirmacaoModal'
import type { AvisoEstoqueNegativo, VinculoOrfaoResumo } from '../../types/producao'

interface Props {
  avisos: AvisoEstoqueNegativo[]
  /** ORC-047 (#398) — produções vinculadas ao orçamento que foram canceladas ou não realizadas. */
  vinculosOrfaos?: VinculoOrfaoResumo[]
  confirming: boolean
  onClose: () => void
  onConfirm: () => void
}

const ESTADO_ORFAO: Record<VinculoOrfaoResumo['estado'], string> = {
  CANCELADA: 'cancelada',
  NAO_REALIZADA: 'não realizada',
}

export default function ConfirmarEstoqueNegativoModal({ avisos, vinculosOrfaos = [], confirming, onClose, onConfirm }: Props) {
  const temOrfao = vinculosOrfaos.length > 0
  const temEstoque = avisos.length > 0
  const titulo = temOrfao && !temEstoque ? 'Produção vinculada cancelada' : 'Estoque insuficiente'
  const descricao = temOrfao
    ? temEstoque
      ? 'Há produção vinculada que não vai acontecer e insumos que ficarão com estoque negativo. Deseja continuar mesmo assim?'
      : 'Este orçamento tem produção vinculada que não vai acontecer. Deseja finalizar mesmo assim?'
    : 'Um ou mais insumos ficarão com estoque negativo com essa baixa. Deseja confirmar mesmo assim?'
  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      title={titulo}
      description={descricao}
      icon={<AlertTriangle size={18} />}
      variant="danger"
      confirmLabel={temOrfao ? 'Continuar mesmo assim' : 'Confirmar mesmo assim'}
      confirmingLabel="Confirmando..."
      cancelLabel="Cancelar"
      confirming={confirming}
    >
      <div className="flex flex-col gap-2">
        {vinculosOrfaos.map(v => (
          <div
            key={v.id}
            className="flex items-start gap-2.5 rounded-input border border-orange/30 bg-orange/8 px-3.5 py-3 text-[13.5px] text-warning-alt"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{v.identificador} {ESTADO_ORFAO[v.estado]}</span>
          </div>
        ))}
        {avisos.map(a => (
          <div
            key={a.componenteId}
            className="flex items-start gap-2.5 rounded-input border border-orange/30 bg-orange/8 px-3.5 py-3 text-[13.5px] text-warning-alt"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{a.mensagem}</span>
          </div>
        ))}
      </div>
    </ConfirmacaoModal>
  )
}
