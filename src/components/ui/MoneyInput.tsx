import clsx from 'clsx'

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus'

/**
 * Campo de valor em R$ (prefixo fixo, só dígitos/vírgula/ponto). Extraído de `CaixaPage.tsx`
 * (V0.12.0) quando apareceu o 2º consumidor — linha de compra (V0.15.0, #541).
 */
export default function MoneyInput({ value, onChange, autoFocus, size = 'md', placeholder, ariaLabel, invalido }: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  ariaLabel?: string
  invalido?: boolean
}) {
  return (
    <div className="relative">
      <span className={clsx(
        'pointer-events-none absolute inset-y-0 left-0 grid place-items-center rounded-l-input border-r border-line bg-cream text-[13px] font-semibold text-dim',
        size === 'sm' ? 'w-10' : 'w-12'
      )}>
        R$
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={clsx(
          inputBase, 'pr-3.5 [font-variant-numeric:tabular-nums]',
          size === 'sm' ? 'h-11 pl-12 text-sm' : 'pl-14',
          size === 'lg' && 'h-[54px] text-[18px] font-semibold',
          invalido && 'border-[#F2B8A6]'
        )}
      />
    </div>
  )
}
