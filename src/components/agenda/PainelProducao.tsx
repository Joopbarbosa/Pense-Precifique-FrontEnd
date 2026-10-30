import { useEffect, useState } from 'react'
import Spinner from '../ui/Spinner'
import { producaoService } from '../../services/producaoService'
import { formatarData } from '../../utils/data'
import type { ProducaoDetalhe } from '../../types/producao'

const ESTADO: Record<string, string> = {
  AGUARDANDO_INICIO: 'Aguardando início', EM_ANDAMENTO: 'Em andamento', TRAVADA: 'Travada',
  FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada', NAO_REALIZADA: 'Não realizada',
}

/**
 * V0.18.0 (#1036, RN-NOVA-7 e RN-NOVA-16) — dados da produção no detalhe do compromisso: PRD-N, os produtos com a quantidade de
 * cada um (todos, em ordem alfabética), datas de início e término previsto e o estado. Só o link para a produção: o estado muda na
 * tela de Produção, nunca por aqui.
 */
export default function PainelProducao({ producaoId }: { producaoId: string }) {
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    producaoService.buscarPorId(producaoId)
      .then(p => { if (vivo) setProducao(p) })
      .catch(() => { if (vivo) setErro('Não foi possível carregar a produção.') })
    return () => { vivo = false }
  }, [producaoId])
  if (erro) return <p className="text-sm text-danger">{erro}</p>
  if (!producao) return <div className="flex justify-center py-3"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={18} /></div>
  const produtos = [...producao.produtos].sort((a, b) => a.nomeProduto.localeCompare(b.nomeProduto, 'pt-BR', { sensitivity: 'base' }))
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-card border border-line bg-cream px-4 py-3 text-sm text-body" data-testid="painel-producao">
      <dt className="font-semibold text-dark">Produção</dt><dd>{producao.identificador}</dd>
      <dt className="font-semibold text-dark">Produtos</dt>
      <dd>
        <ul className="m-0 list-none p-0" data-testid="produtos-da-producao">
          {produtos.map(p => <li key={p.produtoId}>{p.nomeProduto} ({p.quantidade})</li>)}
        </ul>
      </dd>
      <dt className="font-semibold text-dark">Início</dt><dd>{producao.dataInicio ? formatarData(producao.dataInicio) : '—'}</dd>
      <dt className="font-semibold text-dark">Término previsto</dt><dd>{producao.dataTerminoPrevista ? formatarData(producao.dataTerminoPrevista) : '—'}</dd>
      <dt className="font-semibold text-dark">Estado</dt><dd>{ESTADO[producao.estado] ?? producao.estado}</dd>
    </dl>
  )
}
