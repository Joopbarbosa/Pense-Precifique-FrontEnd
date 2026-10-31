import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Wallet } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import SegmentedControl from '../../components/ui/SegmentedControl'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import ModalBaixa from '../../components/financeiro/ModalBaixa'
import { useToast } from '../../hooks/useToast'
import { financeiroService } from '../../services/financeiroService'
import { BRL } from '../../components/venda/formato'
import { formatarData } from '../../utils/data'
import { extractApiError } from '../../utils/apiError'
import {
  MENSAGEM_SEM_LANCAMENTOS, mensagemListaVazia, periodoDoMes, podeBaixar, podeDesfazer,
  rotuloAcaoBaixa, rotuloOrigem, rotuloParcela, rotuloSituacao,
} from '../../utils/financeiro'
import type { FiltroSituacaoParcela, ListaParcelas, ParcelaFinanceira, TipoLancamento } from '../../types/financeiro'

const OPCOES_TIPO = [
  { value: 'A_PAGAR' as TipoLancamento, label: 'A pagar' },
  { value: 'A_RECEBER' as TipoLancamento, label: 'A receber' },
]

const OPCOES_SITUACAO = (tipo: TipoLancamento) => [
  { value: 'EM_ABERTO' as FiltroSituacaoParcela, label: 'Em aberto' },
  { value: 'VENCIDAS' as FiltroSituacaoParcela, label: 'Vencidas' },
  { value: 'BAIXADAS' as FiltroSituacaoParcela, label: tipo === 'A_PAGAR' ? 'Pagas' : 'Recebidas' },
  { value: 'TODAS' as FiltroSituacaoParcela, label: 'Todas' },
]

/**
 * V0.19.0 (PP-520, F1) — Financeiro: listas "A pagar" e "A receber". "Vencida", "Vence hoje", totais e rótulos
 * vêm prontos da API; a tela só exibe e dispara a baixa/desfazer.
 */
