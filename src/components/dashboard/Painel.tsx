import type { ReactNode } from 'react'
import BotaoAjuda from '../ui/BotaoAjuda'
import type { IdAjuda } from '../../constants/ajudaDashboards'

/** #615 (DT-NOVA-10) — painel (cartão) de um gráfico ou lista do dashboard. */
/** `ajuda` é obrigatória (#998, RN-NOVA-34): todo gráfico ou lista de dashboard tem o "?" com a explicação. */
export default function Painel({ titulo, subtitulo, children, acoes, testid, ajuda }: {
  titulo: string; subtitulo?: string; children: ReactNode; acoes?: ReactNode; testid?: string; ajuda: IdAjuda
}) {
  return (
    <div data-testid={testid} className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-dark">{titulo}<BotaoAjuda id={ajuda} /></div>
          {subtitulo && <div className="text-[12px] text-muted">{subtitulo}</div>}
        </div>
        {acoes}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
