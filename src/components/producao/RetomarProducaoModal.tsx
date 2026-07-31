import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { isDivisaoResponse, isConfirmacaoEstoqueNegativoResponse } from '../../types/producao'
import type { DivisaoResponse, ProducaoDetalhe, ConfirmacaoEstoqueNegativoResponse, AvisoEstoqueNegativo } from '../../types/producao'
import ModalDivisao from './ModalDivisao'
import ConfirmarEstoqueNegativoModal from './ConfirmarEstoqueNegativoModal'
import { extractApiError } from '../../utils/apiError'

interface Props {
  producaoId: string
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

export default function RetomarProducaoModal({ producaoId, onClose, onSuccess }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aindaTravada, setAindaTravada] = useState(false)
  const [divisao, setDivisao] = useState<DivisaoResponse | null>(null)
  const [avisoPendente, setAvisoPendente] = useState<AvisoEstoqueNegativo[] | null>(null)
  const [ultimoDividir, setUltimoDividir] = useState(false)
  const [confirmandoAviso, setConfirmandoAviso] = useState(false)

  const tratarResultado = (result: ProducaoDetalhe | DivisaoResponse | ConfirmacaoEstoqueNegativoResponse, dividir: boolean) => {
    if (isConfirmacaoEstoqueNegativoResponse(result)) {
      setAvisoPendente(result.avisos)
      setUltimoDividir(dividir)
    } else if (isDivisaoResponse(result)) {
      setDivisao(result)
    } else if (result.estado === 'EM_ANDAMENTO') {
      onSuccess('Produção retomada.')
    } else {
      setAindaTravada(true)
    }
  }

  const handleRetomar = async (dividir: boolean) => {
    setSalvando(true)
    setErro(null)
    try {
      const result = await producaoService.retomar(producaoId, dividir ? { dividir: true } : undefined)
      tratarResultado(result, dividir)
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao retomar produção.'))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarAviso = async () => {
    if (!avisoPendente) return
    setConfirmandoAviso(true)
    setErro(null)
    try {
      const confirmarEstoqueNegativoInsumoIds = avisoPendente.map(a => a.componenteId)
      const result = await producaoService.retomar(
        producaoId,
        ultimoDividir ? { dividir: true, confirmarEstoqueNegativoInsumoIds } : { confirmarEstoqueNegativoInsumoIds }
      )
      setAvisoPendente(null)
      tratarResultado(result, ultimoDividir)
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao retomar produção.'))
    } finally {
      setConfirmandoAviso(false)
    }
  }

  if (avisoPendente) {
    return (
      <ConfirmarEstoqueNegativoModal
        avisos={avisoPendente}
        confirming={confirmandoAviso}
        onClose={() => setAvisoPendente(null)}
        onConfirm={handleConfirmarAviso}
      />
    )
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
      /* Duplicidade de nome acessível só existe quando `aindaTravada` mostra o botão de rodapé
         "Fechar" (mesmo texto do X do header) — no outro estado o rodapé usa "Cancelar". */
      closeLabel={aindaTravada ? 'Fechar modal de retomada' : undefined}
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
