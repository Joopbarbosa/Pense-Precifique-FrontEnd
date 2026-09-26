import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import TextArea from '../ui/TextArea'
import { PauseCircle, AlertCircle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { extractApiError } from '../../utils/apiError'

interface Props {
  producaoId: string
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

const MIN_CHARS = 30

export default function TravarProducaoModal({ producaoId, onClose, onSuccess }: Props) {
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
      await producaoService.travar(producaoId, justificativa)
      onSuccess('Produção travada.')
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao travar produção.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Travar produção"
      icon={<PauseCircle size={18} />}
      iconBg="#FFF1E8"
      iconColor="#C8721F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valido || salvando} onClick={handleConfirmar}>
            {salvando ? 'Travando...' : 'Confirmar trava'}
          </Button>
        </>
      }
    >
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
          placeholder="Descreva o motivo da trava..."
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
