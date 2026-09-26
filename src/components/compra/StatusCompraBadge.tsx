import clsx from 'clsx'
import { STATUS_COMPRA_LABEL } from './formato'
import type { StatusCompra } from '../../types/compra'

const COR: Record<StatusCompra, { pill: string; dot: string }> = {
  RASCUNHO: { pill: 'bg-line-soft text-subtle', dot: 'bg-dim' },
  CONFIRMADA: { pill: 'bg-success-bg text-success', dot: 'bg-success' },
  CANCELADA: { pill: 'bg-danger-bg text-danger', dot: 'bg-danger' },
}

export function StatusCompraBadge({ status, size = 'md' }: { status: StatusCompra; size?: 'sm' | 'md' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
      size === 'sm' ? 'h-6 px-[9px] text-[11.5px]' : 'h-7 px-[11px] text-[12.5px]',
      COR[status].pill
    )}>
      <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', COR[status].dot)} />
      {STATUS_COMPRA_LABEL[status]}
    </span>
  )
}

/** "Não paga" — só faz sentido em compra confirmada (rascunho ainda pode mudar). */
export function NaoPagaBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={clsx(
      'inline-flex items-center whitespace-nowrap rounded-full bg-warning-bg font-semibold text-warning',
      size === 'sm' ? 'h-6 px-[9px] text-[11.5px]' : 'h-7 px-[11px] text-[12.5px]'
    )}>
      Não paga
    </span>
  )
}
