import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import TextArea from '../ui/TextArea'
import { Ban, AlertCircle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { extractApiError } from '../../utils/apiError'

interface Props {
  producaoId: string
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

const MIN_CHARS = 30

export default function CancelarProducaoModal({ producaoId, onClose, onSuccess }: Props) {
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const len = justificativa.length
  const valido = len >= MIN_CHARS

  const handleConfirmar = async () => {
    if (!valido) return
    setSalvando(true)
    setErro(null)
    try {
      await producaoService.cancelar(producaoId, { justificativa })
      onSuccess('Produção cancelada')
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao cancelar produção.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Cancelar produção"
      icon={<Ban size={18} />}
      iconBg="#FCF0EC"
      iconColor="#C0492B"
      closeLabel="Fechar modal de cancelamento"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="danger" disabled={!valido || salvando} onClick={handleConfirmar}>
            {salvando ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </>
      }
    >
      <p className="m-0 mb-4 text-[13.5px] leading-[1.55] text-body">Esta ação não pode ser desfeita.</p>
      <label className="block">
        <span className="mb-[7px] flex items-center text-[13px] font-semibold text-body">
          <span>Justificativa <span className="text-orange">*</span></span>
        </span>
        <TextArea
          value={justificativa}
          onChange={setJustificativa}
          rows={4}
          minimo={MIN_CHARS}
          textSize="text-sm"
          placeholder="Descreva o motivo do cancelamento..."
        />
      </label>
      {erro && (
        <div className="mt-2 flex items-center gap-[5px] text-[13px] text-danger">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}
