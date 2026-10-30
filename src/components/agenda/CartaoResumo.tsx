import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Compromisso } from '../../types/agenda'
import { formatarData } from '../../utils/data'
import { ORIGEM } from './origem'

/** Resumo ancorado ao compromisso, fora do recorte e da rolagem da grade (#1066). */
export default function CartaoResumo({ compromisso, ancora, atraso }: { compromisso: Compromisso; ancora: DOMRect; atraso: string | null }) {
  const [posicao, setPosicao] = useState({ left: ancora.left, top: ancora.bottom + 6 })

  useEffect(() => {
    const ajustar = () => {
      const largura = 280
      const altura = 160
      setPosicao({
        left: Math.max(8, Math.min(ancora.left, window.innerWidth - largura - 8)),
        top: ancora.bottom + altura + 8 <= window.innerHeight ? ancora.bottom + 6 : Math.max(8, ancora.top - altura - 6),
      })
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    window.addEventListener('scroll', ajustar, true)
    return () => {
      window.removeEventListener('resize', ajustar)
      window.removeEventListener('scroll', ajustar, true)
    }
  }, [ancora])

  // RN-NOVA-2 v4 (#1066): data e hora de início–término quando o compromisso tem término; senão só o início
  const faixa = compromisso.horario && compromisso.horarioFim ? `${compromisso.horario}–${compromisso.horarioFim}` : compromisso.horario
  const horario = faixa ? ` · ${faixa}` : ''
  return createPortal(
    <div data-testid="cartao-resumo" role="tooltip" className="fixed z-[100] w-[280px] rounded-card border border-line bg-white p-3 text-sm text-body shadow-card" style={posicao}>
      <p className="m-0 font-semibold text-dark">{compromisso.titulo}</p>
      <p className="mb-0 mt-1">{formatarData(compromisso.dataExibicao)}{horario}</p>
      <p className="mb-0 mt-1">{ORIGEM[compromisso.origem].rotulo}</p>
      {atraso && <p className="mb-0 mt-1 font-semibold text-danger">{atraso}</p>}
      {compromisso.marcacoes.length > 0 && <p className="mb-0 mt-1">{compromisso.marcacoes.join(' · ')}</p>}
    </div>,
    document.body,
  )
}
