import { AlertCircle, RefreshCw } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

interface RetryCooldownModalProps {
  open: boolean
  mensagem: string
  cooldownRestante: number
  executando: boolean
  onTentarNovamente: () => void
  onClose: () => void
}

/** RN-NOVA-3 — UI compartilhada por preview e download de PDF do orçamento. */
export default function RetryCooldownModal({
  open,
  mensagem,
  cooldownRestante,
  executando,
  onTentarNovamente,
  onClose,
}: RetryCooldownModalProps) {
  const bloqueado = cooldownRestante > 0 || executando

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Não foi possível gerar o documento"
      icon={<AlertCircle size={18} />}
      iconBg="rgba(192,73,43,0.10)"
      iconColor="#C0492B"
      width={420}
      footer={
        <Button
          variant="primary"
          icon={executando ? <Spinner size={15} /> : <RefreshCw size={15} />}
          disabled={bloqueado}
          onClick={onTentarNovamente}
        >
          {executando
            ? 'Tentando...'
            : cooldownRestante > 0
              ? `Tente novamente em ${cooldownRestante}s`
              : 'Tentar novamente'}
        </Button>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.55] text-body">{mensagem}</p>
    </ModalShell>
  )
}
