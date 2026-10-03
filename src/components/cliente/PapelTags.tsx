import { Tag } from '../ui'
import type { ClienteResponse } from '../../types/cliente'

/** V0.15.0 (#536/#537) — papéis do cadastro único: Cliente (verde) e Fornecedor (laranja). */
export function PapelTags({ cliente, size = 'sm' }: {
  cliente: Pick<ClienteResponse, 'ehCliente' | 'ehFornecedor'>
  size?: 'sm' | 'md'
}) {
  return (
    <>
      {cliente.ehCliente && <Tag tone="green" size={size}>Cliente</Tag>}
      {cliente.ehFornecedor && <Tag tone="orange" size={size}>Fornecedor</Tag>}
    </>
  )
}

/** Badge "Inativo" do cadastro (#538) — mesmo tom de perigo suave da lista e do detalhe. */
export function InativoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={size === 'md'
      ? 'inline-flex h-7 items-center whitespace-nowrap rounded-full bg-danger-bg px-[11px] text-[12.5px] font-semibold text-danger'
      : 'inline-flex h-6 items-center whitespace-nowrap rounded-full bg-danger-bg px-[9px] text-[11.5px] font-semibold text-danger'}>
      Inativo
    </span>
  )
}
