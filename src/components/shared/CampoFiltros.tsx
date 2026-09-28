import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ListFilter, Search, X } from 'lucide-react'
import Spinner from '../ui/Spinner'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

// V0.15.0 (#585, RN-NOVA-35) — campo único de filtros da modal de listagem: seleção múltipla agrupada
// por tipo, com os escolhidos como etiquetas (cada uma com X). Tipos diferentes somam como E; valores do
// mesmo tipo, como OU — quem monta a consulta é a tela dona do campo.

export interface FiltroEscolhido {
  grupo: string
  valor: string
  rotulo: string
}

export interface GrupoFiltro {
  id: string
  rotulo: string
  /** Opções fixas (Status, Pagamento…). */
  opcoes?: { valor: string; rotulo: string }[]
  /** Opções buscadas (Insumo, Fornecedor): mostra uma busca dentro do grupo. */
  buscar?: (termo: string) => Promise<{ valor: string; rotulo: string }[]>
}

export default function CampoFiltros({ grupos, escolhidos, onChange }: {
  grupos: GrupoFiltro[]
  escolhidos: FiltroEscolhido[]
  onChange: (f: FiltroEscolhido[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false) } }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc, true) }
  }, [aberto])

  const marcado = (grupo: string, valor: string) => escolhidos.some(f => f.grupo === grupo && f.valor === valor)
  const alternar = (grupo: string, valor: string, rotulo: string) => onChange(marcado(grupo, valor)
    ? escolhidos.filter(f => !(f.grupo === grupo && f.valor === valor))
    : [...escolhidos, { grupo, valor, rotulo }])
  const rotuloGrupo = (id: string) => grupos.find(g => g.id === id)?.rotulo ?? id

  return (
    <div ref={raiz} className="relative">
      <div data-testid="campo-filtros" onClick={() => setAberto(true)}
        className={clsx('flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-input border-[1.5px] bg-white px-2 py-1.5 transition-[border-color,box-shadow]',
          aberto ? 'border-teal ring-4 ring-teal/focus' : 'border-line')}>
        <ListFilter size={15} className="ml-1 flex-shrink-0 text-muted" />
        {escolhidos.length === 0 && <span className="px-1 text-[13px] text-faint">Filtrar por…</span>}
        {escolhidos.map(f => (
          <span key={`${f.grupo}:${f.valor}`} data-testid="chip-filtro"
            className="inline-flex h-7 items-center gap-1 rounded-full bg-teal/10 pl-2.5 pr-1 text-[12.5px] font-semibold text-teal">
            <span className="font-medium text-teal/80">{rotuloGrupo(f.grupo)}:</span> {f.rotulo}
            <button type="button" aria-label={`Tirar filtro ${rotuloGrupo(f.grupo)}: ${f.rotulo}`}
              onClick={e => { e.stopPropagation(); alternar(f.grupo, f.valor, f.rotulo) }}
              className="grid h-5 w-5 cursor-pointer place-items-center rounded-full border-none bg-transparent text-teal hover:bg-teal/15">
              <X size={12} />
            </button>
          </span>
        ))}
        {escolhidos.length > 0 && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange([]) }}
            className="ml-auto cursor-pointer border-none bg-transparent px-1.5 font-[inherit] text-[12px] font-semibold text-muted hover:text-danger">
            Limpar
          </button>
        )}
      </div>

      {aberto && (
        <div role="listbox" aria-multiselectable="true" data-testid="painel-filtros"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[120] max-h-[340px] overflow-y-auto rounded-input border border-line bg-white p-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grupos.filter(g => g.opcoes || g.buscar).map(g => (
              <div key={g.id} className="min-w-0">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">{g.rotulo}</div>
                {g.opcoes && (
                  <div className="flex flex-wrap gap-1.5">
                    {g.opcoes.map(o => {
                      const on = marcado(g.id, o.valor)
                      return (
                        <button key={o.valor} type="button" role="option" aria-selected={on} onClick={() => alternar(g.id, o.valor, o.rotulo)}
                          className={clsx('inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-2.5 font-[inherit] text-[12.5px] font-semibold transition-colors',
                            on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
                          {on && <Check size={12} />} {o.rotulo}
                        </button>
                      )
                    })}
                  </div>
                )}
                {g.buscar && <BuscaGrupo grupo={g} marcado={v => marcado(g.id, v)} alternar={(v, r) => alternar(g.id, v, r)} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BuscaGrupo({ grupo, marcado, alternar }: {
  grupo: GrupoFiltro
  marcado: (valor: string) => boolean
  alternar: (valor: string, rotulo: string) => void
}) {
  const [termo, setTermo] = useState('')
  const q = useDebouncedValue(termo)
  const [opcoes, setOpcoes] = useState<{ valor: string; rotulo: string }[] | null>(null)

  useEffect(() => {
    let vivo = true
    setOpcoes(null)
    grupo.buscar!(q.trim()).then(r => { if (vivo) setOpcoes(r.slice(0, 8)) }).catch(() => { if (vivo) setOpcoes([]) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, grupo.id])

  return (
    <div>
      <label className="relative block">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={termo} onChange={e => setTermo(e.target.value)} aria-label={`Buscar ${grupo.rotulo.toLowerCase()}`}
          placeholder={`Buscar ${grupo.rotulo.toLowerCase()}…`}
          className="h-8 w-full rounded-input border-[1.5px] border-line bg-white pl-7 pr-2 font-[inherit] text-[12.5px] text-dark outline-none focus:border-teal" />
      </label>
      <div className="mt-1.5 flex flex-col">
        {opcoes === null ? (
          <div className="flex items-center gap-2 px-1 py-1.5 text-[12px] text-muted"><Spinner size={12} color="#2A9D8F" trackColor="#EFEDE8" /> Buscando…</div>
        ) : opcoes.length === 0 ? (
          <div className="px-1 py-1.5 text-[12px] text-muted">Nada encontrado.</div>
        ) : opcoes.map(o => {
          const on = marcado(o.valor)
          return (
            <button key={o.valor} type="button" role="option" aria-selected={on} onClick={() => alternar(o.valor, o.rotulo)}
              className={clsx('flex cursor-pointer items-center gap-2 rounded-[7px] border-none px-2 py-1.5 text-left font-[inherit] text-[12.5px]',
                on ? 'bg-teal/10 font-semibold text-teal' : 'bg-transparent text-body hover:bg-cream')}>
              <span className={clsx('grid h-4 w-4 flex-shrink-0 place-items-center rounded-[4px] border-[1.5px]', on ? 'border-teal bg-teal text-white' : 'border-line')}>
                {on && <Check size={10} strokeWidth={3} />}
              </span>
              <span className="truncate">{o.rotulo}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
