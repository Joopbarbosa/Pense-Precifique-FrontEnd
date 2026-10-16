import { useEffect, useState } from 'react'
import { ModalShell, Button } from '../ui'
import Spinner from '../ui/Spinner'
import { insumoService } from '../../services/insumoService'
import { extractApiError } from '../../utils/apiError'
import type { ProdutoRelacionadoResponse } from '../../types/insumo'

// V0.17.0 — #971 (RN-NOVA-23 item 2, DT-NOVA-18 (3)): o ranking "Em quantos produtos cada insumo está" abre os produtos que usam o
// insumo, com a quantidade na ficha ("2 m"). Só produtos ativos, o mesmo filtro do número. Produto abre o cadastro em aba nova.
export default function ModalProdutosDoInsumo({ insumoId, insumoNome, onClose }: { insumoId: string; insumoNome: string; onClose: () => void }) {
  const [produtos, setProdutos] = useState<ProdutoRelacionadoResponse[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativa = true
    insumoService.listarProdutosRelacionados(insumoId, true)
      .then(r => { if (ativa) setProdutos(r) })
      .catch(err => { if (ativa) setErro(extractApiError(err, 'Não foi possível carregar os produtos.')) })
    return () => { ativa = false }
  }, [insumoId])

  return (
    <ModalShell open onClose={onClose} title={`Produtos que usam ${insumoNome}`} width={560}
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>} closeLabel="Fechar lista">
      <div data-testid="modal-produtos-do-insumo" className="max-h-[60vh] overflow-auto">
        {erro ? (
          <div role="alert" className="text-sm text-danger">{erro}</div>
        ) : !produtos ? (
          <div className="flex items-center gap-2.5 py-6 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
        ) : produtos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">Nenhum produto ativo usa este insumo.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="px-2 py-2 font-semibold">Produto</th><th className="px-2 py-2 font-semibold">Quantidade na ficha</th></tr></thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-2 py-2">
                    <a href={`/produtos/${p.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal no-underline hover:underline">{p.nome}</a>
                  </td>
                  <td className="px-2 py-2 [font-variant-numeric:tabular-nums]">
                    {p.quantidade != null ? `${p.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${p.unidade ? ` ${p.unidade}` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalShell>
  )
}
