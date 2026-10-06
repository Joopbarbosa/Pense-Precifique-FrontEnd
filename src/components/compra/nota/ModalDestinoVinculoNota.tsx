import { ExternalLink } from 'lucide-react'
import { Button, ModalShell } from '../../ui'
import type { VinculoNotaResponse } from '../../../types/vinculoNota'

/**
 * #716 (V0.16.0, RN-NOVA-24) — "Ir para…": ao clicar num registro do Histórico de Nota Fiscal, a artesã escolhe
 * abrir a compra em que o vínculo foi feito, o fornecedor ou o insumo. Só aparecem os destinos que existem.
 * Textos são rascunho até a validação do Gestor.
 */
export default function ModalDestinoVinculoNota({ vinculo, onIr, onClose }: {
  vinculo: VinculoNotaResponse
  onIr: (rota: string) => void
  onClose: () => void
}) {
  const destinos = [
    vinculo.compraId && { chave: 'compra', rotulo: `Compra ${vinculo.compraIdentificador ?? ''}`.trim(), rota: `/compras/${vinculo.compraId}` },
    vinculo.fornecedorId && { chave: 'fornecedor', rotulo: `Fornecedor ${vinculo.fornecedorNome}`, rota: `/clientes/${vinculo.fornecedorId}` },
    vinculo.insumo && { chave: 'insumo', rotulo: `Insumo ${vinculo.insumo.nome}`, rota: `/insumos/${vinculo.insumo.id}` },
  ].filter((d): d is { chave: string; rotulo: string; rota: string } => !!d)

  return (
    <ModalShell open onClose={onClose} width={460} title="Ir para…" subtitle={vinculo.nomeItem} icon={<ExternalLink size={17} />}
      footer={<Button variant="ghost" onClick={onClose}>Cancelar</Button>}>
      <div className="flex flex-col gap-2.5" data-testid="destinos-vinculo-nota">
        {destinos.length === 0
          ? <p className="m-0 text-sm text-muted">Este registro não tem compra, fornecedor nem insumo para abrir.</p>
          : <>
            <p className="m-0 text-sm text-body">O que você quer abrir?</p>
            {destinos.map(d => (
              <Button key={d.chave} variant="secondary" fullWidth onClick={() => onIr(d.rota)}>{d.rotulo}</Button>
            ))}
          </>}
      </div>
    </ModalShell>
  )
}
