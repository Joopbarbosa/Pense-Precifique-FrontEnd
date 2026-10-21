import { useCallback, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import Button from '../ui/Button'
import TextArea from '../ui/TextArea'
import Spinner from '../ui/Spinner'
import Paginacao from '../shared/Paginacao'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { orcamentoService } from '../../services/orcamentoService'
import { extractApiError } from '../../utils/apiError'
import { formatarDataHora } from '../../utils/data'
import type { ComentarioOrcamento } from '../../types/orcamento'

/**
 * V0.18.0 (#1038, RN-NOVA-22) — a conversa única de comentários do orçamento, a mesma no Detalhe do Orçamento (aba "Comentários") e
 * no detalhe do compromisso da Agenda. Ordem cronológica com o mais recente no fim, cada comentário com data e hora; 1 a 500
 * caracteres; sem edição nem exclusão; vale em qualquer status. A página 1 traz os mais recentes e "Anterior" leva aos mais antigos.
 */
export default function ComentariosOrcamento({ orcamentoId }: { orcamentoId: string }) {
  const fetcher = useCallback((page: number, size: number) => orcamentoService.comentarios(orcamentoId, page, size), [orcamentoId])
  const lista = usePaginatedList<ComentarioOrcamento>({ fetcher, pageSize: 20, errorMessage: 'Não foi possível carregar os comentários.' })
  const { irParaPagina, reset } = lista
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { void irParaPagina(0) }, [irParaPagina])

  const enviar = async () => {
    const limpo = texto.trim()
    if (!limpo) { setErro('Escreva o comentário'); return }
    setEnviando(true); setErro(null)
    try {
      await orcamentoService.comentar(orcamentoId, limpo)
      setTexto('')
      await reset()
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível enviar o comentário.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="comentarios-orcamento">
      {lista.loading && lista.items.length === 0 ? (
        <div className="flex justify-center py-4"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
      ) : lista.error ? (
        <p className="text-sm text-danger">{lista.error}</p>
      ) : lista.items.length === 0 ? (
        <p className="py-2 text-sm text-subtle" data-testid="sem-comentarios">Nenhum comentário ainda.</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="lista-comentarios">
            {lista.items.map(c => (
              <li key={c.id} className="rounded-card border border-line bg-cream px-3.5 py-2.5 text-sm text-body">
                <div className="mb-0.5 text-[11.5px] font-semibold text-subtle">{formatarDataHora(c.criadoEm)}</div>
                <div className="whitespace-pre-wrap break-words">{c.texto}</div>
              </li>
            ))}
          </ul>
          {lista.totalPages > 1 && (
            <Paginacao pagina={lista.page} totalPaginas={lista.totalPages} ultima={lista.ultima} carregando={lista.loading}
              onMudar={irParaPagina} esquerda={`${lista.totalElements} comentários`} />
          )}
        </>
      )}
      <div>
        <TextArea value={texto} onChange={t => { setTexto(t); setErro(null) }} rows={3} placeholder="Escreva um comentário sobre este orçamento"
          ariaLabel="Novo comentário" erro={erro ?? undefined} />
        <div className="mt-2 flex justify-end">
          <Button variant="secondary" size="sm" icon={<Send size={14} />} disabled={enviando} onClick={enviar}>{enviando ? 'Enviando...' : 'Enviar'}</Button>
        </div>
      </div>
    </div>
  )
}
