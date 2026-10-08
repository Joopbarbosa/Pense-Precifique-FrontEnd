import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Check, ChevronRight, Info, Package, Save, Trash2 } from 'lucide-react'
import MetodoPagamentoEscolha from '../../components/compra/MetodoPagamentoEscolha'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, MoneyInput, SegmentedControl, TextArea } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import SectionTitle from '../../components/shared/SectionTitle'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { FornecedorSelect, InsumoPicker } from '../../components/compra/Pickers'
import ModalImpactoCompra from '../../components/compra/ModalImpactoCompra'
import DescontoInput from '../../components/compra/DescontoInput'
import { erroDesconto, hojeIso, moeda, paraCampo, parseDecimal } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import { primeiroCampoInvalido, useModalErro } from '../../hooks/useModalErro'
import type { CadastroRef, CompraRequest, CompraResponse, ImpactoCompraResponse, InsumoRef, TipoDesconto } from '../../types/compra'

// V0.15.0 — "Registrar compra" (#541, RN-NOVA-4) com método de pagamento (#550, RN-NOVA-23).
// /compras/nova (compra nova) e /compras/:id/editar (só RASCUNHO). Estoque e custo só mudam ao
// confirmar; tudo é validado no backend (a mensagem de linha inválida vem pronta da API).
// #602 (RN-NOVA-32) — erro de bloqueio abre a modal de erro padrão; o campo continua vermelho.

type Linha = {
  key: string
  insumo: InsumoRef
  fornecedor: CadastroRef | null
  quantidade: string
  /** #576 — preço cheio da linha (antes do desconto). */
  precoCheio: string
  descontoTipo: TipoDesconto
  desconto: string
}

let seq = 0
const novaChave = () => `l${++seq}`

const GRADE_UNICO = 'lg:grid-cols-[1.7fr_0.9fr_1fr_1.35fr_0.9fr_40px]'
const GRADE_MULTIPLOS = 'lg:grid-cols-[1.4fr_1.3fr_0.9fr_1fr_1.35fr_0.9fr_40px]'

const inputQtd = 'h-11 w-full rounded-input border-[1.5px] bg-white px-3 font-[inherit] text-sm text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus [font-variant-numeric:tabular-nums]'

/**
 * Prévia de exibição (RN-NOVA-4: "o custo unitário da linha aparece ao vivo"; #576: o valor da linha
 * com o desconto dela). Exceção consciente à regra "nenhum cálculo no front", no mesmo espírito do
 * preview de Produção: o preço pago de verdade — com o rateio do desconto da nota — é calculado e
 * gravado pelo backend (RN-NOVA-28) e vem sempre da resposta da API.
 */
function descontoEmReais(tipo: TipoDesconto, valorTxt: string, base: number | null): number {
  const v = parseDecimal(valorTxt)
  if (v == null || base == null) return 0
  return tipo === 'VALOR' ? v : Math.round(base * v) / 100
}

function valorDaLinha(l: Linha): number | null {
  const cheio = parseDecimal(l.precoCheio)
  if (cheio == null) return null
  return Math.round((cheio - descontoEmReais(l.descontoTipo, l.desconto, cheio)) * 100) / 100
}

function previaUnitario(qtdTxt: string, valor: number | null): number | null {
  const q = parseDecimal(qtdTxt)
  if (q == null || valor == null || q <= 0) return null
  return valor / q
}

