import { useState, useEffect } from 'react'

interface StepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
}

export default function Stepper({ value, onChange, min = 1, step = 1 }: StepperProps) {
  const [texto, setTexto] = useState(String(value))

  useEffect(() => { setTexto(String(value)) }, [value])

  const aplicar = (novo: number) => onChange(Math.max(min, novo))

  return (
    <div className="flex h-[42px] flex-shrink-0 items-stretch overflow-hidden rounded-input border border-line bg-white focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/[0.12]">
      <button
        type="button"
        onClick={() => aplicar(value - step)}
        className="grid w-[38px] flex-shrink-0 place-items-center border-none bg-cream text-lg text-body transition-colors duration-100 hover:bg-line-soft"
      >−</button>
      <input
        type="number"
        min={min}
        value={texto}
        onChange={e => {
          setTexto(e.target.value)
          const n = parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) onChange(Math.max(min, n))
        }}
        onBlur={() => setTexto(String(value))}
        inputMode="numeric"
        className="w-[46px] flex-shrink-0 border-x border-line bg-white text-center font-[inherit] text-[15px] font-bold text-dark outline-none [font-variant-numeric:tabular-nums] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => aplicar(value + step)}
        className="grid w-[38px] flex-shrink-0 place-items-center border-none bg-cream text-lg text-teal transition-colors duration-100 hover:bg-line-soft"
      >+</button>
    </div>
  )
}
