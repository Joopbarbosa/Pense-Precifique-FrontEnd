import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, PackageCheck, Ban } from 'lucide-react'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import ModalShell from '../ui/ModalShell'
import ModalCancelarCompra from '../compra/ModalCancelarCompra'
import ModalImpactoCompra from '../compra/ModalImpactoCompra'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import { dataLocalIso, formatarData } from '../../utils/data'
import { qtd } from '../compra/formato'
import type { CompraResponse, ImpactoCompraResponse } from '../../types/compra'

/**
 * V0.18.0 (#549, RN-NOVA-7 e RN-NOVA-18) — compra pendente de recebimento no detalhe do compromisso: COM-N, fornecedor, resumo dos
 * insumos e previsão, com Concluir (leva à Entrada de compras da compra; estoque e custo mudam lá, nunca aqui), Adiar (nova previsão,
 * hoje ou futura) e Cancelar (o cancelamento existente, com a observação de no mínimo 30 caracteres).
 */
export default function PainelCompra({ compraId, onAlterada }: { compraId: string; onAlterada: () => void }) {
  const navigate = useNavigate()
  const [compra, setCompra] = useState<CompraResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'adiar' | 'cancelar'>(null)
  const [novaData, setNovaData] = useState('')
  const [erroAdiar, setErroAdiar] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [impacto, setImpacto] = useState<{ titulo: string; impacto: ImpactoCompraResponse } | null>(null)

  useEffect(() => {
    let vivo = true
    compraService.buscar(compraId)
      .then(c => { if (vivo) { setCompra(c); setNovaData(c.previsaoEntrega ?? dataLocalIso()) } })
      .catch(() => { if (vivo) setErro('Não foi possível carregar a compra.') })
    return () => { vivo = false }
  }, [compraId])

  const adiar = async () => {
    if (!compra) return
    setSalvando(true); setErroAdiar(null)
    try {
      await compraService.adiarPrevisao(compra.id, novaData)
      setModal(null)
      onAlterada()
    } catch (err) {
      setErroAdiar(extractApiError(err, 'Não foi possível adiar a previsão.'))
    } finally {
      setSalvando(false)
    }
  }

  if (erro) return <p className="text-sm text-danger">{erro}</p>
  if (!compra) return <div className="flex justify-center py-3"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
  const pendente = compra.status === 'PENDENTE_RECEBIMENTO'
  return (
    <div className="flex flex-col gap-3" data-testid="painel-compra">
      <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-card border border-line bg-cream px-4 py-3 text-sm text-body">
        <dt className="font-semibold text-dark">Compra</dt><dd>{compra.identificador}</dd>
        {compra.fornecedor && (<><dt className="font-semibold text-dark">Fornecedor</dt><dd>{compra.fornecedor.nome}</dd></>)}
        <dt className="font-semibold text-dark">Insumos</dt><dd data-testid="insumos-da-compra">{compra.itens.map(i => `${i.insumo.nome} ×${qtd(i.quantidade)}`).join(', ')}</dd>
        <dt className="font-semibold text-dark">Previsão</dt><dd>{compra.previsaoEntrega ? formatarData(compra.previsaoEntrega) : '—'}</dd>
      </dl>
      {pendente && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<PackageCheck size={14} />} onClick={() => navigate(`/compras/entrada?compra=${compra.id}`)}>Concluir</Button>
          <Button variant="ghost" size="sm" icon={<CalendarClock size={14} />} onClick={() => setModal('adiar')}>Adiar</Button>
          <Button variant="danger" size="sm" icon={<Ban size={14} />} onClick={() => setModal('cancelar')}>Cancelar</Button>
        </div>
      )}
      {modal === 'adiar' && (
        <ModalShell open onClose={() => setModal(null)} title="Adiar a previsão de entrega" width={420}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Fechar</Button><Button disabled={salvando || !novaData} onClick={adiar}>Adiar</Button></>}>
          <label className="block">
            <span className="mb-[7px] block text-[13px] font-semibold text-body">Nova previsão de entrega</span>
            <input type="date" value={novaData} min={dataLocalIso()} onChange={e => setNovaData(e.target.value)} aria-label="Nova previsão de entrega"
              className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 text-[15px] text-dark outline-hidden focus:border-teal" />
          </label>
          {erroAdiar && <p className="mt-2 text-[13px] text-danger" role="alert">{erroAdiar}</p>}
        </ModalShell>
      )}
      {modal === 'cancelar' && (
        <ModalCancelarCompra compra={compra} onClose={() => setModal(null)}
          onCancelada={r => { setModal(null); setImpacto({ titulo: `Compra ${r.compra.identificador} cancelada`, impacto: r.impacto }) }} />
      )}
      {impacto && <ModalImpactoCompra titulo={impacto.titulo} impacto={impacto.impacto} onClose={() => { setImpacto(null); onAlterada() }} />}
    </div>
  )
}