export default function FormCompraPage() {
  const { id } = useParams<{ id: string }>()
  const editando = !!id
  const navigate = useNavigate()
  const location = useLocation()

  const [carregando, setCarregando] = useState(editando)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [compra, setCompra] = useState<CompraResponse | null>(null)

  const [dataCompra, setDataCompra] = useState(hojeIso())
  const [multiplos, setMultiplos] = useState(false)
  const [fornecedor, setFornecedor] = useState<CadastroRef | null>(null)
  const [pago, setPago] = useState(false)
  const [metodoId, setMetodoId] = useState<string | null>(null)
  const [parcelas, setParcelas] = useState<number | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [descontoNotaTipo, setDescontoNotaTipo] = useState<TipoDesconto>('PERCENTUAL')
  const [descontoNota, setDescontoNota] = useState('')

  const [salvando, setSalvando] = useState<'rascunho' | 'confirmar' | null>(null)
  const { modalErro, mostrarErro } = useModalErro()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirmarAberto, setConfirmarAberto] = useState(false)
  const [impacto, setImpacto] = useState<{ impacto: ImpactoCompraResponse; compraId: string; identificador: string } | null>(null)

  useEffect(() => {
    if (!id) return
    compraService.buscar(id)
      .then(c => {
        if (c.status !== 'RASCUNHO') { navigate(`/compras/${c.id}`, { replace: true }); return }
        setCompra(c)
        setDataCompra(c.dataCompra)
        setMultiplos(c.multiplosFornecedores)
        setFornecedor(c.fornecedor)
        setPago(c.pago)
        setMetodoId(c.metodoPagamento?.id ?? null)
        setParcelas(c.parcelas)
        setObservacoes(c.observacoes ?? '')
        setDescontoNotaTipo(c.descontoNotaTipo ?? 'PERCENTUAL')
        setDescontoNota(paraCampo(c.descontoNotaInformado, 2))
        setLinhas(c.itens.map(i => ({
          key: novaChave(), insumo: i.insumo, fornecedor: i.fornecedor,
          quantidade: paraCampo(i.quantidade), precoCheio: paraCampo(i.precoCheio ?? i.precoTotal, 2),
          descontoTipo: i.descontoTipo ?? 'PERCENTUAL', desconto: paraCampo(i.descontoInformado, 2),
        })))
      })
      .catch(err => setErroCarga(extractApiError(err, 'Não foi possível carregar a compra.')))
      .finally(() => setCarregando(false))
  }, [id, navigate])

  // "Registrar compra" vindo de outra tela com insumo pré-escolhido (ex.: detalhe do insumo não tem
  // compra própria; hoje ninguém passa, mas o estado é aceito para não quebrar navegação futura).
  useEffect(() => {
    const ins = (location.state as { insumo?: InsumoRef } | null)?.insumo
    if (ins && !editando) setLinhas([{ key: novaChave(), insumo: ins, fornecedor: null, quantidade: '', precoCheio: '', descontoTipo: 'PERCENTUAL', desconto: '' }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const adicionarInsumo = (i: { id: string; identificador?: string; nome: string; marca?: string | null; unidadeMedida: string | null; ativo: boolean }) => {
    setLinhas(prev => [...prev, {
      key: novaChave(),
      insumo: { id: i.id, identificador: i.identificador ?? '', nome: i.nome, marca: i.marca ?? null, unidade: i.unidadeMedida, ativo: i.ativo },
      fornecedor: multiplos ? fornecedor : null,
      quantidade: '',
      precoCheio: '',
      descontoTipo: 'PERCENTUAL',
      desconto: '',
    }])
  }

  const alterarLinha = (key: string, patch: Partial<Linha>) => setLinhas(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
  const removerLinha = (key: string) => setLinhas(prev => prev.filter(l => l.key !== key))

  const alternarMultiplos = (sim: boolean) => {
    // Sim: cada linha começa com o fornecedor do cabeçalho (default editável). Não: o do cabeçalho vale para todas.
    if (sim && !multiplos) setLinhas(prev => prev.map(l => ({ ...l, fornecedor: l.fornecedor ?? fornecedor })))
    setMultiplos(sim)
  }

  const montarRequest = (): CompraRequest => ({
    dataCompra,
    multiplosFornecedores: multiplos,
    fornecedorId: fornecedor?.id ?? null,
    pago,
    metodoPagamentoId: pago ? metodoId : null,
    parcelas: pago ? parcelas : null,
    observacoes: observacoes.trim() || undefined,
    itens: linhas.map(l => {
      const desconto = parseDecimal(l.desconto)
      return {
        insumoId: l.insumo.id,
        fornecedorId: multiplos ? (l.fornecedor?.id ?? null) : null,
        quantidade: parseDecimal(l.quantidade),
        precoCheio: parseDecimal(l.precoCheio),
        descontoTipo: desconto ? l.descontoTipo : null,
        descontoValor: desconto || null,
      }
    }),
    descontoNotaTipo: parseDecimal(descontoNota) ? descontoNotaTipo : null,
    descontoNotaValor: parseDecimal(descontoNota) || null,
  })

  const tratarErro = (err: unknown, fallback: string) => {
    const fe: Record<string, string> = (err as { response?: { data?: { fieldErrors?: Record<string, string> } } })?.response?.data?.fieldErrors ?? {}
    setFieldErrors(fe)
    mostrarErro(err, fallback, () => primeiroCampoInvalido())
  }

  // #602 (CEN-NOVO-47) — desconto validado ao sair do campo; o backend valida de novo ao salvar.
  const chaveDesconto = (idx: number) => `itens[${idx}].descontoValor`
  const limparErro = (chave: string) => setFieldErrors(prev => {
    if (!(chave in prev)) return prev
    const { [chave]: _, ...resto } = prev
    return resto
  })
  // A modal abre uma vez por valor digitado: sair de novo do campo sem mudar nada só mantém o vermelho.
  const avisados = useRef(new Map<string, string>())
  const validarDesconto = (chave: string, e: ReturnType<typeof erroDesconto>, ariaLabel: string, valor: string) => {
    if (!e) { limparErro(chave); avisados.current.delete(chave); return }
    setFieldErrors(prev => ({ ...prev, [chave]: e.mensagem }))
    if (avisados.current.get(chave) === valor) return
    avisados.current.set(chave, valor)
    mostrarErro(e, undefined, () => document.querySelector<HTMLElement>(`input[aria-label="${ariaLabel}"]`))
  }

  const salvarRascunho = async () => {
    setSalvando('rascunho'); setFieldErrors({})
    try {
      const salvo = editando ? await compraService.atualizarRascunho(id!, montarRequest()) : await compraService.salvarRascunho(montarRequest())
      navigate(`/compras/${salvo.id}`, { state: { toast: `Rascunho ${salvo.identificador} salvo. O estoque ainda não mudou.` } })
    } catch (err) {
      tratarErro(err, 'Não foi possível salvar o rascunho.')
    } finally {
      setSalvando(null)
    }
  }

  const confirmar = async () => {
    setConfirmarAberto(false)
    setSalvando('confirmar'); setFieldErrors({})
    try {
      const r = editando ? await compraService.confirmar(id!, montarRequest()) : await compraService.confirmarNova(montarRequest())
      setImpacto({ impacto: r.impacto, compraId: r.compra.id, identificador: r.compra.identificador })
    } catch (err) {
      tratarErro(err, 'Não foi possível confirmar a compra.')
    } finally {
      setSalvando(null)
    }
  }

  // Prévia dos totais (exceção documentada acima): a divisão do desconto da nota entre as linhas é feita
  // pelo backend ao salvar; aqui entra só o valor total do desconto da nota.
  const totalCheio = linhas.reduce((s, l) => s + (parseDecimal(l.precoCheio) ?? 0), 0)
  const somaLinhas = linhas.reduce((s, l) => s + (valorDaLinha(l) ?? 0), 0)
  const descontoNotaReais = descontoEmReais(descontoNotaTipo, descontoNota, somaLinhas)
  const totalDescontos = Math.round((totalCheio - somaLinhas + descontoNotaReais) * 100) / 100
  const totalPrevia = Math.round((somaLinhas - descontoNotaReais) * 100) / 100
  const erroLinha = (idx: number, campo: 'quantidade' | 'precoCheio' | 'descontoValor') => fieldErrors[`itens[${idx}].${campo}`]
  const titulo = editando ? `Editar rascunho ${compra?.identificador ?? ''}` : 'Registrar compra'
  const idsNaCompra = linhas.map(l => l.insumo.id)

  if (carregando || erroCarga) {
    return (
      <AppLayout active="compras" compact>
        {erroCarga
          ? <div className="rounded-input border border-danger-line bg-danger-tint px-3.5 py-3 text-[13.5px] text-danger-deep">{erroCarga}</div>
          : <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando compra…</div>}
      </AppLayout>
    )
  }

  return (
    <AppLayout active="compras" compact>
      <div className="mb-[22px]">
        <div className="mb-2 flex items-center gap-[7px] text-[12.5px] text-muted">
          <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/compras')}>Minhas compras</span>
          <ChevronRight size={15} className="text-dim" />
          <span className="font-semibold text-body">{titulo}</span>
        </div>
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-dark">{titulo}</h1>
        <p className="mb-0 mt-1.5 text-[14px] text-muted">Salve como rascunho para terminar depois. O estoque e o custo dos insumos só mudam quando você confirmar.</p>
      </div>

      <div className="animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

        {/* 1 — Dados da compra */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="1" title="Dados da compra" subtitle="Quando, de quem e como foi paga." />
          <div className="grid grid-cols-1 gap-section md:grid-cols-2 xl:grid-cols-4">
            <Field label="Data da compra" required size="md">
              <input type="date" value={dataCompra} max={hojeIso()} onChange={e => setDataCompra(e.target.value)}
                className="h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus" />
            </Field>
            <Field label="Mais de um fornecedor?" group size="md">
              <SegmentedControl options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]} value={multiplos} onChange={alternarMultiplos} />
            </Field>
            <div className="md:col-span-2">
              <Field label={multiplos ? 'Fornecedor padrão das linhas' : 'Fornecedor'} opt group size="md"
                hint={multiplos ? 'Cada linha começa com este fornecedor e pode ser trocada.' : 'Vale para todos os insumos desta compra.'}>
                <FornecedorSelect value={fornecedor} onChange={setFornecedor} />
              </Field>
            </div>
            <Field label="Pagamento" group size="md">
              <SegmentedControl options={[{ value: false, label: 'Não pago' }, { value: true, label: 'Pago' }]} value={pago}
                onChange={v => { setPago(v); if (!v) setMetodoId(null) }} />
            </Field>
            {pago && (
              <div className="md:col-span-1 xl:col-span-3">
                <Field label="Como foi paga?" required group size="md">
                  <MetodoPagamentoEscolha value={metodoId} onChange={setMetodoId} salvo={compra?.metodoPagamento}
                    parcelas={parcelas} onParcelas={setParcelas} />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* 2 — Insumos */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="2" title="Insumos comprados" subtitle="Quantidade, preço cheio e o desconto de cada insumo, se teve." />

          {linhas.length > 0 && (
            <div className="mb-4 rounded-input border border-line">
              <div className={clsx('hidden gap-3 bg-cream px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim lg:grid',
                multiplos ? GRADE_MULTIPLOS : GRADE_UNICO)}>
                <span>Insumo</span>{multiplos && <span>Fornecedor</span>}<span>Quantidade</span><span>Preço cheio</span><span>Desconto</span><span>Valor / custo un.</span><span />
              </div>
              {linhas.map((l, idx) => {
                const valor = valorDaLinha(l)
                const unit = previaUnitario(l.quantidade, valor)
                const eQ = erroLinha(idx, 'quantidade')
                const eP = erroLinha(idx, 'precoCheio')
                const eD = erroLinha(idx, 'descontoValor')
                return (
                  <div key={l.key} data-testid="linha-compra" className={clsx('grid grid-cols-1 gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:items-start',
                    multiplos ? GRADE_MULTIPLOS : GRADE_UNICO)}>
                    <div className="flex min-h-11 min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-teal/10 text-teal"><Package size={16} /></span>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-dark">{l.insumo.nome}</div>
                        <div className="text-[12px] text-muted">
                          {l.insumo.identificador}{l.insumo.marca ? ` · ${l.insumo.marca}` : ''}
                          {!l.insumo.ativo && <span className="ml-1.5 font-semibold text-danger">inativo</span>}
                        </div>
                      </div>
                    </div>
                    {multiplos && (
                      <div className="min-w-0">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-faint lg:hidden">Fornecedor</span>
                        <FornecedorSelect size="sm" value={l.fornecedor} onChange={f => alterarLinha(l.key, { fornecedor: f })} placeholder="Sem fornecedor" />
                      </div>
                    )}
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-faint lg:hidden">Quantidade</span>
                      <div className="relative">
                        <input aria-label={`Quantidade de ${l.insumo.nome}`} aria-invalid={!!eQ || undefined} inputMode="decimal" value={l.quantidade} placeholder="0"
                          onChange={e => alterarLinha(l.key, { quantidade: e.target.value.replace(/[^\d.,]/g, '') })}
                          className={clsx(inputQtd, 'pr-12', eQ ? 'border-[#F2B8A6]' : 'border-line')} />
                        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[12.5px] font-semibold text-muted">{l.insumo.unidade}</span>
                      </div>
                      {eQ && <span className="mt-1 block text-[12px] text-danger-deep">{eQ}</span>}
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-faint lg:hidden">Preço cheio</span>
                      <MoneyInput size="sm" ariaLabel={`Preço cheio de ${l.insumo.nome}`} value={l.precoCheio} placeholder="0,00" invalido={!!eP}
                        onChange={v => alterarLinha(l.key, { precoCheio: v })} />
                      {eP && <span className="mt-1 block text-[12px] text-danger-deep">{eP}</span>}
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-faint lg:hidden">Desconto (opcional)</span>
                      <DescontoInput tipo={l.descontoTipo} valor={l.desconto} ariaLabel={`Desconto de ${l.insumo.nome}`} invalido={!!eD}
                        onTipo={t => { alterarLinha(l.key, { descontoTipo: t }); limparErro(chaveDesconto(idx)) }}
                        onValor={v => { alterarLinha(l.key, { desconto: v }); limparErro(chaveDesconto(idx)) }}
                        onBlur={() => validarDesconto(chaveDesconto(idx),
                          erroDesconto(l.descontoTipo, l.desconto, parseDecimal(l.precoCheio), `Linha ${idx + 1} (${l.insumo.nome})`),
                          `Desconto de ${l.insumo.nome}`, `${l.descontoTipo}:${l.desconto}:${l.precoCheio}`)} />
                      {eD && <span className="mt-1 block text-[12px] text-danger-deep">{eD}</span>}
                    </div>
                    <div className="flex min-h-11 flex-col justify-center">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-faint lg:hidden">Valor / custo unitário</span>
                      <span data-testid="valor-linha" className={clsx('text-[14px] [font-variant-numeric:tabular-nums]', valor != null ? 'font-semibold text-dark' : 'text-faint')}>
                        {valor != null ? BRL(valor) : '—'}
                      </span>
                      <span data-testid="custo-unitario-linha" className={clsx('text-[12.5px] [font-variant-numeric:tabular-nums]', unit != null ? 'font-semibold text-teal' : 'text-faint')}>
                        {unit != null ? `${moeda(Math.round(unit * 10000) / 10000)}${l.insumo.unidade ? ` / ${l.insumo.unidade}` : ''}` : ''}
                      </span>
                    </div>
                    <div className="flex min-h-11 items-center justify-end">
                      <button type="button" aria-label={`Remover ${l.insumo.nome}`} onClick={() => removerLinha(l.key)}
                        className="grid h-9 w-9 place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-danger-bg hover:text-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="max-w-[560px]">
            <InsumoPicker onSelect={adicionarInsumo} excluir={multiplos ? [] : idsNaCompra} placeholder="Adicionar insumo à compra…" />
          </div>
          {linhas.length === 0 && (
            <p className="mb-0 mt-2.5 text-[13px] text-muted">Nenhum insumo ainda. Busque acima para adicionar. Só insumos ativos aparecem.</p>
          )}
          {multiplos && (
            <p className="mb-0 mt-2.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Info size={13} /> Com mais de um fornecedor, o mesmo insumo pode aparecer em linhas de fornecedores diferentes.
            </p>
          )}

          {linhas.length > 0 && (
            <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 md:flex-row md:items-start md:justify-between">
              {/* #576 — desconto na nota: dividido entre as linhas pelo backend, proporcional ao valor de cada uma. */}
              <div className="max-w-[320px]">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Desconto na nota <span className="font-normal text-muted">(opcional)</span></span>
                <DescontoInput tipo={descontoNotaTipo} valor={descontoNota} ariaLabel="Desconto na nota"
                  invalido={!!fieldErrors.descontoNotaValor}
                  onTipo={t => { setDescontoNotaTipo(t); limparErro('descontoNotaValor') }}
                  onValor={v => { setDescontoNota(v); limparErro('descontoNotaValor') }}
                  onBlur={() => validarDesconto('descontoNotaValor', erroDesconto(descontoNotaTipo, descontoNota, somaLinhas, 'Desconto da nota'), 'Desconto na nota', `${descontoNotaTipo}:${descontoNota}:${somaLinhas}`)} />
                <span className="mt-1 block text-[12px] text-muted">Dividido entre as linhas, pelo valor de cada uma, ao salvar.</span>
              </div>
              <dl className="m-0 flex min-w-[260px] flex-col gap-1 text-[13.5px]">
                {totalDescontos > 0 && <>
                  <div className="flex justify-between gap-6"><dt className="text-muted">Total cheio</dt><dd className="m-0 [font-variant-numeric:tabular-nums]">{BRL(totalCheio)}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-muted">Descontos</dt><dd data-testid="total-descontos" className="m-0 text-orange [font-variant-numeric:tabular-nums]">− {BRL(totalDescontos)}</dd></div>
                </>}
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-[13px] font-semibold text-body">{totalDescontos > 0 ? 'Total pago' : 'Total da compra'}</dt>
                  <dd data-testid="total-compra" className="m-0 text-[22px] font-bold tracking-[-0.01em] text-teal [font-variant-numeric:tabular-nums]">{BRL(totalPrevia)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* 3 — Observações */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="3" title="Observações" />
          <Field label="Observações" opt size="md">
            <TextArea value={observacoes} onChange={setObservacoes} erro={fieldErrors.observacoes} minHeight="min-h-[72px]" placeholder="Ex: entrega combinada para terça" />
          </Field>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3 px-[26px] py-section">
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate(editando ? `/compras/${id}` : '/compras')} disabled={!!salvando}>Cancelar</Button>
            <Button variant="secondary" icon={<Save size={16} />} disabled={!!salvando} onClick={salvarRascunho}>
              {salvando === 'rascunho' ? 'Salvando…' : 'Salvar rascunho'}
            </Button>
            <Button variant="primary" icon={<Check size={16} />} disabled={!!salvando} onClick={() => setConfirmarAberto(true)}>
              {salvando === 'confirmar' ? 'Confirmando…' : 'Confirmar compra'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmacaoModal
        open={confirmarAberto}
        onClose={() => setConfirmarAberto(false)}
        onConfirm={confirmar}
        title="Confirmar a compra?"
        icon={<Check size={16} />}
        width={440}
        confirmLabel="Confirmar compra"
        description="O estoque e o custo dos insumos serão atualizados agora. Depois de confirmada, só o pagamento pode ser alterado; para desfazer, será preciso cancelar a compra."
      />

      {modalErro}

      {impacto && (
        <ModalImpactoCompra
          impacto={impacto.impacto}
          titulo={`Compra ${impacto.identificador} confirmada`}
          onClose={() => navigate(`/compras/${impacto.compraId}`, { replace: true })}
        />
      )}
    </AppLayout>
  )
}
