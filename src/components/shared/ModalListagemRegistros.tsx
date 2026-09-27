import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { ExternalLink, List, Search, X } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import SortableHeader from './SortableHeader'
import ModalRegistro, { type TipoRegistro } from '../cliente/ModalRegistro'
import { BRL } from '../venda/formato'
import { formatarData, hojeIso, STATUS_COMPRA_LABEL } from '../compra/formato'
import { clienteService } from '../../services/clienteService'
import { compraService } from '../../services/compraService'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { extractApiError } from '../../utils/apiError'
import { STATUS_LABEL } from '../../constants/statusOrcamento'
import type { PapelCadastro } from '../../types/cliente'
import type { StatusCompra } from '../../types/compra'
import type { StatusOrcamento } from '../../types/orcamento'

// V0.15.0 (#572, #573, #578 — RN-NOVA-24) — uma única modal de listagem, com as mesmas colunas em todo
// ponto de entrada (lupa dos indicadores do cadastro, clique nos gráficos do cliente e do dashboard de
// compras): Registro, Data, Itens, Status e Valor. Busca, filtros e ordenação no servidor, paginada.
// Orçamento e compra abrem numa aba nova; venda do Caixa (sem página) abre a modal de dados (#571).

export type FonteListagem =
  | { tipo: 'cadastro'; cadastroId: string; papel: PapelCadastro }
  | { tipo: 'compras' }

/** Filtro fixo vindo do ponto de entrada; o que tem rótulo vira um chip removível. */
export interface FiltroInicial {
  somenteCompras?: boolean
  naoPagas?: boolean
  status?: string[]
  de?: string
  ate?: string
  /** Produto/item de catálogo (cliente) ou insumo (fornecedor/compras). */
  itemId?: string
  fornecedorId?: string
  rotulos?: string[]
  /** Ordenação inicial, ex. 'data,asc' (padrão: data mais recente primeiro). */
  sort?: string
}

interface Linha {
  id: string
  tipo: TipoRegistro
  identificador: string
  data: string
  status: string
  valor: number
  resumoItens: string
  pago: boolean | null
}

type Campo = 'identificador' | 'data' | 'valor' | 'status'

const GRUPOS_CLIENTE: { id: string; label: string; status: string[] }[] = [
  { id: 'vendido', label: 'Entregue / Concluída', status: ['ENTREGUE', 'CONCLUIDA'] },
  { id: 'aberto', label: 'Em aberto', status: ['RASCUNHO', 'ENVIADO', 'APROVADO', 'AGUARDANDO_SINAL', 'SINAL_PAGO', 'EM_PRODUCAO', 'FINALIZADO', 'PAGO'] },
  { id: 'cancelado', label: 'Cancelado', status: ['CANCELADO', 'CANCELADA'] },
]
const GRUPOS_COMPRA: { id: string; label: string; status: string[] }[] = [
  { id: 'CONFIRMADA', label: 'Confirmada', status: ['CONFIRMADA'] },
  { id: 'RASCUNHO', label: 'Rascunho', status: ['RASCUNHO'] },
  { id: 'CANCELADA', label: 'Cancelada', status: ['CANCELADA'] },
]

const TIPO_CURTO: Record<TipoRegistro, string> = { ORCAMENTO: 'Orçamento', VENDA_CAIXA: 'Caixa', COMPRA: 'Compra' }

function rotuloStatus(tipo: TipoRegistro, status: string): string {
  if (tipo === 'COMPRA') return STATUS_COMPRA_LABEL[status as StatusCompra] ?? status
  if (tipo === 'VENDA_CAIXA') return status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'
  return STATUS_LABEL[status as StatusOrcamento] ?? status
}

function tomStatus(status: string) {
  if (status === 'ENTREGUE' || status === 'CONCLUIDA' || status === 'CONFIRMADA') return 'bg-success-bg text-success'
  if (status === 'CANCELADO' || status === 'CANCELADA') return 'bg-danger-bg text-danger'
  if (status === 'RASCUNHO') return 'bg-line-soft text-subtle'
  return 'bg-azul/10 text-azul'
}

const POR_PAGINA = 20
const dateInput = 'h-9 rounded-input border-[1.5px] border-line bg-white px-2.5 font-[inherit] text-[13px] text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus'

// A ordenação pública da modal é sempre data/identificador/valor/status; compras usam os nomes do GET /compras.
const CAMPO_COMPRAS: Record<Campo, string> = { data: 'dataCompra', identificador: 'numero', valor: 'total', status: 'status' }

