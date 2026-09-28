import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Eye, EyeOff, Search } from 'lucide-react'

// V0.15.0 (#604, RN-NOVA-34, DT-NOVA-23) — cartão de número padrão do sistema (extraído do Dashboard de
// compras): título, valor em destaque, linha de apoio e, quando houver, a lupa no canto superior direito
// (RN-NOVA-24). `BigNumberGroup` agrupa os cartões com o botão "Esconder números"/"Mostrar números",
// lembrado por tela no navegador (sem storage disponível = expandido).

const TOM = { padrao: 'text-dark', destaque: 'text-teal', perigo: 'text-danger', azul: 'text-azul', aviso: 'text-warning' } as const

export function BigNumber({ icone, titulo, valor, children, destaque, tom, onLupa, testid = 'card-numero' }: {
  icone?: ReactNode
  titulo: string
  valor: ReactNode
  /** Linha(s) de apoio: comparativo ou detalhe. */
  children?: ReactNode
  destaque?: boolean
  /** Cor do valor quando não é o destaque (ex.: prejuízo em vermelho, custo em azul). */
  tom?: keyof typeof TOM
  onLupa?: () => void
  testid?: string
}) {
  return (
    <div data-testid={testid} className="relative min-w-0 rounded-card border border-[#F0EEE9] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      {onLupa && (
        <button type="button" onClick={onLupa} aria-label={`Ver registros de ${titulo}`} title="Ver registros"
          className="absolute right-2.5 top-2.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted transition-colors hover:bg-teal/10 hover:text-teal">
          <Search size={15} />
        </button>
      )}
      <div className={clsx('flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim', onLupa && 'pr-7')}>{icone}{titulo}</div>
      <div className={clsx('mt-2 truncate text-[22px] font-bold tracking-[-0.01em] [font-variant-numeric:tabular-nums]', TOM[tom ?? (destaque ? 'destaque' : 'padrao')])}>{valor}</div>
      {children && <div className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-muted">{children}</div>}
    </div>
  )
}

const CHAVE = (tela: string) => `numerosEscondidos:${tela}`

function lerEscondido(tela: string): boolean {
  try { return localStorage.getItem(CHAVE(tela)) === '1' } catch { return false }
}

function gravarEscondido(tela: string, escondido: boolean) {
  try {
    if (escondido) localStorage.setItem(CHAVE(tela), '1')
    else localStorage.removeItem(CHAVE(tela))
  } catch { /* sem storage: a escolha vale só nesta visita */ }
}

export function BigNumberGroup({ tela, titulo, acoes, children, colunas = 'sm:grid-cols-2 xl:grid-cols-3', testid }: {
  /** Chave da preferência (uma por tela/bloco), ex. "dashboard-compras". */
  tela: string
  titulo?: ReactNode
  /** Conteúdo extra no cabeçalho (ex.: abas Cliente | Fornecedor | Ambos). */
  acoes?: ReactNode
  children: ReactNode
  colunas?: string
  testid?: string
}) {
  const [escondido, setEscondido] = useState(() => lerEscondido(tela))
  const alternar = () => setEscondido(e => { gravarEscondido(tela, !e); return !e })
  return (
    <section data-testid={testid} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {titulo && <div className="text-[13px] font-bold text-dark">{titulo}</div>}
        {acoes}
        <button type="button" onClick={alternar} aria-expanded={!escondido}
          className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3 font-[inherit] text-[12.5px] font-semibold text-body transition-colors hover:bg-cream">
          {escondido ? <Eye size={14} /> : <EyeOff size={14} />}
          {escondido ? 'Mostrar números' : 'Esconder números'}
        </button>
      </div>
      {!escondido && <div className={clsx('grid grid-cols-1 gap-3', colunas)}>{children}</div>}
    </section>
  )
}
