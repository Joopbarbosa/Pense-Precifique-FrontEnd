import clsx from 'clsx'
import { SegmentedControl } from '../ui'
import type { TipoDesconto } from '../../types/compra'

// V0.15.0 (#576, RN-NOVA-28) — desconto da linha ou da nota: R$ ou %, e o valor. O cálculo que vale
// (desconto em R$, rateio da nota, preço pago) é do backend; aqui só a entrada.

const input = 'h-10 w-full min-w-0 rounded-input border-[1.5px] bg-white px-2.5 font-[inherit] text-sm text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus [font-variant-numeric:tabular-nums]'

export default function DescontoInput({ tipo, valor, onTipo, onValor, ariaLabel, invalido }: {
  tipo: TipoDesconto
  valor: string
  onTipo: (t: TipoDesconto) => void
  onValor: (v: string) => void
  ariaLabel: string
  invalido?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <SegmentedControl options={[{ value: 'PERCENTUAL' as const, label: '%' }, { value: 'VALOR' as const, label: 'R$' }]}
        value={tipo} onChange={onTipo} height="h-10" display="inline-flex" optionWidth="w-9" textSize="text-[12.5px]" />
      <input aria-label={ariaLabel} inputMode="decimal" value={valor} placeholder="0"
        onChange={e => onValor(e.target.value.replace(/[^\d.,]/g, ''))}
        className={clsx(input, invalido ? 'border-[#F2B8A6]' : 'border-line')} />
    </div>
  )
}
