import { Button } from '../ui'

/**
 * #992 e #994 (RN-NOVA-31, DT-NOVA-27): paginação numerada comum — "Página X de Y", Anterior e Próxima. Extraída do histórico de vendas do
 * Caixa; `pagina` é de zero em diante (a que o servidor usa). `esquerda` leva o total de registros do filtro, quando a tela mostra.
 */
export default function Paginacao({ pagina, totalPaginas, ultima, carregando, onMudar, esquerda }: {
  pagina: number
  totalPaginas: number
  ultima: boolean
  carregando?: boolean
  onMudar: (pagina: number) => void
  esquerda?: React.ReactNode
}) {
  return (
    <div data-testid="paginacao" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-dark">{esquerda}</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" disabled={carregando || pagina === 0} onClick={() => onMudar(pagina - 1)}>Anterior</Button>
        <span>Página {pagina + 1} de {Math.max(1, totalPaginas)}</span>
        <Button variant="ghost" disabled={carregando || ultima} onClick={() => onMudar(pagina + 1)}>Próxima</Button>
      </div>
    </div>
  )
}
