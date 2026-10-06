import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import Spinner from '../../ui/Spinner'
import { formatarData, qtd } from '../formato'
import { vinculoNotaService } from '../../../services/vinculoNotaService'
import type { VinculoNotaResponse } from '../../../types/vinculoNota'

const ORIGENS: Record<VinculoNotaResponse['origem'], string> = {
  CASAMENTO_NOME: 'Casamento por nome', SUGESTAO_IA: 'Sugestão da IA', MANUAL: 'Manual', OUTRO_FORNECEDOR: 'Vínculo de outro fornecedor',
}

/**
 * #717 (V0.16.0, RN-NOVA-25) — aba "Histórico de Nota Fiscal" do detalhe do insumo: os itens de nota já ligados a
 * este insumo (nome na nota, fornecedor, fator e origem). Só leitura; editar e desfazer ficam no Histórico de Nota
 * Fiscal. Textos são rascunho até a validação do Gestor.
 */
export default function HistoricoNotaInsumo({ insumoId, unidade }: { insumoId: string; unidade: string }) {
  const [vinculos, setVinculos] = useState<VinculoNotaResponse[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let atual = true
    setVinculos(null)
    setErro(false)
    vinculoNotaService.listar(0, 50, { insumoId })
      .then(p => { if (atual) setVinculos(p.content) })
      .catch(() => { if (atual) setErro(true) })
    return () => { atual = false }
  }, [insumoId])

  if (erro) return <div className="px-5 py-8 text-center text-sm text-danger" role="alert">Não foi possível carregar o histórico de notas.</div>
  if (!vinculos) return <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
  if (vinculos.length === 0) return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-muted" data-testid="historico-nota-vazio">
      <History size={22} /> Nenhum item de nota foi ligado a este insumo ainda.
    </div>
  )
  return (
    <div className="overflow-x-auto" data-testid="historico-nota-insumo">
      <table className="w-full min-w-[640px] text-left text-sm" aria-label="Histórico de Nota Fiscal do insumo">
        <thead className="bg-cream text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
          <tr>{['Item na nota', 'Fornecedor', 'Fator', 'Atualizado em', 'Origem'].map(t => <th key={t} className="px-5 py-[13px]">{t}</th>)}</tr>
        </thead>
        <tbody>
          {vinculos.map(v => (
            <tr key={v.id} className="border-t border-line" data-testid={`vinculo-insumo-${v.id}`}>
              <td className="px-5 py-3.5 font-semibold text-dark">{v.nomeItem}</td>
              <td className="px-5 py-3.5">{v.fornecedorNome}</td>
              <td className="px-5 py-3.5 [font-variant-numeric:tabular-nums]">{qtd(v.fator)} {unidade}</td>
              <td className="px-5 py-3.5">{formatarData(v.updatedAt)}</td>
              <td className="px-5 py-3.5">{ORIGENS[v.origem]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
