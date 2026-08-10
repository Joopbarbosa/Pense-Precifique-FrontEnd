import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Calculator, Sparkles, Info } from 'lucide-react'

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function LinhaCalculadora({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2.5 py-[9px]">
      <span className="text-[13.2px] text-body">
        {label}
        {sub && <span className="mt-px block text-[11.5px] text-dim">{sub}</span>}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-dark [font-variant-numeric:tabular-nums]">{value}</span>
    </div>
  )
}

interface CalculadoraPrecoProps {
  titulo: string
  calculando?: boolean
  /** Detalhamento acima do preço sugerido — cada tela monta suas próprias linhas (custo/margem em Produto, preço×quantidade em Catálogo). */
  children?: ReactNode
  mostrarSugerido?: boolean
  mensagemSemPreco?: string
  sugerido: number | null
  sugeridoLabel?: string
  precoFinalLabel?: string
  precoFinal: string
  onPrecoFinalChange: (v: string) => void
  overrideAtivo: boolean
  diffOverride?: number | null
  disabledInput?: boolean
}

/** Calculadora de Custo/Preço — mesmo componente usado em Produto (custo+margem) e Catálogo (preço×quantidade), RN-NOVA/#239. */
export default function CalculadoraPreco({
  titulo, calculando = false, children,
  mostrarSugerido = true, mensagemSemPreco,
  sugerido, sugeridoLabel = 'Preço sugerido',
  precoFinalLabel = 'Preço final de venda',
  precoFinal, onPrecoFinalChange,
  overrideAtivo, diffOverride,
  disabledInput = false,
}: CalculadoraPrecoProps) {
  return (
    <div className="overflow-hidden rounded-card border-[1.5px] border-teal/30 bg-white shadow-[0_8px_26px_-12px_rgba(42,157,143,0.4)]">
      <div className="flex items-center gap-[11px] border-b border-teal/[0.18] bg-[linear-gradient(135deg,rgba(42,157,143,0.12),rgba(42,157,143,0.04))] px-5 py-4">
        <span className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-white text-teal shadow-[0_3px_10px_-3px_rgba(42,157,143,0.4)]">
          <Calculator size={20} />
        </span>
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[15px] font-bold tracking-[-0.01em] text-[#1F7A6F]">{titulo}</div>
          <div className="mt-px flex items-center gap-1 text-[11.5px] text-teal">
            {calculando ? 'Calculando…' : <><Sparkles size={12} /> Atualiza em tempo real</>}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2.5">
        {children}

        {!mostrarSugerido ? (
          <div className="mt-2 rounded-xl border border-teal/[0.18] bg-teal/[0.06] px-4 py-3.5 text-center">
            <div className="text-xs font-semibold text-[#1F7A6F]">{mensagemSemPreco}</div>
            <div className="mt-[3px] text-[11.5px] text-muted">O custo acima é registrado automaticamente.</div>
          </div>
        ) : (
          <>
            <div key={sugerido != null ? Math.round(sugerido * 100) : 'x'} className="mt-2 animate-flash rounded-2xl border-[1.5px] border-teal/[0.28] bg-[linear-gradient(135deg,rgba(42,157,143,0.14),rgba(42,157,143,0.05))] px-[18px] py-4">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#1F7A6F]">{sugeridoLabel}</div>
              <div className="mt-0.5 text-[28px] font-bold tracking-[-0.02em] text-teal [font-variant-numeric:tabular-nums]">
                {sugerido != null ? moeda(sugerido) : '—'}
              </div>
            </div>

            <div className="mt-4">
              <span className="mb-[7px] block text-[13px] font-semibold text-body">{precoFinalLabel}</span>
              <div className="relative">
                <span className={clsx(
                  'pointer-events-none absolute inset-y-0 left-0 grid w-[46px] place-items-center rounded-l-input border-r text-[15px] font-bold',
                  overrideAtivo ? 'border-orange/30 bg-orange/[0.08] text-orange' : 'border-line bg-cream text-dim'
                )}>R$</span>
                <input
                  value={precoFinal}
                  onChange={e => onPrecoFinalChange(e.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  disabled={disabledInput}
                  className={clsx(
                    'h-[52px] w-full rounded-input border-[1.5px] pl-[58px] pr-3.5 font-[inherit] text-xl font-bold outline-none transition-[border-color,box-shadow] duration-150 [font-variant-numeric:tabular-nums]',
                    overrideAtivo
                      ? 'border-orange text-orange focus:ring-4 focus:ring-orange/[0.12]'
                      : 'border-line text-dark focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                    disabledInput ? 'bg-cream' : 'bg-white'
                  )}
                />
              </div>
            </div>

            {diffOverride != null && (
              <div className="mt-3 flex gap-2 rounded-[11px] border border-[#F6E4CE] bg-[#FFF8F0] px-[13px] py-[11px]">
                <Info size={15} className="mt-px flex-shrink-0 text-warning" />
                <p className="m-0 text-[12.3px] leading-[1.5] text-[#7A5A33]">
                  Você ajustou o preço manualmente (<strong className="font-bold">{diffOverride > 0 ? '+' : '−'}{moeda(Math.abs(diffOverride))}</strong> {diffOverride > 0 ? 'acima' : 'abaixo'} do sugerido).
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
