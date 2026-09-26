import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft, Ban, BarChart3, ChevronRight, ClipboardList, Info, Monitor, Pencil, Power, User,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { Button, SegmentedControl } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import { InativoBadge, PapelTags } from '../../components/cliente/PapelTags'
import { BRL } from '../../components/venda/formato'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { extractApiError } from '../../utils/apiError'
import { mascararDocumento, ROTULO_DOCUMENTO } from '../../utils/documento'
import { STATUS_LABEL } from '../../constants/statusOrcamento'
import { GRAFICO_EIXO, GRAFICO_GRID, MENSAGEM_GRAFICO_CELULAR, PALETA_SERIES } from '../../constants/graficos'
import type { StatusOrcamento } from '../../types/orcamento'
import type {
  ClienteResponse, CompraFornecedorHistoricoResponse, GraficosClienteResponse, IndicadoresCadastroResponse,
  PedidoClienteResponse, TipoPessoa,
} from '../../types/cliente'

// V0.15.0 — página de detalhe do cadastro (#560, RN-NOVA-19) com gráficos do cliente (#451, RN-NOVA-20).
// Todo número vem pronto do backend (indicadores/gráficos agregados em DT-NOVA-9); aqui só formatação.

type Aba = 'detalhes' | 'historico'

const TIPO_PESSOA_LABEL: Record<TipoPessoa, string> = { FISICA: 'Pessoa física', JURIDICA: 'Pessoa jurídica', ESTRANGEIRO: 'Estrangeiro' }

