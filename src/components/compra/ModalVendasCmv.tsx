import { useEffect, useState } from 'react'
import { Calculator } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import ModalRegistro from '../cliente/ModalRegistro'
import { compraService } from '../../services/compraService'
import type { VendaCmvResponse, VendasCmvResponse } from '../../types/compra'
import { extractApiError } from '../../utils/apiError'
import { formatarData } from './formato'
import { BRL } from '../venda/formato'

export interface FiltroVendasCmv { de: string; ate: string; mes?: string }
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

export default function ModalVendasCmv({ filtro, onClose }: { filtro: FiltroVendasCmv; onClose: () => void }) {
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState<VendasCmvResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [registro, setRegistro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let ativa = true
    setCarregando(true); setErro(null)
    compraService.vendasCmv(filtro, pagina)
      .then(r => { if (ativa) setDados(r) })
      .catch(e => { if (ativa) setErro(extractApiError(e, 'Não foi possível carregar as vendas.')) })
      .finally(() => { if (ativa) setCarregando(false) })
    return () => { ativa = false }
  }, [filtro.de, filtro.ate, filtro.mes, pagina, tentativa])
  const abrir = (venda: VendaCmvResponse) => {
    if (venda.tipo === 'ORCAMENTO') window.open(`/orcamentos/${venda.id}`, '_blank', 'noopener,noreferrer')
    else setRegistro(venda.id)
  }
  const fechar = () => { if (registro) setRegistro(null); else onClose() }
  const subtitulo = filtro.mes ? `Mês ${filtro.mes.slice(5, 7)}/${filtro.mes.slice(0, 4)}` : `${formatarData(filtro.de)} a ${formatarData(filtro.ate)}`
  return <>
    <ModalShell open onClose={fechar} title="Vendas que compõem o CMV" subtitle={subtitulo} icon={<Calculator size={18} />} width={1120}
      footer={<div className="flex flex-wrap items-center justify-between gap-3">
        <span data-testid="total-custo-cmv" className="text-sm font-semibold">Custo de material total: {dados ? BRL(dados.totalCustoMaterial) : '—'}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={carregando || !dados || dados.vendas.first} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
          <span className="text-sm">Página {pagina + 1} de {Math.max(1, dados?.vendas.totalPages ?? 1)}</span>
          <Button variant="ghost" disabled={carregando || !dados || dados.vendas.last} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
          <Button variant="ghost" onClick={fechar}>Fechar</Button>
        </div>
      </div>} closeLabel="Fechar listagem de vendas">
      <div className="overflow-auto p-5">
        {carregando ? <div className="flex justify-center py-12"><Spinner /></div> : erro ? <div role="alert" className="py-6 text-danger">{erro} <Button variant="ghost" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button></div> : !dados?.vendas.content.length ? <p className="py-8 text-center text-muted">Nenhuma venda neste período.</p> : <table className="w-full text-left text-sm" data-testid="vendas-cmv">
          <thead><tr className="border-b border-line text-muted">{['Venda', 'Data', 'Cliente', 'Itens', 'Faturamento', 'Custo de material', 'CMV %', 'Observação'].map(c => <th key={c} className="px-3 py-3 font-semibold">{c}</th>)}</tr></thead>
          <tbody>{dados.vendas.content.map(v => <tr key={`${v.tipo}-${v.id}`} onClick={() => abrir(v)} className="cursor-pointer border-b border-line hover:bg-cream">
            <td className="whitespace-nowrap px-3 py-3"><button type="button" className="font-semibold text-teal underline" onClick={e => { e.stopPropagation(); abrir(v) }}>{v.identificador}</button></td>
            <td className="whitespace-nowrap px-3 py-3">{formatarData(v.data)}</td><td className="px-3 py-3">{v.cliente ?? 'Consumidor final'}</td><td className="min-w-[160px] px-3 py-3">{v.itens}</td>
            <td className="whitespace-nowrap px-3 py-3">{BRL(v.faturamento)}</td><td className="whitespace-nowrap px-3 py-3">{BRL(v.custoMaterial)}</td><td className="whitespace-nowrap px-3 py-3">{percentual(v.cmvPercentual)}</td>
            <td className="px-3 py-3">{v.estimado && <span className="text-warning">Estimado</span>}{v.estimado && v.semCusto && ' · '}{v.semCusto && <span className="text-muted">Sem custo</span>}</td>
          </tr>)}</tbody>
        </table>}
      </div>
    </ModalShell>
    {registro && <ModalRegistro tipo="VENDA_CAIXA" id={registro} onClose={() => setRegistro(null)} />}
  </>
}
