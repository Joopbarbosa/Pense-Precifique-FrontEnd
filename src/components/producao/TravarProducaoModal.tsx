import { useState } from 'react'
import clsx from 'clsx'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
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
        <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
          <span>Justificativa <span className="text-orange">*</span></span>
          <span className={clsx('font-normal', valido ? 'text-[#3E9D5A]' : 'text-muted')}>
            {len}/{MIN_CHARS} mín.
          </span>
        </span>
        <textarea
          value={justificativa}
          onChange={e => setJustificativa(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo da trava..."
          className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
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
