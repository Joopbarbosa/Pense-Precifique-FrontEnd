import { ModalShell, Button } from '../ui'

// V0.17.0 — #968/#971 (RN-NOVA-23 item 4, CEN-NOVO-79): a lupa do ranking lista todos os itens, não só os 10 do gráfico.
export interface ItemListaCompleta {
  chave: string
  identificador?: string
  rotulo: string
  detalhe?: string
  valor: string
}

export default function ModalListaCompleta({ titulo, itens, onClose }: { titulo: string; itens: ItemListaCompleta[]; onClose: () => void }) {
  return (
    <ModalShell open onClose={onClose} title={titulo} width={560} footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>} closeLabel="Fechar lista">
      <div data-testid="lista-todos" className="max-h-[60vh] overflow-auto">
        {itens.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">Sem dados no período</div>
        ) : itens.map(i => (
          <div key={i.chave} className="flex items-center justify-between gap-3 border-b border-line px-1 py-2.5 text-sm">
            <span>
              {i.identificador && <span className="mr-2 text-[12px] font-semibold text-muted">{i.identificador}</span>}
              {i.rotulo}
              {i.detalhe && <span className="ml-2 text-[12px] text-muted">{i.detalhe}</span>}
            </span>
            <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{i.valor}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}
