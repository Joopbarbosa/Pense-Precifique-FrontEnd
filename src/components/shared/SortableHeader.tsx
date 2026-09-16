import clsx from 'clsx'
import { ArrowUp, ArrowDown } from 'lucide-react'

// #351 (V0.11.0) — extraído de ListaOrcamentosPage.tsx/ListaProducaoPage.tsx (corpo idêntico) e
// ListaCatalogosPage.tsx (mesma regra, reescrita com ícone único+rotate em vez de ArrowUp/ArrowDown
// trocados — unificado aqui pro visual ficar igual nas 3 listagens).
interface SortableHeaderProps<F extends string> {
  label: string
  field: F
  activeField: F | null
  dir: 'asc' | 'desc'
  onSort: (field: F) => void
}

export default function SortableHeader<F extends string>({ label, field, activeField, dir, onSort }: SortableHeaderProps<F>) {
  const ativo = activeField === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={clsx(
        'flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-[inherit] text-[11.5px] font-semibold uppercase tracking-[0.04em] transition-colors duration-100',
        ativo ? 'text-body' : 'text-faint hover:text-body'
      )}
    >
      {label}
      {ativo && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  )
}
