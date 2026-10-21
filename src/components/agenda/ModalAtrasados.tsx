import { useCallback, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Spinner from '../ui/Spinner'
import Paginacao from '../shared/Paginacao'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { agendaService } from '../../services/agendaService'
import type { Compromisso } from '../../types/agenda'
import { formatarData } from '../../utils/data'
import ChipCompromisso from './ChipCompromisso'

/** V0.18.0 (#1034, RN-NOVA-3) — lista dos atrasados, do mais antigo para o mais recente, paginada de 20 em 20 (RN-086). */
export default function ModalAtrasados({ onClose, onAbrir }: { onClose: () => void; onAbrir: (c: Compromisso) => void }) {
  const fetcher = useCallback((page: number, size: number) => agendaService.atrasados(page, size), [])
  const lista = usePaginatedList<Compromisso>({ fetcher, pageSize: 20, errorMessage: 'Não foi possível carregar os atrasados.' })
  const { irParaPagina } = lista
  // a primeira página sobe com a abertura da modal
  useEffect(() => { void irParaPagina(0) }, [irParaPagina])

  return (
    <ModalShell open onClose={onClose} title="Atrasados" subtitle="Do mais antigo para o mais recente" width={640}
      icon={<AlertTriangle size={15} />}>
      {lista.loading && lista.items.length === 0 ? (
        <div className="flex justify-center py-8"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={22} /></div>
      ) : lista.error ? (
        <p className="py-6 text-center text-sm text-danger">{lista.error}</p>
      ) : lista.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Nenhum atrasado.</p>
      ) : (
        <div className="flex flex-col gap-2" data-testid="lista-atrasados">
          {lista.items.map(c => (
            <div key={c.chave} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle">Era para {formatarData(c.dataOrigem)}</span>
              <ChipCompromisso compromisso={c} onAbrir={onAbrir} />
            </div>
          ))}
          <Paginacao pagina={lista.page} totalPaginas={lista.totalPages} ultima={lista.ultima} carregando={lista.loading}
            onMudar={irParaPagina} esquerda={`${lista.totalElements} ${lista.totalElements === 1 ? 'atrasado' : 'atrasados'}`} />
        </div>
      )}
    </ModalShell>
  )
}
