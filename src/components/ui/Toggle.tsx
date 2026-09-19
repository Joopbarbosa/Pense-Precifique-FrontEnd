import clsx from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label?: string
}

// Extraído de ConfiguracoesPage.tsx (#491, achado do teste manual) — era um `AtivoToggle` local,
// sem uso fora dali; promovido para components/ui/ para não ser reimplementado por engano na
// próxima tela que precisar de um on/off (convenção do CLAUDE.md §3).
export default function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        'relative h-6 w-11 flex-shrink-0 rounded-full border-none transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal/[0.25]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-teal' : 'bg-line'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-switch transition-transform duration-150',
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'
      )} />
    </button>
  )
}
