import { useState, useEffect } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { CheckCircle2 } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import type { ProducaoDetalhe } from '../../types/producao'

interface Props {
  producaoId: string
  producao?: ProducaoDetalhe
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

export default function FinalizarProducaoModal({ producaoId, producao: producaoProp, onClose, onSuccess }: Props) {
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(producaoProp ?? null)
  const [carregando, setCarregando] = useState(!producaoProp)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (producaoProp) return
    producaoService.buscarPorId(producaoId)
      .then(setProducao)
      .catch(() => setErro('Não foi possível carregar a produção.'))
      .finally(() => setCarregando(false))
  }, [producaoId, producaoProp])

  const handleConfirmar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await producaoService.finalizar(producaoId)
      onSuccess('Produção finalizada — estoque atualizado.')
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao finalizar produção.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Finalizar produção"
      icon={<CheckCircle2 size={18} />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={carregando || salvando || !producao} onClick={handleConfirmar}>
            {salvando ? 'Finalizando...' : 'Confirmar finalização'}
          </Button>
        </>
      }
    >
      {carregando || !producao ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          <p className="mb-3 mt-0 text-[13.5px] text-body">Estes produtos serão adicionados ao estoque:</p>
          <div className="flex flex-col gap-2.5">
            {producao.produtos.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-[10px] border border-line bg-[#FCFBF9] px-3.5 py-3">
                <span className="text-sm font-medium text-dark">{p.nomeProduto}</span>
                <span className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">×{p.quantidade}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {erro && <div className="mt-2 text-[13px] text-danger">{erro}</div>}
    </ModalShell>
  )
}
