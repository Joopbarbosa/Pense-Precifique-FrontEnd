import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink, Package } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import { insumoService } from '../../services/insumoService'
import { extractApiError } from '../../utils/apiError'
import { formatarData, moeda, qtd } from './formato'
import type { InsumoResponse } from '../../types/insumo'

// V0.15.0 (#568) — dados do insumo sem sair da compra. #592 (RN-NOVA-45): "Detalhes do insumo" abre o
// detalhe (não a edição) numa aba nova, para a compra continuar aberta onde estava.

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim">{rotulo}</dt>
      <dd className="m-0 mt-1 text-[14px] text-dark [font-variant-numeric:tabular-nums]">{children}</dd>
    </div>
  )
}

export default function ModalInsumoResumo({ insumoId, onClose }: { insumoId: string; onClose: () => void }) {
  const [insumo, setInsumo] = useState<InsumoResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    insumoService.buscarPorId(insumoId).then(setInsumo)
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar o insumo.')))
  }, [insumoId])

  const un = insumo?.unidadeMedida ?? ''
  return (
    <ModalShell open onClose={onClose} title={insumo?.nome ?? 'Insumo'} subtitle={insumo?.identificador} icon={<Package size={16} />} width={560}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button variant="secondary" icon={<ExternalLink size={16} />} disabled={!insumo}
          onClick={() => window.open(`/insumos/${insumoId}`, '_blank', 'noopener')}>
          Detalhes do insumo
        </Button>
      </>}>
      {erro ? (
        <div role="alert" className="rounded-input border border-danger-line bg-danger-tint px-3.5 py-2.5 text-[13px] text-danger-deep">{erro}</div>
      ) : !insumo ? (
        <div className="flex items-center gap-2.5 py-6 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando insumo…</div>
      ) : (
        <dl data-testid="modal-insumo" className="m-0 grid grid-cols-2 gap-x-6 gap-y-4">
          <Dado rotulo="Marca">{insumo.marca || <span className="italic text-faint">Não informada</span>}</Dado>
          <Dado rotulo="Unidade">{un}</Dado>
          <Dado rotulo="Custo atual">{moeda(insumo.custoUnitario)} / {un}</Dado>
          <Dado rotulo="Situação">{insumo.ativo ? 'Ativo' : <span className="font-semibold text-danger">Inativo</span>}</Dado>
          <Dado rotulo="Estoque atual">{qtd(insumo.estoqueAtual)} {un}</Dado>
          <Dado rotulo="Estoque mínimo">{insumo.estoqueMinimo != null ? `${qtd(insumo.estoqueMinimo)} ${un}` : '—'}</Dado>
          <Dado rotulo="Fracionável">{insumo.fracionavel ? 'Sim' : 'Não'}</Dado>
          <Dado rotulo="Aceita estoque negativo">{insumo.permitirEstoqueNegativo ? 'Sim' : 'Não'}</Dado>
          <Dado rotulo="Cadastrado em">{formatarData(insumo.createdAt)}</Dado>
        </dl>
      )}
    </ModalShell>
  )
}
