import { useNavigate } from 'react-router-dom'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Split } from 'lucide-react'
import { getBadgeEstado } from '../../utils/badges'
import type { ProducaoDetalhe } from '../../types/producao'

interface Props {
  producaoOriginal: ProducaoDetalhe
  producaoA: ProducaoDetalhe
  producaoB: ProducaoDetalhe
  onClose: () => void
}

export default function ModalDivisao({ producaoOriginal, producaoA, producaoB, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Produção dividida"
      icon={<Split size={18} />}
      footer={
        <Button
          variant="primary"
          fullWidth
          onClick={() => { navigate('/producao'); onClose() }}
        >
          Ver produções
        </Button>
      }
    >
      <p className="m-0 mb-4 text-[13.5px] leading-[1.55] text-body">
        A produção <strong>{producaoOriginal.identificador}</strong> foi substituída por duas novas produções:
      </p>
      <div className="flex flex-col gap-2.5">
        {[producaoA, producaoB].map(p => {
          const badge = getBadgeEstado(p.estado, p.historicoStatus)
          return (
            <button
              key={p.id}
              onClick={() => { navigate(`/producao/${p.id}`); onClose() }}
              className="flex items-center justify-between rounded-[10px] border border-line bg-[#FCFBF9] px-3.5 py-3 text-left font-[inherit] transition-colors duration-100 hover:bg-line-soft"
            >
              <span className="text-sm font-semibold text-dark">{p.identificador}</span>
              <span
                className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold"
                style={{ background: badge.bg, color: badge.fg }}
              >
                {badge.label}
              </span>
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}
