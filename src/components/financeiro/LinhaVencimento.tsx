import clsx from 'clsx'
import Button from '../ui/Button'
import { BRL } from '../venda/formato'
import { formatarData } from '../../utils/data'
import { podeBaixar, rotuloAcaoBaixa, rotuloUrgencia, urgenciaVencimento } from '../../utils/financeiro'
import type { ParcelaFinanceira } from '../../types/financeiro'

const COR = {
  VENCIDA: 'border-danger-line bg-danger-bg text-danger-deep',
  HOJE: 'border-line bg-white text-dark',
  PROXIMA: 'border-line bg-white text-dark',
} as const

/** PP-524 (RN-NOVA-21) — linha de vencimento: cor por urgência sempre acompanhada de texto, com atalho de baixa. */
export default function LinhaVencimento({ parcela, onBaixar }: { parcela: ParcelaFinanceira; onBaixar: (p: ParcelaFinanceira) => void }) {
  const urgencia = urgenciaVencimento(parcela)
  return (
    <li data-testid="linha-vencimento" data-urgencia={urgencia}
      className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input border px-3 py-2', COR[urgencia])}>
      <div className="min-w-[160px] flex-1">
        <div className="text-[14px] font-semibold">{parcela.descricao}</div>
        <div className="text-[12.5px] text-muted">
          {parcela.tipo === 'A_PAGAR' ? 'A pagar' : 'A receber'} · vence {formatarData(parcela.vencimento)}
        </div>
      </div>
      <span className={clsx('text-[12.5px] font-semibold', urgencia === 'VENCIDA' ? 'text-danger-deep' : 'text-muted')}>{rotuloUrgencia(parcela)}</span>
      <span className="w-24 text-right text-[14px] font-bold [font-variant-numeric:tabular-nums]">{BRL(parcela.valor)}</span>
      {podeBaixar(parcela) && <Button size="sm" onClick={() => onBaixar(parcela)}>{rotuloAcaoBaixa(parcela.tipo)}</Button>}
    </li>
  )
}
