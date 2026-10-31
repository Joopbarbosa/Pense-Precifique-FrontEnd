import { useEffect, useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Field from '../ui/Field'
import { financeiroService } from '../../services/financeiroService'
import { empresaService } from '../../services/empresaService'
import { rotuloMetodoPagamento } from '../../constants/metodoPagamentoConfiguravel'
import { BRL } from '../venda/formato'
import { formatarData, dataLocalIso } from '../../utils/data'
import { extractApiError } from '../../utils/apiError'
import { rotuloAcaoBaixa, rotuloParcela } from '../../utils/financeiro'
import type { ParcelaFinanceira } from '../../types/financeiro'
import type { MetodoPagamentoConfiguravelResponse } from '../../types/empresa'

interface Props {
  parcela: ParcelaFinanceira | null
  onClose: () => void
  onBaixada: (p: ParcelaFinanceira) => void
}

/** Baixa com um toque (RN-NOVA-3): data padrão hoje + forma de pagamento ativa. Valida no servidor. */
export default function ModalBaixa({ parcela, onClose, onBaixada }: Props) {
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[]>([])
  const [metodoId, setMetodoId] = useState('')
  const [data, setData] = useState(dataLocalIso())
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!parcela) return
    setData(dataLocalIso()); setErro(null); setMetodoId('')
    setCarregando(true)
    empresaService.listarMetodosPagamento()
      .then(lista => setMetodos(lista.filter(m => m.ativo)))
      .catch(() => setErro('Não foi possível carregar as formas de pagamento.'))
      .finally(() => setCarregando(false))
  }, [parcela])

  if (!parcela) return null
  const acao = rotuloAcaoBaixa(parcela.tipo)

  async function confirmar() {
    if (!parcela) return
    if (!metodoId) { setErro('Escolha a forma de pagamento.'); return }
    setEnviando(true); setErro(null)
    try {
      onBaixada(await financeiroService.baixar(parcela.id, { dataBaixa: data || undefined, metodoPagamentoId: metodoId }))
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível registrar a baixa.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title={acao}
      subtitle={`${parcela.descricao} · ${rotuloParcela(parcela)} · vence ${formatarData(parcela.vencimento)} · ${BRL(parcela.valor)}`}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando || carregando} data-testid="confirmar-baixa">{enviando ? 'Salvando...' : `Confirmar (${acao})`}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <Field label="Data" required>
          <input type="date" aria-label="Data da baixa" value={data} max={dataLocalIso()} onChange={e => setData(e.target.value)}
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] text-dark outline-hidden focus:border-teal" />
        </Field>
        <Field label="Forma de pagamento" required>
          <select aria-label="Forma de pagamento" value={metodoId} onChange={e => setMetodoId(e.target.value)} disabled={carregando}
            className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] text-dark outline-hidden focus:border-teal">
            <option value="">Selecione</option>
            {metodos.map(m => <option key={m.id} value={m.id}>{rotuloMetodoPagamento(m.tipo, m.nome)}</option>)}
          </select>
        </Field>
        {erro && <p role="alert" className="m-0 text-[13.5px] font-medium text-danger">{erro}</p>}
      </div>
    </ModalShell>
  )
}
