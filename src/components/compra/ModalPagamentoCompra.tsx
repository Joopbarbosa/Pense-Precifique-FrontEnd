import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Button, Field, ModalShell, SegmentedControl } from '../ui'
import MetodoPagamentoEscolha from './MetodoPagamentoEscolha'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import type { CompraResponse } from '../../types/compra'

// V0.15.0 (#550) — só o pagamento muda numa compra confirmada (Decisão 14). Usado pelo detalhe e pelo
// menu da listagem (#566).
export default function ModalPagamento({ compra, onClose, onSalvo }: { compra: CompraResponse; onClose: () => void; onSalvo: (c: CompraResponse) => void }) {
  const [pago, setPago] = useState(compra.pago)
  const [metodoId, setMetodoId] = useState<string | null>(compra.metodoPagamento?.id ?? null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async () => {
    setSalvando(true); setErro(null)
    try {
      onSalvo(await compraService.atualizarPagamento(compra.id, pago, pago ? metodoId : null))
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível alterar o pagamento.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell open onClose={onClose} title="Alterar pagamento" subtitle={compra.identificador} icon={<CreditCard size={16} />} width={520}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar pagamento'}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[13px] text-muted">Numa compra confirmada, o pagamento é a única informação que ainda pode mudar.</p>
        <Field label="Pagamento" group size="md">
          <SegmentedControl options={[{ value: false, label: 'Não pago' }, { value: true, label: 'Pago' }]} value={pago}
            onChange={v => { setPago(v); if (!v) setMetodoId(null) }} />
        </Field>
        {pago && (
          <Field label="Como foi paga?" required group size="md">
            <MetodoPagamentoEscolha value={metodoId} onChange={setMetodoId} salvo={compra.metodoPagamento} />
          </Field>
        )}
        {erro && <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-2.5 text-[13px] text-danger-deep">{erro}</div>}
      </div>
    </ModalShell>
  )
}
