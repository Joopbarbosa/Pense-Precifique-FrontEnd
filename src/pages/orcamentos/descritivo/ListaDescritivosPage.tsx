import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import AppLayout from '../../../components/layout/AppLayout'
import { Button, EmptyState, StatusBadge } from '../../../components/ui'
import { Toast } from '../../../components/shared'
import Paginacao from '../../../components/shared/Paginacao'
import { orcamentoDescritivoService } from '../../../services/orcamentoDescritivoService'
import { useToast } from '../../../hooks/useToast'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { extractApiError } from '../../../utils/apiError'
import { ROTULO_STATUS_DESCRITIVO } from './rotulos'
import type { DescritivoResumoResponse, StatusDescritivo } from '../../../types/orcamentoDescritivo'
import type { PageResponse } from '../../../types/shared'

const FILTROS: { valor: '' | StatusDescritivo; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' }, { valor: 'RASCUNHO', rotulo: 'Rascunho' }, { valor: 'ENVIADO', rotulo: 'Enviado' }, { valor: 'CANCELADO', rotulo: 'Cancelado' },
]

/** V0.19.0 #382 — lista dos orçamentos Descritivos (separada da lista de Vendas; numeração ORC-N compartilhada). */
export default function ListaDescritivosPage() {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState(0)
  const [filtro, setFiltro] = useState<'' | StatusDescritivo>('')
  const [busca, setBusca] = useState('')
  const buscaAplicada = useDebouncedValue(busca.trim(), 300)
  const [dados, setDados] = useState<PageResponse<DescritivoResumoResponse> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const { toast, setToast } = useToast()

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setDados(await orcamentoDescritivoService.listar(pagina, 20, filtro || undefined, buscaAplicada || undefined))
    } catch (e) {
      setToast(extractApiError(e, 'Não foi possível carregar os orçamentos descritivos.'))
    } finally { setCarregando(false) }
  }, [pagina, filtro, buscaAplicada, setToast])
  useEffect(() => { carregar() }, [carregar])

  const lista = dados?.content ?? []
  return (
    <AppLayout active="orcamentos" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Orçamentos descritivos</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Listas de opções com preço de referência, sem total.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/orcamentos')}>Ver orçamentos de venda</Button>
          <Button icon={<Plus size={16} />} onClick={() => navigate('/orcamentos/descritivos/novo')}>Novo orçamento descritivo</Button>
        </div>
      </div>
      <div className="mb-section flex flex-wrap items-center gap-2">
        {FILTROS.map(f => (
          <button key={f.valor} type="button" onClick={() => { setFiltro(f.valor); setPagina(0) }}
            className={`h-[34px] rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold ${filtro === f.valor ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body'}`}>{f.rotulo}</button>
        ))}
        <input value={busca} maxLength={200} onChange={e => { setBusca(e.target.value); setPagina(0) }} placeholder="Buscar por título ou cliente" aria-label="Buscar"
          className="ml-auto h-[34px] w-[260px] rounded-input border border-line bg-white px-3 text-sm" />
      </div>
      {!carregando && lista.length === 0 ? (
        <EmptyState title="Nenhum orçamento descritivo" description="Crie uma lista de opções para o cliente escolher."
          action={{ label: 'Criar orçamento descritivo', icon: <Plus size={16} />, onClick: () => navigate('/orcamentos/descritivos/novo') }} />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-white">
          {lista.map(d => (
            <button key={d.id} type="button" onClick={() => navigate(`/orcamentos/descritivos/${d.id}`)} data-testid="linha-descritivo"
              className="grid w-full grid-cols-[90px_1fr_1fr_90px_120px] items-center gap-3 border-b border-line px-5 py-3.5 text-left text-sm last:border-b-0 hover:bg-cream max-[860px]:grid-cols-1">
              <span className="font-semibold text-dark">{d.identificador}</span>
              <span className="text-dark">{d.titulo}</span>
              <span className="text-muted">{d.nomeCliente ?? 'Sem cliente'}</span>
              <span className="text-muted">{d.quantidadeOpcoes} {d.quantidadeOpcoes === 1 ? 'opção' : 'opções'}</span>
              <StatusBadge status={ROTULO_STATUS_DESCRITIVO[d.status]} size="sm" />
            </button>
          ))}
        </div>
      )}
      {dados && dados.totalPages > 1 && (
        <Paginacao pagina={dados.number} totalPaginas={dados.totalPages} ultima={dados.last} carregando={carregando} onMudar={setPagina}
          esquerda={`${dados.totalElements} orçamentos`} />
      )}
      <Toast message={toast} variant="error" />
    </AppLayout>
  )
}
