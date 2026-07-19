import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { isDivisaoResponse } from '../../types/producao'
import type { DivisaoResponse } from '../../types/producao'
import ModalDivisao from './ModalDivisao'

interface Props {
  producaoId: string
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

export default function RetormarProducaoModal({ producaoId, onClose, onSuccess }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aindaTravada, setAindaTravada] = useState(false)
  const [divisao, setDivisao] = useState<DivisaoResponse | null>(null)

  const handleRetomar = async (dividir: boolean) => {
    setSalvando(true)
    setErro(null)
    try {
      const result = await producaoService.retomar(producaoId, dividir ? { dividir: true } : undefined)
      if (isDivisaoResponse(result)) {
        setDivisao(result)
      } else if (result.estado === 'EM_ANDAMENTO') {
        onSuccess('Produção retomada.')
      } else {
        setAindaTravada(true)
      }
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao retomar produção.')
    } finally {
      setSalvando(false)
    }
  }

  if (divisao) {
    return (
      <ModalDivisao
        producaoOriginal={divisao.producaoOriginal}
        producaoA={divisao.producaoA}
        producaoB={divisao.producaoB}
        onClose={() => onSuccess('Produção dividida.')}
      />
    )
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Retomar produção"
      icon={<RotateCcw size={18} />}
      footer={
        aindaTravada ? (
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button variant="primary" disabled={salvando} onClick={() => handleRetomar(true)}>
              {salvando ? 'Dividindo...' : 'Dividir mesmo assim'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={salvando} onClick={() => handleRetomar(false)}>
              {salvando ? 'Retomando...' : 'Confirmar retomada'}
            </Button>
          </>
        )
      }
    >
      {aindaTravada ? (
        <div className="flex items-start gap-2.5 rounded-input border border-danger/40 bg-danger-bg px-3.5 py-3 text-[13.5px] text-danger">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Insumos ainda bloqueantes — produção permanece travada.</span>
        </div>
      ) : (
        <p className="m-0 text-[13.5px] leading-[1.55] text-body">
          A produção voltará ao estado <strong>Em andamento</strong> caso os insumos estejam disponíveis.
        </p>
      )}
      {erro && <div className="mt-2 text-[13px] text-danger">{erro}</div>}
    </ModalShell>
  )
}