/** "2026-05-20T16:45:00" ou "2026-05-20" → "20/05/2026", sem passar por Date (evita deslocamento de fuso). */
const formatarData = (iso?: string | null) => {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`

const qtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const PERIODOS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
] as const

// ---------- Status (pílulas) ----------

type Tom = 'verde' | 'vermelho' | 'cinza' | 'laranja' | 'azul'
const TOM: Record<Tom, string> = {
  verde: 'bg-success-bg text-success',
  vermelho: 'bg-danger-bg text-danger',
  cinza: 'bg-line-soft text-subtle',
  laranja: 'bg-warning-bg text-warning',
  azul: 'bg-azul/10 text-azul',
}

function Pilula({ tom, children }: { tom: Tom; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold', TOM[tom])}>
      {children}
    </span>
  )
}

function statusPedido(p: PedidoClienteResponse): { label: string; tom: Tom } {
  if (p.tipo === 'VENDA_CAIXA') {
    return p.status === 'CONCLUIDA' ? { label: 'Concluída', tom: 'verde' } : { label: 'Cancelada', tom: 'vermelho' }
  }
  const label = STATUS_LABEL[p.status as StatusOrcamento] ?? p.status
  const tom: Tom = p.status === 'ENTREGUE' ? 'verde' : p.status === 'CANCELADO' ? 'vermelho' : p.status === 'RASCUNHO' ? 'cinza' : 'azul'
  return { label, tom }
}

const STATUS_COMPRA: Record<CompraFornecedorHistoricoResponse['status'], { label: string; tom: Tom }> = {
  RASCUNHO: { label: 'Rascunho', tom: 'cinza' },
  CONFIRMADA: { label: 'Confirmada', tom: 'verde' },
  CANCELADA: { label: 'Cancelada', tom: 'vermelho' },
}

// ---------- Indicadores ----------

function Indicador({ titulo, valor, detalhe, destaque }: { titulo: string; valor: ReactNode; detalhe?: ReactNode; destaque?: boolean }) {
  return (
    <div className="min-w-0 border-b border-r border-line bg-white px-5 py-[16px]">
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{titulo}</div>
      <div className={clsx('mt-[6px] [font-variant-numeric:tabular-nums]', destaque ? 'text-[22px] font-bold tracking-[-0.02em] text-teal' : 'text-base font-semibold text-dark')}>
        {valor}
      </div>
      {detalhe && <div className="mt-0.5 truncate text-[12.5px] text-muted">{detalhe}</div>}
    </div>
  )
}

function BlocoIndicadores({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="border-b border-line px-5 py-3 text-[13px] font-bold text-dark">{titulo}</div>
      {/* Bordas por célula (não gap sobre fundo cinza): a última linha incompleta fica branca. O -m corta a
          borda externa; o overflow-hidden aqui é seguro (bloco só de leitura, sem dropdown/menu filho). */}
      <div className="overflow-hidden rounded-b-card">
        <div className="-mb-px -mr-px grid grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function IndicadoresCliente({ ind }: { ind: IndicadoresCadastroResponse['cliente'] }) {
  return (
    <BlocoIndicadores titulo="Como cliente">
      <Indicador titulo="Total gasto" valor={BRL(ind.totalGasto)} destaque />
      <Indicador titulo="Ticket médio" valor={ind.ticketMedio != null ? BRL(ind.ticketMedio) : '—'} />
      <Indicador titulo="Pedidos" valor={ind.numeroPedidos} />
      <Indicador titulo="Última compra" valor={formatarData(ind.ultimaCompra?.dataCompra)} detalhe={ind.ultimaCompra?.identificador} />
      <Indicador titulo="Mais comprado" valor={ind.itemMaisComprado?.nome ?? '—'}
        detalhe={ind.itemMaisComprado ? `${qtd(ind.itemMaisComprado.quantidade)} un · ${BRL(ind.itemMaisComprado.valor)}` : undefined} />
      <Indicador titulo="Cliente desde" valor={formatarData(ind.clienteDesde)} />
      <Indicador titulo="Orçamentos em aberto" valor={ind.orcamentosEmAberto.quantidade} detalhe={BRL(ind.orcamentosEmAberto.valor)} />
      <Indicador titulo="Orçamentos cancelados" valor={ind.orcamentosCancelados.quantidade} detalhe={BRL(ind.orcamentosCancelados.valor)} />
    </BlocoIndicadores>
  )
}

function IndicadoresFornecedor({ ind }: { ind: IndicadoresCadastroResponse['fornecedor'] }) {
  return (
    <BlocoIndicadores titulo="Como fornecedor">
      <Indicador titulo="Total comprado" valor={BRL(ind.totalComprado)} destaque />
      <Indicador titulo="Compra média" valor={ind.compraMedia != null ? BRL(ind.compraMedia) : '—'} />
      <Indicador titulo="Compras" valor={ind.numeroCompras} />
      <Indicador titulo="Última compra" valor={formatarData(ind.ultimaCompra?.data)} detalhe={ind.ultimaCompra?.identificador} />
      <Indicador titulo="Insumo mais comprado" valor={ind.insumoMaisComprado?.nome ?? '—'}
        detalhe={ind.insumoMaisComprado ? `${qtd(ind.insumoMaisComprado.quantidade)} ${ind.insumoMaisComprado.unidade}` : undefined} />
      <Indicador titulo="Insumos vinculados" valor={ind.insumosVinculados} />
      <Indicador titulo="Compras não pagas" valor={ind.comprasNaoPagas.quantidade} detalhe={BRL(ind.comprasNaoPagas.valor)} />
    </BlocoIndicadores>
  )
}

// ---------- Aba Detalhes ----------

function DadosCadastrais({ c }: { c: ClienteResponse }) {
  const linhas: { k: string; v?: string | null; longo?: boolean }[] = [
    { k: 'Tipo de pessoa', v: TIPO_PESSOA_LABEL[c.tipoPessoa] },
    { k: ROTULO_DOCUMENTO[c.tipoPessoa], v: c.documento ? mascararDocumento(c.documento, c.tipoPessoa) : null },
    { k: 'WhatsApp', v: c.whatsapp },
    { k: 'Telefone', v: c.telefone },
    { k: 'E-mail', v: c.email },
    { k: 'Site ou Instagram', v: c.site },
    { k: 'Endereço', v: c.endereco, longo: true },
    { k: 'Observações', v: c.observacoes, longo: true },
    { k: 'Cadastrado em', v: formatarData(c.createdAt) },
  ]
  return (
    <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-[18px] px-5 py-5 md:grid-cols-2">
      {linhas.map(l => (
        <div key={l.k} className={clsx('min-w-0', l.longo && 'md:col-span-2')}>
          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{l.k}</dt>
          <dd className={clsx('m-0 mt-1 whitespace-pre-line break-words text-[14.5px]', l.v ? 'text-dark' : 'italic text-faint')}>
            {l.v || 'Não informado'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ---------- Aba Histórico: gráficos (#451) ----------

function TooltipGasto({ active, payload }: { active?: boolean; payload?: { payload: { mes: string; total: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-input border border-line bg-white px-3 py-2 text-[12.5px] shadow-card">
      <div className="font-semibold text-dark">{rotuloMes(p.mes)}</div>
      <div className="text-body [font-variant-numeric:tabular-nums]">{BRL(p.total)}</div>
    </div>
  )
}

function GraficosCliente({ clienteId }: { clienteId: string }) {
  const mobile = useIsMobile()
  const [meses, setMeses] = useState<number>(12)
  const [dados, setDados] = useState<GraficosClienteResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (mobile) return
    const hoje = new Date()
    const de = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)
    setLoading(true)
    setErro(null)
    clienteService.graficos(clienteId, isoLocal(de), isoLocal(hoje))
      .then(setDados)
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar os gráficos.')))
      .finally(() => setLoading(false))
  }, [clienteId, meses, mobile])

  if (mobile) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-line bg-cream px-4 py-3.5 text-[13.5px] text-body">
        <Monitor size={18} className="flex-shrink-0 text-teal" />
        {MENSAGEM_GRAFICO_CELULAR}
      </div>
    )
  }

  const semCompras = !!dados && dados.itensMaisComprados.length === 0 && dados.gastoMensal.every(m => m.total === 0)
  const maxQtd = dados ? Math.max(1, ...dados.itensMaisComprados.map(i => i.quantidade)) : 1

  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-dark">
          <BarChart3 size={16} className="text-teal" /> Compras deste cliente
        </div>
        <SegmentedControl options={PERIODOS} value={meses} onChange={setMeses} height="h-9" display="inline-flex"
          optionWidth="whitespace-nowrap px-3.5" textSize="text-[12.5px]" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 px-5 py-10 text-sm text-muted">
          <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando gráficos…
        </div>
      ) : erro ? (
        <div className="px-5 py-8 text-center text-sm text-danger">{erro}</div>
      ) : semCompras ? (
        <div className="px-5 py-10 text-center text-sm text-muted">Este cliente ainda não tem compras</div>
      ) : dados && (
        <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="mb-3 text-[12.5px] font-semibold text-body">Gasto por mês</div>
            <div className="h-[240px]" data-testid="grafico-gasto-mensal">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.gastoMensal} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                  <XAxis dataKey="mes" tickFormatter={rotuloMes} tick={{ fontSize: 11.5, fill: GRAFICO_EIXO }} axisLine={false} tickLine={false} />
                  <YAxis width={72} tickFormatter={v => BRL(Number(v)).replace(',00', '')} tick={{ fontSize: 11.5, fill: GRAFICO_EIXO }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipGasto />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
                  <Bar dataKey="total" fill={PALETA_SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="mb-3 text-[12.5px] font-semibold text-body">O que mais comprou no período</div>
            {dados.itensMaisComprados.length === 0 ? (
              <div className="text-sm text-muted">Nenhum item comprado no período.</div>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0" data-testid="itens-mais-comprados">
                {dados.itensMaisComprados.map(i => (
                  <li key={`${i.tipo}-${i.id}`}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate font-medium text-dark">{i.nome}</span>
                      <span className="flex-shrink-0 text-muted [font-variant-numeric:tabular-nums]">{qtd(i.quantidade)} un · {BRL(i.valor)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line-soft">
                      <div className="h-1.5 rounded-full bg-teal" style={{ width: `${(i.quantidade / maxQtd) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Aba Histórico: listas ----------

function useHistorico<T>(fetcher: (page: number) => Promise<{ content: T[]; last: boolean }>, ativo: boolean) {
  const [itens, setItens] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!ativo) return
    setLoading(true)
    setErro(null)
    fetcher(0)
      .then(r => { setItens(r.content); setHasNext(!r.last); setPage(0) })
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o histórico.')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo])

  const carregarMais = () => {
    setLoadingMore(true)
    fetcher(page + 1)
      .then(r => { setItens(prev => [...prev, ...r.content]); setHasNext(!r.last); setPage(page + 1) })
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o histórico.')))
      .finally(() => setLoadingMore(false))
  }

  return { itens, hasNext, loading, loadingMore, erro, carregarMais }
}

function ListaHistorico<T>({ titulo, icone, colunas, h, vazio, renderLinha, legenda }: {
  titulo: string
  icone: ReactNode
  colunas: string[]
  h: ReturnType<typeof useHistorico<T>>
  vazio: string
  renderLinha: (item: T) => ReactNode
  legenda?: string
}) {
  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-[13px] font-bold text-dark">
        {icone} {titulo}
      </div>
      {legenda && (
        <div className="flex items-start gap-2 border-b border-line bg-cream px-5 py-2.5 text-[12.5px] text-body">
          <Info size={14} className="mt-px flex-shrink-0 text-teal" /> {legenda}
        </div>
      )}
      {h.loading ? (
        <div className="flex items-center gap-2.5 px-5 py-8 text-sm text-muted">
          <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…
        </div>
      ) : h.erro && h.itens.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-danger">{h.erro}</div>
      ) : h.itens.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted">{vazio}</div>
      ) : (
        <>
          <div className="hidden grid-cols-[1fr_1fr_1.2fr_1fr] gap-4 bg-cream px-5 py-[11px] md:grid">
            {colunas.map(c => <div key={c} className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">{c}</div>)}
          </div>
          {h.itens.map(renderLinha)}
          {h.hasNext && (
            <div className="flex justify-center border-t border-line px-5 py-3">
              <Button variant="ghost" onClick={h.carregarMais} disabled={h.loadingMore}>
                {h.loadingMore ? 'Carregando…' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const linhaHistorico = 'grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line px-5 py-3 text-[13.5px] md:grid-cols-[1fr_1fr_1.2fr_1fr] md:items-center md:gap-4'

// ---------- Página ----------

export default function DetalheClientePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, setToast } = useToast()

  const [cadastro, setCadastro] = useState<ClienteResponse | null>(null)
  const [indicadores, setIndicadores] = useState<IndicadoresCadastroResponse | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('detalhes')
  const [confirmInativar, setConfirmInativar] = useState(false)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) {
      setToast(msg)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!id) return
    setErroCarga(null)
    Promise.all([clienteService.buscarPorId(id), clienteService.indicadores(id)])
      .then(([c, ind]) => { setCadastro(c); setIndicadores(ind) })
      .catch(err => setErroCarga(extractApiError(err, 'Não foi possível carregar o cadastro.')))
  }, [id])

  const ind = indicadores
  // Um registro que perdeu o papel ainda tem histórico (contrato): mostra a seção se tem o papel OU dados.
  const mostraCliente = !!cadastro && !!ind && (cadastro.ehCliente || ind.cliente.numeroPedidos > 0 || ind.cliente.orcamentosEmAberto.quantidade > 0 || ind.cliente.orcamentosCancelados.quantidade > 0)
  const mostraFornecedor = !!cadastro && !!ind && (cadastro.ehFornecedor || ind.fornecedor.numeroCompras > 0)

  const pedidos = useHistorico<PedidoClienteResponse>(p => clienteService.historicoPedidos(id!, p), aba === 'historico' && mostraCliente)
  const compras = useHistorico<CompraFornecedorHistoricoResponse>(p => clienteService.historicoCompras(id!, p), aba === 'historico' && mostraFornecedor)

  const alternarAtivo = async () => {
    if (!cadastro) return
    setProcessando(true)
    try {
      if (cadastro.ativa) await clienteService.inativar(cadastro.id)
      else await clienteService.reativar(cadastro.id)
      setCadastro({ ...cadastro, ativa: !cadastro.ativa })
      setToast(cadastro.ativa ? `${cadastro.nome} inativado.` : `${cadastro.nome} reativado.`)
    } catch (err) {
      setToast(extractApiError(err, 'Não foi possível concluir. Tente novamente.'))
    } finally {
      setProcessando(false)
      setConfirmInativar(false)
    }
  }

  if (erroCarga) {
    return (
      <AppLayout active="clientes" compact>
        <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">{erroCarga}</div>
        <div className="mt-4"><Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/clientes')}>Voltar</Button></div>
      </AppLayout>
    )
  }

  if (!cadastro || !ind) {
    return (
      <AppLayout active="clientes" compact>
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando cadastro…
        </div>
      </AppLayout>
    )
  }

  const ABAS: { id: Aba; label: string; icon: typeof User }[] = [
    { id: 'detalhes', label: 'Detalhes', icon: User },
    { id: 'historico', label: 'Histórico', icon: ClipboardList },
  ]

  return (
    <AppLayout active="clientes" compact>
      <Toast message={toast} />

      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/clientes')}>Clientes e Fornecedores</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="truncate font-semibold text-body">{cadastro.nome}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-[18px]">
        <div className="flex min-w-0 items-center gap-[15px]">
          <span className={clsx(
            'grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-[15px] text-[22px] font-bold',
            cadastro.ativa ? 'bg-teal/10 text-teal' : 'bg-line-deep text-dim'
          )}>
            {cadastro.nome.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {cadastro.identificador && (
                <span className="text-[13px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{cadastro.identificador}</span>
              )}
              <h1 className="m-0 text-[25px] font-bold tracking-[-0.02em] text-dark">{cadastro.nome}</h1>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PapelTags cliente={cadastro} size="md" />
              {!cadastro.ativa && <InativoBadge size="md" />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/clientes')}>Voltar</Button>
          <Button variant="ghost" icon={<Pencil size={16} />} onClick={() => navigate(`/clientes/${cadastro.id}/editar`)}>Editar</Button>
          {cadastro.ativa ? (
            <Button variant="ghost" icon={<Ban size={16} />} onClick={() => setConfirmInativar(true)}>Inativar</Button>
          ) : (
            <Button variant="ghost" icon={<Power size={16} />} disabled={processando} onClick={alternarAtivo}>Reativar</Button>
          )}
        </div>
      </div>

      {!cadastro.ativa && (
        <div className="mb-4 flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-4 py-3 text-[13.5px] text-danger-deep">
          <Info size={16} className="mt-px flex-shrink-0" />
          Cadastro inativo: não aparece na escolha de cliente nem de fornecedor. Orçamentos, vendas e compras que já o usam continuam iguais.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {mostraCliente && <IndicadoresCliente ind={ind.cliente} />}
        {mostraFornecedor && <IndicadoresFornecedor ind={ind.fornecedor} />}
      </div>

      <div className="mt-[26px] flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {ABAS.map(a => {
          const on = aba === a.id
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={on}
              onClick={() => setAba(a.id)}
              className={clsx(
                'relative flex items-center gap-2 whitespace-nowrap border-none bg-transparent px-4 py-3 font-[inherit] text-sm transition-colors duration-150',
                on ? 'font-semibold text-teal' : 'font-medium text-dim hover:text-body'
              )}
            >
              <a.icon size={16} className={on ? 'text-teal' : 'text-dim'} />
              {a.label}
              {on && <span className="absolute -bottom-[1.5px] left-2 right-2 h-[2.5px] rounded-[3px] bg-teal" />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {aba === 'detalhes' ? (
          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <DadosCadastrais c={cadastro} />
          </div>
        ) : (
          <>
            {mostraCliente && <GraficosCliente clienteId={cadastro.id} />}
            {mostraCliente && (
              <ListaHistorico
                titulo="Orçamentos e vendas"
                icone={<ClipboardList size={16} className="text-teal" />}
                colunas={['Pedido', 'Data', 'Status', 'Valor']}
                h={pedidos}
                vazio="Nenhum orçamento ou venda para este cliente."
                legenda="Só orçamentos entregues e vendas concluídas contam como compra nos indicadores; os demais aparecem com valor em cinza."
                renderLinha={p => {
                  const s = statusPedido(p)
                  const clicavel = p.tipo === 'ORCAMENTO'
                  return (
                    <div
                      key={`${p.tipo}-${p.id}`}
                      data-testid="linha-pedido"
                      onClick={clicavel ? () => navigate(`/orcamentos/${p.id}`) : undefined}
                      className={clsx(linhaHistorico, clicavel && 'cursor-pointer hover:bg-cream')}
                    >
                      <div className="font-semibold text-dark">
                        {p.identificador}
                        <span className="ml-2 text-[12px] font-medium text-muted">{p.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Caixa'}</span>
                      </div>
                      <div className="text-right text-body md:text-left">{formatarData(p.data)}</div>
                      <div><Pilula tom={s.tom}>{s.label}</Pilula></div>
                      <div className={clsx('text-right font-semibold [font-variant-numeric:tabular-nums] md:text-left', p.contaComoCompra ? 'text-dark' : 'text-faint')}>
                        {BRL(p.valor)}
                      </div>
                    </div>
                  )
                }}
              />
            )}
            {mostraFornecedor && (
              <ListaHistorico
                titulo="Compras deste fornecedor"
                icone={<ClipboardList size={16} className="text-orange" />}
                colunas={['Compra', 'Data', 'Status', 'Valor']}
                h={compras}
                vazio="Nenhuma compra registrada com este fornecedor."
                legenda="Em compras com vários fornecedores, o valor é só a parte deste fornecedor."
                renderLinha={c => {
                  const s = STATUS_COMPRA[c.status]
                  return (
                    <div key={c.id} data-testid="linha-compra" className={linhaHistorico}>
                      <div className="font-semibold text-dark">{c.identificador}</div>
                      <div className="text-right text-body md:text-left">{formatarData(c.dataCompra)}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Pilula tom={s.tom}>{s.label}</Pilula>
                        {c.status === 'CONFIRMADA' && !c.pago && <Pilula tom="laranja">Não paga</Pilula>}
                      </div>
                      <div className="text-right font-semibold text-dark [font-variant-numeric:tabular-nums] md:text-left">{BRL(c.valor)}</div>
                    </div>
                  )
                }}
              />
            )}
            {!mostraCliente && !mostraFornecedor && (
              <div className="rounded-card border border-line bg-white px-5 py-8 text-center text-sm text-muted">Sem histórico para este cadastro.</div>
            )}
          </>
        )}
      </div>

      <ConfirmacaoModal
        open={confirmInativar}
        onClose={() => setConfirmInativar(false)}
        onConfirm={alternarAtivo}
        variant="danger"
        title={`Inativar "${cadastro.nome}"?`}
        icon={<Ban size={16} />}
        width={420}
        confirmLabel="Inativar"
        description="O cadastro deixa de aparecer na escolha de cliente e de fornecedor. Orçamentos, vendas e compras que já usam este cadastro continuam iguais. Você pode reativá-lo depois."
      />
    </AppLayout>
  )
}
