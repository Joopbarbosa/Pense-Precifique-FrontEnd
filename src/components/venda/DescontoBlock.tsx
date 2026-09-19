import SegmentedControl from '../ui/SegmentedControl'
import { BRL } from './formato'

/**
 * Bloco de desconto do resumo da venda (Orçamento e Caixa).
 *
 * O símbolo exibido ('%' | 'R$') é conceito distinto do valor aceito pela API (enum TipoDesconto
 * do backend) — a conversão fica em quem chama, nunca aqui.
 */
export default function DescontoBlock({ tipo, valor, onTipo, onValor, descontoAplicado }: {
  tipo: '%' | 'R$'
  valor: string
  onTipo: (v: '%' | 'R$') => void
  onValor: (v: string) => void
  descontoAplicado: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14.5px] text-body">Desconto</span>
        <span className="text-[14.5px] font-semibold text-danger [font-variant-numeric:tabular-nums]">− {BRL(descontoAplicado)}</span>
      </div>
      <div className="flex gap-2">
        <SegmentedControl
          options={[{ value: '%', label: '%' }, { value: 'R$', label: 'R$' }]}
          value={tipo}
          onChange={onTipo}
          height="h-[42px]"
          optionWidth="w-[42px]"
          textSize="text-[13.5px]"
          className="flex-shrink-0"
        />
        <input
          value={valor}
          onChange={e => onValor(e.target.value.replace(/[^\d.,]/g, ''))}
          inputMode="decimal" placeholder="0"
          className="h-[42px] min-w-0 flex-1 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
      </div>
    </div>
  )
}
