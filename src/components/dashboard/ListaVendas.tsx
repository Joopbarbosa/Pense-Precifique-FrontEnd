import { useCallback, useEffect, useState } from 'react'
import { Button, EmptyState } from '../ui'
import Spinner from '../ui/Spinner'
import ModalRegistro from '../cliente/ModalRegistro'
import { formatarData } from '../compra/formato'
import { BRL } from '../venda/formato'
import { dashboardVendasService } from '../../services/dashboardVendasService'
import { extractApiError } from '../../utils/apiError'
import type { FiltroListaVendas, LinhaListaVendas, ListaVendasResponse, OrigemVenda } from '../../types/dashboardVendas'

// V0.17.0 — #719 (RN-NOVA-17) e #970: aba Vendas. Todas as vendas do Caixa e todos os orçamentos, de qualquer status. O clique na
// linha abre a modal de dados do registro (orçamento com os itens e o botão "Abrir orçamento"; venda do Caixa sem página).
// O total e a quantidade do conjunto inteiro vêm do backend.

const STATUS_ROTULO: Record<string, string> = {
  RASCUNHO: 'Rascunho', ENVIADO: 'Enviado', APROVADO: 'Aprovado', AGUARDANDO_SINAL: 'Aguardando sinal', SINAL_PAGO: 'Sinal pago',
  EM_PRODUCAO: 'Em produção', FINALIZADO: 'Finalizado', PAGO: 'Pago', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
  CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
// Um filtro por grupo: "Cancelado" cobre o orçamento (CANCELADO) e a venda do Caixa (CANCELADA)
const FILTROS_STATUS: { id: string; rotulo: string; valores: string[] }[] = [
  { id: 'TODOS', rotulo: 'Todos os status', valores: [] },
  { id: 'ENTREGUE', rotulo: 'Entregue / Concluída', valores: ['ENTREGUE', 'CONCLUIDA'] },
  { id: 'CANCELADO', rotulo: 'Cancelado', valores: ['CANCELADO', 'CANCELADA'] },
  { id: 'RASCUNHO', rotulo: 'Rascunho', valores: ['RASCUNHO'] },
  { id: 'ANDAMENTO', rotulo: 'Em andamento', valores: ['ENVIADO', 'APROVADO', 'AGUARDANDO_SINAL', 'SINAL_PAGO', 'EM_PRODUCAO', 'FINALIZADO', 'PAGO'] },
]
const ORIGENS: { id: OrigemVenda | ''; rotulo: string }[] = [
  { id: '', rotulo: 'Todas as origens' }, { id: 'VENDA_CAIXA', rotulo: 'Caixa' }, { id: 'ORCAMENTO', rotulo: 'Orçamento' },
]
const campo = 'h-11 rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-hidden focus:border-teal'

export default function ListaVendas({ filtroInicial }: { filtroInicial: FiltroListaVendas }) {
  const [origem, setOrigem] = useState<OrigemVenda | ''>(filtroInicial.origem ?? '')
  const [statusId, setStatusId] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState<ListaVendasResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [registro, setRegistro] = useState<{ tipo: 'ORCAMENTO' | 'VENDA_CAIXA'; id: string } | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const filtro = useCallback((): FiltroListaVendas => ({
    ...filtroInicial,
    origem: origem || undefined,
    status: FILTROS_STATUS.find(s => s.id === statusId)?.valores,
    busca: buscaAplicada || undefined,
    page: pagina,
  }), [filtroInicial, origem, statusId, buscaAplicada, pagina])

  useEffect(() => { setPagina(0) }, [origem, statusId, buscaAplicada, filtroInicial])
  useEffect(() => {
    let ativa = true
    setCarregando(true); setErro(null)
    dashboardVendasService.lista(filtro())
      .then(r => { if (ativa) setDados(r) })
      .catch(e => { if (ativa) setErro(extractApiError(e, 'Não foi possível carregar as vendas.')) })
      .finally(() => { if (ativa) setCarregando(false) })
    return () => { ativa = false }
  }, [filtro, tentativa])

  const abrir = (l: LinhaListaVendas) => setRegistro({ tipo: l.origem === 'ORCAMENTO' ? 'ORCAMENTO' : 'VENDA_CAIXA', id: l.id })

  return (
    <div className="flex flex-col gap-4" data-testid="aba-vendas">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Origem</span>
          <select aria-label="Origem" value={origem} onChange={e => setOrigem(e.target.value as OrigemVenda | '')} className={campo}>
            {ORIGENS.map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Status</span>
          <select aria-label="Status" value={statusId} onChange={e => setStatusId(e.target.value)} className={campo}>
            {FILTROS_STATUS.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
          </select>
        </label>
        <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); setBuscaAplicada(busca.trim()) }}>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Buscar por venda ou cliente</span>
            <input aria-label="Buscar por venda ou cliente" value={busca} onChange={e => setBusca(e.target.value)}
              onBlur={() => setBuscaAplicada(busca.trim())} placeholder="Ex.: ORC-14 ou Ana" className={`${campo} w-64`} />
          </label>
        </form>
      </div>

      {carregando && !dados ? (
        <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando vendas…</div>
      ) : erro ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
          {erro} <Button variant="ghost" size="sm" onClick={() => setTentativa(t => t + 1)}>Tentar de novo</Button>
        </div>
      ) : !dados || dados.vendas.content.length === 0 ? (
        <EmptyState compact title="Nenhuma venda neste filtro" description="Ajuste o período ou os filtros para ver outras vendas." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <table className="w-full text-left text-sm" data-testid="tabela-vendas">
            <thead>
              <tr className="border-b border-line text-muted">
                {['Venda', 'Data', 'Cliente', 'Itens', 'Total', 'Status', 'Origem'].map(c => <th key={c} className="px-3 py-3 font-semibold">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {dados.vendas.content.map(l => (
                <tr key={`${l.origem}-${l.id}`} data-testid="linha-venda" onClick={() => abrir(l)} className="cursor-pointer border-b border-line hover:bg-cream">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-teal">{l.identificador}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatarData(l.data)}</td>
                  <td className="px-3 py-3">{l.cliente ?? 'Consumidor final'}</td>
                  <td className="min-w-[160px] px-3 py-3">{l.itens}</td>
                  <td className="whitespace-nowrap px-3 py-3 [font-variant-numeric:tabular-nums]">{BRL(l.total)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={l.contaNosNumeros ? 'font-semibold text-success' : 'text-muted'}>{STATUS_ROTULO[l.status] ?? l.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{l.origem === 'ORCAMENTO' ? 'Orçamento' : 'Caixa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span data-testid="totais-lista" className="font-semibold text-dark">
            {dados.quantidadeFiltrada} {dados.quantidadeFiltrada === 1 ? 'venda' : 'vendas'} · Total {BRL(dados.totalFiltrado)}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={carregando || dados.vendas.first} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
            <span>Página {pagina + 1} de {Math.max(1, dados.vendas.totalPages)}</span>
            <Button variant="ghost" disabled={carregando || dados.vendas.last} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
      {registro && <ModalRegistro tipo={registro.tipo} id={registro.id} onClose={() => setRegistro(null)} />}
    </div>
  )
}
