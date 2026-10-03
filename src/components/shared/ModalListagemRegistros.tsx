import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { ExternalLink, List, Search } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import SortableHeader from './SortableHeader'
import CampoFiltros, { type FiltroEscolhido, type GrupoFiltro } from './CampoFiltros'
import ModalRegistro, { type TipoRegistro } from '../cliente/ModalRegistro'
import { BRL } from '../venda/formato'
import { formatarData, hojeIso, STATUS_COMPRA_LABEL } from '../compra/formato'
import { clienteService } from '../../services/clienteService'
import { compraService } from '../../services/compraService'
import { insumoService } from '../../services/insumoService'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useModalErro } from '../../hooks/useModalErro'
import { extractApiError } from '../../utils/apiError'
import { STATUS_LABEL } from '../../constants/statusOrcamento'
import type { PapelCadastro } from '../../types/cliente'
import type { StatusCompra } from '../../types/compra'
import type { StatusOrcamento } from '../../types/orcamento'

// V0.15.0 (#572, #573, #578 — RN-NOVA-24) — uma única modal de listagem, com as mesmas colunas em todo
// ponto de entrada (lupa dos indicadores do cadastro, clique nos gráficos do cliente e do dashboard de
// compras): Registro, Data, Itens, Status e Valor. Busca, filtros e ordenação no servidor, paginada.
// Orçamento e compra abrem numa aba nova; venda do Caixa (sem página) abre a modal de dados (#571).
// #585 (RN-NOVA-35) — os filtros ficam num campo só, com seleção múltipla agrupada por tipo; o ponto de
// entrada já traz o campo preenchido. Tipos diferentes somam como E; valores do mesmo tipo, como OU.

export type FonteListagem =
  | { tipo: 'cadastro'; cadastroId: string; papel: PapelCadastro }
  | { tipo: 'compras' }

