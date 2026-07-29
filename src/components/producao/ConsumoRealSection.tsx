import { Package } from 'lucide-react'
import type { ProducaoDetalhe } from '../../types/producao'

export function chaveConsumo(item: ProducaoDetalhe['insumosConsumidos'][number]): string {
  return item.produtoBaseId || item.insumoId || ''
}

interface Props {
  insumosConsumidos: ProducaoDetalhe['insumosConsumidos']
  valores: Record<string, number>
  onChange: (chave: string, valor: number) => void
  titulo?: string
}

export default function ConsumoRealSection({ insumosConsumidos, valores, onChange, titulo }: Props) {
  if (insumosConsumidos.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      {titulo && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-body">
          <Package size={15} className="text-teal" /> {titulo}
        </div>
      )}
      {insumosConsumidos.map((item, i) => {
        const chave = chaveConsumo(item)
        const fracionavel = item.fracionavel ?? true
        const valor = valores[chave] ?? item.quantidade
        return (
          <div key={chave || i} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-cream px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-dark">{item.nomeInsumo || '—'}</div>
              <div className="text-[12.5px] text-muted">Baixado: {item.quantidade} {item.unidadeMedida || 'un'}</div>
            </div>
            <input
              type="number"
              min={0}
              max={item.quantidade}
              step={fracionavel ? '0.001' : '1'}
              value={valor}
              onChange={e => {
                const raw = parseFloat(e.target.value)
                onChange(chave, isNaN(raw) ? 0 : Math.max(raw, 0))
              }}
              className="h-11 w-[100px] flex-shrink-0 rounded-input border-[1.5px] border-line bg-white px-3 text-center font-[inherit] text-[14.5px] font-semibold text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </div>
        )
      })}
    </div>
  )
}
