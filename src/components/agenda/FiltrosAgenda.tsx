import type { FiltrosAgenda as FiltrosAgendaValue, MostrarAgenda } from '../../utils/agenda'
import type { OrigemCompromisso } from '../../types/agenda'

const OPCOES_MOSTRAR: { value: MostrarAgenda; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ATRASADOS', label: 'Somente atrasados' },
  { value: 'PENDENTES', label: 'Somente pendentes' },
  { value: 'CONCLUIDOS', label: 'Somente concluídos' },
]

const ORIGENS: { value: OrigemCompromisso; label: string }[] = [
  { value: 'ORCAMENTO', label: 'Orçamento' },
  { value: 'PRODUCAO', label: 'Produção' },
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AVULSO', label: 'Meus eventos' },
]

export default function FiltrosAgenda({ filtros, ativo, onMudarMostrar, onMudarOrigens, onLimpar }: {
  filtros: FiltrosAgendaValue
  ativo: boolean
  onMudarMostrar: (mostrar: MostrarAgenda) => void
  onMudarOrigens: (origens: OrigemCompromisso[]) => void
  onLimpar: () => void
}) {
  const alternarOrigem = (origem: OrigemCompromisso) => {
    onMudarOrigens(filtros.origens.includes(origem)
      ? filtros.origens.filter(o => o !== origem)
      : [...filtros.origens, origem])
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-card border border-line bg-white p-3" data-testid="filtros-agenda">
      <label className="flex flex-col gap-1 text-xs font-semibold text-body">
        Mostrar
        <select aria-label="Mostrar" value={filtros.mostrar} onChange={e => onMudarMostrar(e.target.value as MostrarAgenda)}
          className="h-9 min-w-[190px] rounded-input border border-line bg-white px-3 text-sm font-medium text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus">
          {OPCOES_MOSTRAR.map(opcao => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
        </select>
      </label>
      <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-0 p-0">
        <legend className="mb-1 text-xs font-semibold text-body">Origem</legend>
        {ORIGENS.map(origem => (
          <label key={origem.value} className="flex cursor-pointer items-center gap-1.5 text-sm text-body">
            <input type="checkbox" checked={filtros.origens.includes(origem.value)} onChange={() => alternarOrigem(origem.value)}
              className="h-4 w-4 accent-teal" />
            {origem.label}
          </label>
        ))}
      </fieldset>
      <button type="button" disabled={!ativo} onClick={onLimpar} className="h-9 rounded-btn px-3 text-sm font-semibold text-teal enabled:hover:bg-teal/10 disabled:cursor-not-allowed disabled:text-faint">
        Limpar filtros
      </button>
    </div>
  )
}
