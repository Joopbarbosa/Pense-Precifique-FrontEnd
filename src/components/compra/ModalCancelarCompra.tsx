import { useEffect, useState } from 'react'
import { AlertTriangle, Ban } from 'lucide-react'
import { Button, ModalErro, ModalShell, TextArea } from '../ui'
import Spinner from '../ui/Spinner'
import { moeda, qtd } from './formato'
import { compraService } from '../../services/compraService'
import { extractApiError, type ErroExplicado } from '../../utils/apiError'
import { useModalErro } from '../../hooks/useModalErro'
import type { CompraConfirmacaoResponse, CompraResponse, SimulacaoCancelamentoResponse } from '../../types/compra'

/**
 * #544 (RN-NOVA-9) — cancelar compra confirmada. Antes de pedir a observação, simula no backend
 * (`simular-cancelamento`, nada é gravado): BLOQUEIO por estoque negativo proibido impede tudo; AVISO
 * de custo mantido exige confirmação explícita (`confirmarManterCusto`).
 * #602 (RN-NOVA-32, CEN-NOVO-49) — o BLOQUEIO aparece na modal de erro padrão. Os textos repetem os do
 * backend (`CompraService.cancelar`), que devolve o mesmo erro se a pessoa tentar cancelar assim mesmo.
 */
function erroBloqueio(s: SimulacaoCancelamentoResponse): ErroExplicado {
  return {
    titulo: 'Cancelamento bloqueado pelo estoque',
    mensagem: `Não é possível cancelar: o estoque ficaria negativo em ${s.bloqueios.map(b => b.nome).join(', ')}, que não permite estoque negativo.`,
    motivo: 'Cancelar a compra tira do estoque a quantidade que ela deu entrada. Parte disso já foi usada, e o insumo está marcado para não aceitar estoque negativo.',
    comoResolver: 'Ajuste o estoque do insumo (edição manual) ou marque no insumo que ele aceita estoque negativo, e tente cancelar de novo.',
    itens: s.bloqueios.map(b => `${b.nome}: estoque ${qtd(b.estoqueAtual)} − ${qtd(b.quantidadeEstornada)} = ${qtd(b.estoqueResultante)} ${b.unidade}`),
  }
}

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
  const { modalErro, mostrarErro } = useModalErro()
  const [erroCampo, setErroCampo] = useState<string | undefined>()

  useEffect(() => {
    compraService.simularCancelamento(compra.id).then(setSimulacao)
      .catch(err => setErroSimulacao(extractApiError(err, 'Não foi possível verificar o cancelamento.')))
  }, [compra.id])

  const temAvisos = (simulacao?.avisos.length ?? 0) > 0

  const cancelar = async () => {
    setEnviando(true); setErroCampo(undefined)
    try {
      onCancelada(await compraService.cancelar(compra.id, observacao, temAvisos && manterCusto))
    } catch (err) {
      const fe = (err as { response?: { data?: { fieldErrors?: Record<string, string> } } })?.response?.data?.fieldErrors
      if (fe?.observacao) setErroCampo(fe.observacao)
      mostrarErro(err, 'Não foi possível cancelar a compra.', () => document.querySelector<HTMLElement>('[aria-invalid="true"]'))
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = simulacao && !simulacao.podeCancelar

  if (bloqueado) return <ModalErro erro={erroBloqueio(simulacao)} onOk={onClose} />

  return (
    <ModalShell open onClose={onClose} title={`Cancelar a compra ${compra.identificador}?`} icon={<Ban size={16} />}
      iconBg="rgba(192,73,43,0.10)" iconColor="#C0492B" width={560}
      footer={erroSimulacao ? <Button variant="ghost" onClick={onClose}>Fechar</Button> : <>
        <Button variant="ghost" onClick={onClose} disabled={enviando}>Voltar</Button>
        <Button variant="danger" onClick={cancelar} disabled={!simulacao || enviando || (temAvisos && !manterCusto)}>
          {enviando ? 'Cancelando…' : 'Cancelar compra'}
        </Button>
      </>}>
      {!simulacao && !erroSimulacao ? (
        <div className="flex items-center gap-2.5 py-4 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Verificando estoque e custos…</div>
      ) : erroSimulacao ? (
        <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13.5px] text-danger-deep">{erroSimulacao}</div>
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
                  <span className="font-semibold text-dark">{a.nome}</span>: fica em {moeda(a.custoAtual)} (antes desta compra era {moeda(a.custoAntesDaCompra)})
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
        </div>
      )}
      {modalErro}
    </ModalShell>
  )
}
