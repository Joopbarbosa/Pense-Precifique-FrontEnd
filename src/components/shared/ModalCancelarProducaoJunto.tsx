import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Factory, AlertTriangle } from 'lucide-react'
import { getBadgeEstado } from '../../utils/badges'
import type { VinculoPendente } from '../../utils/vinculoCancelamento'

// RN-NOVA-40 (V0.18.0, #1167) — ao cancelar o orçamento, uma pergunta por produção vinculada ainda
// aberta: "Cancelar também a produção PRD-N?". Substitui a janela "Desfazer vínculo?" / "Manter o
// produto sendo produzido?" neste fluxo (o orçamento cancelado sempre se desvincula).
//
// Nenhuma chamada de API aqui: as respostas são só coletadas e seguem junto com o cancelamento
// (decisoesProducao). Fechar pelo X equivale a "Não, manter a produção". O aviso de insumo
// consumido é AVISO e nunca bloqueia.

interface Props {
  fila: VinculoPendente[]
  onConcluir: (decisoes: Record<string, boolean>) => void
}

const ESTADOS_COM_INSUMO_CONSUMIDO = ['EM_ANDAMENTO', 'TRAVADA']

export default function ModalCancelarProducaoJunto({ fila, onConcluir }: Props) {
  const [indice, setIndice] = useState(0)
  const [decisoes, setDecisoes] = useState<Record<string, boolean>>({})

  const item = fila[indice]
  if (!item) return null

  const responder = (cancelar: boolean) => {
    const proximas = { ...decisoes, [item.producaoId]: cancelar }
    if (indice + 1 >= fila.length) {
      onConcluir(proximas)
      return
    }
    setDecisoes(proximas)
    setIndice(i => i + 1)
  }

  const comInsumoConsumido = ESTADOS_COM_INSUMO_CONSUMIDO.includes(item.estadoProducao)
  const progresso = fila.length > 1 ? `Produção ${indice + 1} de ${fila.length}` : undefined

  return (
    <ModalShell
      open
      onClose={() => responder(false)}
      title={`Cancelar também a produção ${item.rotuloOutroLado}?`}
      subtitle={progresso}
      icon={<Factory size={18} />}
      iconBg="rgba(249,115,22,0.10)"
      iconColor="#F97316"
      closeLabel="Fechar"
      footer={
        <>
          <Button variant="ghost" onClick={() => responder(false)}>Não, manter a produção</Button>
          <Button variant="danger" onClick={() => responder(true)}>Sim, cancelar a produção</Button>
        </>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.6] text-body">
        Este orçamento será cancelado e deixa de estar vinculado à produção{' '}
        <strong>{item.rotuloOutroLado}</strong> ({getBadgeEstado(item.estadoProducao).label.toLowerCase()}).
        Se mantiver a produção, ela continua sem orçamento vinculado.
      </p>
      {comInsumoConsumido && (
        <div className="mt-3 flex items-start gap-2.5 rounded-input border border-danger/40 bg-danger-bg px-3.5 py-3 text-[13px] leading-normal text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Os insumos já consumidos não voltam ao estoque se a produção for cancelada.</span>
        </div>
      )}
    </ModalShell>
  )
}
