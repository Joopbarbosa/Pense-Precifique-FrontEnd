import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Button, Field, ModalShell, SegmentedControl } from '../ui'
import MetodoPagamentoEscolha from './MetodoPagamentoEscolha'
import { compraService } from '../../services/compraService'
import { useModalErro } from '../../hooks/useModalErro'
import { vencimentoPadrao } from '../../utils/vencimento'
import type { CompraResponse } from '../../types/compra'

// V0.15.0 (#550) — só o pagamento muda numa compra confirmada (Decisão 14). Usado pelo detalhe e pelo
// menu da listagem (#566).
export default function ModalPagamento({ compra, onClose, onSalvo }: { compra: CompraResponse; onClose: () => void; onSalvo: (c: CompraResponse) => void }) {
  // V0.19.0 (#1173): cartão em aberto vem como pago=false com método; na tela segue sendo "paga com cartão".
  const [pago, setPago] = useState(compra.pago === true || !!compra.metodoPagamento)
  const [metodoId, setMetodoId] = useState<string | null>(compra.metodoPagamento?.id ?? null)
  const [salvando, setSalvando] = useState(false)
  const [parcelas, setParcelas] = useState<number | null>(compra.parcelas)
  const [vencimento, setVencimento] = useState('')
  const precisaVencimento = !pago || parcelas !== null
  const venc = vencimento || vencimentoPadrao(compra.dataCompra, pago)
  const { modalErro, mostrarErro } = useModalErro()

  const salvar = async () => {
    setSalvando(true)
    try {
      onSalvo(await compraService.atualizarPagamento(compra.id, pago, pago ? metodoId : null, pago ? parcelas : null, precisaVencimento ? venc : null))
    } catch (err) {
      mostrarErro(err, 'Não foi possível alterar o pagamento.')
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
        {precisaVencimento && (
          <Field label={pago ? 'Vencimento da 1ª parcela' : 'Vence em'} required={!pago} size="md">
            <input type="date" aria-label="Vencimento" value={venc} onChange={e => setVencimento(e.target.value)}
              className="h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus" />
          </Field>
        )}
        {pago && (
          <Field label="Como foi paga?" required group size="md">
            <MetodoPagamentoEscolha value={metodoId} onChange={setMetodoId} salvo={compra.metodoPagamento}
              parcelas={parcelas} onParcelas={setParcelas} />
          </Field>
        )}
      </div>
      {modalErro}
    </ModalShell>
  )
}
