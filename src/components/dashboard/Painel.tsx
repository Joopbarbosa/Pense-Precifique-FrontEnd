import type { ReactNode } from 'react'

/** #615 (DT-NOVA-10) — painel (cartão) de um gráfico ou lista do dashboard. */
export default function Painel({ titulo, subtitulo, children, acoes, testid }: {
  titulo: string; subtitulo?: string; children: ReactNode; acoes?: ReactNode; testid?: string
}) {
  return (
    <div data-testid={testid} className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <div className="text-[13px] font-bold text-dark">{titulo}</div>
          {subtitulo && <div className="text-[12px] text-muted">{subtitulo}</div>}
        </div>
        {acoes}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