export default function FinanceiroPage() {
  const [tipo, setTipo] = useState<TipoLancamento>('A_PAGAR')
  const [situacao, setSituacao] = useState<FiltroSituacaoParcela>('EM_ABERTO')
  const mes = useMemo(() => periodoDoMes(), [])
  const [de, setDe] = useState(mes.de)
  const [ate, setAte] = useState(mes.ate)
  const [lista, setLista] = useState<ListaParcelas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState<ParcelaFinanceira | null>(null)
  const [desfazendo, setDesfazendo] = useState<ParcelaFinanceira | null>(null)
  const [processando, setProcessando] = useState(false)
  const { toast, setToast } = useToast()
  const [toastErro, setToastErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setLista(await financeiroService.listarParcelas({ tipo, de, ate, situacao }))
      setErro(null)
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível carregar o financeiro.'))
    } finally {
      setCarregando(false)
    }
  }, [tipo, de, ate, situacao])

  useEffect(() => { void carregar() }, [carregar])

  async function desfazer() {
    if (!desfazendo) return
    setProcessando(true)
    try {
      await financeiroService.desfazerBaixa(desfazendo.id)
      setDesfazendo(null)
      setToast('Baixa desfeita.')
      await carregar()
    } catch (e) {
      setDesfazendo(null)
      setToastErro(extractApiError(e, 'Não foi possível desfazer a baixa.'))
      setTimeout(() => setToastErro(null), 4000)
    } finally {
      setProcessando(false)
    }
  }

  const baixadaRotulo = tipo === 'A_PAGAR' ? 'Paga' : 'Recebida'

  return (
    <AppLayout active="financeiro">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-dark">Financeiro</h1>
        <SegmentedControl options={OPCOES_TIPO} value={tipo} onChange={t => { setTipo(t); setSituacao('EM_ABERTO') }} display="inline-flex" optionWidth="whitespace-nowrap px-4" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl options={OPCOES_SITUACAO(tipo)} value={situacao} onChange={setSituacao} display="inline-flex" optionWidth="whitespace-nowrap px-4" />
        <label className="flex items-center gap-2 text-[13.5px] text-body">De
          <input type="date" aria-label="Período de" value={de} max={ate} onChange={e => e.target.value && setDe(e.target.value)} className="h-9 rounded-input border-[1.5px] border-line bg-white px-2.5 text-[14px]" />
        </label>
        <label className="flex items-center gap-2 text-[13.5px] text-body">até
          <input type="date" aria-label="Período até" value={ate} min={de} onChange={e => e.target.value && setAte(e.target.value)} className="h-9 rounded-input border-[1.5px] border-line bg-white px-2.5 text-[14px]" />
        </label>
      </div>

      {lista && (
        <div className="mb-4 flex flex-wrap gap-3" data-testid="totais-financeiro">
          <div className="rounded-input border border-line bg-white px-4 py-3">
            <div className="text-[12.5px] font-medium text-muted">Em aberto</div>
            <div className="text-[20px] font-bold text-dark" data-testid="total-em-aberto">{BRL(lista.totalEmAberto)}</div>
          </div>
          <div className={clsx('rounded-input border px-4 py-3', lista.totalVencido > 0 ? 'border-danger-line bg-danger-bg' : 'border-line bg-white')}>
            <div className={clsx('text-[12.5px] font-medium', lista.totalVencido > 0 ? 'text-danger-deep' : 'text-muted')}>Vencido</div>
            <div className={clsx('text-[20px] font-bold', lista.totalVencido > 0 ? 'text-danger-deep' : 'text-dark')} data-testid="total-vencido">{BRL(lista.totalVencido)}</div>
          </div>
        </div>
      )}

      {carregando && !lista && <div className="flex justify-center py-12"><Spinner /></div>}
      {erro && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-input border border-danger-line bg-danger-bg px-4 py-3 text-[14px] text-danger-deep">
          {erro}
          <Button variant="secondary" size="sm" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      )}

      {!erro && lista && lista.vazioDeLancamentos && (
        <EmptyState icon={<Wallet size={28} />} title="Nenhum lançamento ainda" description={MENSAGEM_SEM_LANCAMENTOS} />
      )}
      {!erro && lista && !lista.vazioDeLancamentos && lista.itens.length === 0 && (
        <EmptyState icon={<Wallet size={28} />} title={mensagemListaVazia(tipo)} compact />
      )}

      {!erro && lista && lista.itens.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={tipo === 'A_PAGAR' ? 'Contas a pagar' : 'Contas a receber'}>
          {lista.itens.map(p => {
            const vencida = p.situacaoExibida === 'VENCIDA'
            return (
              <li key={p.id} data-testid="parcela-financeira" data-situacao={p.situacaoExibida}
                className={clsx('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-input border px-4 py-3',
                  vencida ? 'border-danger-line bg-danger-bg' : 'border-line bg-white')}>
                <div className="min-w-[200px] flex-1">
                  <div className="text-[15px] font-semibold text-dark">{p.descricao}</div>
                  <div className="text-[13px] text-muted">
                    {rotuloOrigem(p.origem)} · Parcela {rotuloParcela(p)} · vence {formatarData(p.vencimento)}
                    {p.dataBaixa && ` · ${baixadaRotulo.toLowerCase()} em ${formatarData(p.dataBaixa)}${p.metodoPagamentoNome ? ` (${p.metodoPagamentoNome})` : ''}`}
                  </div>
                </div>
                <span className={clsx('text-[12.5px] font-semibold', vencida ? 'text-danger-deep' : 'text-muted')} data-testid="situacao-parcela">
                  {vencida && p.rotulo ? p.rotulo : (p.rotulo && p.situacaoExibida === 'VENCE_HOJE' ? p.rotulo : rotuloSituacao(p.situacaoExibida))}
                </span>
                <div className="w-28 text-right text-[16px] font-bold text-dark">{BRL(p.valor)}</div>
                {podeBaixar(p) && <Button size="sm" onClick={() => setBaixando(p)}>{rotuloAcaoBaixa(p.tipo)}</Button>}
                {podeDesfazer(p) && <Button size="sm" variant="ghost" onClick={() => setDesfazendo(p)}>Desfazer</Button>}
              </li>
            )
          })}
        </ul>
      )}

      <ModalBaixa parcela={baixando} onClose={() => setBaixando(null)}
        onBaixada={() => { setBaixando(null); setToast(tipo === 'A_PAGAR' ? 'Pagamento registrado.' : 'Recebimento registrado.'); void carregar() }} />
      <ConfirmacaoModal open={!!desfazendo} onClose={() => setDesfazendo(null)} onConfirm={() => void desfazer()}
        title="Desfazer baixa?" description="Isso muda o realizado do período." confirmLabel="Desfazer baixa" confirmingLabel="Desfazendo..." confirming={processando} variant="danger" />
      <Toast message={toast} />
      <Toast message={toastErro} variant="error" />
    </AppLayout>
  )
}
