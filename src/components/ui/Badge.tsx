import { AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type StatusOrcamento =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

type TipoProduto = 'Produto' | 'Produto Base' | 'Customização'

interface StatusBadgeProps {
  status: StatusOrcamento
  size?: 'sm' | 'md'
}

interface TipoProdutoBadgeProps {
  tipo: TipoProduto
  size?: 'sm' | 'md'
}

const STATUS_META: Record<StatusOrcamento, { bg: string; fg: string; dot: string }> = {
  'Rascunho':         { bg: '#F1F0EC', fg: '#7C786F', dot: '#A8A49C' },
  'Enviado':          { bg: '#EAF1FB', fg: '#2A6FB0', dot: '#3A86CE' },
  'Aprovado':         { bg: '#EAF7EF', fg: '#3E9D5A', dot: '#54B36F' },
  'Aguardando Sinal': { bg: '#FFF8EC', fg: '#B07A1F', dot: '#E0A030' },
  'Sinal Pago':       { bg: '#FFF1E8', fg: '#C8721F', dot: '#F97316' },
  'Em Produção':      { bg: '#FFF1E8', fg: '#C8721F', dot: '#F97316' },
  'Finalizado':       { bg: '#E7F4F1', fg: '#1F7A6F', dot: '#2A9D8F' },
  'Entregue':         { bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F' },
  'Pago':             { bg: '#E2F0E6', fg: '#176B43', dot: '#1F8A5B' },
  'Cancelado':        { bg: '#FCF0EC', fg: '#C0492B', dot: '#D06A4E' },
}

const TIPO_META: Record<TipoProduto, { bg: string; fg: string }> = {
  'Produto':      { bg: '#E9F1F9', fg: '#3A6FA0' },
  'Produto Base': { bg: '#EFEDE9', fg: '#6B6860' },
  'Customização': { bg: 'rgba(42,157,143,0.14)', fg: '#2A9D8F' },
}

const badgeSize = {
  sm: 'h-6 px-[9px] text-[11.5px]',
  md: 'h-7 px-[11px] text-[12.5px]',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold', badgeSize[size])}
      style={{ background: meta.bg, color: meta.fg }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: meta.dot }} />
      {status}
    </span>
  )
}

export function TipoProdutoBadge({ tipo, size = 'md' }: TipoProdutoBadgeProps) {
  const meta = TIPO_META[tipo]
  return (
    <span
      className={clsx('inline-flex items-center whitespace-nowrap rounded-full font-semibold', badgeSize[size])}
      style={{ background: meta.bg, color: meta.fg }}
    >
      {tipo}
    </span>
  )
}

export function VencidoBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-[5px] whitespace-nowrap rounded-full bg-[#FCF0EC] px-[9px] text-[11.5px] font-semibold text-danger">
      <AlertCircle size={12} className="text-danger" />
      Vencido
    </span>
  )
}
