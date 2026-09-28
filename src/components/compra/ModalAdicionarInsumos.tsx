import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { PackagePlus, Search } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import { InativoBadge } from '../cliente/PapelTags'
import { insumoService } from '../../services/insumoService'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { extractApiError } from '../../utils/apiError'
import { moeda, qtd } from './formato'
import type { InsumoResponse } from '../../types/insumo'

// V0.15.0 (#570, RN-NOVA-25) — escolha de vários insumos de uma vez para a Lista de compras. Busca no
// servidor pelo nome (a mesma busca da listagem de Insumos), só ativos; quem já está na lista aparece marcado e bloqueado.

const POR_PAGINA = 20

export default function ModalAdicionarInsumos({ jaNaLista, onClose, onAdicionar }: {
  jaNaLista: string[]
  onClose: () => void
  onAdicionar: (ids: string[]) => void
}) {
  const [busca, setBusca] = useState('')
  const q = useDebouncedValue(busca)
  const [insumos, setInsumos] = useState<InsumoResponse[]>([])
  const [page, setPage] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const seq = useRef(0)

  const carregar = (pagina: number, termo: string) => {
    const minha = ++seq.current
    setCarregando(true); setErro(null)
    // #616 (RN-NOVA-40) — inativos aparecem depois dos ativos, riscados e sem poder marcar.
    insumoService.listar(pagina, POR_PAGINA, termo || undefined, undefined, 'nome,asc', true)
      .then(r => {
        if (minha !== seq.current) return
        setInsumos(prev => pagina === 0 ? r.content : [...prev, ...r.content])
        setTemMais(!r.last); setPage(pagina)
      })
      .catch(err => { if (minha === seq.current) setErro(extractApiError(err, 'Não foi possível carregar os insumos.')) })
      .finally(() => { if (minha === seq.current) setCarregando(false) })
  }

  useEffect(() => {
    if (q !== busca) return
    carregar(0, q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const alternar = (id: string) => setMarcados(prev => {
    const novo = new Set(prev)
    if (novo.has(id)) novo.delete(id); else novo.add(id)
    return novo
  })

  const n = marcados.size
  return (
    <ModalShell open onClose={onClose} width={720} title="Adicionar insumos" subtitle="Marque os insumos que entram na lista"
      icon={<PackagePlus size={16} />}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="secondary" disabled={n === 0} onClick={() => onAdicionar([...marcados])}>
          {n === 0 ? 'Adicionar insumos' : `Adicionar ${n} ${n === 1 ? 'insumo' : 'insumos'}`}
        </Button>
      </>}>
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar insumo pelo nome"
            aria-label="Buscar insumo"
            className="h-10 w-full rounded-input border-[1.5px] border-line bg-white pl-9 pr-3 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus" />
        </label>

        <div className="max-h-[420px] overflow-y-auto rounded-input border border-line" data-testid="modal-adicionar-insumos">
          <div className="sticky top-0 z-[1] hidden grid-cols-[32px_0.7fr_2fr_1.2fr_0.9fr] gap-3 bg-cream px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim sm:grid">
            <span /><span>Código</span><span>Insumo</span><span>Estoque / mínimo</span><span>Custo atual</span>
          </div>
          {erro ? (
            <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-danger">{erro}
              <Button variant="ghost" size="sm" onClick={() => carregar(0, q)}>Tentar de novo</Button>
            </div>
          ) : !carregando && insumos.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">Nenhum insumo encontrado.</div>
          ) : insumos.map(i => !i.ativo ? (
            <div key={i.id} data-testid="opcao-inativa" aria-disabled="true"
              className="grid cursor-default grid-cols-[32px_1fr] items-center gap-x-3 gap-y-0.5 border-t border-line px-3.5 py-2.5 text-[13.5px] first-of-type:border-t-0 sm:grid-cols-[32px_0.7fr_2fr_1.2fr_0.9fr]">
              <span />
              <span className="hidden text-faint line-through sm:block">{i.identificador}</span>
              <span className="min-w-0"><span className="font-semibold text-dim line-through">{i.nome}</span> <InativoBadge /></span>
              <span /><span />
            </div>
          ) : (() => {
            const naLista = jaNaLista.includes(i.id)
            const marcado = naLista || marcados.has(i.id)
            return (
              <label key={i.id} data-testid="opcao-insumo"
                className={clsx('grid grid-cols-[32px_1fr] items-center gap-x-3 gap-y-0.5 border-t border-line px-3.5 py-2.5 text-[13.5px] first-of-type:border-t-0 sm:grid-cols-[32px_0.7fr_2fr_1.2fr_0.9fr]',
                  naLista ? 'cursor-not-allowed bg-cream/60' : 'cursor-pointer hover:bg-cream')}>
                <input type="checkbox" checked={marcado} disabled={naLista} onChange={() => alternar(i.id)}
                  aria-label={`Selecionar ${i.nome}`} className="h-4 w-4 accent-teal" />
                <span className="hidden text-muted sm:block">{i.identificador}</span>
                <span className="min-w-0 font-semibold text-dark">
                  {i.nome}
                  {naLista && <span className="ml-2 rounded-full bg-line-soft px-2 py-0.5 text-[10.5px] font-semibold text-subtle">já na lista</span>}
                </span>
                <span className={clsx('col-start-2 [font-variant-numeric:tabular-nums] sm:col-start-auto', i.estoqueAtual < 0 ? 'text-danger' : 'text-body')}>
                  {qtd(i.estoqueAtual)} / {i.estoqueMinimo != null ? qtd(i.estoqueMinimo) : '—'} {i.unidadeMedida}
                </span>
                <span className="col-start-2 text-body [font-variant-numeric:tabular-nums] sm:col-start-auto">{moeda(i.custoUnitario)}</span>
              </label>
            )
          })())}
          {carregando && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
          )}
          {temMais && !carregando && (
            <div className="flex justify-center border-t border-line py-2.5">
              <Button variant="ghost" size="sm" onClick={() => carregar(page + 1, q)}>Carregar mais</Button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
