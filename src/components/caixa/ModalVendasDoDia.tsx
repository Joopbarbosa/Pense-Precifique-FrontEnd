import { formatarData, dataLocalIso } from '../../utils/data'
import { useEffect, useState } from 'react'
import { ExternalLink, History } from 'lucide-react'
import { Button, EmptyState, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import Paginacao from '../shared/Paginacao'
import ModalRegistro from '../cliente/ModalRegistro'
import { caixaService } from '../../services/caixaService'

import { BRL } from '../venda/formato'
import { extractApiError } from '../../utils/apiError'
import type { HistoricoVendaResponse } from '../../types/caixa'
import type { PageResponse } from '../../types/shared'

const POR_PAGINA = 20
const ROTULO_STATUS: Record<HistoricoVendaResponse['status'], string> = { CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }

/**
 * #992 (RN-NOVA-26, alteração, CEN-NOVO-95): o botão "Histórico de vendas" do Caixa abre as vendas de hoje (concluídas e canceladas,
 * de qualquer turno), da mais recente para a mais antiga, com paginação; o clique numa linha abre a modal de dados da venda e o
 * botão "Ver histórico completo" abre a tela do histórico em aba nova, com a modal continuando aberta.
 */
export default function ModalVendasDoDia({ onClose }: { onClose: () => void }) {
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState<PageResponse<HistoricoVendaResponse> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [registro, setRegistro] = useState<string | null>(null)

  useEffect(() => {
    let ativa = true
    const hoje = dataLocalIso()
    setCarregando(true); setErro(null)
    caixaService.historicoVendas({ de: hoje, ate: hoje, sort: 'data,desc', page: pagina, size: POR_PAGINA })
      .then(r => { if (ativa) setDados(r) })
      .catch(e => { if (ativa) setErro(extractApiError(e, 'Não foi possível carregar as vendas de hoje.')) })
      .finally(() => { if (ativa) setCarregando(false) })
    return () => { ativa = false }
  }, [pagina, tentativa])

  return (
    <>
      <ModalShell open onClose={onClose} width={900} icon={<History size={16} />} title="Vendas de hoje"
        subtitle="Todas as vendas do Caixa de hoje, de qualquer turno"
        footer={<>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="secondary" icon={<ExternalLink size={16} />} onClick={() => window.open('/caixa/historico', '_blank', 'noopener')}>
            Ver histórico completo
          </Button>
        </>}>
        {carregando && !dados ? (
          <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando vendas…</div>
        ) : erro ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
            {erro} <Button variant="ghost" size="sm" onClick={() => setTentativa(t => t + 1)}>Tentar de novo</Button>
          </div>
        ) : !dados || dados.content.length === 0 ? (
          <EmptyState compact title="Nenhuma venda hoje" description="As vendas feitas hoje no Caixa aparecem aqui." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-input border border-line">
              <table className="w-full text-left text-sm" data-testid="tabela-vendas-do-dia">
                <thead>
                  <tr className="border-b border-line bg-cream text-muted">
                    {['Venda', 'Data', 'Cliente', 'Itens', 'Pagamento', 'Total', 'Status'].map(c => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {dados.content.map(v => (
                    <tr key={v.id} data-testid="linha-venda-do-dia" onClick={() => setRegistro(v.id)} className="cursor-pointer border-b border-line last:border-b-0 hover:bg-cream">
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-teal">{v.identificador}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatarData(v.data)}</td>
                      <td className="px-3 py-2.5">{v.cliente}</td>
                      <td className="min-w-[140px] px-3 py-2.5">{v.itens}</td>
                      <td className="px-3 py-2.5">{v.formas.join(' + ')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 [font-variant-numeric:tabular-nums]">{BRL(v.total)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={v.status === 'CANCELADA' ? 'text-danger' : 'font-semibold text-success'}>{ROTULO_STATUS[v.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao pagina={pagina} totalPaginas={dados.totalPages} ultima={dados.last} carregando={carregando} onMudar={setPagina}
              esquerda={<span data-testid="total-vendas-do-dia">{dados.totalElements} {dados.totalElements === 1 ? 'venda' : 'vendas'} hoje</span>} />
          </>
        )}
      </ModalShell>
      {registro && <ModalRegistro tipo="VENDA_CAIXA" id={registro} onClose={() => setRegistro(null)} />}
    </>
  )
}
