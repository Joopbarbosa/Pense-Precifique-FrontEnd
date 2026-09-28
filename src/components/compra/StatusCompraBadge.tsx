import clsx from 'clsx'
import { STATUS_COMPRA_LABEL } from './formato'
import type { StatusCompra, StatusListaCompra } from '../../types/compra'

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

/** #596 (RN-NOVA-41) — status da lista de compras. */
export const STATUS_LISTA_LABEL: Record<StatusListaCompra, string> = {
  RASCUNHO: 'Rascunho',
  GERADA: 'Gerada',
  PARCIALMENTE_COMPRADA: 'Parcialmente comprada',
  COMPRADA: 'Comprada',
  CANCELADA: 'Cancelada',
}

const COR_LISTA: Record<StatusListaCompra, { pill: string; dot: string }> = {
  RASCUNHO: { pill: 'bg-line-soft text-subtle', dot: 'bg-dim' },
  GERADA: { pill: 'bg-azul/10 text-azul', dot: 'bg-azul' },
  PARCIALMENTE_COMPRADA: { pill: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  COMPRADA: { pill: 'bg-success-bg text-success', dot: 'bg-success' },
  CANCELADA: { pill: 'bg-danger-bg text-danger', dot: 'bg-danger' },
}

export function StatusListaBadge({ status, size = 'md' }: { status: StatusListaCompra; size?: 'sm' | 'md' }) {
  return (
    <span data-testid="status-lista" className={clsx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
      size === 'sm' ? 'h-6 px-[9px] text-[11.5px]' : 'h-7 px-[11px] text-[12.5px]',
      COR_LISTA[status].pill
    )}>
      <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', COR_LISTA[status].dot)} />
      {STATUS_LISTA_LABEL[status]}
    </span>
  )
}
