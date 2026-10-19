import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import clsx from 'clsx'
import { HelpCircle } from 'lucide-react'
import { AJUDA, type IdAjuda, type ParteAjuda } from '../../constants/ajudaDashboards'

/**
 * V0.17.0 #998 (RN-NOVA-34) — botão "?" com o balão de explicação de um número, gráfico ou lista dos dashboards.
 * Abre ao clicar; fecha ao clicar fora ou com Esc; só um balão fica aberto por vez (estado compartilhado do módulo).
 * O texto vem do catálogo `constants/ajudaDashboards.ts`, pelo `id`.
 */

let abertoId: string | null = null
const ouvintes = new Set<() => void>()
const definirAberto = (id: string | null) => { abertoId = id; ouvintes.forEach(f => f()) }
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
const lerAberto = () => abertoId

const LARGURA_BALAO = 340
const ALTURA_BALAO = 380

function Parte({ p }: { p: ParteAjuda }) {
  return (
    <div className="flex flex-col gap-1.5">
      {p.nome && <div className="text-[12.5px] font-bold text-dark">{p.nome}</div>}
      <p className="m-0">{p.mostra}</p>
      {p.origem && <p className="m-0"><span className="font-semibold text-dark">De onde vem: </span>{p.origem}</p>}
      {p.conta && <p className="m-0"><span className="font-semibold text-dark">Conta: </span>{p.conta}</p>}
      {p.exemplo && <p className="m-0 rounded-md bg-cream px-2.5 py-1.5"><span className="font-semibold text-dark">Exemplo: </span>{p.exemplo}</p>}
    </div>
  )
}

export default function BotaoAjuda({ id, className }: { id: IdAjuda; className?: string }) {
  const texto = AJUDA[id]
  const aberto = useSyncExternalStore(assinar, lerAberto) === id
  const raiz = useRef<HTMLSpanElement>(null)
  const [alinharDireita, setAlinharDireita] = useState(false)
  const [abrirAcima, setAbrirAcima] = useState(false)

  useLayoutEffect(() => {
    if (!aberto || !raiz.current) return
    const { left, top, bottom } = raiz.current.getBoundingClientRect()
    setAlinharDireita(left + LARGURA_BALAO > window.innerWidth - 16)
    // sem espaço embaixo (item no fim da tela) e com espaço em cima: o balão abre para cima
    setAbrirAcima(bottom + ALTURA_BALAO > window.innerHeight && top > ALTURA_BALAO)
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) definirAberto(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') definirAberto(null) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  // Desmontar com o balão aberto (troca de tela, de aba ou de período) não deixa o estado preso.
  useEffect(() => () => { if (abertoId === id) definirAberto(null) }, [id])

  return (
    <span ref={raiz} className={clsx('relative inline-flex align-middle normal-case tracking-normal', className)}>
      <button type="button" aria-label={`Como funciona: ${texto.titulo}`} aria-expanded={aberto} data-testid="botao-ajuda" data-ajuda-id={id}
        onClick={() => definirAberto(aberto ? null : id)}
        className="grid h-[20px] w-[20px] cursor-pointer place-items-center rounded-full border-none bg-transparent p-0 text-muted transition-colors hover:bg-teal/10 hover:text-teal focus-visible:outline-2 focus-visible:outline-teal">
        <HelpCircle size={15} />
      </button>
      {aberto && (
        <div role="dialog" aria-label={`Como funciona: ${texto.titulo}`} data-testid="balao-ajuda"
          style={{ width: `min(${LARGURA_BALAO}px, calc(100vw - 32px))` }}
          className={clsx(
            'z-40 flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-card border border-line bg-white p-4 text-left text-[13px] font-normal leading-[1.5] text-body shadow-[0_8px_24px_rgba(0,0,0,0.14)]',
            'max-sm:fixed max-sm:inset-x-4 max-sm:top-24 max-sm:!w-auto sm:absolute',
            abrirAcima ? 'sm:bottom-full sm:mb-1.5' : 'sm:top-full sm:mt-1.5',
            alinharDireita ? 'sm:right-0' : 'sm:left-0',
          )}>
          <div className="text-[14px] font-bold text-dark">{texto.titulo}</div>
          {texto.partes.map((p, i) => <Parte key={i} p={p} />)}
          {texto.clique && <p className="m-0 text-muted"><span className="font-semibold text-dark">Ao clicar: </span>{texto.clique}</p>}
        </div>
      )}
    </span>
  )
}
