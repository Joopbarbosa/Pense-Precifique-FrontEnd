import { ArrowDown, ArrowUp } from 'lucide-react'
import { pct } from './periodo'

/** #615 (DT-NOVA-10) — "+12,50% vs. R$ 100,00 em ago/2026" (variação já calculada no backend). */
export default function Comparacao({ n, formato, periodo }: {
  n: { anterior: number | null; variacaoPercentual: number | null }
  formato: (v: number) => string
  periodo: string
}) {
  if (n.anterior == null) return <span className="text-faint">Sem dado {periodo}</span>
  const v = n.variacaoPercentual
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="comparativo">
      {v != null && v !== 0 && (v > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      <span className="font-semibold text-body">{v == null ? '—' : `${v > 0 ? '+' : ''}${pct(v)}`}</span>
      <span>vs. {formato(n.anterior)} {periodo}</span>
    </span>
  )
}