/** Filtro vindo do ponto de entrada; vira etiquetas no campo de filtros, que a pessoa pode tirar. */
export interface FiltroInicial {
  somenteCompras?: boolean
  /** Compras confirmadas não pagas (vira "Pagamento: Não paga" + "Status: Confirmada"). */
  naoPagas?: boolean
  comDesconto?: boolean
  status?: string[]
  de?: string
  ate?: string
  /** Produto/item de catálogo (cliente) ou insumo (fornecedor/compras). */
  itemId?: string
  fornecedorId?: string
  /** Rótulo do item ou do fornecedor acima (nome que aparece na etiqueta). */
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

const TIPO_CURTO: Record<TipoRegistro, string> = { ORCAMENTO: 'Orçamento', VENDA_CAIXA: 'Caixa', COMPRA: 'Compra' }

const STATUS_CLIENTE = [
  ...Object.entries(STATUS_LABEL).map(([valor, rotulo]) => ({ valor, rotulo })),
  { valor: 'CONCLUIDA', rotulo: 'Concluída (Caixa)' },
  { valor: 'CANCELADA', rotulo: 'Cancelada (Caixa)' },
]
const STATUS_COMPRAS = (['RASCUNHO', 'CONFIRMADA', 'CANCELADA'] as StatusCompra[]).map(v => ({ valor: v, rotulo: STATUS_COMPRA_LABEL[v] }))
const PAGAMENTO = [{ valor: 'true', rotulo: 'Paga' }, { valor: 'false', rotulo: 'Não paga' }]

const buscarInsumos = (termo: string) => insumoService.listar(0, 8, termo || undefined, undefined, 'nome,asc')
  .then(p => p.content.map(i => ({ valor: i.id, rotulo: i.nome })))
const buscarFornecedores = (termo: string) => clienteService.listar(0, 8, termo || undefined, { papel: 'FORNECEDOR' })
  .then(p => p.content.map(c => ({ valor: c.id, rotulo: c.nome })))

function gruposDa(fonte: FonteListagem): GrupoFiltro[] {
  if (fonte.tipo === 'cadastro' && fonte.papel === 'CLIENTE') return [
    { id: 'tipo', rotulo: 'Tipo', opcoes: [{ valor: 'ORCAMENTO', rotulo: 'Orçamento' }, { valor: 'VENDA_CAIXA', rotulo: 'Venda do Caixa' }] },
    { id: 'conta', rotulo: 'Conta como compra', opcoes: [{ valor: 'sim', rotulo: 'Sim' }] },
    { id: 'status', rotulo: 'Status', opcoes: STATUS_CLIENTE },
    // Item só vem do ponto de entrada (lupa do mais comprado / clique no item do gráfico).
    { id: 'item', rotulo: 'Item' },
  ]
  const comuns: GrupoFiltro[] = [
    { id: 'status', rotulo: 'Status', opcoes: STATUS_COMPRAS },
    { id: 'pagamento', rotulo: 'Pagamento', opcoes: PAGAMENTO },
    { id: 'desconto', rotulo: 'Desconto', opcoes: [{ valor: 'sim', rotulo: 'Com desconto' }] },
  ]
  if (fonte.tipo === 'cadastro') return [...comuns, { id: 'item', rotulo: 'Insumo', buscar: buscarInsumos }]
  return [...comuns, { id: 'fornecedor', rotulo: 'Fornecedor', buscar: buscarFornecedores }, { id: 'item', rotulo: 'Insumo', buscar: buscarInsumos }]
}

function etiquetasIniciais(f: FiltroInicial, grupos: GrupoFiltro[]): FiltroEscolhido[] {
  const rotuloOpcao = (grupo: string, valor: string) => grupos.find(g => g.id === grupo)?.opcoes?.find(o => o.valor === valor)?.rotulo ?? valor
  const out: FiltroEscolhido[] = []
  const status = new Set(f.status ?? [])
  if (f.naoPagas) status.add('CONFIRMADA')
  status.forEach(s => out.push({ grupo: 'status', valor: s, rotulo: rotuloOpcao('status', s) }))
  if (f.somenteCompras) out.push({ grupo: 'conta', valor: 'sim', rotulo: 'Sim' })
  if (f.naoPagas) out.push({ grupo: 'pagamento', valor: 'false', rotulo: 'Não paga' })
  if (f.comDesconto) out.push({ grupo: 'desconto', valor: 'sim', rotulo: 'Com desconto' })
  if (f.fornecedorId) out.push({ grupo: 'fornecedor', valor: f.fornecedorId, rotulo: f.rotulos?.[0] ?? 'Fornecedor' })
  if (f.itemId) out.push({ grupo: 'item', valor: f.itemId, rotulo: f.rotulos?.[0] ?? 'Item' })
  return out
}

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

/** #602 (RN-NOVA-32) — mesmo texto do backend (ClienteHistoricoService, "Período inválido"). */
export const ERRO_PERIODO = {
  titulo: 'Período inválido',
  mensagem: 'A data inicial não pode ser depois da data final.',
  motivo: 'O período vai da data inicial até a data final.',
  comoResolver: 'Troque as datas de lugar (ex.: de 01/09/2026 até 30/09/2026).',
}

export default function ModalListagemRegistros({ titulo, subtitulo, fonte, filtro, onClose }: {
  titulo: string
  subtitulo?: string
  fonte: FonteListagem
  filtro: FiltroInicial
  onClose: () => void
}) {
  const grupos = useMemo(() => gruposDa(fonte), [fonte])
  const [ordemInicialCampo, ordemInicialDir] = (filtro.sort ?? 'data,desc').split(',') as [Campo, 'asc' | 'desc']

  const [busca, setBusca] = useState('')
  const q = useDebouncedValue(busca)
  const [filtros, setFiltros] = useState<FiltroEscolhido[]>(() => etiquetasIniciais(filtro, grupos))
  const [de, setDe] = useState(filtro.de ?? '')
  const [ate, setAte] = useState(filtro.ate ?? '')
  const [ordem, setOrdem] = useState<{ campo: Campo; dir: 'asc' | 'desc' }>({ campo: ordemInicialCampo, dir: ordemInicialDir })
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [vendaAberta, setVendaAberta] = useState<string | null>(null)
  const { modalErro, mostrarErro } = useModalErro()
  const seq = useRef(0)

  const valores = (grupo: string) => filtros.filter(f => f.grupo === grupo).map(f => f.valor)
  const pagamento = valores('pagamento')
  const pago = pagamento.length === 1 ? pagamento[0] as 'true' | 'false' : undefined

  const buscar = async (pagina: number): Promise<{ linhas: Linha[]; total: number; last: boolean }> => {
    const sort = `${fonte.tipo === 'compras' ? CAMPO_COMPRAS[ordem.campo] : ordem.campo},${ordem.dir}`
    const status = valores('status')
    if (fonte.tipo === 'cadastro') {
      const r = await clienteService.registros(fonte.cadastroId, pagina, POR_PAGINA, {
        papel: fonte.papel, busca: q || undefined, status: status.length ? status : undefined,
        tipo: valores('tipo'), somenteCompras: valores('conta').length > 0, pago,
        comDesconto: valores('desconto').length > 0, itemId: valores('item'),
        de: de || undefined, ate: ate || undefined, sort,
      })
      return { linhas: r.content.map(x => ({ ...x })), total: r.totalElements, last: r.last }
    }
    const r = await compraService.listar(pagina, POR_PAGINA, {
      status: status as StatusCompra[], pago: pago === undefined ? undefined : pago === 'true',
      comDesconto: valores('desconto').length > 0 || undefined,
      fornecedorId: valores('fornecedor'), insumoId: valores('item'), busca: q || undefined,
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

  const chaveFiltros = filtros.map(f => `${f.grupo}:${f.valor}`).join()
  useEffect(() => {
    if (q !== busca) return
    carregar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, chaveFiltros, de, ate, ordem])

  const ordenar = (campo: Campo) => setOrdem(o => o.campo === campo
    ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    : { campo, dir: campo === 'data' || campo === 'valor' ? 'desc' : 'asc' })

  // Período: data inicial depois da final é BLOQUEIO — a lista não muda e a data volta ao valor anterior.
  const mudarPeriodo = (campo: 'de' | 'ate', valor: string, alvo: HTMLInputElement) => {
    const novoDe = campo === 'de' ? valor : de
    const novoAte = campo === 'ate' ? valor : ate
    if (novoDe && novoAte && novoDe > novoAte) { mostrarErro(ERRO_PERIODO, undefined, alvo); return }
    if (campo === 'de') setDe(valor)
    else setAte(valor)
  }

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
              De <input type="date" aria-label="Data inicial" value={de} max={hojeIso()} onChange={e => mudarPeriodo('de', e.target.value, e.currentTarget)} className={dateInput} />
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-body">
              Até <input type="date" aria-label="Data final" value={ate} max={hojeIso()} onChange={e => mudarPeriodo('ate', e.target.value, e.currentTarget)} className={dateInput} />
            </label>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[280px] flex-1">
              <CampoFiltros grupos={grupos} escolhidos={filtros} onChange={setFiltros} />
            </div>
            <span className="pt-2.5 text-[12.5px] text-muted">{carregando && page === 0 ? '' : `${total} ${total === 1 ? 'registro' : 'registros'}`}</span>
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
      {modalErro}
      {vendaAberta && <ModalRegistro tipo="VENDA_CAIXA" id={vendaAberta} onClose={() => setVendaAberta(null)} />}
    </>
  )
}
