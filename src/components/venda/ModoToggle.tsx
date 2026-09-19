import { SegmentedControl } from '../ui'

/**
 * Alternância Tudo/Catálogo/Produto do painel de busca de item (`ItemSearch`) — usado por
 * Orçamento e Caixa (#502, V0.12.0). Extraído de `CriarOrcamentoPage.tsx` sem mudança de
 * comportamento.
 */
export default function ModoToggle({ modo, onChange }: {
  modo: 'tudo' | 'catalogo' | 'produto'
  onChange: (m: 'tudo' | 'catalogo' | 'produto') => void
}) {
  return (
    <SegmentedControl
      options={[
        { value: 'tudo' as const, label: 'Tudo' },
        { value: 'catalogo' as const, label: 'Catálogo' },
        { value: 'produto' as const, label: 'Produto' },
      ]}
      value={modo}
      onChange={onChange}
      height="h-[38px]"
      display="inline-flex"
      optionWidth="whitespace-nowrap px-4"
      textSize="text-[13.5px]"
      className="flex-shrink-0"
    />
  )
}
