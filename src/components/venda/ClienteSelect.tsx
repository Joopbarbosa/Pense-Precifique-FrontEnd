import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Phone, Search } from 'lucide-react'
import { clienteService } from '../../services/clienteService'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { ClienteResponse } from '../../types/cliente'

/**
 * Busca + seleção de cliente — usado por Orçamento e Caixa (#502, V0.12.0). Extraído de
 * `CriarOrcamentoPage.tsx` (função local `ClienteSelect`, OpenProject #243) sem mudança de
 * comportamento — mesma paridade "busca dispara ao focar, mesmo sem digitar" (ORC-030) e mesma
 * calibragem de altura via `[data-search-row]` do `ItemSearch`.
 */
export default function ClienteSelect({ cliente, onSelect, onClear }: {
  cliente: ClienteResponse | null
  onSelect: (c: ClienteResponse) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ClienteResponse[]>([])
  const [maxHeight, setMaxHeight] = useState<number>()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const debouncedQ = useDebouncedValue(q, 300)
  useEffect(() => {
    // #357 (correção) — guard contra fetch prematuro: ver nota completa em NovaProducaoPage.tsx.
    if (!open || debouncedQ !== q) return
    const load = async () => {
      try {
        const data = await clienteService.listar(0, 20, debouncedQ.trim() || undefined)
        setResults(data.content)
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
        setResults([])
      }
    }
    load()
  }, [debouncedQ, open, q])

  // Altura do painel calculada a partir da posição real da 8ª linha (ver ItemSearch) — imune ao
  // scale(0.92→1) do animate-pop.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    el.scrollTop = 0
    const linhas = el.querySelectorAll<HTMLElement>('[data-search-row]')
    if (linhas.length <= 8) {
      setMaxHeight(undefined)
      return
    }
    const oitava = linhas[7]
    setMaxHeight(Math.ceil(oitava.offsetTop + oitava.offsetHeight + 6))
  }, [results])

  if (cliente) {
    return (
      <div className="px-5 pb-5 pt-3.5">
        <div className="flex items-center gap-3.5 rounded-xl border border-teal/20 bg-teal/[0.07] px-4 py-3.5">
          <span className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-full bg-teal/[0.15] text-lg font-bold text-teal">
            {cliente.nome.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15.5px] font-semibold text-dark">{cliente.nome}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-body">
              <Phone size={16} className="text-teal" /> {cliente.whatsapp || 'Sem telefone'}
            </div>
          </div>
          <button onClick={onClear} className="flex-shrink-0 cursor-pointer border-none bg-transparent px-2 py-1.5 text-[13px] font-semibold text-teal">
            Trocar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 pt-3.5">
      <div ref={wrapRef} className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
          <Search size={18} />
        </span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Selecionar cliente..."
          className="h-12 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
        {open && results.length > 0 && (
          <div
            ref={panelRef}
            style={maxHeight != null ? { maxHeight } : undefined}
            className="absolute inset-x-0 top-[54px] z-30 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]"
          >
            {results.map(c => (
              <button
                key={c.id}
                data-search-row
                onClick={() => { onSelect(c); setOpen(false); setQ('') }}
                className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-teal/[0.12] font-bold text-teal">
                  {c.nome.charAt(0)}
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold text-dark">{c.nome}</div>
                  <div className="text-[12.5px] text-muted">{c.whatsapp || 'Sem telefone'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
