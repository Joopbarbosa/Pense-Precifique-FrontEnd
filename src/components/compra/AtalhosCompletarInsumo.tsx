import { ExternalLink } from 'lucide-react'
import Button from '../ui/Button'
import type { ErroExplicado } from '../../utils/apiError'

/** Título do bloqueio do backend ao confirmar compra com insumo em rascunho (RN-NOVA-19). */
export const TITULO_INSUMO_RASCUNHO_NA_COMPRA = 'Insumo em rascunho na compra'

/**
 * V0.16.0 (#687, RN-NOVA-19, CEN-NOVO-50) — atalho "Completar o insumo" na modal de erro da confirmação.
 * O backend lista os nomes em `itens`; o id vem das linhas da compra na tela. Abre em nova aba para não
 * perder a compra em edição.
 */
export function atalhosCompletarInsumo(erro: ErroExplicado, insumos: { id: string; nome: string }[]) {
  if (erro.titulo !== TITULO_INSUMO_RASCUNHO_NA_COMPRA || !erro.itens?.length) return null
  const alvos = erro.itens
    .map(nome => insumos.find(i => i.nome === nome))
    .filter((i): i is { id: string; nome: string } => !!i)
    .filter((i, idx, lista) => lista.findIndex(x => x.id === i.id) === idx)
  if (!alvos.length) return null
  return (
    <section data-testid="atalhos-completar-insumo" className="flex flex-col gap-2">
      {alvos.map(i => (
        <div key={i.id} className="flex items-center justify-between gap-3 rounded-input border border-line px-3 py-2">
          <span className="min-w-0 truncate font-semibold text-dark">{i.nome}</span>
          <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />}
            onClick={() => window.open(`/insumos/${i.id}/editar`, '_blank', 'noopener')}>
            Completar o insumo
          </Button>
        </div>
      ))}
    </section>
  )
}
