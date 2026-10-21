import { ModalShell, Button } from '../ui'

// V0.17.0 — #974 (RN-NOVA-25): lupa dos números de estoque. Colunas e total no rodapé, iguais ao número.
export default function ModalTabelaEstoque({ titulo, colunas, linhas, total, onClose }: {
  titulo: string
  colunas: string[]
  linhas: string[][]
  total?: string
  onClose: () => void
}) {
  return (
    <ModalShell open onClose={onClose} title={titulo} width={720} closeLabel="Fechar lista"
      footer={<div className="flex w-full items-center justify-between gap-3">
        <span data-testid="total-estoque" className="text-sm font-semibold text-dark">{total ?? ''}</span>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>}>
      <div className="max-h-[60vh] overflow-auto">
        {linhas.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">Sem dados no período</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted">{colunas.map(c => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
            <tbody>
              {linhas.map((celulas, i) => (
                <tr key={i} className="border-t border-line">
                  {celulas.map((c, j) => <td key={j} className="px-2 py-2 [font-variant-numeric:tabular-nums]">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalShell>
  )
}
