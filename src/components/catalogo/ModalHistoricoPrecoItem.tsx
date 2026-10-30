import { useCallback, useEffect } from 'react'
import { History } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Spinner from '../ui/Spinner'
import Paginacao from '../shared/Paginacao'
import { AntesDepois, rotuloCausa } from '../produto/HistoricoPrecoSugerido'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import { formatarDataHora } from '../../utils/data'
import type { HistoricoPrecoItem } from '../../types/itemCatalogo'

/**
 * V0.18.0 (#961, RN-NOVA-28, DT-NOVA-13) — janela com o histórico do preço sugerido de um item de Catálogo: valor anterior, valor novo,
 * causa (com a referência, como COM-12), data e hora; da mais recente para a mais antiga, paginada como as demais listas (RN-086). O preço
 * de venda do item nunca muda por causa dessas mudanças (PDT-023).
 */
export default function ModalHistoricoPrecoItem({ catalogoId, itemId, nomeItem, onClose }: {
  catalogoId: string
  itemId: string
  nomeItem: string
  onClose: () => void
}) {
  const fetcher = useCallback((page: number, size: number) => itemCatalogoService.historicoPreco(catalogoId, itemId, page, size), [catalogoId, itemId])
  const lista = usePaginatedList<HistoricoPrecoItem>({ fetcher, pageSize: 20, errorMessage: 'Não foi possível carregar o histórico de preço.' })
  const { irParaPagina } = lista
  useEffect(() => { void irParaPagina(0) }, [irParaPagina])

  return (
    <ModalShell open onClose={onClose} title="Histórico de preço" subtitle={nomeItem} width={640} icon={<History size={15} />}>
      {lista.loading && lista.items.length === 0 ? (
        <div className="flex justify-center py-8"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={22} /></div>
      ) : lista.error ? (
        <p className="py-6 text-center text-sm text-danger">{lista.error}</p>
      ) : lista.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle" data-testid="historico-vazio">Nenhuma mudança registrada</p>
      ) : (
        <div data-testid="historico-preco-item">
          {lista.items.map(m => (
            <div key={m.id} data-testid="linha-historico-preco" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line py-3 first:border-t-0">
              <span className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{formatarDataHora(m.criadoEm)}</span>
              <AntesDepois antes={m.valorAnterior} depois={m.valorNovo} />
              <span className="text-[12.5px] text-muted">{rotuloCausa(m.causa, m.referenciaTexto)}</span>
            </div>
          ))}
          <Paginacao pagina={lista.page} totalPaginas={lista.totalPages} ultima={lista.ultima} carregando={lista.loading}
            onMudar={irParaPagina} esquerda={`${lista.totalElements} ${lista.totalElements === 1 ? 'mudança' : 'mudanças'}`} />
        </div>
      )}
    </ModalShell>
  )
}
