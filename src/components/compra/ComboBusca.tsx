import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { AlertCircle, RotateCw, Search } from 'lucide-react'
import Spinner from '../ui/Spinner'
import OpcaoInativa from '../shared/OpcaoInativa'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

/**
 * Busca com painel de resultados (V0.15.0, Compras) — mesmo comportamento de `ClienteSelect`:
 * busca ao focar, debounce de 300ms com guard `debouncedQ !== q` (#357), estados carregando/vazio/erro
 * com "Tentar de novo" (#342). Genérico para servir insumo e fornecedor nas telas de Compras.
 * `inativo` (#583/#616, RN-NOVA-40): o item aparece riscado com "Inativo" e não pode ser escolhido.
 */
export default function ComboBusca<T>({ buscar, onSelect, getKey, renderItem, placeholder, vazio, size = 'md', autoFocus, ariaLabel, inativo }: {
  buscar: (termo: string) => Promise<T[]>
  onSelect: (item: T) => void
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  placeholder: string
  vazio: string
  size?: 'sm' | 'md'
  autoFocus?: boolean
  ariaLabel?: string
  inativo?: (item: T) => boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [itens, setItens] = useState<T[]>([])
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando')
  const [tentativa, setTentativa] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debouncedQ = useDebouncedValue(q, 300)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open || debouncedQ !== q) return
    let cancelado = false
    setEstado('carregando')
    buscar(debouncedQ.trim())
      .then(r => { if (!cancelado) { setItens(r); setEstado('pronto') } })
      .catch(() => { if (!cancelado) { setItens([]); setEstado('erro') } })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, open, q, tentativa])

  const painel = 'absolute inset-x-0 z-30 mt-1.5 rounded-xl border border-line bg-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]'

  return (
    <div ref={wrapRef} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
        <Search size={size === 'sm' ? 16 : 18} />
      </span>
      <input
        value={q}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-input border-[1.5px] border-line bg-white pr-3.5 font-[inherit] text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus',
          size === 'sm' ? 'h-11 pl-10 text-sm' : 'h-12 pl-[42px] text-[14.5px]'
        )}
      />
      {open && estado === 'erro' && (
        <div role="alert" className={clsx(painel, 'flex flex-wrap items-center justify-between gap-2 border-[#F2D8CF] bg-danger-bg px-4 py-3 text-[13.5px] text-danger-deep')}>
          <span className="flex items-center gap-2"><AlertCircle size={16} /> Não foi possível carregar.</span>
          <button type="button" onClick={() => setTentativa(t => t + 1)}
            className="inline-flex items-center gap-1.5 border-none bg-transparent font-[inherit] text-[13px] font-semibold text-teal">
            <RotateCw size={14} /> Tentar de novo
          </button>
        </div>
      )}
      {open && estado === 'carregando' && itens.length === 0 && (
        <div role="status" className={clsx(painel, 'flex items-center gap-2.5 px-4 py-3.5 text-sm text-muted')}>
          <Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Buscando…
        </div>
      )}
      {open && estado === 'pronto' && itens.length === 0 && (
        <div role="status" className={clsx(painel, 'px-4 py-3.5 text-sm text-muted')}>{vazio}</div>
      )}
      {open && estado !== 'erro' && itens.length > 0 && (
        <div className={clsx(painel, 'max-h-[320px] overflow-y-auto p-1.5')}>
          {itens.map(item => inativo?.(item) ? (
            <OpcaoInativa key={getKey(item)}>{renderItem(item)}</OpcaoInativa>
          ) : (
            <button
              key={getKey(item)}
              type="button"
              data-search-row
              onClick={() => { onSelect(item); setOpen(false); setQ('') }}
              className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
