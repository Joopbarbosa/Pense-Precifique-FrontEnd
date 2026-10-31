import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'
import SegmentedControl from '../ui/SegmentedControl'
import MetodoPagamentoEscolha from '../compra/MetodoPagamentoEscolha'
import { empresaService } from '../../services/empresaService'
import { dataLocalIso } from '../../utils/data'
import { formatarMoeda2 } from '../../utils/formatacao'
import {
  PERCENTUAL_SINAL_PADRAO, formatarDecimal, lerDecimal, montarCorpoPagamento, percentualPorValor,
  sinalPorPercentual, validarPagamentoOrcamento,
  type ResultadoPagamento, type TipoSinalPagamento,
} from '../../utils/pagamentoOrcamento'

/**
 * V0.19.0 (PP-528, RN-NOVA-37 a 42, UC-NOVO-4) — passo "Pagamento" da aprovação: forma (métodos ativos do
 * cadastro), sinal (padrão 50%, % e R$ se recalculam) e prazos. Só prepara e valida; a gravação do
 * pagamento é da transação da aprovação (#1174), que monta o corpo com `onChange(..., corpo)`.
 */
export default function PassoPagamento({ total, onChange }: {
  total: number
  onChange?: (resultado: ResultadoPagamento, corpo: Record<string, unknown>) => void
}) {
  const hoje = useMemo(() => dataLocalIso(), [])
  const [ativosIds, setAtivosIds] = useState<string[] | null>(null)
  const [metodoId, setMetodoId] = useState<string | null>(null)
  const [temSinal, setTemSinal] = useState(false)
  const [tipo, setTipo] = useState<TipoSinalPagamento>('PERCENTUAL')
  const [percentualTexto, setPercentualTexto] = useState(String(PERCENTUAL_SINAL_PADRAO))
  const [valorTexto, setValorTexto] = useState(() => formatarDecimal(sinalPorPercentual(total, PERCENTUAL_SINAL_PADRAO)))
  const [sinalAte, setSinalAte] = useState('')
  const [vencimentoSaldo, setVencimentoSaldo] = useState('')
  const [tocou, setTocou] = useState(false)

  useEffect(() => {
    empresaService.listarMetodosPagamento()
      .then(l => setAtivosIds(l.filter(m => m.ativo).map(m => m.id))).catch(() => setAtivosIds([]))
  }, [])

  const entrada = {
    total, metodoId, metodosAtivosIds: ativosIds ?? [], temSinal, tipoSinal: tipo,
    percentualTexto, valorTexto, sinalAte, vencimentoSaldo, hoje,
  }
  const resultado = validarPagamentoOrcamento(entrada)
  const corpo = montarCorpoPagamento(entrada)
  const resumo = resultado.resumo

  useEffect(() => {
    onChange?.(resultado, corpo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(corpo), JSON.stringify(resultado.erros)])

  const mudarPercentual = (texto: string) => {
    const limpo = texto.replace(/[^\d.,]/g, '')
    setPercentualTexto(limpo)
    const p = lerDecimal(limpo)
    if (p !== null && p >= 1 && p <= 100) setValorTexto(formatarDecimal(sinalPorPercentual(total, p)))
  }
  const mudarValor = (texto: string) => {
    const limpo = texto.replace(/[^\d.,]/g, '')
    setValorTexto(limpo)
    const v = lerDecimal(limpo)
    if (v !== null && v > 0 && v <= total) setPercentualTexto(formatarDecimal(percentualPorValor(total, v)))
  }

  const erro = (campo: string) => (tocou ? resultado.erros[campo] : undefined)
  const campoCls = (temErro: boolean) => clsx(
    'h-[46px] rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[15px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/12',
    temErro ? 'border-danger' : 'border-line')
  const Erro = ({ msg }: { msg?: string }) => msg
    ? <div className="mt-2 flex items-center gap-[5px] text-[13px] text-danger"><AlertCircle size={13} />{msg}</div> : null

  return (
    <div className="flex flex-col gap-5" onBlurCapture={() => setTocou(true)}>
      <div>
        <div className="mb-2 text-[13px] font-semibold text-body">Forma de pagamento</div>
        <MetodoPagamentoEscolha value={metodoId} onChange={setMetodoId} />
        <Erro msg={erro('metodoPagamentoId')} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14.5px] font-semibold text-dark">Cobrar entrada (sinal)?</span>
          <SegmentedControl options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
            value={temSinal} onChange={setTemSinal} height="h-10" optionWidth="w-[60px]" textSize="text-sm" className="shrink-0" />
        </div>

        {temSinal && (
          <div className="mt-4 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedControl options={[{ value: 'PERCENTUAL' as TipoSinalPagamento, label: '%' }, { value: 'VALOR' as TipoSinalPagamento, label: 'R$' }]}
                value={tipo} onChange={setTipo} height="h-[46px]" optionWidth="w-[46px]" textSize="text-sm" className="shrink-0" />
              {tipo === 'PERCENTUAL'
                ? <input aria-label="Percentual do sinal" value={percentualTexto} onChange={e => mudarPercentual(e.target.value)}
                    inputMode="decimal" className={clsx(campoCls(!!erro('sinal')), 'min-w-0 flex-1 font-semibold')} />
                : <input aria-label="Valor do sinal" value={valorTexto} onChange={e => mudarValor(e.target.value)}
                    inputMode="decimal" className={clsx(campoCls(!!erro('sinal')), 'min-w-0 flex-1 font-semibold')} />}
            </div>
            <Erro msg={erro('sinal')} />
            <label className="block">
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Sinal até</span>
              <input type="date" aria-label="Sinal até" value={sinalAte} min={hoje} onChange={e => setSinalAte(e.target.value)}
                className={clsx(campoCls(!!erro('sinalAte')), 'w-full max-w-[220px]')} />
              <Erro msg={erro('sinalAte')} />
            </label>
          </div>
        )}
      </div>

      {(!temSinal || (resumo && resumo.geraParcelaSaldo)) && (
        <label className="block">
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Vencimento do saldo <span className="font-normal text-muted">(vazio = hoje)</span></span>
          <input type="date" aria-label="Vencimento do saldo" value={vencimentoSaldo} min={hoje} onChange={e => setVencimentoSaldo(e.target.value)}
            className={clsx(campoCls(!!erro('vencimentoSaldo')), 'w-full max-w-[220px]')} />
          <Erro msg={erro('vencimentoSaldo')} />
        </label>
      )}

      <div className="flex flex-col gap-1.5 rounded-input border border-dashed border-teal/35 bg-teal/6 px-3.5 py-3 text-[13.5px] text-body">
        {temSinal && <div className="flex justify-between"><span>Sinal</span><b className="text-teal">{formatarMoeda2(resumo?.valorSinal ?? 0)}</b></div>}
        <div className="flex justify-between">
          <span>{temSinal ? 'Saldo' : 'A receber'}</span>
          <b className="text-dark">{formatarMoeda2(resumo?.saldo ?? total)}</b>
        </div>
        {temSinal && resumo && !resumo.geraParcelaSaldo && <div className="text-muted">Sinal de 100%: não há parcela de saldo.</div>}
      </div>
    </div>
  )
}
