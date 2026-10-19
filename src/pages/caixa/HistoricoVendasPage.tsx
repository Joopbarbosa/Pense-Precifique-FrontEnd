import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, Search } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import SortableHeader from '../../components/shared/SortableHeader'
import Paginacao from '../../components/shared/Paginacao'
import ModalRegistro from '../../components/cliente/ModalRegistro'
import { useModalErro } from '../../hooks/useModalErro'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { caixaService } from '../../services/caixaService'
import { formatarData, hojeIso } from '../../components/compra/formato'
import { BRL } from '../../components/venda/formato'
import { extractApiError } from '../../utils/apiError'
import type { HistoricoVendaResponse } from '../../types/caixa'
import type { PageResponse } from '../../types/shared'

// V0.17.0 — #973 (RN-NOVA-26, UC-NOVO-6): histórico das vendas do Caixa, de todos os turnos (concluídas e canceladas), no padrão da
// listagem de orçamentos: cabeçalho ordenável, filtros, busca e paginação feitos no servidor. Clique na linha abre a modal da venda.

type Campo = 'numero' | 'data' | 'cliente' | 'total' | 'status'
const POR_PAGINA = 20
const ROTULO_STATUS: Record<HistoricoVendaResponse['status'], string> = { CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }
const FORMAS = ['Dinheiro', 'Pix', 'Cartão Crédito', 'Cartão Débito', 'Outro', 'Não informada']
const campo = 'h-11 rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-sm text-dark outline-hidden focus:border-teal'
const ERRO_PERIODO = {
  titulo: 'Período inválido',
  mensagem: 'A data inicial não pode ser maior que a final',
  motivo: 'O período vai da data inicial até a data final.',
  comoResolver: 'Troque as datas de lugar.',
}

export default function HistoricoVendasPage() {
  const navigate = useNavigate()
  const { modalErro, mostrarErro } = useModalErro()
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [status, setStatus] = useState('')
  const [forma, setForma] = useState('')
  const [busca, setBusca] = useState('')
  const buscaAplicada = useDebouncedValue(busca)
  const [ordem, setOrdem] = useState<{ campo: Campo; dir: 'asc' | 'desc' }>({ campo: 'data', dir: 'desc' })
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState<PageResponse<HistoricoVendaResponse> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [registro, setRegistro] = useState<string | null>(null)

  useEffect(() => { setPagina(0) }, [de, ate, status, forma, buscaAplicada, ordem])
  useEffect(() => {
    let ativa = true
    setCarregando(true); setErro(null)
    caixaService.historicoVendas({
      de: de || undefined, ate: ate || undefined, status: status ? [status] : undefined, forma: forma || undefined,
      busca: buscaAplicada || undefined, sort: `${ordem.campo},${ordem.dir}`, page: pagina, size: POR_PAGINA,
    })
      .then(r => { if (ativa) setDados(r) })
      .catch(e => { if (ativa) setErro(extractApiError(e, 'Não foi possível carregar o histórico de vendas.')) })
      .finally(() => { if (ativa) setCarregando(false) })
    return () => { ativa = false }
  }, [de, ate, status, forma, buscaAplicada, ordem, pagina, tentativa])

  // Data inicial depois da final é BLOQUEIO: a lista não muda e a data volta ao valor anterior
  const mudarPeriodo = (campoData: 'de' | 'ate', valor: string, alvo: HTMLInputElement) => {
    const novoDe = campoData === 'de' ? valor : de
    const novoAte = campoData === 'ate' ? valor : ate
    if (novoDe && novoAte && novoDe > novoAte) { mostrarErro(ERRO_PERIODO, undefined, alvo); return }
    if (campoData === 'de') setDe(valor)
    else setAte(valor)
  }

  const ordenar = (c: Campo) => setOrdem(o => o.campo === c
    ? { campo: c, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    : { campo: c, dir: c === 'data' ? 'desc' : 'asc' })

  return (
    <AppLayout active="caixa" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Histórico de vendas do Caixa</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Vendas de todos os turnos, concluídas e canceladas.</p>
        </div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/caixa')}>Voltar ao Caixa</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">De</span>
          <input type="date" aria-label="Data inicial" value={de} max={hojeIso()} className={campo} onChange={e => mudarPeriodo('de', e.target.value, e.currentTarget)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Até</span>
          <input type="date" aria-label="Data final" value={ate} max={hojeIso()} className={campo} onChange={e => mudarPeriodo('ate', e.target.value, e.currentTarget)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Status</span>
          <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className={campo}>
            <option value="">Todos os status</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Forma de pagamento</span>
          <select aria-label="Forma de pagamento" value={forma} onChange={e => setForma(e.target.value)} className={campo}>
            <option value="">Todas as formas</option>
            {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-body">Buscar por venda ou cliente</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Buscar por venda ou cliente" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: CX-7 ou Maria"
              className={clsx(campo, 'w-64 pl-8')} />
          </span>
        </label>
      </div>

      {carregando && !dados ? (
        <div className="flex items-center gap-2.5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando vendas…</div>
      ) : erro ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger-deep">
          {erro} <Button variant="ghost" size="sm" onClick={() => setTentativa(t => t + 1)}>Tentar de novo</Button>
        </div>
      ) : !dados || dados.content.length === 0 ? (
        <EmptyState compact title="Nenhuma venda encontrada" description="Ajuste o período ou os filtros para ver outras vendas." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <table className="w-full text-left text-sm" data-testid="tabela-historico-vendas">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-3 py-3"><SortableHeader label="Venda" field="numero" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} /></th>
                <th className="px-3 py-3"><SortableHeader label="Data" field="data" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} /></th>
                <th className="px-3 py-3"><SortableHeader label="Cliente" field="cliente" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} /></th>
                <th className="px-3 py-3 font-semibold">Itens</th>
                <th className="px-3 py-3 font-semibold">Pagamento</th>
                <th className="px-3 py-3"><SortableHeader label="Total" field="total" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} /></th>
                <th className="px-3 py-3"><SortableHeader label="Status" field="status" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} /></th>
              </tr>
            </thead>
            <tbody>
              {dados.content.map(v => (
                <tr key={v.id} data-testid="linha-historico-venda" onClick={() => setRegistro(v.id)} className="cursor-pointer border-b border-line hover:bg-cream">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-teal">{v.identificador}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatarData(v.data)}</td>
                  <td className="px-3 py-3">{v.cliente}</td>
                  <td className="min-w-[160px] px-3 py-3">{v.itens}</td>
                  <td className="px-3 py-3">{v.formas.join(' + ')}</td>
                  <td className="whitespace-nowrap px-3 py-3 [font-variant-numeric:tabular-nums]">{BRL(v.total)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={v.status === 'CANCELADA' ? 'text-danger' : 'font-semibold text-success'}>{ROTULO_STATUS[v.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && (
        <Paginacao pagina={pagina} totalPaginas={dados.totalPages} ultima={dados.last} carregando={carregando} onMudar={setPagina}
          esquerda={<span data-testid="total-historico">{dados.totalElements} {dados.totalElements === 1 ? 'venda' : 'vendas'} neste filtro</span>} />
      )}
      {registro && <ModalRegistro tipo="VENDA_CAIXA" id={registro} onClose={() => setRegistro(null)} />}
      {modalErro}
    </AppLayout>
  )
}
