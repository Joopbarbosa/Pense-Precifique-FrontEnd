import { formatarData, dataLocalIso } from '../../utils/data'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight, PackageCheck } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Field } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { PrevisaoTag } from '../../components/compra/PrevisaoTag'
import ModalImpactoCompra from '../../components/compra/ModalImpactoCompra'
import { moeda, parseDecimal, qtd } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { compraService } from '../../services/compraService'
import { useModalErro } from '../../hooks/useModalErro'
import { extractApiError } from '../../utils/apiError'
import type { CompraConfirmacaoResponse, CompraResponse, CompraResumoResponse } from '../../types/compra'

// V0.17.0 — #959 (RN-NOVA-7, UC-NOVO-4): "Entrada de compras". Lista as compras pendentes de recebimento
// (previsão mais antiga primeiro, atrasadas em destaque); ao escolher uma, a artesã confere a quantidade
// recebida de cada item (o preço unitário pago não muda) e a data do recebimento. A entrada vale para a
// compra inteira: não existe entrada parcial. Contas e validações são do backend.

const dateInput = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus'

export default function EntradaComprasPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { modalErro, mostrarErro } = useModalErro()
  const [pendentes, setPendentes] = useState<CompraResumoResponse[] | null>(null)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [escolhida, setEscolhida] = useState<CompraResponse | null>(null)
  const [recebidas, setRecebidas] = useState<Record<string, string>>({})
  const [dataRecebimento, setDataRecebimento] = useState(dataLocalIso())
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CompraConfirmacaoResponse | null>(null)

  const abrir = useCallback(async (id: string) => {
    try {
      const c = await compraService.buscar(id)
      if (c.status !== 'PENDENTE_RECEBIMENTO') { navigate(`/compras/${c.id}`, { replace: true }); return }
      setEscolhida(c)
      setRecebidas(Object.fromEntries(c.itens.map(i => [i.id, qtdCampo(i.quantidade)])))
      setDataRecebimento(dataLocalIso())
    } catch (err) {
      mostrarErro(err, 'Não foi possível abrir a compra.')
    }
  }, [navigate, mostrarErro])

  useEffect(() => {
    compraService.listar(0, 100, { status: 'PENDENTE_RECEBIMENTO', sort: 'dataCompra,asc' })
      .then(p => setPendentes(p.content))
      .catch(err => setErroLista(extractApiError(err, 'Não foi possível carregar as compras pendentes.')))
  }, [])

  const idDaUrl = params.get('compra')
  useEffect(() => { if (idDaUrl) abrir(idDaUrl) }, [idDaUrl, abrir])

  // Previsão mais antiga primeiro (as atrasadas vêm naturalmente na frente).
  const ordenadas = useMemo(
    () => [...(pendentes ?? [])].sort((a, b) => (a.previsaoEntrega ?? '9999').localeCompare(b.previsaoEntrega ?? '9999')),
    [pendentes])

  const confirmar = async () => {
    if (!escolhida) return
    setEnviando(true)
    try {
      const r = await compraService.darEntrada(escolhida.id, {
        dataRecebimento,
        itens: escolhida.itens.map(i => ({ itemId: i.id, quantidadeRecebida: parseDecimal(recebidas[i.id] ?? '') ?? 0 })),
      })
      setResultado(r)
    } catch (err) {
      mostrarErro(err, 'Não foi possível dar entrada na compra.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AppLayout active="compras" compact>
      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/compras')}>Minhas compras</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="font-semibold text-body">Entrada de compras</span>
      </div>
      <div className="mb-5">
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-dark">Entrada de compras</h1>
        <p className="mb-0 mt-1.5 text-[14px] text-muted">
          {escolhida
            ? `Confira o que chegou da compra ${escolhida.identificador}. A entrada vale para a compra inteira.`
            : 'Escolha a compra que chegou. O estoque e o custo dos insumos só mudam quando você confirma a entrada.'}
        </p>
      </div>

      {!escolhida ? (
        pendentes === null && !erroLista ? (
          <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando compras…</div>
        ) : erroLista ? (
          <div role="alert" className="rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">{erroLista}</div>
        ) : ordenadas.length === 0 ? (
          <EmptyState icon={<PackageCheck size={20} />} title="Nenhuma compra pendente de recebimento"
            description="Quando você registrar uma compra com entrega não imediata, ela aparece aqui até chegar." />
        ) : (
          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {ordenadas.map(c => (
              <div key={c.id} data-testid="compra-pendente" className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[14.5px] font-bold text-dark">{c.identificador}</span>
                    <PrevisaoTag previsao={c.previsaoEntrega} diasAtraso={c.diasAtraso} size="sm" />
                  </div>
                  <div className="mt-1 truncate text-[13px] text-muted">
                    {c.fornecedores.length ? c.fornecedores.join(', ') : 'Sem fornecedor'} · {c.resumoItens} · {BRL(c.total)}
                  </div>
                </div>
                <Button variant="primary" icon={<PackageCheck size={16} />} onClick={() => abrir(c.id)}>Dar entrada</Button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="border-b border-line px-[26px] py-5">
            <div className="grid grid-cols-1 gap-section md:grid-cols-2 xl:grid-cols-4">
              <Field label="Data do recebimento" required size="md" hint="Pode ser uma data anterior (chegou ontem). A entrada vale no momento em que você confirma.">
                <input type="date" aria-label="Data do recebimento" value={dataRecebimento}
                  min={escolhida.dataCompra} max={dataLocalIso()} onChange={e => setDataRecebimento(e.target.value)} className={dateInput} />
              </Field>
              <div className="text-[13.5px] text-muted md:col-span-1 xl:col-span-3">
                <div><strong className="font-semibold text-dark">Compra</strong> {escolhida.identificador} de {formatarData(escolhida.dataCompra)}</div>
                <div>
                  <strong className="font-semibold text-dark">Fornecedor</strong>{' '}
                  {escolhida.fornecedor?.nome ?? Array.from(new Set(escolhida.itens.map(i => i.fornecedor?.nome).filter(Boolean))).join(', ') ?? '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="px-[26px] py-5">
            <div className="hidden gap-3 bg-cream px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim lg:grid lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
              <span>Insumo</span><span>Quantidade pedida</span><span>Preço unitário pago</span><span>Quantidade recebida</span>
            </div>
            {escolhida.itens.map((i, idx) => (
              <div key={i.id} data-testid="item-entrada" className="grid grid-cols-1 gap-2 border-b border-line px-4 py-3 last:border-b-0 lg:grid-cols-[2fr_1fr_1fr_1.2fr] lg:items-center lg:gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-dark">{i.insumo.nome}</div>
                  {i.insumo.marca && <div className="text-[12px] text-muted">{i.insumo.marca}</div>}
                </div>
                <div className="text-[14px] text-body [font-variant-numeric:tabular-nums]">{qtd(i.quantidade)} {i.insumo.unidade ?? ''}</div>
                <div className="text-[14px] text-body [font-variant-numeric:tabular-nums]">{moeda(i.precoUnitario)}</div>
                <input inputMode="decimal" aria-label={`Quantidade recebida da linha ${idx + 1}`} value={recebidas[i.id] ?? ''}
                  onChange={e => setRecebidas(prev => ({ ...prev, [i.id]: e.target.value }))} className={dateInput} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3 px-[26px] pb-6">
            <Button variant="ghost" icon={<ArrowLeft size={16} />} disabled={enviando}
              onClick={() => { setEscolhida(null); navigate('/compras/entrada', { replace: true }) }}>Voltar</Button>
            <Button variant="primary" icon={enviando ? <Spinner size={15} /> : <Check size={16} />} disabled={enviando} onClick={confirmar}>
              {enviando ? 'Confirmando…' : 'Confirmar entrada'}
            </Button>
          </div>
        </div>
      )}

      {modalErro}
      {resultado && (
        <ModalImpactoCompra impacto={resultado.impacto} titulo={`Entrada da compra ${resultado.compra.identificador} registrada`}
          onClose={() => navigate(`/compras/${resultado.compra.id}`, { replace: true })} />
      )}
    </AppLayout>
  )
}

function qtdCampo(n: number | null): string {
  return n == null ? '' : String(n).replace('.', ',')
}
