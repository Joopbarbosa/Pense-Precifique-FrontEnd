import { useEffect, useState } from 'react'
import { AlertTriangle, Ban } from 'lucide-react'
import { Button, ModalShell, TextArea } from '../ui'
import Spinner from '../ui/Spinner'
import { moeda4, qtd } from './formato'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import type { CompraConfirmacaoResponse, CompraResponse, SimulacaoCancelamentoResponse } from '../../types/compra'

/**
 * #544 (RN-NOVA-9) — cancelar compra confirmada. Antes de pedir a observação, simula no backend
 * (`simular-cancelamento`, nada é gravado): BLOQUEIO por estoque negativo proibido impede tudo; AVISO
 * de custo mantido exige confirmação explícita (`confirmarManterCusto`).
 */
export default function ModalCancelarCompra({ compra, onClose, onCancelada }: {
  compra: CompraResponse
  onClose: () => void
  onCancelada: (r: CompraConfirmacaoResponse) => void
}) {
  const [simulacao, setSimulacao] = useState<SimulacaoCancelamentoResponse | null>(null)
  const [erroSimulacao, setErroSimulacao] = useState<string | null>(null)
  const [observacao, setObservacao] = useState('')
  const [manterCusto, setManterCusto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroCampo, setErroCampo] = useState<string | undefined>()

  useEffect(() => {
    compraService.simularCancelamento(compra.id).then(setSimulacao)
      .catch(err => setErroSimulacao(extractApiError(err, 'Não foi possível verificar o cancelamento.')))
  }, [compra.id])

  const temAvisos = (simulacao?.avisos.length ?? 0) > 0

  const cancelar = async () => {
    setEnviando(true); setErro(null); setErroCampo(undefined)
    try {
      onCancelada(await compraService.cancelar(compra.id, observacao, temAvisos && manterCusto))
    } catch (err) {
      const fe = (err as { response?: { data?: { fieldErrors?: Record<string, string> } } })?.response?.data?.fieldErrors
      if (fe?.observacao) setErroCampo(fe.observacao)
      else setErro(extractApiError(err, 'Não foi possível cancelar a compra.'))
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = simulacao && !simulacao.podeCancelar

  return (
    <ModalShell open onClose={onClose} title={`Cancelar a compra ${compra.identificador}?`} icon={<Ban size={16} />}
      iconBg="rgba(192,73,43,0.10)" iconColor="#C0492B" width={560}
      footer={bloqueado || erroSimulacao ? <Button variant="ghost" onClick={onClose}>Fechar</Button> : <>
        <Button variant="ghost" onClick={onClose} disabled={enviando}>Voltar</Button>
        <Button variant="danger" onClick={cancelar} disabled={!simulacao || enviando || (temAvisos && !manterCusto)}>
          {enviando ? 'Cancelando…' : 'Cancelar compra'}
        </Button>
      </>}>
      {!simulacao && !erroSimulacao ? (
        <div className="flex items-center gap-2.5 py-4 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Verificando estoque e custos…</div>
      ) : erroSimulacao ? (
        <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">{erroSimulacao}</div>
      ) : bloqueado ? (
        <div className="flex flex-col gap-3">
          <div role="alert" className="flex items-start gap-2.5 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            Não é possível cancelar: o estoque ficaria negativo em insumos que não permitem estoque negativo. Nada foi alterado.
          </div>
          <div className="rounded-input border border-line">
            {simulacao!.bloqueios.map((b, k) => (
              <div key={b.insumoId} data-testid="bloqueio-cancelamento" className={`px-4 py-2.5 text-[13px] ${k > 0 ? 'border-t border-line' : ''}`}>
                <span className="font-semibold text-dark">{b.nome}</span>
                <span className="ml-2 text-muted">estoque {qtd(b.estoqueAtual)} {b.unidade} − {qtd(b.quantidadeEstornada)} = </span>
                <span className="font-semibold text-danger">{qtd(b.estoqueResultante)} {b.unidade}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[13.5px] leading-[1.55] text-body">
            O estoque comprado volta a sair dos insumos e o custo volta ao valor de antes desta compra. A compra fica como
            Cancelada e pode ser duplicada depois.
          </p>
          {temAvisos && (
            <div className="rounded-input border border-warning/30 bg-warning-bg px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-warning"><AlertTriangle size={15} /> Estes insumos vão manter o custo atual</div>
              <p className="m-0 mb-2 text-[12.5px] text-body">O custo deles mudou depois desta compra (houve outra compra), então não dá para voltar ao valor anterior.</p>
              {simulacao!.avisos.map(a => (
                <div key={a.insumoId} data-testid="aviso-cancelamento" className="text-[13px] text-body">
                  <span className="font-semibold text-dark">{a.nome}</span>: fica em {moeda4(a.custoAtual)} (antes desta compra era {moeda4(a.custoAntesDaCompra)})
                </div>
              ))}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-dark">
                <input type="checkbox" checked={manterCusto} onChange={e => setManterCusto(e.target.checked)} className="h-4 w-4 accent-teal" />
                Entendi, cancelar mantendo o custo atual desses insumos
              </label>
            </div>
          )}
          <label className="block">
            <span className="mb-[7px] block text-[13px] font-semibold text-body">Motivo do cancelamento <span className="text-orange">*</span></span>
            <TextArea value={observacao} onChange={setObservacao} minimo={30} erro={erroCampo} rows={3} textSize="text-sm"
              placeholder="Ex: o fornecedor entregou o pedido errado e a compra foi devolvida" />
          </label>
          {erro && <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-2.5 text-[13px] text-danger-deep">{erro}</div>}
        </div>
      )}
    </ModalShell>
  )
}