export default function ModalListagemRegistros({ titulo, subtitulo, fonte, filtro, onClose }: {
  titulo: string
  subtitulo?: string
  fonte: FonteListagem
  filtro: FiltroInicial
  onClose: () => void
}) {
  const grupos = fonte.tipo === 'cadastro' && fonte.papel === 'CLIENTE' ? GRUPOS_CLIENTE : GRUPOS_COMPRA
  const gruposIniciais = filtro.status
    ? grupos.filter(g => g.status.some(st => filtro.status!.includes(st))).map(g => g.id)
    : []
  const [ordemInicialCampo, ordemInicialDir] = (filtro.sort ?? 'data,desc').split(',') as [Campo, 'asc' | 'desc']

  const [busca, setBusca] = useState('')
  const q = useDebouncedValue(busca)
  const [gruposMarcados, setGruposMarcados] = useState<string[]>(gruposIniciais)
  const [de, setDe] = useState(filtro.de ?? '')
  const [ate, setAte] = useState(filtro.ate ?? '')
  const [fixos, setFixos] = useState(filtro)
  const [ordem, setOrdem] = useState<{ campo: Campo; dir: 'asc' | 'desc' }>({ campo: ordemInicialCampo, dir: ordemInicialDir })
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [vendaAberta, setVendaAberta] = useState<string | null>(null)
  const seq = useRef(0)

  const statusSelecionados = grupos.filter(g => gruposMarcados.includes(g.id)).flatMap(g => g.status)

  const buscar = async (pagina: number): Promise<{ linhas: Linha[]; total: number; last: boolean }> => {
    const sort = `${fonte.tipo === 'compras' ? CAMPO_COMPRAS[ordem.campo] : ordem.campo},${ordem.dir}`
    if (fonte.tipo === 'cadastro') {
      const r = await clienteService.registros(fonte.cadastroId, pagina, POR_PAGINA, {
        papel: fonte.papel, busca: q || undefined, status: statusSelecionados.length ? statusSelecionados : undefined,
        somenteCompras: fixos.somenteCompras, naoPagas: fixos.naoPagas, de: de || undefined, ate: ate || undefined,
        itemId: fixos.itemId, sort,
      })
      return { linhas: r.content.map(x => ({ ...x })), total: r.totalElements, last: r.last }
    }
    // GET /compras aceita um status por vez: com mais de um marcado, a lista mostra todos.
    const r = await compraService.listar(pagina, POR_PAGINA, {
      status: statusSelecionados.length === 1 ? (statusSelecionados[0] as StatusCompra) : undefined,
      fornecedorId: fixos.fornecedorId, insumoId: fixos.itemId, busca: q || undefined,
      de: de || undefined, ate: ate || undefined, sort,
    })
    return {
      linhas: r.content.map(c => ({ id: c.id, tipo: 'COMPRA' as const, identificador: c.identificador, data: c.dataCompra, status: c.status,
        valor: c.total, resumoItens: c.resumoItens, pago: c.pago })),
      total: r.totalElements, last: r.last,
    }
  }

  const carregar = (pagina: number) => {
    const minha = ++seq.current
    setCarregando(true); setErro(null)
    buscar(pagina)
      .then(r => {
        if (minha !== seq.current) return
        setLinhas(prev => pagina === 0 ? r.linhas : [...prev, ...r.linhas])
        setTotal(r.total); setTemMais(!r.last); setPage(pagina)
      })
      .catch(err => { if (minha === seq.current) setErro(extractApiError(err, 'Não foi possível carregar a listagem.')) })
      .finally(() => { if (minha === seq.current) setCarregando(false) })
  }

  useEffect(() => {
    if (q !== busca) return
    carregar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, gruposMarcados.join(), de, ate, fixos, ordem])

  const ordenar = (campo: Campo) => setOrdem(o => o.campo === campo
    ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    : { campo, dir: campo === 'data' || campo === 'valor' ? 'desc' : 'asc' })

  const alternarGrupo = (id: string) => setGruposMarcados(prev => fonte.tipo === 'compras'
    ? (prev.includes(id) ? [] : [id])
    : (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const abrir = (l: Linha) => {
    if (l.tipo === 'VENDA_CAIXA') { setVendaAberta(l.id); return }
    window.open(l.tipo === 'ORCAMENTO' ? `/orcamentos/${l.id}` : `/compras/${l.id}`, '_blank', 'noopener')
  }

  const grade = 'md:grid-cols-[1.1fr_0.8fr_2.2fr_1fr_0.9fr_24px]'

  return (
    <>
      <ModalShell open onClose={onClose} width={960} icon={<List size={16} />} title={titulo} subtitle={subtitulo}
        footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="relative block min-w-[220px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar na listagem"
                placeholder={fonte.tipo === 'compras' || (fonte.tipo === 'cadastro' && fonte.papel === 'FORNECEDOR') ? 'Buscar por número ou insumo' : 'Buscar por número ou item'}
                className="h-9 w-full rounded-input border-[1.5px] border-line bg-white pl-8 pr-3 font-[inherit] text-[13px] text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus" />
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-body">
              De <input type="date" aria-label="Data inicial" value={de} max={ate || hojeIso()} onChange={e => setDe(e.target.value)} className={dateInput} />
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-body">
              Até <input type="date" aria-label="Data final" value={ate} min={de || undefined} max={hojeIso()} onChange={e => setAte(e.target.value)} className={dateInput} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {grupos.map(g => {
              const on = gruposMarcados.includes(g.id)
              return (
                <button key={g.id} type="button" onClick={() => alternarGrupo(g.id)} aria-pressed={on}
                  className={clsx('inline-flex h-8 items-center rounded-full border-[1.5px] px-3 font-[inherit] text-[12.5px] font-semibold transition-colors',
                    on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
                  {g.label}
                </button>
              )
            })}
            {(fixos.rotulos ?? []).map(r => (
              <span key={r} data-testid="chip-filtro" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-orange/10 pl-3 pr-1.5 text-[12.5px] font-semibold text-orange">
                {r}
                <button type="button" aria-label={`Tirar filtro ${r}`}
                  onClick={() => setFixos({ ...fixos, rotulos: [], somenteCompras: false, naoPagas: false, itemId: undefined, fornecedorId: undefined })}
                  className="grid h-5 w-5 place-items-center rounded-full border-none bg-transparent text-orange hover:bg-orange/15">
                  <X size={13} />
                </button>
              </span>
            ))}
            <span className="ml-auto text-[12.5px] text-muted">{carregando && page === 0 ? '' : `${total} ${total === 1 ? 'registro' : 'registros'}`}</span>
          </div>

          <div className="rounded-input border border-line" data-testid="modal-listagem">
            <div className={clsx('hidden gap-3 bg-cream px-4 py-2.5 md:grid', grade)}>
              <SortableHeader label="Registro" field="identificador" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <SortableHeader label="Data" field="data" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Itens</span>
              <SortableHeader label="Status" field="status" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <SortableHeader label="Valor" field="valor" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <span />
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {erro ? (
                <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-danger">{erro}
                  <Button variant="ghost" size="sm" onClick={() => carregar(0)}>Tentar de novo</Button>
                </div>
              ) : !carregando && linhas.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">Nenhum registro com estes filtros.</div>
              ) : linhas.map(l => (
                <button key={`${l.tipo}-${l.id}`} type="button" data-testid="linha-listagem" onClick={() => abrir(l)}
                  className={clsx('grid w-full cursor-pointer grid-cols-2 gap-x-3 gap-y-1 border-0 border-t border-solid border-line bg-white px-4 py-2.5 text-left font-[inherit] text-[13.5px] first:border-t-0 hover:bg-cream md:items-center', grade)}>
                  <span className="font-semibold text-dark">
                    {l.identificador}
                    <span className="ml-1.5 text-[11.5px] font-medium text-muted">{TIPO_CURTO[l.tipo]}</span>
                  </span>
                  <span className="text-right text-body [font-variant-numeric:tabular-nums] md:text-left">{formatarData(l.data)}</span>
                  <span className="col-span-2 truncate text-[12.5px] text-muted md:col-span-1" title={l.resumoItens}>{l.resumoItens || '—'}</span>
                  <span className="flex flex-wrap gap-1">
                    <span className={clsx('inline-flex h-6 items-center rounded-full px-2 text-[11.5px] font-semibold', tomStatus(l.status))}>{rotuloStatus(l.tipo, l.status)}</span>
                    {l.tipo === 'COMPRA' && l.status === 'CONFIRMADA' && l.pago === false && (
                      <span className="inline-flex h-6 items-center rounded-full bg-warning-bg px-2 text-[11.5px] font-semibold text-warning">Não paga</span>
                    )}
                  </span>
                  <span className="text-right font-semibold text-dark [font-variant-numeric:tabular-nums] md:text-left">{BRL(l.valor)}</span>
                  <span className="hidden text-muted md:block">{l.tipo !== 'VENDA_CAIXA' && <ExternalLink size={14} />}</span>
                </button>
              ))}
              {carregando && (
                <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
              )}
              {temMais && !carregando && (
                <div className="flex justify-center border-t border-line py-2.5">
                  <Button variant="ghost" size="sm" onClick={() => carregar(page + 1)}>Carregar mais</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalShell>
      {vendaAberta && <ModalRegistro tipo="VENDA_CAIXA" id={vendaAberta} onClose={() => setVendaAberta(null)} />}
    </>
  )
}
